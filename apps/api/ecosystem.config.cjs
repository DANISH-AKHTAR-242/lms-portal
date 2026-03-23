module.exports = {
  apps: [
    {
      name: "lms-api",
      script: "index.js",
      instances: "max",
      exec_mode: "cluster",
      max_memory_restart: "750M",
      kill_timeout: 5000,
      wait_ready: false,
      listen_timeout: 10000,
      env: {
        NODE_ENV: "production",
        UV_THREADPOOL_SIZE: 64,
      },
    },
    {
      name: "lms-domain-worker",
      script: "workers/domain-events.worker.js",
      instances: 2,
      exec_mode: "fork",
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        DOMAIN_EVENT_WORKER_CONCURRENCY: 40,
      },
    },
    {
      name: "lms-analytics-worker",
      script: "workers/analytics.worker.js",
      instances: 2,
      exec_mode: "fork",
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        ANALYTICS_WORKER_CONCURRENCY: 40,
      },
    },
  ],
};
