import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxLength: [50, "Name cannot exceed 50 character"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      unique: true,
      match: [
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
        "Please provide a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minLength: [8, "Password must be at last of 8 charactes"],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ["student", "instructor", "admin"],
        message: "Please selct a valid role",
      },
      default: "student",
    },
    avatar: { type: String, default: "default-avatar.png" },
    bio: {
      type: String,
      maxLength: [250, "Bio cannot exceed of 250 charaacters"],
    },
    enrolledCourse: [
      {
        course: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Course",
        },
        enrolledAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//hashing the password
userSchema.pre("save", async function (next) {
  if (!isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

//compare password
userSchema.method.comparePassword = async function (enterPassword) {
  return await bcrypt.compare(enterPassword, this.password);
};

userSchema.method.getResetPasswordToken = function () {
  const restToken = crypto.randomBytes(20).toString("hex");
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(restToken)
    .digest("hex");

  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  return restToken;
};

userSchema.method.updateLastActive = function () {
  this.lastActive = Date.now();
  return this.lastActive({ validateBeforeSave: false });
};

//virtual feild  for total enrolled courses
userSchema.virtual("totalEnrolledCourses").get(function () {
  return this.enrolledCourse.length;
});

export const User = mongoose.model("User", userSchema);
