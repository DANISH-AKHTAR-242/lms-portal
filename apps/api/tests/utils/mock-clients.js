export const buildMockRazorpayClient = (orderId = "order_test_123") => ({
  orders: {
    create: jest.fn().mockResolvedValue({
      id: orderId,
      amount: 10000,
      currency: "INR",
    }),
  },
});

export const buildMockCloudinaryUploader = (mediaUrl = "https://cdn.example.com/video.mp4") =>
  jest.fn().mockResolvedValue({
    provider: "mock-cdn",
    mediaUrl,
    publicId: "lecture/mock-public-id",
  });
