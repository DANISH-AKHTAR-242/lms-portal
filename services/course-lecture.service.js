import redisClient from "../config/redis.js";
import { enqueueMediaProcessing } from "../config/queues.js";
import { uploadLectureAsset } from "../config/storage.js";
import { Course } from "../models/course.model.js";
import { Lecture } from "../models/lecture.model.js";
import { User } from "../models/user.model.js";

const CATALOG_CACHE_KEY = "course:catalog:v1";
const CATALOG_TTL_SECONDS = 5 * 60;

export const invalidateCourseCatalogCache = async () => {
  if (redisClient?.isOpen) {
    await redisClient.del(CATALOG_CACHE_KEY);
  }
};

export const getCourseCatalog = async () => {
  if (redisClient?.isOpen) {
    const cached = await redisClient.get(CATALOG_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  }

  const courses = await Course.find({ isPublished: true })
    .select("title subtitle thumbnail category level price instructor totalLectures")
    .populate("instructor", "name")
    .sort({ createdAt: -1 })
    .lean();

  if (redisClient?.isOpen) {
    await redisClient.set(CATALOG_CACHE_KEY, JSON.stringify(courses), {
      EX: CATALOG_TTL_SECONDS,
    });
  }

  return courses;
};

export const registerCreatedCourse = async ({ userId, courseId }) => {
  await User.findByIdAndUpdate(userId, { $addToSet: { createdCourses: courseId } });
  await invalidateCourseCatalogCache();
};

export const createLectureAsset = async ({ course, payload, filePath, uploader = uploadLectureAsset }) => {
  const uploadedAsset = await uploader(filePath);

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
