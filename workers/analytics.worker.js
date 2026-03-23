import { Worker } from "bullmq";
import IORedis from "ioredis";
import logger from "../config/logger.js";
import { processAnalyticsEvent } from "../services/analytics.service.js";

const redisUrl = process.env.REDIS_URL;
const connection = redisUrl
  ? new IORedis(redisUrl, { maxRetriesPerRequest: null })
  : null;

let analyticsWorker = null;

export const startAnalyticsWorker = () => {
  if (!connection) {
    logger.warn("analytics_worker_skipped_no_redis");
    return null;
  }

  analyticsWorker = new Worker(
    "analytics-events",
    async (job) => {
      await processAnalyticsEvent(job.data);
    },
    { connection, concurrency: 20 }
  );

  analyticsWorker.on("failed", (job, error) => {
    logger.error("analytics_worker_job_failed", {
      jobId: job?.id,
      eventType: job?.data?.eventType,
      error: error.message,
    });
  });

  return analyticsWorker;
};

export default startAnalyticsWorker;
