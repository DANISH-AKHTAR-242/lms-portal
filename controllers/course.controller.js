import { ApiError, catchAsync } from "../middleware/error.middleware.js";
import mongoose from "mongoose";
import { Course } from "../models/course.model.js";
import { CourseProgress } from "../models/courseProgress.js";
import { CourseEnrollment } from "../models/courseEnrollment.model.js";
import { LectureProgress } from "../models/lectureProgress.model.js";
import { Lecture } from "../models/lecture.model.js";
import { User } from "../models/user.model.js";
import { deleteVideoFromCloudinary } from "../utils/cloudinary.js";
import {
  createLectureAsset,
  getCourseCatalog,
  invalidateCourseCatalogCache,
  registerCreatedCourse,
} from "../services/course-lecture.service.js";
import {
  findCourseProgress,
  trackLectureProgress,
} from "../services/progress-analytics.service.js";
import { DOMAIN_EVENTS, eventBus } from "../config/event-bus.js";
import { trackAnalyticsEvent } from "../services/analytics.service.js";

export const createCourse = catchAsync(async (req, res) => {
  const { title, subtitle, description, category, level, price, thumbnail } =
    req.body;

  const course = await Course.create({
    title,
    subtitle,
    description,
    category,
    level,
    price,
    thumbnail,
    instructor: req.id,
  });

  await registerCreatedCourse({
    userId: req.id,
    courseId: course._id,
    traceId: req.traceId,
  });

  res.status(201).json({ success: true, data: course });
});

export const updateCourse = catchAsync(async (req, res) => {
  const { courseId } = req.params;
  const course = await Course.findById(courseId);

  if (!course) {
    throw new ApiError("Course not found", 404);
  }

  if (String(course.instructor) !== String(req.id)) {
    throw new ApiError("Unauthorized to update this course", 403);
  }

  Object.assign(course, req.body);
  await course.save();
  await invalidateCourseCatalogCache();

  res.status(200).json({ success: true, data: course });
});

export const deleteCourse = catchAsync(async (req, res) => {
  const { courseId } = req.params;
  const course = await Course.findById(courseId);

  if (!course) {
    throw new ApiError("Course not found", 404);
  }

  if (String(course.instructor) !== String(req.id)) {
    throw new ApiError("Unauthorized to delete this course", 403);
  }

  const lectures = await Lecture.find({ _id: { $in: course.lectures } });
  await Promise.all(
    lectures.map(async (lecture) => {
      if (lecture.publicId) {
        await deleteVideoFromCloudinary(lecture.publicId);
      }
    })
  );

  await Lecture.deleteMany({ _id: { $in: course.lectures } });
  const progressDocs = await CourseProgress.find({ course: course._id })
    .select("_id")
    .lean();
  await CourseProgress.deleteMany({ course: course._id });
  if (progressDocs.length > 0) {
    await LectureProgress.deleteMany({
      progress: { $in: progressDocs.map((item) => item._id) },
    });
  }
  await CourseEnrollment.deleteMany({ course: course._id });

  await Course.findByIdAndDelete(courseId);
  await invalidateCourseCatalogCache();

  res.status(200).json({ success: true, message: "Course deleted successfully" });
});

export const uploadLecture = catchAsync(async (req, res) => {
  const { courseId } = req.params;
  const { title, description, duration, isPreview } = req.body;

  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError("Course not found", 404);
  }

  if (String(course.instructor) !== String(req.id)) {
    throw new ApiError("Unauthorized to add lecture", 403);
  }

  if (!req.file) {
    throw new ApiError("Lecture video file is required", 400);
  }

  const lecture = await createLectureAsset({
    course,
    payload: { title, description, duration, isPreview },
    filePath: req.file.path,
  });

  res.status(201).json({ success: true, data: lecture });
});

export const listCourseCatalog = catchAsync(async (req, res) => {
  const courses = await getCourseCatalog();
  await trackAnalyticsEvent({
    eventId: `course-catalog-viewed-${req.traceId}`,
    eventType: DOMAIN_EVENTS.COURSE_VIEWED,
    userId: req.id ? String(req.id) : undefined,
    traceId: req.traceId,
  });
  res.status(200).json({ success: true, data: courses });
});

