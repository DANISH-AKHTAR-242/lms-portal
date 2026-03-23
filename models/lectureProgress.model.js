import mongoose from "mongoose";

const lectureProgressSchema = new mongoose.Schema(
  {
    progress: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseProgress",
      required: [true, "Course progress reference is required"],
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course reference is required"],
      index: true,
    },
    lecture: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lecture",
      required: [true, "Lecture reference is required"],
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    watchTime: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastWatched: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

lectureProgressSchema.index({ progress: 1, lecture: 1 }, { unique: true });
lectureProgressSchema.index({ user: 1, course: 1, lastWatched: -1 });
lectureProgressSchema.index({ course: 1, isCompleted: 1 });

export const LectureProgress = mongoose.model("LectureProgress", lectureProgressSchema);
