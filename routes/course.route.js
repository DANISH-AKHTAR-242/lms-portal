import express from "express";
import uploads from "../utils/multer.js";
import {
  createCourse,
  deleteCourse,
  enrollInCourse,
  getCourseProgress,
  updateCourse,
  uploadLecture,
  viewEnrolledCourses,
  viewEnrolledStudents,
  watchLecture,
} from "../controllers/course.controller.js";
import { authorizeRoles, isAuthenticated } from "../middleware/auth.middleware.js";
import {
  validateCourseCreate,
  validateEnroll,
  validateObjectIdParam,
} from "../middleware/validation.middleware.js";

const router = express.Router();

router.post("/", isAuthenticated, authorizeRoles("instructor", "admin"), validateCourseCreate, createCourse);
router.patch(
  "/:courseId",
  isAuthenticated,
  authorizeRoles("instructor", "admin"),
  validateObjectIdParam("courseId"),
  updateCourse
);
router.delete(
  "/:courseId",
  isAuthenticated,
  authorizeRoles("instructor", "admin"),
  validateObjectIdParam("courseId"),
  deleteCourse
);
router.post(
  "/:courseId/lectures",
  isAuthenticated,
  authorizeRoles("instructor", "admin"),
  validateObjectIdParam("courseId"),
  uploads.single("video"),
  uploadLecture
);
router.get(
  "/:courseId/students",
  isAuthenticated,
  authorizeRoles("instructor", "admin"),
  validateObjectIdParam("courseId"),
  viewEnrolledStudents
);

router.post("/enroll", isAuthenticated, authorizeRoles("student", "admin"), validateEnroll, enrollInCourse);
router.get("/enrolled", isAuthenticated, authorizeRoles("student", "admin"), viewEnrolledCourses);
router.post(
  "/:courseId/lectures/:lectureId/watch",
  isAuthenticated,
  authorizeRoles("student", "admin"),
  validateObjectIdParam("courseId"),
  validateObjectIdParam("lectureId"),
  watchLecture
);
router.get(
  "/:courseId/progress",
  isAuthenticated,
  authorizeRoles("student", "admin"),
  validateObjectIdParam("courseId"),
  getCourseProgress
);

export default router;
