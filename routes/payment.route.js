import express from "express";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import { requireIdempotencyKey } from "../middleware/idempotency.middleware.js";
import {
  createRazorpayOrder,
  handleFailedPayment,
  verifyPayment,
} from "../controllers/razorpay.controller.js";

const router = express.Router();

router.post("/order", isAuthenticated, requireIdempotencyKey, createRazorpayOrder);
router.post("/verify", isAuthenticated, requireIdempotencyKey, verifyPayment);
router.post("/failed", isAuthenticated, handleFailedPayment);

export default router;
