import { jest } from "@jest/globals";

globalThis.jest = jest;

process.env.NODE_ENV = "test";
process.env.SECRET_KEY = "test_secret_key";
process.env.RAZORPAY_KEY_ID = "test_key_id";
process.env.RAZORPAY_KEY_SECRET = "test_key_secret";
