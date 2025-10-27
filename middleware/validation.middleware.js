import { body, param, query, validationResult } from "express-validator";

export const validate = (validations) => {
  return async (req, res, next) => {
    //run all the validations
    await Promise.all(validations.map(validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty) {
      return next();
    }

    const extractedError = errors.array().map((error) => ({
      field: error,
      message: error.msg,
    }));

    throw new Error("Validation error");
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
]);
