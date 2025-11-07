import { sleep, computeDelay, parseRetryAfter } from "./backoff";
import type { RetryOptions } from "./type";

/**
 * Network errors that can be retried
 * These are transient errors that might succeed on retry
 */
const RETRYABLE_ERROR_CODES = [
  'ECONNREFUSED',  // Connection refused
  'ECONNRESET',    // Connection reset by peer
  'ETIMEDOUT',     // Connection timeout
  'ESOCKETTIMEDOUT', // Socket timeout
  'ENETUNREACH',   // Network unreachable
  'EAI_AGAIN',     // DNS lookup timeout
];

/**
 * Check if an error is a retryable network error
 */
function isRetryableNetworkError(err: any): boolean {
  if (!err) return false;
  
  // Check error code
  if (err.code && RETRYABLE_ERROR_CODES.includes(err.code)) {
    return true;
  }
  
  // Check if it's a timeout error (not user abort)
  if (err.name === 'AbortError' && err.message?.includes('timeout')) {
    return true;
  }
  
  // Axios timeout error
  if (err.code === 'ECONNABORTED' && err.message?.includes('timeout')) {
    return true;
  }
  
  // Check for fetch network errors (TypeError with "fetch" in message)
  // This covers DNS failures, connection refused, etc.
  if (err.name === 'TypeError' && 
      (err.message?.includes('fetch') || 
       err.message?.includes('network') ||
       err.message?.includes('Failed to fetch'))) {
    return true;
  }
  
  return false;
}

/**
 * Default shouldRetry logic
 * Only retry on specific network errors and certain HTTP status codes
 */
function defaultShouldRetry(err: any, res: any, attempt: number): boolean {
  // Check HTTP status code
  const status = res?.status ?? err?.response?.status ?? err?.status;
  if (status) {
    // Retry on rate limit and server errors
    const retryableStatusCodes = [429, 502, 503, 504];
    return retryableStatusCodes.includes(status);
  }
  
  // Check if it's a retryable network error
  return isRetryableNetworkError(err);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 0,  // Default: no retry
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

      // Use custom shouldRetry if provided, otherwise use default logic
      const canRetry =
        attempt <= maxRetries &&
        (shouldRetry?.(err, err?.response, attempt) ??
          defaultShouldRetry(err, err?.response, attempt));

      if (!canRetry) throw err;

      onRetry(attempt, err, err?.response);

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
