import mongoose from "mongoose";

const lectureSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Course lecture is required"],
      trim: true,
      maxLenght: [100, "Course lecture cannot exceed the 100 characters"],
    },
    description: {
      type: String,
      trim: true,
    },
    videoUrl: {
      type: String,
      required: [true, "Video url is required"],
    },
    duration: {
      type: Number,
      default: 0,
    },
    publicId: {
      type: String,
      required: [true, "Public id is required"],
    },
    isPreview: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      required: [true, "Lecture order is required"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

lectureSchema.pre("save", function (next) {
  if (this.duration) {
    this.duration = Math.round(this.duration * 100) / 100;
  }
  next();
});

export const Lecture = mongoose.model("Lecture", lectureSchema);
