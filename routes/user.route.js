import express from "express";
import {
  authenticateUser,
  createUserAccount,
  getCurrentUserProfile,
  signOutUser,
  updateUser,
} from "../controllers/user.controller.js";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import uploads from "../utils/multer.js";
import { validateSignup } from "../middleware/validation.middleware.js";

const router = express.Router();

//auth routes
router.post("/signup", validateSignup, createUserAccount);
router.post("/signin", authenticateUser);
router.post("/signout", signOutUser);

//profile routes
router.get("/profile", isAuthenticated, getCurrentUserProfile);
router.patch("/profile", isAuthenticated, uploads.single("avatar"), updateUser);

export default router;
