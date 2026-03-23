import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "*.password",
      "token",
      "*.token",
    ],
    remove: true,
  },
});

export { logger };
export default logger;
