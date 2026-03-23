export const CIRCUIT_STATE = {
  CLOSED: "CLOSED",
  OPEN: "OPEN",
  HALF_OPEN: "HALF_OPEN",
};

export class CircuitBreaker {
  constructor({
    failureThreshold = 5,
    recoveryTimeoutMs = 30_000,
    halfOpenSuccesses = 1,
    fallback = null,
    name = "circuit-breaker",
  } = {}) {
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.recoveryTimeoutMs = recoveryTimeoutMs;
    this.halfOpenSuccesses = halfOpenSuccesses;
    this.fallback = fallback;

    this.state = CIRCUIT_STATE.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptAt = 0;
  }

  canAttempt() {
    if (this.state !== CIRCUIT_STATE.OPEN) {
      return true;
    }

    if (Date.now() >= this.nextAttemptAt) {
      this.state = CIRCUIT_STATE.HALF_OPEN;
      this.successCount = 0;
      return true;
    }

    return false;
  }

  onSuccess() {
    if (this.state === CIRCUIT_STATE.HALF_OPEN) {
      this.successCount += 1;
      if (this.successCount >= this.halfOpenSuccesses) {
        this.state = CIRCUIT_STATE.CLOSED;
        this.failureCount = 0;
      }
      return;
    }

    this.failureCount = 0;
  }

  onFailure() {
    this.failureCount += 1;
    this.successCount = 0;

    if (this.failureCount >= this.failureThreshold) {
      this.state = CIRCUIT_STATE.OPEN;
      this.nextAttemptAt = Date.now() + this.recoveryTimeoutMs;
    }
  }

  async execute(operation, fallbackContext = {}) {
    if (!this.canAttempt()) {
      if (this.fallback) {
        return this.fallback({
          reason: "circuit_open",
          state: this.state,
          ...fallbackContext,
        });
      }

      throw new Error(`${this.name}: circuit is open`);
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();

      if (this.fallback) {
        return this.fallback({
          reason: "operation_failed",
          error,
          state: this.state,
          ...fallbackContext,
        });
      }

      throw error;
    }
  }
}
