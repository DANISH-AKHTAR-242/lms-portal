import { Queue, Worker } from "bullmq";
import logger from "./logger.js";
import { createIORedisClient } from "./redis-connection.js";

export const DOMAIN_EVENTS = {
  USER_REGISTERED: "USER_REGISTERED",
  USER_ENROLLED: "USER_ENROLLED",
  PAYMENT_SUCCESS: "PAYMENT_SUCCESS",
  LECTURE_WATCHED: "LECTURE_WATCHED",
  COURSE_CREATED: "COURSE_CREATED",
  COURSE_VIEWED: "COURSE_VIEWED",
};

const EVENT_QUEUE = "domain-events";
const EVENT_DLX_QUEUE = "domain-events-dlx";

const queueConnection = createIORedisClient("queue", {
  maxRetriesPerRequest: null,
});

const createQueue = (name) => {
  if (!queueConnection) {
    return {
      async add(jobName, payload) {
        logger.info("event_queue_skipped", { queue: name, jobName, payload });
        return { id: `skipped-${Date.now()}` };
      },
    };
  }

  return new Queue(name, { connection: queueConnection });
};

const eventQueue = createQueue(EVENT_QUEUE);
const deadLetterQueue = createQueue(EVENT_DLX_QUEUE);

const buildEventJobId = (eventType, payload) => {
  const idempotencyKey =
    payload?.eventId || payload?.idempotencyKey || payload?.dedupeKey;
  return idempotencyKey ? `${eventType}:${idempotencyKey}` : undefined;
};

export const eventBus = {
  async emit(eventType, payload = {}, options = {}) {
    return eventQueue.add(
      eventType,
      {
        eventType,
        payload,
        occurredAt: new Date().toISOString(),
        traceId: payload?.traceId,
      },
      {
        attempts: options.attempts ?? 5,
        backoff: options.backoff ?? { type: "exponential", delay: 1_000 },
        removeOnComplete: options.removeOnComplete ?? 200,
        removeOnFail: false,
        jobId: options.jobId ?? buildEventJobId(eventType, payload),
      }
    );
  },
};

export const startEventWorker = ({
  handlers,
  queueName = EVENT_QUEUE,
  workerName = "domain-event-worker",
  concurrency = Number(process.env.DOMAIN_EVENT_WORKER_CONCURRENCY || 20),
} = {}) => {
  if (!queueConnection) {
    logger.warn("event_worker_skipped_no_redis", { workerName, queueName });
    return null;
  }

  const handledJobs = new Set();

  const worker = new Worker(
    queueName,
    async (job) => {
      const {
        name: eventType,
        id: jobId,
        data: { payload = {} } = {},
      } = job;
      const dedupeId = payload?.eventId || payload?.idempotencyKey || jobId;

      if (handledJobs.has(dedupeId)) {
        logger.info("event_job_duplicate_skipped", { eventType, dedupeId });
        return;
      }

      const handler = handlers?.[eventType];
      if (!handler) {
        logger.warn("event_handler_missing", { eventType });
        return;
      }

      handledJobs.add(dedupeId);
      await handler(payload, job);
    },
    { connection: queueConnection, concurrency }
  );

  worker.on("failed", async (job, error) => {
    logger.error("event_job_failed", {
      queueName,
      workerName,
      eventType: job?.name,
      jobId: job?.id,
      error: error.message,
      attemptsMade: job?.attemptsMade,
    });

    const exhaustedAttempts = job && job.attemptsMade >= (job.opts.attempts || 1);
    if (exhaustedAttempts) {
      await deadLetterQueue.add(
        `${job.name}-dlq`,
        {
          originalQueue: queueName,
          eventType: job.name,
          payload: job.data?.payload,
          failedAt: new Date().toISOString(),
          error: error.message,
        },
        { removeOnComplete: 1_000 }
      );
    }
  });

  return worker;
};
