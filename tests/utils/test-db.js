import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

export const shouldRunIntegrationTests =
  process.env.RUN_INTEGRATION_TESTS === "true" ||
  Boolean(process.env.TEST_MONGODB_URI);

export const createTestDb = async (dbName) => {
  if (process.env.TEST_MONGODB_URI) {
    await mongoose.connect(process.env.TEST_MONGODB_URI, { dbName });
    return { mongoServer: null };
  }

  const mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { dbName });
  return { mongoServer };
};

export const closeTestDb = async (mongoServer) => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
};
