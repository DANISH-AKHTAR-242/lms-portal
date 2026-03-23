import crypto from "crypto";
import Razorpay from "razorpay";
import { enqueueNotification, enqueuePaymentReconciliation } from "../config/queues.js";
import { Course } from "../models/course.model.js";
import { CoursePurchase } from "../models/coursePurschase.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../middleware/error.middleware.js";
import { ensureCourseProgress } from "./progress-analytics.service.js";

export const getRazorpayClient = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new ApiError("Razorpay is not configured", 500);
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

export const createOrderForCourse = async ({ userId, courseId, razorpayClient = getRazorpayClient() }) => {
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
    amount: Math.round(course.price * 100),
    currency: "INR",
    receipt: `course_${courseId}`,
    notes: {
      courseId: String(courseId),
      userId: String(userId),
    },
  };

  const order = await razorpayClient.orders.create(options);

  await CoursePurchase.create({
    course: courseId,
    user: userId,
    amount: course.price,
    currency: "INR",
    status: "pending",
    paymentMethod: "razorpay",
    paymentId: order.id,
  });

  await enqueueNotification({
    type: "payment_order_created",
    userId: String(userId),
    courseId: String(courseId),
    orderId: order.id,
  });

  return {
    order,
    course: {
      name: course.title,
      description: course.description,
    },
  };
};

export const verifyCoursePayment = async ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
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
