import fs from "fs/promises";
import path from "path";
import { Course } from "../../models/course.model.js";
import { Lecture } from "../../models/lecture.model.js";
import { User } from "../../models/user.model.js";
import { createLectureAsset } from "../../services/course-lecture.service.js";
import { buildMockCloudinaryUploader } from "../utils/mock-clients.js";
import { closeTestDb, createTestDb, shouldRunIntegrationTests } from "../utils/test-db.js";

const integrationDescribe = shouldRunIntegrationTests ? describe : describe.skip;

integrationDescribe("media integration", () => {
  let mongoServer;

  beforeAll(async () => {
    const db = await createTestDb("lms-media-test");
    mongoServer = db.mongoServer;
  });

  afterEach(async () => {
    await Promise.all([User.deleteMany({}), Course.deleteMany({}), Lecture.deleteMany({})]);
  });

  afterAll(async () => {
    await closeTestDb(mongoServer);
  });

  test("creates lecture asset using mocked uploader", async () => {
    const instructor = await User.create({
      name: "Instructor Media",
      email: "media.instructor@example.com",
      password: "password123",
      role: "instructor",
    });

    const course = await Course.create({
      title: "Video Course",
      category: "Media",
      price: 50,
      thumbnail: "thumb.png",
      instructor: instructor._id,
    });

    const tmpFile = path.resolve(process.cwd(), "tests", "integration", "tmp-video.mp4");
    await fs.writeFile(tmpFile, "mock-video-data");

    try {
      const uploader = buildMockCloudinaryUploader();
      const lecture = await createLectureAsset({
        course,
        payload: { title: "Lecture One", description: "Desc", duration: 10 },
        filePath: tmpFile,
        uploader,
      });

      expect(lecture.videoUrl).toBe("https://cdn.example.com/video.mp4");
      expect(lecture.publicId).toBe("lecture/mock-public-id");

      const persisted = await Lecture.findById(lecture._id);
      expect(persisted).toBeTruthy();
    } finally {
      await fs.unlink(tmpFile);
    }
  });
});
