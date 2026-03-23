import mongoose from "mongoose";

const MAX_RETRIES = 3;
const RETRY_INTERVAL = 5000; //5sec
const DEFAULT_POOL_SIZE = 75;

class DatabaseConnection {
  constructor() {
    this.retryCount = 0;
    this.isConnecteed = false;

    mongoose.set("strictQuery", true);

    mongoose.connection.on("connected", () => {
      console.log("MongoDB Connected Successfully");
      this.isConnecteed = true;
    });

    mongoose.connection.on("error", () => {
      console.log("MongoDB Connection Error ");
      this.isConnecteed = false;
    });

    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB Disconnected");
      this.isConnecteed = false;
      this.handleDisconnection();
    });

    process.on("SIGTERM", this.handleAppTermination.bind(this));
  }

  async connect() {
    try {
      if (!process.env.MONGODB_URI) {
        throw new Error("MongoDB URI is not defined in env variables");
      }

      const connectionOptions = {
        maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || DEFAULT_POOL_SIZE),
        minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 10),
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 4500,
        family: 4,
        readPreference: process.env.MONGO_READ_PREFERENCE || "secondaryPreferred",
        readConcern: { level: process.env.MONGO_READ_CONCERN || "majority" },
      };

      if (process.env.NODE_ENV === "development") {
        mongoose.set("debug", true);
      }

      await mongoose.connect(process.env.MONGODB_URI, connectionOptions);
      this.retryCount = 0;
    } catch (error) {
      console.error(error.message);
      await this.handleConnectionError();
    }
  }

  async handleConnectionError() {
    if (this.retryCount < MAX_RETRIES) {
      this.retryCount++;
      console.log(
        `Retrying connection... Atempt ${this.retryCount} of ${MAX_RETRIES}`
      );

      await new Promise((resolve) => {
        setTimeout(resolve, RETRY_INTERVAL);
      });

      return this.connect();
    }

    console.error(`Failed to connect to MongoDB after ${MAX_RETRIES} attempts`);
    process.exit(1);
  }

  async handleDisconnection() {
    if (!this.isConnecteed) {
      console.log("Attempting to reconnected to MongoDB");
      this.connect();
    }
  }

  async handleAppTermination() {
    try {
      await mongoose.connection.close();
      console.log("MongoDB connection closed through app termination");
      process.exit(0);
    } catch (error) {
      console.error("Error during database disconnection", error);
      process.exit(1);
    }
  }

  getConnectionStatus() {
    return {
      isConnecteed: this.isConnecteed,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    };
  }
}

const dbConnection = new DatabaseConnection();

export default dbConnection.connect.bind(dbConnection);
export const getDBStatus = dbConnection.getConnectionStatus.bind(dbConnection);
