export default {
  testEnvironment: "node",
  testMatch: ["**/tests/integration/**/*.test.js"],
  maxWorkers: 1,
  setupFiles: ["<rootDir>/tests/setup-env.js"],
};
