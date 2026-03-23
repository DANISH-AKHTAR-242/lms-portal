import { eventBus, DOMAIN_EVENTS } from "../config/event-bus.js";
import { CourseProgress } from "../models/courseProgress.js";
import { LectureProgress } from "../models/lectureProgress.model.js";
import { enqueueAnalyticsEvent } from "../config/queues.js";
import mongoose from "mongoose";

export const ensureCourseProgress = async ({ userId, courseId }) =>
  CourseProgress.findOneAndUpdate(
    { user: userId, course: courseId },
    { $setOnInsert: { user: userId, course: courseId } },
    { upsert: true, new: true }
  );

export const trackLectureProgress = async ({
  userId,
  courseId,
  lectureId,
  watchTime = 0,
  isCompleted = false,
  traceId,
}) => {
  const progress = await ensureCourseProgress({ userId, courseId });
  await LectureProgress.findOneAndUpdate(
    {
      progress: progress._id,
      user: userId,
      course: courseId,
      lecture: lectureId,
    },
    {
      $set: {
        watchTime: Number(watchTime),
        isCompleted: Boolean(isCompleted),
        lastWatched: new Date(),
      },
      $setOnInsert: {
        progress: progress._id,
        user: userId,
        course: courseId,
        lecture: lectureId,
      },
    },
    { upsert: true, new: true }
  );

  const [progressStats] = await LectureProgress.aggregate([
    { $match: { progress: progress._id } },
    {
      $group: {
        _id: "$progress",
        totalLectures: { $sum: 1 },
        completedLectures: {
          $sum: { $cond: [{ $eq: ["$isCompleted", true] }, 1, 0] },
        },
      },
    },
  ]);

  const totalLectures = progressStats?.totalLectures || 0;
  const completedLectures = progressStats?.completedLectures || 0;
  const completionPercentage =
    totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0;

  await CourseProgress.updateOne(
    { _id: progress._id },
    {
      $set: {
        completionPercentage,
        isCompleted: completionPercentage === 100 && totalLectures > 0,
        lastAccessed: new Date(),
      },
    }
  );

  const analyticsPayload = {
    eventId: `lecture-watched-${userId}-${courseId}-${lectureId}`,
    eventType: DOMAIN_EVENTS.LECTURE_WATCHED,
    userId: String(userId),
    courseId: String(courseId),
    lectureId: String(lectureId),
    watchTime: Number(watchTime),
    isCompleted: Boolean(isCompleted),
    traceId,
    occurredAt: new Date().toISOString(),
  };
  await enqueueAnalyticsEvent(analyticsPayload);
  await eventBus.emit(DOMAIN_EVENTS.LECTURE_WATCHED, analyticsPayload);

  return findCourseProgress({ userId, courseId });
};

export const findCourseProgress = async ({
  userId,
  courseId,
  page = 1,
  limit = 50,
}) => {
  const normalizedPage = Math.max(1, Number(page) || 1);
  const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const skip = (normalizedPage - 1) * normalizedLimit;

  const userObjectId = new mongoose.Types.ObjectId(String(userId));
  const courseObjectId = new mongoose.Types.ObjectId(String(courseId));

  const [progress] = await CourseProgress.aggregate([
    {
      $match: {
        user: userObjectId,
        course: courseObjectId,
      },
    },
    {
      $lookup: {
        from: "lectureprogresses",
        let: { progressId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$progress", "$$progressId"] } } },
          { $sort: { lastWatched: -1 } },
          { $skip: skip },
          { $limit: normalizedLimit },
          {
            $lookup: {
              from: "lectures",
              localField: "lecture",
              foreignField: "_id",
              pipeline: [{ $project: { title: 1, duration: 1, order: 1 } }],
              as: "lecture",
            },
          },
          { $unwind: { path: "$lecture", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 1,
              watchTime: 1,
              isCompleted: 1,
              lastWatched: 1,
              lecture: 1,
            },
          },
        ],
        as: "lectureProgress",
      },
    },
    {
      $lookup: {
        from: "lectureprogresses",
        let: { progressId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$progress", "$$progressId"] } } },
          { $count: "total" },
        ],
        as: "lectureProgressMeta",
      },
    },
    {
      $project: {
        user: 1,
        course: 1,
        isCompleted: 1,
        completionPercentage: 1,
        lastAccessed: 1,
        createdAt: 1,
        updatedAt: 1,
        lectureProgress: 1,
        totalLectureProgress: {
          $ifNull: [{ $arrayElemAt: ["$lectureProgressMeta.total", 0] }, 0],
        },
      },
    },
  ]);

  return progress || null;
};
