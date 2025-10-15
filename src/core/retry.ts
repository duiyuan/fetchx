import { sleep, computeDelay, parseRetryAfter } from "./backoff";
import type { RetryOptions } from "./type";

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 200,
    backoff = "exponential-jitter",
    maxDelayMs = 10000,
    retryOn = [429, 502, 503, 504],
    shouldRetry,
    onRetry = () => {},
    respectRetryAfter = true,
  } = opts;

  let attempt = 0;
  let lastError: any;

  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      attempt++;

      const status = err?.response?.status ?? err?.status;
      const canRetry =
        attempt <= maxRetries &&
        (shouldRetry?.(err, err?.response, attempt) ??
          (!status || retryOn.includes(status)));

      if (!canRetry) throw err;

      onRetry(attempt, err);

      let delay = computeDelay(attempt, baseDelayMs, backoff, maxDelayMs);

      // Check for Retry-After header if respectRetryAfter is enabled
      if (respectRetryAfter && err?.response?.headers) {
        const retryAfterHeader =
          err.response.headers.get?.("retry-after") ||
          err.response.headers["retry-after"];
        const retryAfterMs = parseRetryAfter(retryAfterHeader);
        if (retryAfterMs !== null) {
          delay = Math.min(retryAfterMs, maxDelayMs);
        }
      }

      await sleep(delay);
    }
  }

  throw lastError;
}
