import redisClient from "./redis.js";
import logger from "./logger.js";

const memoryFallback = new Map();

const parseSafe = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const setMemoryCache = (key, value, ttlSeconds) => {
  memoryFallback.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
    staleUntil: Date.now() + ttlSeconds * 2000,
  });
};

const getMemoryCache = (key) => {
  const entry = memoryFallback.get(key);
  if (!entry) {
    return null;
  }
  if (entry.staleUntil < Date.now()) {
    memoryFallback.delete(key);
    return null;
  }
  return entry;
};

const withRedisLock = async ({ lockKey, lockTtlSeconds = 5, operation }) => {
  if (!redisClient?.isOpen) {
    return operation();
  }
  const lockValue = `${process.pid}-${Date.now()}-${Math.random()}`;
  const lockAcquired = await redisClient.set(lockKey, lockValue, {
    NX: true,
    EX: lockTtlSeconds,
  });
  if (!lockAcquired) {
    return null;
  }
  try {
    return await operation();
  } finally {
    const currentValue = await redisClient.get(lockKey);
    if (currentValue === lockValue) {
      await redisClient.del(lockKey);
    }
  }
};

export const getOrSetCacheSWR = async ({
  key,
  ttlSeconds = 60,
  staleTtlSeconds = 120,
  queryFn,
  lockTtlSeconds = 5,
}) => {
  const cachedRaw = redisClient?.isOpen ? await redisClient.get(key) : null;
  const cached = cachedRaw ? parseSafe(cachedRaw) : getMemoryCache(key);

  if (cached?.freshUntil && cached.freshUntil > Date.now()) {
    return cached.value;
  }

  if (cached?.staleUntil && cached.staleUntil > Date.now()) {
    setImmediate(async () => {
      try {
        await withRedisLock({
          lockKey: `${key}:lock`,
          lockTtlSeconds,
          operation: async () => {
            const freshData = await queryFn();
            const payload = {
              value: freshData,
              freshUntil: Date.now() + ttlSeconds * 1000,
              staleUntil: Date.now() + staleTtlSeconds * 1000,
            };
            if (redisClient?.isOpen) {
              await redisClient.set(key, JSON.stringify(payload), {
                EX: staleTtlSeconds,
              });
            } else {
              setMemoryCache(key, freshData, staleTtlSeconds);
            }
          },
        });
      } catch (error) {
        logger.warn("cache_background_refresh_failed", {
          key,
          error: error.message,
        });
      }
    });
    return cached.value;
  }

  const refreshed = await withRedisLock({
    lockKey: `${key}:lock`,
    lockTtlSeconds,
    operation: async () => {
      const freshData = await queryFn();
      const payload = {
        value: freshData,
        freshUntil: Date.now() + ttlSeconds * 1000,
        staleUntil: Date.now() + staleTtlSeconds * 1000,
      };
      if (redisClient?.isOpen) {
        await redisClient.set(key, JSON.stringify(payload), { EX: staleTtlSeconds });
      } else {
        setMemoryCache(key, freshData, staleTtlSeconds);
      }
      return freshData;
    },
  });

  if (refreshed !== null) {
    return refreshed;
  }

  const staleRaw = redisClient?.isOpen ? await redisClient.get(key) : null;
  const staleValue = staleRaw ? parseSafe(staleRaw)?.value : getMemoryCache(key)?.value;
  if (staleValue !== undefined && staleValue !== null) {
    return staleValue;
  }

  return queryFn();
};
