/**
 * timeout test
 */

import { describe, test, expect } from "@jest/globals";
import { request } from "../src/index";

const TEST_API = "https://jsonplaceholder.typicode.com";

describe("test timeout", () => {
  test("request should not timeout", async () => {
    const data = await request(`${TEST_API}/posts/1`, "fetch", {
      timeoutMs: 5000, // 5 seconds timeout, request should complete before this
    });

    expect(data).toBeDefined();
    expect(data.id).toBe(1);
  }, 10000);

  test("timeout config should work for fetch adapter", async () => {
    const startTime = Date.now();

    try {
      // use a URL that will timeout (actually may fail due to network error)
      await request("https://httpstat.us/200?sleep=10000", "fetch", {
        timeoutMs: 1000, // 1 second timeout
      });

      // if we get here, it means no timeout
      expect(true).toBe(false);
    } catch (error: any) {
      const elapsed = Date.now() - startTime;

      // should fail near timeout time
      expect(elapsed).toBeLessThan(3000);
      // error should be AbortError or TimeoutError
      expect(
        ["AbortError", "TimeoutError", "TypeError"].some(
          (name) => error.name === name || error.message.includes("abort")
        )
      ).toBe(true);
    }
  }, 15000);

  test("timeout config should work for axios adapter", async () => {
    const startTime = Date.now();

    try {
      await request("https://httpstat.us/200?sleep=10000", "axios", {
        timeoutMs: 1000, // 1 second timeout
      });

      expect(true).toBe(false);
    } catch (error: any) {
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(3000);
      // Axios timeout error
      expect(
        error.code === "ECONNABORTED" ||
          error.message.includes("timeout") ||
          error.name === "AbortError"
      ).toBe(true);
    }
  }, 15000);

  test("set different timeout for different requests", async () => {
    // short timeout
    const shortTimeout = request(`${TEST_API}/posts/1`, "fetch", {
      timeoutMs: 5000,
    });

    // long timeout
    const longTimeout = request(`${TEST_API}/posts/2`, "fetch", {
      timeoutMs: 10000,
    });

    const [data1, data2] = await Promise.all([shortTimeout, longTimeout]);

    expect(data1).toBeDefined();
    expect(data1.id).toBe(1);
    expect(data2).toBeDefined();
    expect(data2.id).toBe(2);
  }, 15000);

  test("timeoutMs = 0 means infinite wait", async () => {
    const data = await request(`${TEST_API}/posts/1`, "fetch", {
      timeoutMs: 0,
    });

    expect(data).toBeDefined();
    expect(data.id).toBe(1);
  }, 10000);

  test("if timeoutMs is not set, use default behavior", async () => {
    const data = await request(`${TEST_API}/posts/1`, "fetch");

    expect(data).toBeDefined();
    expect(data.id).toBe(1);
  }, 10000);
});

describe("test timeout and retry combination", () => {
  test("retry after timeout (fetch)", async () => {
    let attemptCount = 0;

    try {
      await request("https://httpstat.us/200?sleep=5000", "fetch", {
        timeoutMs: 500, // 500ms timeout
        retry: {
          maxRetries: 2,
          baseDelayMs: 100,
          onRetry: () => {
            attemptCount++;
          },
        },
      });

      expect(true).toBe(false);
    } catch (error) {
      // should retry 2 times
      expect(attemptCount).toBe(2);
    }
  }, 20000);

  test("timeout should not retry infinitely (axios)", async () => {
    let attemptCount = 0;
    const maxRetries = 3;

    try {
      await request("https://httpstat.us/200?sleep=5000", "axios", {
        timeoutMs: 500,
        retry: {
          maxRetries,
          baseDelayMs: 100,
          onRetry: () => {
            attemptCount++;
          },
        },
      });

      expect(true).toBe(false);
    } catch (error) {
      // should retry maxRetries times
      expect(attemptCount).toBe(maxRetries);
    }
  }, 20000);
});

describe("test timeout and cancel combination", () => {
  test("manual cancel should take precedence over timeout", async () => {
    const req = request(`${TEST_API}/posts`, "fetch", {
      timeoutMs: 5000, // 5 seconds timeout
    });

    // cancel manually after 100ms
    setTimeout(() => {
      req.abort();
    }, 100);

    const startTime = Date.now();

    try {
      await req;
      expect(true).toBe(false);
    } catch (error: any) {
      const elapsed = Date.now() - startTime;

      // should be cancelled between 100-500ms, not wait for 5 seconds timeout
      expect(elapsed).toBeLessThan(1000);
      expect(error.name).toBe("AbortError");
    }
  }, 10000);

  test("timeout should automatically cancel request", async () => {
    const startTime = Date.now();

    try {
      await request("https://httpstat.us/200?sleep=10000", "fetch", {
        timeoutMs: 1000, // 1 second timeout
      });

      expect(true).toBe(false);
    } catch (error: any) {
      const elapsed = Date.now() - startTime;

      // should fail near timeout time
      expect(elapsed).toBeLessThan(3000);
    }
  }, 15000);
});
