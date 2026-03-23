import crypto from "crypto";
import Razorpay from "razorpay";
import { CircuitBreaker } from "../config/circuit-breaker.js";
import { DOMAIN_EVENTS, eventBus } from "../config/event-bus.js";
import { withRetry } from "../config/retry.js";
import { enqueueNotification, enqueuePaymentReconciliation } from "../config/queues.js";
import { Course } from "../models/course.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../middleware/error.middleware.js";
import { ensureCourseProgress } from "./progress-analytics.service.js";
import { trackAnalyticsEvent } from "./analytics.service.js";

const paymentCircuitBreaker = new CircuitBreaker({
  name: "razorpay-orders",
  failureThreshold: 4,
  recoveryTimeoutMs: 20_000,
  fallback: ({ error }) => {
    throw error || new ApiError("Payment service temporarily unavailable", 503);
  },
});

const isTransientDbError = (error) => [50, 91, 6].includes(error?.code);

export const getRazorpayClient = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new ApiError("Razorpay is not configured", 500);
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

export const createOrderForCourse = async ({
  userId,
  courseId,
  razorpayClient = getRazorpayClient(),
  traceId,
}) => {
  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError("Course not found", 404);
  }

  const existingCompletedPurchase = await CoursePurchase.findOne({
    course: courseId,
    user: userId,
    status: "completed",
  });

  if (existingCompletedPurchase) {
    throw new ApiError("Course already purchased", 400);
  }

  const options = {
    // Razorpay expects amount in paise (smallest INR currency unit).
    amount: Math.round(course.price * 100),
    currency: "INR",
    receipt: `course_${courseId}`,
    notes: {
      courseId: String(courseId),
      userId: String(userId),
    },
  };

  const order = await paymentCircuitBreaker.execute(() =>
    withRetry(() => razorpayClient.orders.create(options), {
      retries: 3,
      baseDelayMs: 300,
      operationName: "razorpay_create_order",
    })
  );

  await withRetry(
    () =>
      CoursePurchase.updateOne(
        { paymentId: order.id },
        {
          $setOnInsert: {
            course: courseId,
            user: userId,
            amount: course.price,
            currency: "INR",
            status: "pending",
            paymentMethod: "razorpay",
            paymentId: order.id,
          },
        },
        { upsert: true }
      ),
    {
      retries: 2,
      operationName: "create_purchase_record",
      shouldRetry: isTransientDbError,
    }
  );

  await enqueueNotification({
    type: "payment_order_created",
    userId: String(userId),
    courseId: String(courseId),
    orderId: order.id,
  });
  await trackAnalyticsEvent({
    eventId: `payment-order-created-${order.id}`,
    eventType: "PAYMENT_ORDER_CREATED",
    userId: String(userId),
    courseId: String(courseId),
    traceId,
  });

  return {
    order,
    course: {
      name: course.title,
      description: course.description,
    },
  };
};

export const verifyCoursePayment = async ({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  traceId,
}) => {
  if (!process.env.RAZORPAY_KEY_SECRET) {
    throw new ApiError("Razorpay is not configured", 500);
  }

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  const purchase = await CoursePurchase.findOne({ paymentId: razorpay_order_id });
  if (!purchase) {
    throw new ApiError("Purchase record not found", 404);
  }

  if (purchase.status === "completed") {
    return purchase;
  }

  if (expectedSignature !== razorpay_signature) {
    purchase.status = "failed";
    await purchase.save();
    throw new ApiError("Payment verification failed", 400);
  }

  purchase.status = "completed";
  purchase.metadata = new Map([
    ["razorpay_payment_id", razorpay_payment_id],
    ["razorpay_signature", razorpay_signature],
  ]);
  await purchase.save();

  await User.findByIdAndUpdate(purchase.user, {
    $addToSet: {
      enrolledCourse: {
        course: purchase.course,
        enrolledAt: new Date(),
      },
    },
  });

  await Course.findByIdAndUpdate(purchase.course, {
    $addToSet: {
      enrolledStudent: purchase.user,
    },
  });

  await ensureCourseProgress({ userId: purchase.user, courseId: purchase.course });

  await eventBus.emit(DOMAIN_EVENTS.PAYMENT_SUCCESS, {
    eventId: `payment-success-${razorpay_order_id}`,
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    purchaseId: String(purchase._id),
    userId: String(purchase.user),
    courseId: String(purchase.course),
    traceId,
  });
  await eventBus.emit(DOMAIN_EVENTS.USER_ENROLLED, {
    eventId: `user-enrolled-${purchase.user}-${purchase.course}`,
    userId: String(purchase.user),
    courseId: String(purchase.course),
    traceId,
  });
  await trackAnalyticsEvent({
    eventId: `payment-success-${razorpay_order_id}`,
    eventType: DOMAIN_EVENTS.PAYMENT_SUCCESS,
    userId: String(purchase.user),
    courseId: String(purchase.course),
    traceId,
    paymentId: razorpay_payment_id,
  });

  await enqueuePaymentReconciliation({
    purchaseId: String(purchase._id),
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    action: "reconcile_successful_payment",
  });

  await enqueueNotification({
    type: "course_purchase_completed",
    userId: String(purchase.user),
    courseId: String(purchase.course),
  });

  return purchase;
};

export const markPaymentFailed = async ({ paymentId }) => {
  const purchase = await CoursePurchase.findOne({ paymentId });

  if (!purchase) {
    throw new ApiError("Purchase record not found", 404);
  }

  purchase.status = "failed";
  await purchase.save();

  await enqueuePaymentReconciliation({
    purchaseId: String(purchase._id),
    orderId: paymentId,
    action: "reconcile_failed_payment",
  });

  return purchase;
};
