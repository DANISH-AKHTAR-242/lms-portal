import * as Sentry from "@sentry/node";

let sentryEnabled = false;

export const initSentry = () => {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    environment: process.env.NODE_ENV || "development",
  });
  sentryEnabled = true;
};

export const captureException = (error, context = {}) => {
  if (!sentryEnabled) {
    return;
  }
  Sentry.captureException(error, { extra: context });
};
