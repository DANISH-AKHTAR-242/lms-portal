import { Queue } from "bullmq";
import logger from "./logger.js";
import { createIORedisClient } from "./redis-connection.js";
import { queueDepthGauge } from "./metrics-prometheus.js";

let queueConnection = null;
const queueDepthThreshold = Number(process.env.QUEUE_DEPTH_THRESHOLD || 5000);

queueConnection = createIORedisClient("queue", {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});
if (queueConnection) {
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
export const analyticsQueue = createQueue(
  `analytics-events:${process.env.ANALYTICS_QUEUE_PARTITION || 0}`
);

export const getQueueConnection = () => queueConnection;

export const monitorQueueDepth = async () => {
  if (!queueConnection) {
    return { overloaded: false, totalDepth: 0, queues: {} };
  }

  const [paymentDepth, mediaDepth, notificationDepth, analyticsDepth] =
    await Promise.all([
      paymentReconciliationQueue.getWaitingCount(),
      mediaProcessingQueue.getWaitingCount(),
      notificationQueue.getWaitingCount(),
      analyticsQueue.getWaitingCount(),
    ]);

  const queues = {
    payment: paymentDepth,
    media: mediaDepth,
    notifications: notificationDepth,
    analytics: analyticsDepth,
  };
  Object.entries(queues).forEach(([queue, depth]) => {
    queueDepthGauge.set({ queue }, depth);
  });
  const totalDepth = Object.values(queues).reduce((sum, item) => sum + item, 0);
  const overloaded = totalDepth >= queueDepthThreshold;

  if (overloaded) {
    logger.warn("queue_depth_threshold_exceeded", {
      queueDepthThreshold,
      totalDepth,
      queues,
    });
  }

  return { overloaded, totalDepth, queues };
};

export const enqueuePaymentReconciliation = async (data) =>
  paymentReconciliationQueue.add("reconcile-payment", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 100,
    priority: 1,
  });

export const enqueueMediaProcessing = async (data) =>
  mediaProcessingQueue.add("process-media", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 100,
    priority: 2,
  });

export const enqueueNotification = async (data) =>
  notificationQueue.add("send-notification", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 100,
    priority: 3,
  });

export const enqueueAnalyticsEvent = async (data) =>
  analyticsQueue.add("analytics-event", data, {
    attempts: 5,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 1000,
    priority: 5,
  });
