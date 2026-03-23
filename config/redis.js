import { createClient } from "redis";
import logger from "./logger.js";

let redisClient;
let redisEnabled = false;

const redisUrl = process.env.REDIS_URL;

if (redisUrl) {
  redisClient = createClient({ url: redisUrl });

  redisClient.on("error", (error) => {
    console.error("Redis client error", error.message);
  });

  redisClient.on("ready", () => {
    redisEnabled = true;
  });

  redisClient.on("end", () => {
    redisEnabled = false;
  });
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
}

export const connectRedis = async () => {
  if (redisUrl && !redisClient.isOpen) {
    await redisClient.connect();
  }
};

export const isRedisEnabled = () => redisEnabled && Boolean(redisUrl);

export default redisClient;
