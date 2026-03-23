import express from "express";
import morgan from "morgan";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import helmet from "helmet";
import mongooseSanitizer from "express-mongo-sanitize";
import hpp from "hpp";
import cookieParser from "cookie-parser";
import cors from "cors";
import { connectRedis, getRateLimitRedisClient, getRedisUrl } from "./config/redis.js";
import { getMetricsSnapshot, getPrometheusMetrics } from "./config/metrics.js";
import { monitorQueueDepth } from "./config/queues.js";
import {
  requestLoggingMiddleware,
  tracingMiddleware,
} from "./middleware/observability.middleware.js";
import connectDB from "./database/db.js";
import healthRoute from "./routes/health.route.js";
import userRoute from "./routes/user.route.js";
import courseRoute from "./routes/course.route.js";
import paymentRoute from "./routes/payment.route.js";
import securityRoute from "./routes/security.route.js";
import { csrfProtection } from "./middleware/csrf.middleware.js";
import { initSentry, captureException } from "./config/sentry.js";
import { startEventWorker } from "./config/event-bus.js";
import startAnalyticsWorker from "./workers/analytics.worker.js";
import { warmCourseCatalogCache } from "./services/course-lecture.service.js";
import { domainEventHandlers } from "./config/event-handlers.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
initSentry();

const csrfExemptPaths = new Set([
  "/health",
  "/api/v1/security/csrf-token",
  "/api/v1/user/signup",
  "/api/v1/user/signin",
  "/api/v1/user/signout",
]);

//global rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  message: "Too many request from this IP, Please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  ...(getRedisUrl("rateLimit")
    ? {
        store: new RedisStore({
          sendCommand: async (...args) => {
            const rateLimitRedisClient = getRateLimitRedisClient();
            return rateLimitRedisClient.sendCommand(args);
          },
        }),
      }
    : {}),
});
const perUserLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.id || req.ip),
});

const gracefulDegradationMiddleware = async (req, res, next) => {
  try {
    const { overloaded } = await monitorQueueDepth();
    if (overloaded && req.path.startsWith("/api/v1/courses/catalog")) {
      return res.status(503).json({
        status: "degraded",
        message:
          "Service temporarily under heavy load. Non-critical requests are throttled.",
      });
    }
  } catch (_) {
    // continue with best-effort load check
  }
  return next();
};

//security middleware
app.use(helmet());
app.use(hpp());
app.use(mongooseSanitizer());
app.use("/api", limiter);

//logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
app.use(tracingMiddleware);
app.use(requestLoggingMiddleware);

//cors configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-CSRF-Token",
      "X-Requested-With",
      "device-remember-token",
      "Access-Control-Allow-Origin",
      "Origin",
      "Accept",
    ],
  })
);

//body parser middleware
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

app.use((req, res, next) => {
  const normalizedPath = (req.path || "/").replace(/\/+$/, "") || "/";
  if (csrfExemptPaths.has(normalizedPath)) {
    return next();
  }

  return csrfProtection(req, res, next);
});

//api routes
app.use("/health", healthRoute);
app.get("/metrics", (req, res) => {
  res.status(200).json({
    success: true,
    data: getMetricsSnapshot(),
  });
});
app.get("/metrics/prometheus", async (req, res, next) => {
  try {
    res.set("Content-Type", "text/plain; version=0.0.4");
    res.status(200).send(await getPrometheusMetrics());
  } catch (error) {
    next(error);
  }
});
app.use("/api/v1/security", securityRoute);
app.use("/api/v1/user/refresh", perUserLimiter);
app.use("/api/v1/courses/catalog", gracefulDegradationMiddleware);
app.use("/api/v1/user", userRoute);
app.use("/api/v1/courses", courseRoute);
app.use("/api/v1/payment", paymentRoute);

//404 handler
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found !",
  });
});

//global error handler
app.use((err, req, res, next) => {
  if (err.code === "EBADCSRFTOKEN") {
    return res.status(403).json({
      status: "fail",
      message: "Invalid CSRF token",
    });
  }

  captureException(err, { traceId: req.traceId, path: req.originalUrl });

  return res.status(err.statusCode || 500).json({
    status: err.status || "error",
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

const startServer = async () => {
  await connectDB();
  await connectRedis();
  startEventWorker({ handlers: domainEventHandlers });
  startAnalyticsWorker();
  await warmCourseCatalogCache();
  app.listen(port, () => {
    console.log(`Server is running at ${port} in ${process.env.NODE_ENV}`);
  });
};

if (!process.env.JEST_WORKER_ID && process.env.NODE_ENV !== "test") {
  startServer();
}

export { app, startServer };
