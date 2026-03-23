import { body, param, query, validationResult } from "express-validator";
import { ApiError } from "./error.middleware.js";

export const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extractedError = errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
    }));

    return next(new ApiError(JSON.stringify(extractedError), 400));
  };
};

export const commonValidations = {
  pagination: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 to 100"),
  ],
  email: body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  name: body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Please provide a valid name"),
};

export const validateSignup = validate([
  commonValidations.name,
  commonValidations.email,
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
]);

export const validateCourseCreate = validate([
  body("title").trim().notEmpty().withMessage("Course title is required"),
  body("category").trim().notEmpty().withMessage("Course category is required"),
  body("price")
    .isFloat({ min: 0 })
    .withMessage("Course price must be a non-negative number"),
  body("thumbnail")
    .trim()
    .notEmpty()
    .withMessage("Course thumbnail is required"),
]);

export const validateObjectIdParam = (field) =>
  validate([
    param(field)
      .isMongoId()
      .withMessage(`${field} must be a valid Mongo ObjectId`),
  ]);

export const validateEnroll = validate([
  body("courseId").isMongoId().withMessage("courseId must be a valid ObjectId"),
]);
