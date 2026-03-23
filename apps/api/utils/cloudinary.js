import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import { internalError } from "../middleware/error.middleware.js";

dotenv.config({});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadMedia = async (file) => {
  try {
    const uploadMedia = await cloudinary.uploader.upload(file, {
      resource_type: "auto",
    });

    return uploadMedia;
  } catch (error) {
    throw internalError("Failed to upload media");
  }
};

export const deleteMediaFromCloudinary = async (publicId) => {
  try {
    const deleteMedia = await cloudinary.uploader.destroy(publicId);
    return deleteMedia;
  } catch (error) {
    throw internalError("Failed to delete media");
  }
};

export const deleteVideoFromCloudinary = async (publicId) => {
  try {
    const deleteVideo = await cloudinary.uploader.destroy(publicId, {
      resource_type: "video",
    });
    return deleteVideo;
  } catch (error) {
    throw internalError("Failed to delete video");
  }
};
