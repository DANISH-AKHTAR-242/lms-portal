import mongoose from "mongoose";
import { enqueueAnalyticsEvent } from "../config/queues.js";
import { CourseProgress } from "../models/courseProgress.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import logger from "../config/logger.js";

const analyticsEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    eventType: { type: String, required: true, index: true },
    userId: { type: String, index: true },
    courseId: { type: String, index: true },
    traceId: { type: String },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    occurredAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

const AnalyticsEvent =
  mongoose.models.AnalyticsEvent ||
  mongoose.model("AnalyticsEvent", analyticsEventSchema);

const analyticsDailyMetricSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true, index: true },
    activeUsers: { type: Number, default: 0 },
    completionRateByCourse: { type: Map, of: Number, default: {} },
    revenueByCurrency: { type: Map, of: Number, default: {} },
    paymentCountByCurrency: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

const AnalyticsDailyMetric =
  mongoose.models.AnalyticsDailyMetric ||
  mongoose.model("AnalyticsDailyMetric", analyticsDailyMetricSchema);

let analyticsBatchBuffer = [];
let analyticsBatchTimer = null;

const flushAnalyticsBatch = async () => {
  const batch = analyticsBatchBuffer;
  analyticsBatchBuffer = [];
  analyticsBatchTimer = null;
  if (batch.length === 0) {
    return;
  }

  const deduped = new Map();
  batch.forEach((event) => {
    deduped.set(event.eventId, event);
  });

  const operations = Array.from(deduped.values()).map((event) => ({
    updateOne: {
      filter: { eventId: event.eventId },
      update: {
        $setOnInsert: {
          eventId: event.eventId,
          eventType: event.eventType,
          userId: event.userId,
          courseId: event.courseId,
          traceId: event.traceId,
          payload: event,
          occurredAt: new Date(event.occurredAt || Date.now()),
        },
      },
      upsert: true,
    },
  }));

  await AnalyticsEvent.bulkWrite(operations, { ordered: false });
};

export const trackAnalyticsEvent = async (event) => {
  await enqueueAnalyticsEvent({
    ...event,
    occurredAt: event.occurredAt || new Date().toISOString(),
  });
};

export const processAnalyticsEvent = async (event) => {
  analyticsBatchBuffer.push(event);
  const batchSize = Number(process.env.ANALYTICS_BATCH_SIZE || 50);
  const flushWindowMs = Number(process.env.ANALYTICS_BATCH_WINDOW_MS || 1000);

  if (analyticsBatchBuffer.length >= batchSize) {
    await flushAnalyticsBatch();
    return;
  }

  if (!analyticsBatchTimer) {
    analyticsBatchTimer = setTimeout(() => {
      flushAnalyticsBatch().catch((error) => {
        logger.error("analytics_batch_flush_failed", { error: error.message });
      });
    }, flushWindowMs);
  }
};

export const getAnalyticsEventSchema = () => ({
  eventId: "string",
  eventType: "string",
  userId: "string|null",
  courseId: "string|null",
  traceId: "string|null",
  payload: "object",
  occurredAt: "iso-date-time",
});

export const getDailyActiveUsers = async (date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [result] = await AnalyticsEvent.aggregate([
    {
      $match: {
        occurredAt: { $gte: start, $lt: end },
      },
    },
    { $group: { _id: "$userId" } },
    { $count: "count" },
  ]);

  return result?.count || 0;
};

export const getCourseCompletionRate = async (courseId) => {
  const pipeline = [
    {
      $match: {
        course: new mongoose.Types.ObjectId(courseId),
      },
    },
    {
      $group: {
        _id: null,
        enrolled: { $sum: 1 },
        completed: {
          $sum: {
            $cond: [{ $eq: ["$isCompleted", true] }, 1, 0],
          },
        },
      },
    },
  ];

  const [result] = await CourseProgress.aggregate(pipeline);
  if (!result || result.enrolled === 0) {
    return 0;
  }

  return Number(((result.completed / result.enrolled) * 100).toFixed(2));
};

export const getRevenueMetrics = async () => {
  const [result] = await CoursePurchase.aggregate([
    { $match: { status: "completed" } },
    {
      $group: {
        _id: "$currency",
        totalRevenue: { $sum: "$amount" },
        payments: { $sum: 1 },
      },
    },
  ]);

  return result || { _id: "INR", totalRevenue: 0, payments: 0 };
};

export const buildDailyAnalyticsSnapshot = async (date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const dayKey = start.toISOString().slice(0, 10);

  const [activeUsers, revenue, completionRates] = await Promise.all([
    getDailyActiveUsers(start),
    CoursePurchase.aggregate([
      {
        $match: {
          status: "completed",
          createdAt: { $gte: start, $lt: new Date(start.getTime() + 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: "$currency",
          totalRevenue: { $sum: "$amount" },
          payments: { $sum: 1 },
        },
      },
    ]),
    CourseProgress.aggregate([
      {
        $group: {
          _id: "$course",
          enrolled: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$isCompleted", true] }, 1, 0] } },
        },
      },
    ]),
  ]);

  await AnalyticsDailyMetric.updateOne(
    { date: dayKey },
    {
      $set: {
        date: dayKey,
        activeUsers,
        completionRateByCourse: completionRates.reduce((acc, item) => {
          acc[String(item._id)] =
            item.enrolled > 0 ? Number(((item.completed / item.enrolled) * 100).toFixed(2)) : 0;
          return acc;
        }, {}),
        revenueByCurrency: revenue.reduce((acc, item) => {
          acc[item._id] = item.totalRevenue;
          return acc;
        }, {}),
        paymentCountByCurrency: revenue.reduce((acc, item) => {
          acc[item._id] = item.payments;
          return acc;
        }, {}),
      },
    },
    { upsert: true }
  );
};
