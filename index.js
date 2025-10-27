import express from "express";
import morgan from "morgan";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongooseSanitizer from "express-mongo-sanitize";
import hpp from "hpp";
import cookieParser from "cookie-parser";
import cors from "cors";
import healthRoute from "./routes/health.route.js";
import userRoute from "./routes/user.route.js";

dotenv.config();

const app = express();
const port = process.env.PORT;

//global rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  message: "Too many request from this IP, Please try again later",
});

//security middleware
app.use(helmet());
app.use(hpp());
app.use(mongooseSanitizer());
app.use("/api", limiter);

//logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

//body parser middleware
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

//global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

//cors configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "device-remember-token",
      "Access-Control-Allow-Origin",
      "Origin",
      "Accept",
    ],
  })
);

//api routes
app.use("/health", healthRoute);
app.use("/api/v1/user", userRoute);

//404 handler
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found !",
  });
});

app.listen(port, () => {
  console.log(`Server is running at ${port} in ${process.env.NODE_ENV}`);
});
