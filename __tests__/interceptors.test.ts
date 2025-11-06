/**
 * test interceptors functions
 */

import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { request, setGlobalConfig } from "../src/index";

const TEST_API = "https://jsonplaceholder.typicode.com";

describe("test request interceptors", () => {
  beforeEach(() => {
    setGlobalConfig({});
  });

  test("add request interceptors", async () => {
    const interceptor = jest.fn((config: any) => {
      return {
        ...config,
        headers: {
          ...config.headers,
          "X-Custom-Header": "test-value",
        },
      };
    });

    const data = await request(`${TEST_API}/posts/1`, "fetch", {
      requestInterceptors: [interceptor],
    });

    expect(interceptor).toHaveBeenCalled();
    expect(data).toBeDefined();
    expect(data.id).toBe(1);
  }, 10000);

  test("chain request interceptors", async () => {
    const interceptor1 = jest.fn((config: any) => {
      return {
        ...config,
        headers: {
          ...config.headers,
          "X-Header-1": "value-1",
        },
      };
    });

    const interceptor2 = jest.fn((config: any) => {
      return {
        ...config,
        headers: {
          ...config.headers,
          "X-Header-2": "value-2",
        },
      };
    });

    const data = await request(`${TEST_API}/posts/1`, "fetch", {
      requestInterceptors: [interceptor1, interceptor2],
    });

    expect(interceptor1).toHaveBeenCalled();
    expect(interceptor2).toHaveBeenCalled();
    expect(data).toBeDefined();
  }, 10000);

  test("execute request interceptors in order", async () => {
    const executionOrder: number[] = [];

    const interceptor1 = jest.fn((config: any) => {
      executionOrder.push(1);
      return config;
    });

    const interceptor2 = jest.fn((config: any) => {
      executionOrder.push(2);
      return config;
    });

    const interceptor3 = jest.fn((config: any) => {
      executionOrder.push(3);
      return config;
    });

    await request(`${TEST_API}/posts/1`, "fetch", {
      requestInterceptors: [interceptor1, interceptor2, interceptor3],
    });

    expect(executionOrder).toEqual([1, 2, 3]);
  }, 10000);

  test("support async request interceptors", async () => {
    const asyncInterceptor = jest.fn(async (config: any) => {
      // mock async operation, like get token
      await new Promise((resolve) => setTimeout(resolve, 100));

      return {
        ...config,
        headers: {
          ...config.headers,
          Authorization: "Bearer async-token",
        },
      };
    });

    const data = await request(`${TEST_API}/posts/1`, "fetch", {
      requestInterceptors: [asyncInterceptor],
    });

    expect(asyncInterceptor).toHaveBeenCalled();
    expect(data).toBeDefined();
  }, 10000);
});

describe("test response interceptors", () => {
  beforeEach(() => {
    setGlobalConfig({});
  });

  test("add response interceptors", async () => {
    const interceptor = jest.fn((data: any) => {
      return {
        ...data,
        intercepted: true,
      };
    });

    const data = await request(`${TEST_API}/posts/1`, "fetch", {
      responseInterceptors: [interceptor],
    });

    expect(interceptor).toHaveBeenCalled();
    expect(data).toBeDefined();
    expect((data as any).intercepted).toBe(true);
  }, 10000);

  test("chain response interceptors", async () => {
    const interceptor1 = jest.fn((data: any) => {
      return {
        ...data,
        step1: true,
      };
    });

    const interceptor2 = jest.fn((data: any) => {
      return {
        ...data,
        step2: true,
      };
    });

    const data = await request(`${TEST_API}/posts/1`, "fetch", {
      responseInterceptors: [interceptor1, interceptor2],
    });

    expect(interceptor1).toHaveBeenCalled();
    expect(interceptor2).toHaveBeenCalled();
    expect((data as any).step1).toBe(true);
    expect((data as any).step2).toBe(true);
  }, 10000);

  test("execute response interceptors in order", async () => {
    const executionOrder: number[] = [];

    const interceptor1 = jest.fn((data: any) => {
      executionOrder.push(1);
      return data;
    });

    const interceptor2 = jest.fn((data: any) => {
      executionOrder.push(2);
      return data;
    });

    const interceptor3 = jest.fn((data: any) => {
      executionOrder.push(3);
      return data;
    });

    await request(`${TEST_API}/posts/1`, "fetch", {
      responseInterceptors: [interceptor1, interceptor2, interceptor3],
    });

    expect(executionOrder).toEqual([1, 2, 3]);
  }, 10000);

  test("support async response interceptors", async () => {
    const asyncInterceptor = jest.fn(async (data: any) => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      return {
        ...data,
        processed: true,
      };
    });

    const data = await request(`${TEST_API}/posts/1`, "fetch", {
      responseInterceptors: [asyncInterceptor],
    });

    expect(asyncInterceptor).toHaveBeenCalled();
    expect((data as any).processed).toBe(true);
  }, 10000);

  test("transform data structure with response interceptors", async () => {
    interface Post {
      id: number;
      userId: number;
      title: string;
      body: string;
    }

    const transformInterceptor = jest.fn((data: Post) => {
      // transform data structure
      return {
        postId: data.id,
        author: data.userId,
        heading: data.title,
        content: data.body,
      };
    });

    const data = await request(`${TEST_API}/posts/1`, "fetch", {
      responseInterceptors: [transformInterceptor],
    });

    expect(transformInterceptor).toHaveBeenCalled();
    expect((data as any).postId).toBeDefined();
    expect((data as any).author).toBeDefined();
    expect((data as any).heading).toBeDefined();
    expect((data as any).content).toBeDefined();
  }, 10000);
});

