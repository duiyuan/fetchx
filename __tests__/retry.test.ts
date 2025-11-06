/**
 * test retry functions
 */

import { describe, test, expect, jest } from "@jest/globals";
import { request } from "../src/index";

const TEST_API = "https://jsonplaceholder.typicode.com";

describe("retry functions test", () => {
  test("retry by default (maxRetries = 0)", async () => {
    const onRetry = jest.fn();

    try {
      // use a non-existent domain to trigger network error
      await request("https://this-domain-does-not-exist-12345.com", "fetch", {
        retry: {
          maxRetries: 0,
          onRetry,
        },
        timeoutMs: 1000,
      });
    } catch (error) {
      expect(onRetry).not.toHaveBeenCalled();
    }
  }, 15000);

  test("retry on network error", async () => {
    const onRetry = jest.fn();

    try {
      await request("https://this-domain-does-not-exist-12345.com", "fetch", {
        retry: {
          maxRetries: 2,
          baseDelayMs: 100,
          backoff: "fixed",
          onRetry,
        },
        timeoutMs: 1000,
      });
    } catch (error) {
      // should retry 2 times
      expect(onRetry).toHaveBeenCalledTimes(2);
    }
  }, 15000);

  test("support exponential backoff strategy", async () => {
    const onRetry = jest.fn();
    const delays: number[] = [];

    try {
      await request("https://this-domain-does-not-exist-12345.com", "fetch", {
        retry: {
          maxRetries: 3,
          baseDelayMs: 100,
          backoff: "exponential",
          onRetry: (attempt, error) => {
            delays.push(Date.now());
            onRetry(attempt, error);
          },
        },
        timeoutMs: 1000,
      });
    } catch (error) {
      expect(onRetry).toHaveBeenCalledTimes(3);

      // verify delay time increasing (with some error)
      if (delays.length >= 2) {
        const delay1 = delays[1] - delays[0];
        const delay2 = delays[2] - delays[1];
        // second delay should be greater than first (exponential growth)
        expect(delay2).toBeGreaterThanOrEqual(delay1 * 0.8); // 允许 20% 误差
      }
    }
  }, 20000);

  test("retry on success", async () => {
    const onRetry = jest.fn();

    const data = await request(`${TEST_API}/posts/1`, "fetch", {
      retry: {
        maxRetries: 3,
        onRetry,
      },
    });

    expect(data).toBeDefined();
    expect(onRetry).not.toHaveBeenCalled();
  }, 10000);

  test("support custom shouldRetry function", async () => {
    const shouldRetry = jest.fn(() => false); // never retry
    const onRetry = jest.fn();

    try {
      await request("https://this-domain-does-not-exist-12345.com", "fetch", {
        retry: {
          maxRetries: 3,
          shouldRetry,
          onRetry,
        },
        timeoutMs: 1000,
      });
    } catch (error) {
      // shouldRetry returns false, so should not retry
      expect(shouldRetry).toHaveBeenCalled();
      expect(onRetry).not.toHaveBeenCalled();
    }
  }, 15000);

  test("support exponential-jitter backoff strategy", async () => {
    const onRetry = jest.fn();

    try {
      await request("https://this-domain-does-not-exist-12345.com", "fetch", {
        retry: {
          maxRetries: 2,
          baseDelayMs: 100,
          backoff: "exponential-jitter",
          onRetry,
        },
        timeoutMs: 1000,
      });
    } catch (error) {
      expect(onRetry).toHaveBeenCalledTimes(2);
    }
  }, 15000);

  test("limit max delay time", async () => {
    const onRetry = jest.fn();
    const delays: number[] = [];

    try {
      await request("https://this-domain-does-not-exist-12345.com", "fetch", {
        retry: {
          maxRetries: 5,
          baseDelayMs: 1000,
          maxDelayMs: 2000, // max delay 2 seconds
          backoff: "exponential",
          onRetry: (attempt, error) => {
            delays.push(Date.now());
            onRetry(attempt, error);
          },
        },
        timeoutMs: 1000,
      });
    } catch (error) {
      expect(onRetry).toHaveBeenCalledTimes(5);

      // verify delay time not exceeds maxDelayMs
      if (delays.length >= 4) {
        const delay3 = delays[3] - delays[2];
        const delay4 = delays[4] - delays[3];
        // delay time should be limited to 2000ms (with some error)
        expect(delay3).toBeLessThan(2500); // allow some error
        expect(delay4).toBeLessThan(2500);
      }
    }
  }, 30000);
});

describe("test onRetry callback", () => {
  test("onRetry should receive correct parameters", async () => {
    const onRetry = jest.fn();

    try {
      await request("https://this-domain-does-not-exist-12345.com", "fetch", {
        retry: {
          maxRetries: 2,
          baseDelayMs: 100,
          onRetry,
        },
        timeoutMs: 1000,
      });
    } catch (error) {
      expect(onRetry).toHaveBeenCalledTimes(2);

      // check first retry parameters
      const firstCall = onRetry.mock.calls[0];
      expect(firstCall[0]).toBe(1); // attempt = 1
      expect(firstCall[1]).toBeDefined(); // error object

      // check second retry parameters
      const secondCall = onRetry.mock.calls[1];
      expect(secondCall[0]).toBe(2); // attempt = 2
      expect(secondCall[1]).toBeDefined(); // error object
    }
  }, 15000);
});
