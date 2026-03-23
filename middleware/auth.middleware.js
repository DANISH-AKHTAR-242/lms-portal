import jwt from "jsonwebtoken";
import { ApiError, catchAsync, jwtError } from "./error.middleware.js";
import { User } from "../models/user.model.js";

export const isAuthenticated = catchAsync(async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    throw new ApiError("Not logged in", 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const user = await User.findById(decoded.userId).select("_id role");

    if (!user) {
      throw new ApiError("User not found", 401);
    }

    req.id = user._id;
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw jwtError();
  }
});

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError("Forbidden: insufficient permissions", 403));
    }
    next();
  };
};
