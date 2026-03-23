import { CACHE_TTLS, cacheKeys, getOrSetCache, invalidateCacheKeys } from "../config/cache.js";
import { User } from "../models/user.model.js";
import redisClient from "../config/redis.js";
import { CourseEnrollment } from "../models/courseEnrollment.model.js";

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
    queryFn: async () => {
      const [user, enrollmentCount] = await Promise.all([
        User.findById(userId).select("name email role avatar bio createdCourses").lean(),
        CourseEnrollment.countDocuments({ user: userId }),
      ]);

      if (!user) {
        return null;
      }

      return {
        ...user,
        totalEnrolledCoursesCount: enrollmentCount,
      };
    },
  });
