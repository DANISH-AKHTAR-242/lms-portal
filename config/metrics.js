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
};

export const getMetricsSnapshot = () => ({
  ...metricsState,
  avgHttpRequestDurationMs:
    metricsState.httpRequestsTotal > 0
      ? Number((metricsState.httpRequestDurationMsTotal / metricsState.httpRequestsTotal).toFixed(2))
      : 0,
});
