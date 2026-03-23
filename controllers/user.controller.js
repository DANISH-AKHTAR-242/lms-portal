import { ApiError, catchAsync } from "../middleware/error.middleware.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { deleteMediaFromCloudinary, uploadMedia } from "../utils/cloudinary.js";
import {
  cacheSessionMetadata,
  clearSessionMetadata,
  getUserProfile,
} from "../services/auth-user.service.js";
import { generateToken } from "../utils/generateToken.js";

export const createUserAccount = catchAsync(async (req, res) => {
  const { name, email, password, role = "student" } = req.body;

  const existingUser = await User.findOne({ email: email.toLowerCase() });

  if (existingUser) {
    throw new ApiError("User already exists", 400);
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role,
  });
  await user.updateLastActive();
  await cacheSessionMetadata({
    userId: user._id,
    email: user.email,
    role: user.role,
  });
  generateToken(res, user, "Account created successfully");
});

export const authenticateUser = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+password"
  );

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError("Invalid email or password", 401);
  }

  await user.updateLastActive();
  await cacheSessionMetadata({
    userId: user._id,
    email: user.email,
    role: user.role,
  });
  generateToken(res, user, `Welcome back ${user.name}`);
});

export const signOutUser = catchAsync(async (req, res) => {
  const token = req.cookies?.token;
  if (token && process.env.SECRET_KEY) {
    try {
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      if (decoded?.userId) {
        await clearSessionMetadata({ userId: decoded.userId });
      }
    } catch (_) {
      // no-op for invalid token on signout
    }
  }
  res.cookie("token", "", { maxAge: 0 });
  res.status(200).json({
    success: true,
    message: "Signed out successfully",
  });
});

export const getCurrentUserProfile = catchAsync(async (req, res) => {
  const user = await getUserProfile({ userId: req.id });

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  res.status(200).json({
    success: true,
    data: {
      ...user.toJSON(),
      totalEnrolledCourses: user.totalEnrolledCourses,
    },
  });
});

export const updateUser = catchAsync(async (req, res) => {
  const { name, email, bio } = req.body;
  const updateData = { name, email: email?.toLowerCase(), bio };

  if (req.file) {
    const avatarResult = await uploadMedia(req.file.path);
    updateData.avatar = avatarResult.secure_url;

    //delete old avatar
    const user = await User.findById(req.id);
    if (user.avatar && user.avatar !== "default-avatar.png") {
      await deleteMediaFromCloudinary(user.avatar);
    }
  }

  //update user
  const updatedUser = await User.findByIdAndUpdate(req.id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) {
    throw new ApiError("User not found", 404);
  }
  res.status(200).json({
    success: true,
    message: "Updated the data successfully",
    data: updatedUser,
  });
});

export const extra = catchAsync(async (req, res) => {});
