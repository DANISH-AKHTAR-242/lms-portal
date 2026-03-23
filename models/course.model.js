import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
      maxLenght: [100, "Course title cannot exceed the 100 characters"],
    },
    subtitle: {
      type: String,
      trim: true,
      maxLenght: [200, "Course subtitle cannot exceed the 200 characters"],
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Course category is required"],
      trim: true,
    },
    level: {
      type: String,
      enum: {
        values: ["beginner", "intermediate", "advanced"],
        message: "Please select a valid course level",
      },
      default: "beginner",
    },
    price: {
      type: Number,
      required: [true, "Course price is required"],
      min: [0, "Course price must not be negative value"],
    },
    thumbnail: {
      type: String,
      required: [true, "Thumbnail is required"],
    },
    enrolledStudent: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    lectures: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lecture",
      },
    ],
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Course instructor is required"],
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    totalDuration: {
      type: Number,
      default: 0,
    },
    totalLectures: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

courseSchema.virtual("averageRating").get(function () {
  return 0; //placeholder assignment (TODO)
});

courseSchema.pre("save", function (next) {
  if (this.lectures) {
    this.totalLectures = this.lectures.length;
  }
  next();
});

courseSchema.index({ instructor: 1, createdAt: -1 });
courseSchema.index({ isPublished: 1, createdAt: -1 });
courseSchema.index({ category: 1, level: 1 });
courseSchema.index({ enrolledStudent: 1 });

export const Course = mongoose.model("Course", courseSchema);
