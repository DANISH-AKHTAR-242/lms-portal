import crypto from "crypto";
import redisClient from "./redis.js";

const fallbackStore = new Map();
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const keyFor = (userId, jti) => `refresh:${userId}:${jti}`;

export const issueRefreshSession = async ({ userId, token, jti }) => {
  const hashed = hashToken(token);
  const key = keyFor(userId, jti);

  if (redisClient?.isOpen) {
    await redisClient.set(key, hashed, { EX: REFRESH_TTL_SECONDS });
    return;
  }

  fallbackStore.set(key, {
    token: hashed,
    expiresAt: Date.now() + REFRESH_TTL_SECONDS * 1000,
  });
};

export const validateRefreshSession = async ({ userId, token, jti }) => {
  const key = keyFor(userId, jti);
  const hashed = hashToken(token);

  if (redisClient?.isOpen) {
    const stored = await redisClient.get(key);
    return stored === hashed;
  }

  const entry = fallbackStore.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    fallbackStore.delete(key);
    return false;
  }
  return entry.token === hashed;
};

export const revokeRefreshSession = async ({ userId, jti }) => {
  const key = keyFor(userId, jti);

  if (redisClient?.isOpen) {
    await redisClient.del(key);
    return;
  }

  fallbackStore.delete(key);
};
