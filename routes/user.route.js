import express from "express";
import {
  authenticateUser,
  createUserAccount,
  getCurrentUserProfile,
  refreshAuthToken,
  signOutUser,
  updateUser,
} from "../controllers/user.controller.js";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import uploads from "../utils/multer.js";
import { validateSignup, validate } from "../middleware/validation.middleware.js";
import { body } from "express-validator";

const router = express.Router();

//auth routes
router.post("/signup", validateSignup, createUserAccount);
router.post(
  "/signin",
  validate([
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("password").notEmpty().withMessage("Password is required"),
  ]),
  authenticateUser
);
router.post("/signout", signOutUser);
router.post("/refresh", refreshAuthToken);

//profile routes
router.get("/profile", isAuthenticated, getCurrentUserProfile);
router.patch("/profile", isAuthenticated, uploads.single("avatar"), updateUser);

export default router;
