import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { issueRefreshSession } from "../config/token-store.js";

export const generateToken = async (res, user, message) => {
  const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY, {
    expiresIn: "1d",
  });
  const refreshJti = randomUUID();
  const refreshToken = jwt.sign(
    { userId: user._id, type: "refresh", jti: refreshJti },
    process.env.SECRET_KEY,
    { expiresIn: "7d" }
  );
  await issueRefreshSession({
    userId: String(user._id),
    token: refreshToken,
    jti: refreshJti,
  });

  return res
    .status(200)
    .cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 24 * 60 * 60 * 1000,
    })
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/api/v1/user/refresh",
    })
    .json({
      success: true,
      message,
      user,
      token,
    });
};
