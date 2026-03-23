import { withRetry } from "./retry.js";
import { CircuitBreaker } from "./circuit-breaker.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const withTimeout = async (
  operation,
  { timeoutMs = 5000, timeoutMessage = "Operation timed out" } = {}
) =>
  Promise.race([
    operation(),
    sleep(timeoutMs).then(() => {
      throw new Error(timeoutMessage);
    }),
  ]);

export class Bulkhead {
  constructor({ name = "bulkhead", maxConcurrent = 20, queueLimit = 100 } = {}) {
    this.name = name;
    this.maxConcurrent = maxConcurrent;
    this.queueLimit = queueLimit;
    this.active = 0;
    this.waiting = [];
  }

  async execute(operation) {
    if (this.active >= this.maxConcurrent) {
      if (this.waiting.length >= this.queueLimit) {
        throw new Error(`${this.name}: bulkhead queue limit reached`);
      }
      await new Promise((resolve) => this.waiting.push(resolve));
    }

    this.active += 1;
    try {
      return await operation();
    } finally {
      this.active -= 1;
      const next = this.waiting.shift();
      if (next) {
        next();
      }
    }
  }
}

export const buildResilientExecutor = ({
  bulkheadOptions = {},
  circuitBreakerOptions = {},
  retryOptions = {},
  timeoutOptions = {},
} = {}) => {
  const bulkhead = new Bulkhead(bulkheadOptions);
  const circuitBreaker = new CircuitBreaker(circuitBreakerOptions);

  return async (operation) =>
    bulkhead.execute(() =>
      circuitBreaker.execute(() =>
        withRetry(
          () =>
            withTimeout(operation, {
              timeoutMs: timeoutOptions.timeoutMs || 5000,
              timeoutMessage: timeoutOptions.timeoutMessage,
            }),
          retryOptions
        )
      )
    );
};
