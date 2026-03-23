import { createClient } from "redis";

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
  redisClient = {
    isOpen: false,
    connect: async () => {},
    get: async () => null,
    set: async () => null,
    del: async () => 0,
    ping: async () => "PONG",
  };
}

export const connectRedis = async () => {
  if (redisUrl && !redisClient.isOpen) {
    await redisClient.connect();
  }
};

export const isRedisEnabled = () => redisEnabled && Boolean(redisUrl);

export default redisClient;