export const viewEnrolledStudents = catchAsync(async (req, res) => {
  const { courseId } = req.params;
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const skip = (page - 1) * limit;

  const course = await Course.findById(courseId).select("instructor");

  if (!course) {
    throw new ApiError("Course not found", 404);
  }

  if (String(course.instructor) !== String(req.id)) {
    throw new ApiError("Unauthorized to view enrolled students", 403);
  }

  const [students, totalResult] = await Promise.all([
    CourseEnrollment.aggregate([
      { $match: { course: course._id } },
      { $sort: { enrolledAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1, email: 1, avatar: 1, role: 1 } }],
          as: "student",
        },
      },
      { $unwind: "$student" },
      { $replaceRoot: { newRoot: "$student" } },
    ]),
    CourseEnrollment.aggregate([
      { $match: { course: course._id } },
      { $count: "total" },
    ]),
  ]);

  res.status(200).json({
    success: true,
    data: students,
    total: totalResult?.[0]?.total || 0,
    pagination: { page, limit, returned: students.length },
  });
});

export const enrollInCourse = catchAsync(async (req, res) => {
  const { courseId } = req.body;

  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError("Course not found", 404);
  }

  await CourseEnrollment.updateOne(
    { user: req.id, course: courseId },
    {
      $setOnInsert: {
        user: req.id,
        course: courseId,
        enrolledAt: new Date(),
      },
    },
    { upsert: true }
  );

  await CourseProgress.findOneAndUpdate(
    { user: req.id, course: courseId },
    { $setOnInsert: { user: req.id, course: courseId } },
    { upsert: true, new: true }
  );
  await eventBus.emit(DOMAIN_EVENTS.USER_ENROLLED, {
    eventId: `user-enrolled-${req.id}-${courseId}`,
    userId: String(req.id),
    courseId: String(courseId),
    traceId: req.traceId,
  });

  res.status(200).json({ success: true, message: "Enrolled in course successfully" });
});

export const viewEnrolledCourses = catchAsync(async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const skip = (page - 1) * limit;
  const userExists = await User.exists({ _id: req.id });
  if (!userExists) {
    throw new ApiError("User not found", 404);
  }

  const [courses, totalResult] = await Promise.all([
    CourseEnrollment.aggregate([
      { $match: { user: userObjectId } },
      { $sort: { enrolledAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "courses",
          localField: "course",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                title: 1,
                subtitle: 1,
                thumbnail: 1,
                category: 1,
                level: 1,
                price: 1,
                instructor: 1,
                totalLectures: 1,
              },
            },
          ],
          as: "course",
        },
      },
      { $unwind: { path: "$course", preserveNullAndEmptyArrays: false } },
      { $project: { course: 1, enrolledAt: 1 } },
    ]),
    CourseEnrollment.aggregate([
      { $match: { user: userObjectId } },
      { $count: "total" },
    ]),
  ]);

  res.status(200).json({
    success: true,
    data: courses,
    total: totalResult?.[0]?.total || 0,
    pagination: { page, limit, returned: courses.length },
  });
});

export const watchLecture = catchAsync(async (req, res) => {
  const { courseId, lectureId } = req.params;
  const { watchTime = 0, isCompleted = false } = req.body;

  const lecture = await Lecture.findById(lectureId);
  if (!lecture) {
    throw new ApiError("Lecture not found", 404);
  }

  const isEnrolled = await User.exists({
    _id: req.id,
  });
  const hasEnrollment = await CourseEnrollment.exists({ user: req.id, course: courseId });

  if (!isEnrolled || !hasEnrollment) {
    throw new ApiError("Enroll in the course to access lectures", 403);
  }

  const progress = await trackLectureProgress({
    userId: req.id,
    courseId,
    lectureId,
    watchTime,
    isCompleted,
    traceId: req.traceId,
  });

  res.status(200).json({
    success: true,
    lecture: {
      _id: lecture._id,
      title: lecture.title,
      description: lecture.description,
      videoUrl: lecture.videoUrl,
      duration: lecture.duration,
    },
    progress,
  });
});

export const getCourseProgress = catchAsync(async (req, res) => {
  const { courseId } = req.params;
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));

  const progress = await findCourseProgress({
    userId: req.id,
    courseId,
    page,
    limit,
  });

  if (!progress) {
    throw new ApiError("No progress found for this course", 404);
  }

  res.status(200).json({
    success: true,
    data: progress,
    pagination: {
      page,
      limit,
      returned: progress.lectureProgress?.length || 0,
      total: progress.totalLectureProgress || 0,
    },
  });
});
  const userObjectId = new mongoose.Types.ObjectId(String(req.id));