describe("test global interceptors", () => {
  beforeEach(() => {
    setGlobalConfig({});
  });

  test("support global request interceptors", async () => {
    const globalInterceptor = jest.fn((config: any) => {
      return {
        ...config,
        headers: {
          ...config.headers,
          "X-Global-Header": "global-value",
        },
      };
    });

    setGlobalConfig({
      baseURL: TEST_API,
      requestInterceptors: [globalInterceptor],
    });

    const data = await request("/posts/1", "fetch");

    expect(globalInterceptor).toHaveBeenCalled();
    expect(data).toBeDefined();
  }, 10000);

  test("support global response interceptors", async () => {
    const globalInterceptor = jest.fn((data: any) => {
      return {
        ...data,
        globallyProcessed: true,
      };
    });

    setGlobalConfig({
      baseURL: TEST_API,
      responseInterceptors: [globalInterceptor],
    });

    const data = await request("/posts/1", "fetch");

    expect(globalInterceptor).toHaveBeenCalled();
    expect((data as any).globallyProcessed).toBe(true);
  }, 10000);

  test("merge global and local interceptors", async () => {
    const globalRequestInterceptor = jest.fn((config: any) => config);
    const localRequestInterceptor = jest.fn((config: any) => config);
    const globalResponseInterceptor = jest.fn((data: any) => data);
    const localResponseInterceptor = jest.fn((data: any) => data);

    setGlobalConfig({
      baseURL: TEST_API,
      requestInterceptors: [globalRequestInterceptor],
      responseInterceptors: [globalResponseInterceptor],
    });

    await request("/posts/1", "fetch", {
      requestInterceptors: [localRequestInterceptor],
      responseInterceptors: [localResponseInterceptor],
    });

    // global and local interceptors should be called
    expect(globalRequestInterceptor).toHaveBeenCalled();
    expect(localRequestInterceptor).toHaveBeenCalled();
    expect(globalResponseInterceptor).toHaveBeenCalled();
    expect(localResponseInterceptor).toHaveBeenCalled();
  }, 10000);

  test("local interceptors should be executed after global interceptors", async () => {
    const executionOrder: string[] = [];

    const globalRequestInterceptor = jest.fn((config: any) => {
      executionOrder.push("global-request");
      return config;
    });

    const localRequestInterceptor = jest.fn((config: any) => {
      executionOrder.push("local-request");
      return config;
    });

    setGlobalConfig({
      baseURL: TEST_API,
      requestInterceptors: [globalRequestInterceptor],
    });

    await request("/posts/1", "fetch", {
      requestInterceptors: [localRequestInterceptor],
    });

    // global interceptors should be executed first, then local interceptors
    expect(executionOrder).toEqual(["global-request", "local-request"]);
  }, 10000);
});
