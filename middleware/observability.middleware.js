import { randomUUID } from "crypto";
import logger from "../config/logger.js";
import { recordHttpMetric } from "../config/metrics.js";

export const tracingMiddleware = (req, res, next) => {
  const traceId = req.headers["x-trace-id"] || randomUUID();
  req.traceId = traceId;
  res.setHeader("X-Trace-Id", traceId);
  next();
};

export const requestLoggingMiddleware = (req, res, next) => {
  const startTime = process.hrtime.bigint();

  res.on("finish", () => {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;

    const meta = {
      traceId: req.traceId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
    };

    recordHttpMetric(req.method, req.route?.path || req.path || req.originalUrl, res.statusCode, durationMs);
    logger.info("http_request", meta);
  });

  next();
};
