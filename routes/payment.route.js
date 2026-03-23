import express from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import { requireIdempotencyKey } from "../middleware/idempotency.middleware.js";
import { validateWithZod } from "../middleware/validation.middleware.js";
import {
  createRazorpayOrder,
  handleFailedPayment,
  verifyPayment,
} from "../controllers/razorpay.controller.js";

const router = express.Router();
const paymentRouteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.id || req.ip),
});
const createOrderSchema = z.object({
  body: z.object({
    courseId: z.string().regex(/^[a-f\d]{24}$/i),
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
  paymentRouteLimiter,
  requireIdempotencyKey,
  validateWithZod(createOrderSchema),
  createRazorpayOrder
);
router.post(
  "/verify",
  isAuthenticated,
  paymentRouteLimiter,
  requireIdempotencyKey,
  validateWithZod(verifyPaymentSchema),
  verifyPayment
);
router.post(
  "/failed",
  isAuthenticated,
  paymentRouteLimiter,
  requireIdempotencyKey,
  handleFailedPayment
);

export default router;
