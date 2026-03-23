import { httpRequestCounter, httpRequestDuration, metricsRegister } from "./metrics-prometheus.js";

const metricsState = {
  httpRequestsTotal: 0,
  httpRequestDurationMsTotal: 0,
  byRoute: {},
};

export const recordHttpMetric = (method, route, statusCode, durationMs) => {
  metricsState.httpRequestsTotal += 1;
  metricsState.httpRequestDurationMsTotal += durationMs;

  const key = `${method}:${route}:${statusCode}`;
  metricsState.byRoute[key] = (metricsState.byRoute[key] || 0) + 1;
  const labels = {
    method,
    route,
    status_code: String(statusCode),
  };
  httpRequestCounter.inc(labels);
  httpRequestDuration.observe(labels, durationMs);
};

export const getMetricsSnapshot = () => ({
  ...metricsState,
  avgHttpRequestDurationMs:
    metricsState.httpRequestsTotal > 0
      ? Number((metricsState.httpRequestDurationMsTotal / metricsState.httpRequestsTotal).toFixed(2))
      : 0,
});

export const getPrometheusMetrics = async () => metricsRegister.metrics();
