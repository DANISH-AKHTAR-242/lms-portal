import { eventBus, DOMAIN_EVENTS } from "../config/event-bus.js";
import { CourseProgress } from "../models/courseProgress.js";
import { enqueueAnalyticsEvent } from "../config/queues.js";

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

  return progress;
};

export const findCourseProgress = async ({ userId, courseId }) =>
  CourseProgress.findOne({ user: userId, course: courseId }).populate(
    "lectureProgress.lecture",
    "title duration order"
  );
