import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

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
    console.log("Error in uploading the media cloudinary");
    console.log(error);
  }
};

export const deleteMediaFromCloudinary = async (publicId) => {
  try {
    const deleteMedia = await cloudinary.uploader.destroy(publicId);
    return deleteMedia;
  } catch (error) {
    console.log("Error in deleting the file from cloudinary");

    console.log(error);
  }
};

export const deleteVideoFromCloudinary = async (publicId) => {
  try {
    const deleteVideo = await cloudinary.uploader.destroy(publicId, {
      resource_type: "video",
    });
    return deleteVideo;
  } catch (error) {
    console.log("Error in deleting the file from cloudinary");

    console.log(error);
  }
};
