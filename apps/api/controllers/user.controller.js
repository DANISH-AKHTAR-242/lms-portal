import { ApiError, catchAsync } from "../middleware/error.middleware.js";
import jwt from "jsonwebtoken";
import { DOMAIN_EVENTS, eventBus } from "../config/event-bus.js";
import { User } from "../models/user.model.js";
import { deleteMediaFromCloudinary, uploadMedia } from "../utils/cloudinary.js";
import {
  cacheSessionMetadata,
  clearSessionMetadata,
  getUserProfile,
} from "../services/auth-user.service.js";
import { generateToken } from "../utils/generateToken.js";
import { revokeRefreshSession, validateRefreshSession } from "../config/token-store.js";

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
  await eventBus.emit(DOMAIN_EVENTS.USER_REGISTERED, {
    eventId: `user-registered-${user._id}`,
    userId: String(user._id),
    email: user.email,
    role: user.role,
    traceId: req.traceId,
  });
  await generateToken(res, user, "Account created successfully");
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
  await generateToken(res, user, `Welcome back ${user.name}`);
});

export const signOutUser = catchAsync(async (req, res) => {
  const token = req.cookies?.token;
  const refreshToken = req.cookies?.refreshToken;
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
  if (refreshToken && process.env.SECRET_KEY) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.SECRET_KEY);
      if (decoded?.userId && decoded?.jti) {
        await revokeRefreshSession({
          userId: String(decoded.userId),
          jti: decoded.jti,
        });
      }
    } catch (_) {
      // no-op for invalid token on signout
    }
  }
  res.cookie("token", "", { maxAge: 0 });
  res.cookie("refreshToken", "", { maxAge: 0, path: "/" });
  res.status(200).json({
    success: true,
    message: "Signed out successfully",
  });
});

export const refreshAuthToken = catchAsync(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    throw new ApiError("Refresh token is required", 401);
  }

  const decoded = jwt.verify(refreshToken, process.env.SECRET_KEY);
  if (!decoded?.userId || decoded?.type !== "refresh" || !decoded?.jti) {
    throw new ApiError("Invalid refresh token", 401);
  }

  const isValidSession = await validateRefreshSession({
    userId: String(decoded.userId),
    token: refreshToken,
    jti: decoded.jti,
  });
  if (!isValidSession) {
    throw new ApiError("Refresh session revoked", 401);
  }

  await revokeRefreshSession({
    userId: String(decoded.userId),
    jti: decoded.jti,
  });

  const user = await User.findById(decoded.userId);
  if (!user) {
    throw new ApiError("User not found", 404);
  }

  await generateToken(res, user, "Token refreshed successfully");
});

export const getCurrentUserProfile = catchAsync(async (req, res) => {
  const user = await getUserProfile({ userId: req.id });

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  res.status(200).json({
    success: true,
    data: {
      ...(typeof user.toJSON === "function" ? user.toJSON() : user),
      totalEnrolledCourses:
        user.totalEnrolledCourses || user.totalEnrolledCoursesCount || 0,
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
