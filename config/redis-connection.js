import IORedis from "ioredis";

const parseSentinels = () => {
  const raw = process.env.REDIS_SENTINELS;
  if (!raw) {
    return null;
  }
  return raw
    .split(",")
    .map((node) => node.trim())
    .filter(Boolean)
    .map((node) => {
      const [host, port] = node.split(":");
      return { host, port: Number(port || 26379) };
    });
};

export const getRedisUrlByRole = (role = "cache") => {
  const byRole = {
    cache: process.env.REDIS_CACHE_URL || process.env.REDIS_URL,
    queue: process.env.REDIS_QUEUE_URL || process.env.REDIS_URL,
    rateLimit: process.env.REDIS_RATE_LIMIT_URL || process.env.REDIS_URL,
  };

  return byRole[role] || byRole.cache;
};

export const buildIORedisOptions = (role = "cache") => {
  const sentinels = parseSentinels();
  const masterName = process.env.REDIS_MASTER_NAME;
  if (sentinels?.length && masterName) {
    return {
      sentinels,
      name: masterName,
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
    };
  }

  const redisUrl = getRedisUrlByRole(role);
  if (!redisUrl) {
    return null;
  }
  return redisUrl;
};

export const createIORedisClient = (role = "cache", overrides = {}) => {
  const options = buildIORedisOptions(role);
  if (!options) {
    return null;
  }
  if (typeof options === "string") {
    return new IORedis(options, overrides);
  }
  return new IORedis({ ...options, ...overrides });
};
