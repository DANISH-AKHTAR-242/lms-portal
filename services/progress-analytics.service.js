import redisClient from "../config/redis.js";
import { CourseProgress } from "../models/courseProgress.js";

export const ensureCourseProgress = async ({ userId, courseId }) =>
  CourseProgress.findOneAndUpdate(
    { user: userId, course: courseId },
    { $setOnInsert: { user: userId, course: courseId } },
    { upsert: true, new: true }
  );

export const trackLectureProgress = async ({ userId, courseId, lectureId, watchTime = 0, isCompleted = false }) => {
  const progress = await ensureCourseProgress({ userId, courseId });

  const existingProgress = progress.lectureProgress.find(
    (item) => String(item.lecture) === String(lectureId)
  );

  if (existingProgress) {
    existingProgress.watchTime = Number(watchTime);
    existingProgress.isCompleted = Boolean(isCompleted);
    existingProgress.lastWatched = new Date();
  } else {
    progress.lectureProgress.push({
      lecture: lectureId,
      watchTime: Number(watchTime),
      isCompleted: Boolean(isCompleted),
      lastWatched: new Date(),
    });
  }

  await progress.updateLastAccessed();

  if (redisClient?.isOpen) {
    await redisClient.incr(`analytics:lecture_watch:${courseId}`);
  }

  return progress;
};

export const findCourseProgress = async ({ userId, courseId }) =>
  CourseProgress.findOne({ user: userId, course: courseId }).populate(
    "lectureProgress.lecture",
    "title duration order"
  );
