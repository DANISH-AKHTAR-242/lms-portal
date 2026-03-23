import Razorpay from "razorpay";
import crypto from "crypto";
import { Course } from "../models/course.model.js";
import { CoursePurchase } from "../models/coursePurschase.model.js";
import { User } from "../models/user.model.js";
import { CourseProgress } from "../models/courseProgress.js";
import { ApiError, catchAsync } from "../middleware/error.middleware.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createRazorpayOrder = catchAsync(async (req, res) => {
  const userId = req.id;
  const { courseId } = req.body;

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
    amount: Math.round(course.price * 100), //amount in paise
    currency: "INR",
    receipt: `course_${courseId}`,
    notes: {
      courseId: String(courseId),
      userId: String(userId),
    },
  };

  const order = await razorpay.orders.create(options);

  const newPurchase = new CoursePurchase({
    course: courseId,
    user: userId,
    amount: course.price,
    currency: "INR",
    status: "pending",
    paymentMethod: "razorpay",
    paymentId: order.id,
  });

  await newPurchase.save();

  res.status(201).json({
    success: true,
    order,
    course: {
      name: course.title,
      description: course.description,
    },
  });
});

export const verifyPayment = catchAsync(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  const isAuthenticated = expectedSignature === razorpay_signature;

  const purchase = await CoursePurchase.findOne({
    paymentId: razorpay_order_id,
  });

  if (!purchase) {
    throw new ApiError("Purchase record not found", 404);
  }

  if (!isAuthenticated) {
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

  await CourseProgress.findOneAndUpdate(
    { user: purchase.user, course: purchase.course },
    { $setOnInsert: { user: purchase.user, course: purchase.course } },
    { upsert: true, new: true }
  );

  res.status(200).json({
    success: true,
    message: "Payment is verified successfully",
    courseId: purchase.course,
  });
});

export const handleFailedPayment = catchAsync(async (req, res) => {
  const { paymentId } = req.body;

  const purchase = await CoursePurchase.findOne({ paymentId });

  if (!purchase) {
    throw new ApiError("Purchase record not found", 404);
  }

  purchase.status = "failed";
  await purchase.save();

  res.status(200).json({
    success: true,
    message: "Payment marked as failed",
  });
});
