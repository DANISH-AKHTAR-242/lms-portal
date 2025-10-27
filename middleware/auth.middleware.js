import jwt from "jsonwebtoken";
import { ApiError, catchAsync, jwtError } from "./error.middleware.js";

export const isAuthenticated = catchAsync(async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    throw new ApiError("Not logged in", 401);
  }
  try {
    const decoded = await jwt.verify(token, process.env.SECRET_KEY);
    req.id = decoded.userId;
    next();
  } catch (error) {
    throw new jwtError("JWT token error", 401);
  }
});
