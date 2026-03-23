import { Queue } from "bullmq";
import IORedis from "ioredis";
import logger from "./logger.js";

const redisUrl = process.env.REDIS_URL;

let queueConnection = null;

if (redisUrl) {
  queueConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  queueConnection.on("error", (error) => {
    logger.error("queue_redis_error", { error: error.message });
  });
}

const createQueue = (name) => {
  if (!queueConnection) {
    return {
      async add(jobName, data) {
        logger.info("queue_job_skipped", { queue: name, jobName, data });
        return { id: `skipped-${Date.now()}` };
      },
    };
  }

  return new Queue(name, { connection: queueConnection });
};

export const paymentReconciliationQueue = createQueue("payment-reconciliation");
export const mediaProcessingQueue = createQueue("media-processing");
export const notificationQueue = createQueue("notifications");

export const enqueuePaymentReconciliation = async (data) =>
  paymentReconciliationQueue.add("reconcile-payment", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 100,
  });

export const enqueueMediaProcessing = async (data) =>
  mediaProcessingQueue.add("process-media", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 100,
  });

export const enqueueNotification = async (data) =>
  notificationQueue.add("send-notification", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 100,
  });
