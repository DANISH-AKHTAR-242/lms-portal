import crypto from "crypto";
import { Course } from "../../models/course.model.js";
import { CoursePurchase } from "../../models/coursePurchase.model.js";
import { User } from "../../models/user.model.js";
import { createOrderForCourse, verifyCoursePayment } from "../../services/payment.service.js";
import { buildMockRazorpayClient } from "../utils/mock-clients.js";
import { closeTestDb, createTestDb, shouldRunIntegrationTests } from "../utils/test-db.js";

const integrationDescribe = shouldRunIntegrationTests ? describe : describe.skip;

integrationDescribe("payment integration", () => {
  let mongoServer;

  beforeAll(async () => {
    process.env.RAZORPAY_KEY_SECRET = "test_secret";
    const db = await createTestDb("lms-test");
    mongoServer = db.mongoServer;
  });

  afterEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Course.deleteMany({}),
      CoursePurchase.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await closeTestDb(mongoServer);
  });

  test("creates course order with mocked Razorpay client", async () => {
    const user = await User.create({
      name: "Student One",
      email: "student1@example.com",
      password: "password123",
    });

    const instructor = await User.create({
      name: "Instructor One",
      email: "instructor1@example.com",
      password: "password123",
      role: "instructor",
    });

    const course = await Course.create({
      title: "Node Fundamentals",
      category: "Programming",
      price: 100,
      thumbnail: "thumb.png",
      instructor: instructor._id,
    });

    const razorpayClient = buildMockRazorpayClient("order_mock_1");

    const result = await createOrderForCourse({
      userId: user._id,
      courseId: course._id,
      razorpayClient,
    });

    expect(result.order.id).toBe("order_mock_1");
    expect(razorpayClient.orders.create).toHaveBeenCalledTimes(1);

    const purchase = await CoursePurchase.findOne({ paymentId: "order_mock_1" });
    expect(purchase).toBeTruthy();
    expect(purchase.status).toBe("pending");
  });

  test("verifies payment and marks purchase completed", async () => {
    const user = await User.create({
      name: "Student Two",
      email: "student2@example.com",
      password: "password123",
    });

    const instructor = await User.create({
      name: "Instructor Two",
      email: "instructor2@example.com",
      password: "password123",
      role: "instructor",
    });

    const course = await Course.create({
      title: "Express Mastery",
      category: "Programming",
      price: 200,
      thumbnail: "thumb.png",
      instructor: instructor._id,
    });

    await CoursePurchase.create({
      course: course._id,
      user: user._id,
      amount: 200,
      currency: "INR",
      status: "pending",
      paymentMethod: "razorpay",
      paymentId: "order_verify_1",
    });

    const paymentId = "pay_verify_1";
    const signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`order_verify_1|${paymentId}`)
      .digest("hex");

    const purchase = await verifyCoursePayment({
      razorpay_order_id: "order_verify_1",
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    });

    expect(String(purchase.course)).toBe(String(course._id));
    expect(purchase.status).toBe("completed");
  });
});
