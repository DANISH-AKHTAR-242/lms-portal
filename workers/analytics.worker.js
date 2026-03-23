import { Worker } from "bullmq";
import logger from "../config/logger.js";
import {
  buildDailyAnalyticsSnapshot,
  processAnalyticsEvent,
} from "../services/analytics.service.js";
import { createIORedisClient } from "../config/redis-connection.js";

const connection = createIORedisClient("queue", { maxRetriesPerRequest: null });

let analyticsWorker = null;

export const startAnalyticsWorker = () => {
  if (!connection) {
    logger.warn("analytics_worker_skipped_no_redis");
    return null;
  }

  analyticsWorker = new Worker(
    `analytics-events:${process.env.ANALYTICS_QUEUE_PARTITION || 0}`,
    async (job) => {
      await processAnalyticsEvent(job.data);
    },
    {
      connection,
      concurrency: Number(process.env.ANALYTICS_WORKER_CONCURRENCY || 20),
    }
  );

  analyticsWorker.on("failed", (job, error) => {
    logger.error("analytics_worker_job_failed", {
      jobId: job?.id,
      eventType: job?.data?.eventType,
      error: error.message,
    });
  });

  setInterval(() => {
    buildDailyAnalyticsSnapshot().catch((error) => {
      logger.error("analytics_daily_snapshot_failed", { error: error.message });
    });
  }, Number(process.env.ANALYTICS_SNAPSHOT_INTERVAL_MS || 5 * 60 * 1000));

  return analyticsWorker;
};

export default startAnalyticsWorker;

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  startAnalyticsWorker();
}
