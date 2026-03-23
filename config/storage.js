import { readFile } from "fs/promises";
import path from "path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { uploadMedia } from "../utils/cloudinary.js";

const hasObjectStorageConfig = () =>
  Boolean(
    process.env.OBJECT_STORAGE_BUCKET &&
      process.env.AWS_REGION &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY
  );

const createS3Client = () =>
  new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

export const uploadLectureAsset = async (filePath) => {
  if (!hasObjectStorageConfig()) {
    const uploaded = await uploadMedia(filePath);
    return {
      provider: "cloudinary",
      mediaUrl: uploaded?.secure_url,
      publicId: uploaded?.public_id,
    };
  }

  const buffer = await readFile(filePath);
  const extension = path.extname(filePath) || ".bin";
  const key = `lectures/${randomUUID()}${extension}`;

  const s3Client = createS3Client();
  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.OBJECT_STORAGE_BUCKET,
      Key: key,
      Body: buffer,
    })
  );

  const mediaUrl = process.env.CDN_BASE_URL
    ? `${process.env.CDN_BASE_URL.replace(/\/$/, "")}/${key}`
    : `https://${process.env.OBJECT_STORAGE_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  return {
    provider: "s3",
    mediaUrl,
    publicId: key,
  };
};
