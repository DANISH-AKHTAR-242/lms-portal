import mongoose from "mongoose";
import { enqueueAnalyticsEvent } from "../config/queues.js";
import { CourseProgress } from "../models/courseProgress.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";

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

export const trackAnalyticsEvent = async (event) => {
  await enqueueAnalyticsEvent({
    ...event,
    occurredAt: event.occurredAt || new Date().toISOString(),
  });
};

export const processAnalyticsEvent = async (event) => {
  await AnalyticsEvent.updateOne(
    { eventId: event.eventId },
    {
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
    { upsert: true }
  );
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
