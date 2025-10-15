export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function computeDelay(
  attempt: number,
  baseDelayMs: number,
  strategy: "fixed" | "exponential" | "exponential-jitter",
  maxDelayMs = 10000
) {
  let delay =
    strategy === "fixed" ? baseDelayMs : baseDelayMs * Math.pow(2, attempt - 1);

  if (strategy === "exponential-jitter") {
    const rand = (Math.random() - 0.5) * 0.6;
    delay += delay * rand;
  }

  return Math.min(delay, maxDelayMs);
}

export function parseRetryAfter(retryAfter: string | null): number | null {
  if (!retryAfter) return null;

  // Try parsing as seconds (number)
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000; // Convert to milliseconds
  }

  // Try parsing as HTTP date
  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }

  return null;
}
