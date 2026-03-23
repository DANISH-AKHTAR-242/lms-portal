import { createClient } from "redis";
import logger from "./logger.js";
import { getRedisUrlByRole } from "./redis-connection.js";

const redisUrls = {
  cache: getRedisUrlByRole("cache"),
  queue: getRedisUrlByRole("queue"),
  rateLimit: getRedisUrlByRole("rateLimit"),
};

const hasSentinelConfig = () =>
  Boolean(process.env.REDIS_SENTINELS && process.env.REDIS_MASTER_NAME);

const buildRedisConnectionOptions = (url) => ({ url });

let redisClient;
let rateLimitRedisClient;
let redisEnabled = false;

if (redisUrls.cache) {
  redisClient = createClient(buildRedisConnectionOptions(redisUrls.cache));

  redisClient.on("error", (error) => {
    console.error("Redis client error", error.message);
  });

  redisClient.on("ready", () => {
    redisEnabled = true;
  });

  redisClient.on("end", () => {
    redisEnabled = false;
  });

  if (redisUrls.rateLimit && redisUrls.rateLimit !== redisUrls.cache) {
    rateLimitRedisClient = createClient(
      buildRedisConnectionOptions(redisUrls.rateLimit)
    );
    rateLimitRedisClient.on("error", (error) => {
      logger.error("redis_rate_limit_error", { error: error.message });
    });
  } else {
    rateLimitRedisClient = redisClient;
  }
} else {
  const fallbackWarning = (method) => {
    logger.warn("redis_fallback_method_invoked", { method });
  };

  redisClient = {
    isOpen: false,
    connect: async () => {
      fallbackWarning("connect");
    },
    get: async () => {
      fallbackWarning("get");
      return null;
    },
    set: async () => {
      fallbackWarning("set");
      return null;
    },
    del: async () => {
      fallbackWarning("del");
      return 0;
    },
    incr: async () => {
      fallbackWarning("incr");
      return 0;
    },
    sendCommand: async () => {
      fallbackWarning("sendCommand");
      return null;
    },
    ping: async () => {
      fallbackWarning("ping");
      return "PONG";
    },
  };
  rateLimitRedisClient = redisClient;
}

export const connectRedis = async () => {
  if (redisUrls.cache && !redisClient.isOpen) {
    await redisClient.connect();
  }
  if (
    rateLimitRedisClient &&
    rateLimitRedisClient !== redisClient &&
    !rateLimitRedisClient.isOpen
  ) {
    await rateLimitRedisClient.connect();
  }
};

export const isRedisEnabled = () => redisEnabled && Boolean(redisUrls.cache);
export const getRedisUrl = (role = "cache") => redisUrls[role] || redisUrls.cache;
export const getRateLimitRedisClient = () => rateLimitRedisClient;
export const getRedisTopology = () => ({
  mode: hasSentinelConfig() ? "sentinel" : "standalone",
  urls: redisUrls,
});

export default redisClient;
