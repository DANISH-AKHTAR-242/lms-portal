import { catchAsync } from "../middleware/error.middleware.js";
import {
  createOrderForCourse,
  markPaymentFailed,
  verifyCoursePayment,
} from "../services/payment.service.js";

export const createRazorpayOrder = catchAsync(async (req, res) => {
  const userId = req.id;
  const { courseId } = req.body;

  const orderPayload = await createOrderForCourse({ userId, courseId });

  res.status(201).json({
    success: true,
    ...orderPayload,
  });
});

export const verifyPayment = catchAsync(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  const purchase = await verifyCoursePayment({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });

  res.status(200).json({
    success: true,
    message: "Payment is verified successfully",
    courseId: purchase.course,
  });
});

export const handleFailedPayment = catchAsync(async (req, res) => {
  const { paymentId } = req.body;
  await markPaymentFailed({ paymentId });

  res.status(200).json({
    success: true,
    message: "Payment marked as failed",
  });
});
