import logger from "./logger.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const withRetry = async (
  operation,
  {
    retries = 3,
    baseDelayMs = 200,
    maxDelayMs = 5_000,
    factor = 2,
    jitter = true,
    operationName = "operation",
    shouldRetry = () => true,
  } = {}
) => {
  let lastError;

  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      const canRetry = attempt <= retries && shouldRetry(error);

      if (!canRetry) {
        throw error;
      }

      const exponentialDelay = Math.min(
        baseDelayMs * factor ** (attempt - 1),
        maxDelayMs
      );
      const randomizedDelay = jitter
        ? Math.round(exponentialDelay * (0.8 + Math.random() * 0.4))
        : exponentialDelay;

      logger.warn("retry_attempt_scheduled", {
        operationName,
        attempt,
        retries,
        delayMs: randomizedDelay,
        error: error.message,
      });

      await sleep(randomizedDelay);
    }
  }

  throw lastError;
};
