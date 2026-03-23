import redisClient from "./redis.js";
import logger from "./logger.js";
import { getOrSetCacheSWR } from "./cache-resilience.js";

export const CACHE_TTLS = {
  COURSE_CATALOG: 300,
  COURSE_DETAIL: 180,
  USER_PROFILE: 60,
  USER_ENROLLED_COURSES: 120,
};

export const cacheKeys = {
  courseCatalog: () => "cache:course:catalog:v1",
  courseDetail: (courseId) => `cache:course:${courseId}:detail`,
  userProfile: (userId) => `cache:user:${userId}:profile`,
  userEnrolledCourses: (userId) => `cache:user:${userId}:enrolled`,
};

export const getOrSetCache = async ({ key, ttlSeconds, queryFn }) => {
  if (redisClient?.isOpen) {
    const cached = await redisClient.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
  }

  const data = await queryFn();

  if (redisClient?.isOpen) {
    await redisClient.set(key, JSON.stringify(data), { EX: ttlSeconds });
  }

  return data;
};

export const getOrSetCacheWithSWR = async ({
  key,
  ttlSeconds,
  staleTtlSeconds = ttlSeconds * 2,
  queryFn,
}) =>
  getOrSetCacheSWR({
    key,
    ttlSeconds,
    staleTtlSeconds,
    queryFn,
  });

export const invalidateCacheKeys = async (keys = []) => {
  if (!redisClient?.isOpen || keys.length === 0) {
    return;
  }

  await redisClient.del(keys);
};

export const warmCache = async (entries = []) => {
  for (const entry of entries) {
    try {
      await getOrSetCache(entry);
    } catch (error) {
      logger.warn("cache_warm_failed", {
        key: entry.key,
        error: error.message,
      });
    }
  }
};
