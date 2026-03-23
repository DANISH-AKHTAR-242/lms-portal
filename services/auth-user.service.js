import { CACHE_TTLS, cacheKeys, getOrSetCache, invalidateCacheKeys } from "../config/cache.js";
import { User } from "../models/user.model.js";

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export const cacheSessionMetadata = async ({ userId, email, role }) => {
  if (!redisClient?.isOpen) {
    return;
  }

  const key = `session:${userId}`;
  const payload = {
    userId: String(userId),
    email,
    role,
    lastAuthenticatedAt: new Date().toISOString(),
  };

  await redisClient.set(key, JSON.stringify(payload), { EX: SESSION_TTL_SECONDS });
};

export const clearSessionMetadata = async ({ userId }) => {
  if (!userId) {
    return;
  }
  await invalidateCacheKeys([`session:${userId}`, cacheKeys.userProfile(userId)]);
};

export const getUserProfile = async ({ userId }) =>
  getOrSetCache({
    key: cacheKeys.userProfile(userId),
    ttlSeconds: CACHE_TTLS.USER_PROFILE,
    queryFn: async () =>
      User.findById(userId).populate({
        path: "enrolledCourse.course",
        select: "title thumbnail description",
      }),
  });
