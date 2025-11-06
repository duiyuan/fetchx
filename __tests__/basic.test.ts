/**
 * basic functions test
 */

import { describe, test, expect, beforeEach } from "@jest/globals";
import { request, setGlobalConfig } from "../src/index";

// use real test API
const TEST_API = "https://jsonplaceholder.typicode.com";

describe("basic request test", () => {
  beforeEach(() => {
    setGlobalConfig({});
  });

  test("test GET request(fetch)", async () => {
    const data = await request(`${TEST_API}/posts/1`, "fetch");

    expect(data).toBeDefined();
    expect(data.id).toBe(1);
    expect(data.userId).toBeDefined();
    expect(data.title).toBeDefined();
    expect(data.body).toBeDefined();
  }, 10000);

  test("test GET request(axios)", async () => {
    const data = await request(`${TEST_API}/posts/1`, "axios");

    expect(data).toBeDefined();
    expect(data.id).toBe(1);
    expect(data.userId).toBeDefined();
    expect(data.title).toBeDefined();
    expect(data.body).toBeDefined();
  }, 10000);

  test("get list data", async () => {
    const data = await request(`${TEST_API}/posts`, "fetch");

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("id");
    expect(data[0]).toHaveProperty("title");
  }, 10000);

  test("test POST request (fetch)", async () => {
    const payload = {
      title: "Test Post",
      body: "This is a test post",
      userId: 1,
    };

    const data = await request(`${TEST_API}/posts`, "fetch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    expect(data).toBeDefined();
    expect(data.title).toBe(payload.title);
    expect(data.body).toBe(payload.body);
    expect(data.userId).toBe(payload.userId);
    expect(data.id).toBeDefined();
  }, 10000);

  test("test POST request (axios)", async () => {
    const payload = {
      title: "Test Post Axios",
      body: "This is a test post via axios",
      userId: 1,
    };

    const data = await request(`${TEST_API}/posts`, "axios", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      data: payload,
    });

    expect(data).toBeDefined();
    expect(data.title).toBe(payload.title);
    expect(data.body).toBe(payload.body);
    expect(data.userId).toBe(payload.userId);
    expect(data.id).toBeDefined();
  }, 10000);

  test("test PUT request", async () => {
    const payload = {
      id: 1,
      title: "Updated Post",
      body: "This is an updated post",
      userId: 1,
    };

    const data = await request(`${TEST_API}/posts/1`, "fetch", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    expect(data).toBeDefined();
    expect(data.title).toBe(payload.title);
    expect(data.body).toBe(payload.body);
  }, 10000);

  test("test DELETE request", async () => {
    const data = await request(`${TEST_API}/posts/1`, "fetch", {
      method: "DELETE",
    });

    expect(data).toBeDefined();
  }, 10000);

  test("handle query params (axios params)", async () => {
    const data = await request(`${TEST_API}/posts`, "axios", {
      method: "GET",
      params: {
        userId: 1,
      },
    });

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data.every((post: any) => post.userId === 1)).toBe(true);
  }, 10000);
});

describe("global config test", () => {
  beforeEach(() => {
    setGlobalConfig({});
  });

  test("test set and use global baseURL", async () => {
    setGlobalConfig({
      baseURL: TEST_API,
    });

    const data = await request("/posts/1", "fetch");

    expect(data).toBeDefined();
    expect(data.id).toBe(1);
  }, 10000);

  test("test merge local and global headers", async () => {
    setGlobalConfig({
      baseURL: TEST_API,
      headers: {
        "X-Global-Header": "global-value",
      },
    });

    // this test is just to ensure no error because of headers conflict
    const data = await request("/posts/1", "fetch", {
      headers: {
        "X-Local-Header": "local-value",
      },
    });

    expect(data).toBeDefined();
    expect(data.id).toBe(1);
  }, 10000);
});

describe("test TypeScript type", () => {
  interface Post {
    id: number;
    userId: number;
    title: string;
    body: string;
  }

  test("should support generic type inference", async () => {
    const post = await request<Post>(`${TEST_API}/posts/1`, "fetch");

    expect(typeof post.id).toBe("number");
    expect(typeof post.userId).toBe("number");
    expect(typeof post.title).toBe("string");
    expect(typeof post.body).toBe("string");
  }, 10000);

  test("test support array type inference", async () => {
    const posts = await request<Post[]>(`${TEST_API}/posts`, "fetch");

    expect(Array.isArray(posts)).toBe(true);
    expect(posts.length).toBeGreaterThan(0);

    const firstPost = posts[0];
    expect(typeof firstPost.id).toBe("number");
    expect(typeof firstPost.title).toBe("string");
  }, 10000);
});

describe("adapter selection test", () => {
  test("fetch adapter should work", async () => {
    const data = await request(`${TEST_API}/posts/1`, "fetch");
    expect(data).toBeDefined();
    expect(data.id).toBe(1);
  }, 10000);

  test("axios adapter should work", async () => {
    const data = await request(`${TEST_API}/posts/1`, "axios");
    expect(data).toBeDefined();
    expect(data.id).toBe(1);
  }, 10000);

  test("auto adapter should automatically select", async () => {
    const data = await request(`${TEST_API}/posts/1`, "auto");
    expect(data).toBeDefined();
    expect(data.id).toBe(1);
  }, 10000);
});
