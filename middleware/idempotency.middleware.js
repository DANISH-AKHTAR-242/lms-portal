import crypto from "crypto";
import redisClient from "../config/redis.js";

const localIdempotencyStore = new Map();
const TTL_SECONDS = 15 * 60;

const getBodyHash = (body) =>
  crypto.createHash("sha256").update(JSON.stringify(body || {})).digest("hex");

const getClientFingerprint = (req) => req.ip || req.headers["x-forwarded-for"] || "unknown";

const buildKey = (req, idempotencyKey) =>
  `idempotency:${req.id || `anonymous:${getClientFingerprint(req)}`}:${req.method}:${req.path}:${idempotencyKey}`;

const getCachedResponse = async (key) => {
  if (redisClient?.isOpen) {
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  const entry = localIdempotencyStore.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt < Date.now()) {
    localIdempotencyStore.delete(key);
    return null;
  }

  return entry.value;
};

const setCachedResponse = async (key, value) => {
  if (redisClient?.isOpen) {
    await redisClient.set(key, JSON.stringify(value), { EX: TTL_SECONDS });
    return;
  }

  localIdempotencyStore.set(key, {
    value,
    expiresAt: Date.now() + TTL_SECONDS * 1000,
  });
};

export const requireIdempotencyKey = async (req, res, next) => {
  try {
    const idempotencyKey = req.header("Idempotency-Key");

    if (!idempotencyKey) {
      return res.status(400).json({
        success: false,
        message: "Idempotency-Key header is required",
      });
    }

    const requestBodyHash = getBodyHash(req.body);
    const cacheKey = buildKey(req, idempotencyKey);
    const cached = await getCachedResponse(cacheKey);

    if (cached) {
      if (cached.requestBodyHash !== requestBodyHash) {
        return res.status(409).json({
          success: false,
          message: "Idempotency key reused with different request payload",
        });
      }

      res.set("X-Idempotency-Replay", "true");
      return res.status(cached.statusCode).json(cached.responseBody);
    }

    const originalJson = res.json.bind(res);
    res.json = async (payload) => {
      const responseBody = payload;
      await setCachedResponse(cacheKey, {
        requestBodyHash,
        statusCode: res.statusCode,
        responseBody,
      });

      return originalJson(payload);
    };

    return next();
  } catch (error) {
    return next(error);
  }
};
