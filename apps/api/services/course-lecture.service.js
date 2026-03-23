import {
  CACHE_TTLS,
  cacheKeys,
  getOrSetCacheWithSWR,
  invalidateCacheKeys,
} from "../config/cache.js";
import { eventBus, DOMAIN_EVENTS } from "../config/event-bus.js";
import { enqueueMediaProcessing } from "../config/queues.js";
import { uploadLectureAsset } from "../config/storage.js";
import { Course } from "../models/course.model.js";
import { Lecture } from "../models/lecture.model.js";
import { User } from "../models/user.model.js";
import { withRetry } from "../config/retry.js";
import { CircuitBreaker } from "../config/circuit-breaker.js";

const mediaCircuitBreaker = new CircuitBreaker({
  name: "media-upload",
  failureThreshold: 4,
  recoveryTimeoutMs: 15_000,
  fallback: ({ error }) => {
    throw error || new Error("Media service temporarily unavailable");
  },
});

export const invalidateCourseCatalogCache = async () => {
  await invalidateCacheKeys([cacheKeys.courseCatalog()]);
};

export const getCourseCatalog = async () => {
  return getOrSetCacheWithSWR({
    key: cacheKeys.courseCatalog(),
    ttlSeconds: CACHE_TTLS.COURSE_CATALOG,
    staleTtlSeconds: CACHE_TTLS.COURSE_CATALOG * 2,
    queryFn: async () =>
      Course.find({ isPublished: true })
        .select("title subtitle thumbnail category level price instructor totalLectures")
        .populate("instructor", "name")
        .sort({ createdAt: -1 })
        .lean(),
  });
};

export const warmCourseCatalogCache = async () =>
  getCourseCatalog().catch(() => []);

export const registerCreatedCourse = async ({ userId, courseId, traceId }) => {
  await User.findByIdAndUpdate(userId, { $addToSet: { createdCourses: courseId } });
  await invalidateCourseCatalogCache();
  await eventBus.emit(DOMAIN_EVENTS.COURSE_CREATED, {
    eventId: `course-created-${courseId}`,
    userId: String(userId),
    courseId: String(courseId),
    traceId,
  });
};

export const createLectureAsset = async ({ course, payload, filePath, uploader = uploadLectureAsset }) => {
  const uploadedAsset = await mediaCircuitBreaker.execute(() =>
    withRetry(
      () => uploader(filePath),
      {
        retries: 3,
        baseDelayMs: 300,
        operationName: "upload_lecture_asset",
      }
    )
  );

  const lecture = await Lecture.create({
    title: payload.title,
    description: payload.description,
    videoUrl: uploadedAsset.mediaUrl,
    duration: Number(payload.duration || 0),
    publicId: uploadedAsset.publicId,
    isPreview: String(payload.isPreview) === "true",
    order: course.lectures.length + 1,
  });

  course.lectures.push(lecture._id);
  await course.save();

  await enqueueMediaProcessing({
    lectureId: String(lecture._id),
    sourceProvider: uploadedAsset.provider,
    sourcePublicId: uploadedAsset.publicId,
    action: "transcode-and-optimize",
  });

  await invalidateCourseCatalogCache();

  return lecture;
};
