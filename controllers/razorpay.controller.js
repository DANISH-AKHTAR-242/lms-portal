import Razorpay from "razorpay";
import { Course } from "../models/course.model.js";
import { CoursePurchase } from "../models/coursePurschase.model.js";
import crypto from "crypto";

const razorpay = Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.id;
    const { courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const newPurchase = new CoursePurchase({
      course: courseId,
      user: userId,
      amount: course.price,
      status: pending,
      paymentMethod: "razorpay",
    });

    const options = {
      amount: course.price * 100, //amount in paisa
      currency: "INR",
      receipt: `course_${courseId}`,
      notes: {
        courseId: courseId,
        userId: userId,
      },
    };

    const order = await razorpay.orders.create(options);
    newPurchase.paymentId = order.id;

    await newPurchase.save();

    res.status(200).json({
      success: true,
      order,
      course: {
        name: course.title,
        description: course.description,
      },
    });
  } catch (error) {
    console.log(error);
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthenticated = expectedSignature === razorpay_signature;

    if (!isAuthenticated) {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    const purchase = await CoursePurchase.findOne({
      paymentId: razorpay_order_id,
    });

    if (!purchase) {
      return res.status(404).json({ message: "Purchase record not found" });
    }

    purchase.status = "completed";
    await purchase.save();

    res.status(200).json({
      success: true,
      message: "Payment is verified successfully",
      courseId: purchase.courseId,
    });
  } catch (error) {}
};
