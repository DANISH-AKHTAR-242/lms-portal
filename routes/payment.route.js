import express from "express";
import { z } from "zod";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import { requireIdempotencyKey } from "../middleware/idempotency.middleware.js";
import { validateWithZod } from "../middleware/validation.middleware.js";
import {
  createRazorpayOrder,
  handleFailedPayment,
  verifyPayment,
} from "../controllers/razorpay.controller.js";

const router = express.Router();
const createOrderSchema = z.object({
  body: z.object({
    courseId: z.string().min(1),
  }),
  params: z.object({}),
  query: z.object({}),
});
const verifyPaymentSchema = z.object({
  body: z.object({
    razorpay_order_id: z.string().min(1),
    razorpay_payment_id: z.string().min(1),
    razorpay_signature: z.string().min(1),
  }),
  params: z.object({}),
  query: z.object({}),
});

router.post(
  "/order",
  isAuthenticated,
  requireIdempotencyKey,
  validateWithZod(createOrderSchema),
  createRazorpayOrder
);
router.post(
  "/verify",
  isAuthenticated,
  requireIdempotencyKey,
  validateWithZod(verifyPaymentSchema),
  verifyPayment
);
router.post("/failed", isAuthenticated, handleFailedPayment);

export default router;
