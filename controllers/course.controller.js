import { ApiError, catchAsync } from "../middleware/error.middleware.js";
import { Course } from "../models/course.model.js";
import { CourseProgress } from "../models/courseProgress.js";
import { Lecture } from "../models/lecture.model.js";
import { User } from "../models/user.model.js";
import { deleteVideoFromCloudinary } from "../utils/cloudinary.js";
import {
  createLectureAsset,
  getCourseCatalog,
  registerCreatedCourse,
} from "../services/course-lecture.service.js";
import { trackLectureProgress } from "../services/progress-analytics.service.js";

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

  await registerCreatedCourse({ userId: req.id, courseId: course._id });

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
  await CourseProgress.deleteMany({ course: course._id });
  await User.updateMany(
    { "enrolledCourse.course": course._id },
    { $pull: { enrolledCourse: { course: course._id } } }
  );

  await Course.findByIdAndDelete(courseId);

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
  res.status(200).json({ success: true, data: courses });
});

export const viewEnrolledStudents = catchAsync(async (req, res) => {
  const { courseId } = req.params;

  const course = await Course.findById(courseId)
    .populate("enrolledStudent", "name email avatar role")
    .populate("instructor", "_id");

  if (!course) {
    throw new ApiError("Course not found", 404);
  }

  if (String(course.instructor._id) !== String(req.id)) {
    throw new ApiError("Unauthorized to view enrolled students", 403);
  }

  res.status(200).json({
    success: true,
    data: course.enrolledStudent,
    total: course.enrolledStudent.length,
  });
});

export const enrollInCourse = catchAsync(async (req, res) => {
  const { courseId } = req.body;

  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError("Course not found", 404);
  }

  await User.findByIdAndUpdate(req.id, {
    $addToSet: {
      enrolledCourse: {
        course: courseId,
        enrolledAt: new Date(),
      },
    },
  });

  await Course.findByIdAndUpdate(courseId, {
    $addToSet: {
      enrolledStudent: req.id,
    },
  });

  await CourseProgress.findOneAndUpdate(
    { user: req.id, course: courseId },
    { $setOnInsert: { user: req.id, course: courseId } },
    { upsert: true, new: true }
  );

  res.status(200).json({ success: true, message: "Enrolled in course successfully" });
});

export const viewEnrolledCourses = catchAsync(async (req, res) => {
  const user = await User.findById(req.id).populate({
    path: "enrolledCourse.course",
    select: "title subtitle thumbnail category level price instructor totalLectures",
  });

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  res.status(200).json({ success: true, data: user.enrolledCourse });
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
    "enrolledCourse.course": courseId,
  });

  if (!isEnrolled) {
    throw new ApiError("Enroll in the course to access lectures", 403);
  }

  const progress = await trackLectureProgress({
    userId: req.id,
    courseId,
    lectureId,
    watchTime,
    isCompleted,
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

  const progress = await CourseProgress.findOne({
    user: req.id,
    course: courseId,
  }).populate("lectureProgress.lecture", "title duration order");

  if (!progress) {
    throw new ApiError("No progress found for this course", 404);
  }

  res.status(200).json({ success: true, data: progress });
});
