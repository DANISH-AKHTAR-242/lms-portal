import express from "express";
import { csrfTokenHandler } from "../middleware/csrf.middleware.js";

const router = express.Router();

router.get("/csrf-token", csrfTokenHandler);

export default router;
