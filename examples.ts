/**
 * FetchX examples
 * include fetch and axios adapter
 */

import { request, setGlobalConfig } from "./src/index";

// example 1: basic GET request
async function example1_basicGet() {
  // use fetch adapter (default)
  const users = await request("https://api.example.com/users", "fetch");
  console.log(users);

  // use axios adapter
  const usersAxios = await request("https://api.example.com/users", "axios");
  console.log(usersAxios);
}

// example 2: POST request - Fetch adapter
async function example2_postWithFetch() {
  const newUser = await request("https://api.example.com/users", "fetch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "John",
      email: "john@example.com",
    }),
    cache: "no-cache", // fetch supported parameters
  });
  console.log(newUser);
}

// example 3: POST request - Axios adapter
async function example3_postWithAxios() {
  // axios uses data instead of body
  const newUser = await request("https://api.example.com/users", "axios", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: {
      // axios uses data parameter
      name: "John",
      email: "john@example.com",
    },
    timeoutMs: 5000,
  });
  console.log(newUser);
}

// example 4: correct POST request (your scenario)
async function example4_correctPostRequest() {
  // use fetch adapter (recommended for browser)
  const resFetch = await request("/api/performance/start", "fetch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      scriptName: "test-script",
      url: "https://example.com",
      threads: 200,
      cycles: 10,
    }),
    cache: "no-cache",
  });

  // use axios adapter
  const resAxios = await request("/api/performance/start", "axios", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache", // axios sets cache through headers
    },
    data: {
      // axios uses data instead of body
      scriptName: "test-script",
      url: "https://example.com",
      threads: 200,
      cycles: 10,
    },
    timeoutMs: 30000, // unified timeout configuration
  });

  return { resFetch, resAxios };
}

// example 5: Fetch vs Axios parameters comparison
async function example5_fetchVsAxios() {
  const url = "/api/data";
  const payload = { name: "test", value: 123 };

  // Fetch way
  const fetchResult = await request(url, "fetch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload), // fetch uses body + JSON.stringify
    cache: "no-cache", // fetch specific
    credentials: "include", // fetch specific
  });

  // Axios way
  const axiosResult = await request(url, "axios", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache", // axios sets cache through headers
    },
    data: payload, // axios uses data, automatically JSON.stringify
    withCredentials: true, // axios credentials equivalent
  });

  return { fetchResult, axiosResult };
}

// example 6: all HTTP methods
async function example6_allMethods() {
  const baseUrl = "https://api.example.com/users";

  // GET
  const users = await request(baseUrl, "fetch", {
    method: "GET",
  });

  // POST
  const newUser = await request(baseUrl, "fetch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Alice" }),
  });

  // PUT
  const updatedUser = await request(`${baseUrl}/123`, "fetch", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Alice Updated" }),
  });

  // PATCH
  const patchedUser = await request(`${baseUrl}/123`, "fetch", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "alice@example.com" }),
  });

  // DELETE
  await request(`${baseUrl}/123`, "fetch", {
    method: "DELETE",
  });

  return { users, newUser, updatedUser, patchedUser };
}

// ============================================
// example 7: Axios full configuration example
// ============================================
async function example7_axiosFullConfig() {
  const result = await request("/api/data", "axios", {
    method: "POST",

    // request data
    data: {
      key: "value",
    },

    // request headers
    headers: {
      "Content-Type": "application/json",
      "X-Custom-Header": "custom-value",
      "Cache-Control": "no-cache",
    },

    // timeout setting (both ways can be used)
    timeoutMs: 5000, // recommended: unified timeout configuration
    // timeout: 5000,  // or use axios native timeout

    // retry configuration
    retry: {
      maxRetries: 3,
      baseDelayMs: 200,
      backoff: "exponential-jitter",
      retryOn: [429, 502, 503, 504],
    },

    // Axios specific configuration
    withCredentials: true, // 发送 cookies
    responseType: "json", // response type
    maxRedirects: 5, // maximum redirect次数

    // request interceptors
    requestInterceptors: [
      async (config) => {
        console.log("send request:", config);
        return config;
      },
    ],

    // response interceptors
    responseInterceptors: [
      async (data) => {
        console.log("receive response:", data);
        return data;
      },
    ],
  });

  return result;
}

// ============================================
// example 8: file upload
// ============================================
async function example8_fileUpload() {
  const formData = new FormData();
  formData.append("file", new Blob(["file content"]), "test.txt");
  formData.append("name", "test file");

  // Fetch way
  const fetchResult = await request("/api/upload", "fetch", {
    method: "POST",
    body: formData, // fetch uses FormData directly
    // don't set Content-Type, let browser set it automatically
  });

  // Axios way
  const axiosResult = await request("/api/upload", "axios", {
    method: "POST",
    data: formData, // axios uses data
    headers: {
      // axios also sets Content-Type automatically
    },
  });

  return { fetchResult, axiosResult };
}

// ============================================
// example 9: query parameters handling
// ============================================
async function example9_queryParams() {
  // method 1: manually concatenate URL
  const result1 = await request("/api/users?page=1&limit=10", "fetch", {});

  // method 2: use URLSearchParams
  const params = new URLSearchParams({
    page: "1",
    limit: "10",
    sort: "name",
  });
  const result2 = await request(`/api/users?${params.toString()}`, "fetch", {});

  // method 3: Axios params configuration
  const result3 = await request("/api/users", "axios", {
    method: "GET",
    params: {
      // axios specific: automatically converted to query string
      page: 1,
      limit: 10,
      sort: "name",
    },
  });

  return { result1, result2, result3 };
}

// ============================================
// example 10: global configuration
// ============================================
async function example10_globalConfig() {
  // 设置全局配置
  setGlobalConfig({
    baseURL: "https://api.example.com",
    headers: {
      Authorization: "Bearer your-token",
      "X-App-Version": "1.0.0",
    },
    retry: {
      maxRetries: 3,
      backoff: "exponential-jitter",
    },
    // global request interceptors
    requestInterceptors: [
      async (config) => {
        // automatically add timestamp
        return {
          ...config,
          headers: {
            ...config.headers,
            "X-Request-Time": new Date().toISOString(),
          },
        };
      },
    ],
    // global response interceptors
    responseInterceptors: [
      async (data) => {
        // unified error handling
        if (data && data.code !== undefined && data.code !== 0) {
          throw new Error(data.message || "request failed");
        }
        return data;
      },
    ],
  });

  // subsequent requests will automatically use global configuration
  const users = await request("/users"); // actually: https://api.example.com/users
}

// ============================================
// example 11: cache control
// ============================================
async function example11_cacheControl() {
  // Fetch: use cache parameter
  const fetchResult = await request("/api/data", "fetch", {
    cache: "no-cache", // 'default' | 'no-cache' | 'reload' | 'force-cache' | 'only-if-cached'
  });

  // Axios: use headers
  const axiosResult = await request("/api/data", "axios", {
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  return { fetchResult, axiosResult };
}

// ============================================
// example 12: error handling
// ============================================
async function example12_errorHandling() {
  try {
    const result = await request("/api/data", "axios", {
      method: "POST",
      data: { test: true },
      retry: {
        maxRetries: 3,
        onRetry: (attempt, error) => {
          console.log(`retry ${attempt} time:`, error.message);
        },
      },
    });
    return result;
  } catch (error: any) {
    // unified error handling
    if (error.status === 401) {
      console.error("unauthorized, please login");
    } else if (error.status === 429) {
      console.error("request too frequent");
    } else if (error.status >= 500) {
      console.error("server error");
    } else {
      console.error("request failed:", error.message);
    }
    throw error;
  }
}

// ============================================
// example 13: TypeScript type support
// ============================================
interface User {
  id: string;
  name: string;
  email: string;
}

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

async function example13_typescript() {
  // method 1: directly specify return type
  const users = await request<User[]>("/api/users", "fetch", {});
  console.log(users[0].name); // TypeScript knows this is string

  // method 2: use response wrapper type
  const response = await request<ApiResponse<User>>(
    "/api/users/123",
    "axios",
    {}
  );
  console.log(response.data.email); // TypeScript full type inference

  return { users, response };
}

// ============================================
// example 14: complete practical example (your scenario fix version)
// ============================================
interface PerformanceTestPayload {
  scriptName: string;
  url: string;
  threads: number;
  cycles: number;
}

interface PerformanceTestResponse {
  taskId: string;
  status: string;
  message: string;
}

async function example14_performanceTest() {
  const payload: PerformanceTestPayload = {
    scriptName: "load-test",
    url: "https://example.com/api",
    threads: 200,
    cycles: 10,
  };

  // recommended way 1: use fetch (browser default)
  const fetchResult = await request<PerformanceTestResponse>(
    "/api/performance/start",
    "fetch",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-cache",
      timeoutMs: 30000,
      retry: {
        maxRetries: 2,
        backoff: "exponential-jitter",
      },
    }
  );

  // recommended way 2: use axios
  const axiosResult = await request<PerformanceTestResponse>(
    "/api/performance/start",
    "axios",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      data: payload, // note: axios uses data, no need to JSON.stringify
      timeoutMs: 30000,
      retry: {
        maxRetries: 2,
        backoff: "exponential-jitter",
      },
    }
  );

  return { fetchResult, axiosResult };
}

// ============================================
// example 15: HTTP Proxy Configuration (Node.js only)
// ============================================
// ⚠️ IMPORTANT: Proxy configuration only works in Node.js environment!
// 
// Browser Limitation:
// - JavaScript cannot configure proxies in browsers (security restriction)
// - In browsers, use: system settings, browser extensions, or launch parameters
// - All browser requests automatically use configured system/browser proxy
//
async function example15_proxyConfig() {
  // ========== Fetch Adapter Proxy ==========
  // Requires: npm install https-proxy-agent
  // Only works in Node.js environment
  
  // Method 1: Simple proxy URL string
  const fetchWithProxy1 = await request("/api/users", "fetch", {
    proxyUrl: "http://127.0.0.1:7890",
  });
  
  // Method 2: Detailed proxy configuration
  const fetchWithProxy2 = await request("/api/users", "fetch", {
    proxyUrl: {
      protocol: "http",
      host: "127.0.0.1",
      port: 7890,
    },
  });
  
  // Method 3: Proxy with authentication
  const fetchWithAuthProxy = await request("/api/users", "fetch", {
    proxyUrl: {
      protocol: "http",
      host: "proxy.example.com",
      port: 8080,
      auth: {
        username: "proxyuser",
        password: "proxypass",
      },
    },
  });
  
  // ========== Axios Adapter Proxy ==========
  // Native support, no extra dependency needed
  
  // Method 1: Basic proxy configuration
  const axiosWithProxy = await request("/api/users", "axios", {
    proxy: {
      protocol: "http",
      host: "127.0.0.1",
      port: 7890,
    },
  });
  
  // Method 2: Proxy with authentication
  const axiosWithAuthProxy = await request("/api/users", "axios", {
    proxy: {
      protocol: "http",
      host: "proxy.example.com",
      port: 8080,
      auth: {
        username: "proxyuser",
        password: "proxypass",
      },
    },
  });
  
  // Method 3: Disable proxy explicitly
  const axiosNoProxy = await request("/api/users", "axios", {
    proxy: false,
  });
  
  // ========== Global Proxy Configuration ==========
  setGlobalConfig({
    baseURL: "https://api.example.com",
    // Note: proxyUrl works for fetch adapter in global config
    // For axios, you need to set proxy in each request
  });
  
  return {
    fetchWithProxy1,
    fetchWithProxy2,
    fetchWithAuthProxy,
    axiosWithProxy,
    axiosWithAuthProxy,
    axiosNoProxy,
  };
}

// ============================================
// example 16: Request Cancellation - NEW Built-in Abort API
// ============================================
// ✨ NEW: All requests now have built-in abort() method!
// No need to manually manage AbortController in most cases
async function example16_requestCancellation() {
  // ========== Method 1: Built-in abort() - RECOMMENDED ==========
  
  // Fetch adapter - just call .abort()
  const req1 = request("/api/users", "fetch");
  
  // Cancel after 2 seconds
  setTimeout(() => {
    req1.abort();  // ✅ Super simple!
    console.log("Request cancelled");
  }, 2000);
  
  try {
    const data = await req1;
    console.log(data);
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.log("Request was aborted");
    }
  }
  
  // Axios adapter - same simple API
  const req2 = request("/api/posts", "axios", {
    method: "POST",
    data: { title: "New Post" }
  });
  
  // Cancel immediately
  req2.abort();
  
  try {
    const data = await req2;
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.log("Axios request cancelled");
    }
  }
  
  // ========== Method 2: Manual AbortController (if needed) ==========
  
  // Still supported if you need manual control
  const controller = new AbortController();
  
  const req3 = request("/api/users", "fetch", {
    signal: controller.signal,
  });
  
  // Can use either controller.abort() or req3.abort()
  controller.abort();  // or req3.abort()
  
  // ========== Practical Pattern: Auto-cancel previous request (NEW API) ==========
  
  class DataFetcher {
    private currentRequest: any = null;
    
    async fetch(url: string) {
      // Cancel previous request if exists
      if (this.currentRequest) {
        this.currentRequest.abort();  // ✅ Simple!
      }
      
      // Start new request
      this.currentRequest = request(url, "fetch");
      
      try {
        const data = await this.currentRequest;
        this.currentRequest = null;
        return data;
      } catch (error: any) {
        if (error.name === "AbortError") {
          console.log("Previous request cancelled");
          return null;
        }
        throw error;
      }
    }
    
    cancelAll() {
      if (this.currentRequest) {
        this.currentRequest.abort();
        this.currentRequest = null;
      }
    }
  }
  
  // Usage
  const fetcher = new DataFetcher();
  fetcher.fetch("/api/users");  // Start request
  fetcher.fetch("/api/posts");  // Auto-cancel first, start second
  
  // ========== Search with auto-cancel (NEW API) ==========
  
  let currentSearch: any = null;
  
  async function search(keyword: string) {
    // Cancel previous search
    if (currentSearch) {
      currentSearch.abort();  // ✅ No controller management!
    }
    
    // Start new search
    currentSearch = request(`/api/search?q=${keyword}`, "fetch");
    
    try {
      const results = await currentSearch;
      console.log("Search results:", results);
      currentSearch = null;
      return results;
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Search failed:", error);
      }
      return null;
    }
  }
  
  // Simulate fast typing - only last search completes
  await search("rea");    // cancelled
  await search("reac");   // cancelled
  await search("react");  // completes
  
  // ========== Combine with timeout (NEW API) ==========
  
  async function requestWithTimeout(url: string, timeoutMs: number) {
    const req = request(url, "axios");
    
    // Auto-abort after timeout
    const timeoutId = setTimeout(() => {
      req.abort();  // ✅ Clean!
    }, timeoutMs);
    
    try {
      const data = await req;
      clearTimeout(timeoutId);
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error(`Request timeout (${timeoutMs}ms)`);
      }
      throw error;
    }
  }
  
  // ========== Button click cancellation ==========
  
  let uploadReq: any = null;
  
  function startUpload(file: File) {
    if (uploadReq) {
      uploadReq.abort();
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    uploadReq = request("/api/upload", "axios", {
      method: "POST",
      data: formData,
    });
    
    return uploadReq;
  }
  
  // Simulated button click
  function cancelUpload() {
    if (uploadReq) {
      uploadReq.abort();
      console.log("Upload cancelled by user");
    }
  }
  
  return {
    req1,
    req2,
    req3,
    fetcher,
    search,
    requestWithTimeout,
    startUpload,
    cancelUpload,
  };
}

// ============================================
// export all examples
// ============================================
export {
  example1_basicGet,
  example2_postWithFetch,
  example3_postWithAxios,
  example4_correctPostRequest,
  example5_fetchVsAxios,
  example6_allMethods,
  example7_axiosFullConfig,
  example8_fileUpload,
  example9_queryParams,
  example10_globalConfig,
  example11_cacheControl,
  example12_errorHandling,
  example13_typescript,
  example14_performanceTest,
  example15_proxyConfig,
  example16_requestCancellation,
};

// ============================================
// Fetch vs Axios quick reference
// ============================================
/*

┌─────────────────────────────────────────────────────────────────┐
│                    Fetch vs Axios                   │
├─────────────────┬──────────────────┬─────────────────────────────┤
│      功能       │      Fetch       │           Axios             │
├─────────────────┼──────────────────┼─────────────────────────────┤
│ 适配器选择      │ adapter: 'fetch' │ adapter: 'axios'            │
│ HTTP 方法       │ method: 'POST'   │ method: 'POST'              │
│ 请求体          │ body: JSON.stringify(data) │ data: {} (自动序列化) │
│ 请求头          │ headers: {}      │ headers: {}                 │
│ 超时            │ timeoutMs: 5000  │ timeoutMs: 5000             │
│ 缓存控制        │ cache: 'no-cache'│ headers: {'Cache-Control'} │
│ 携带凭证        │ credentials: 'include' │ withCredentials: true │
│ 查询参数        │ 手动拼接 URL     │ params: {}                  │
│ 响应类型        │ 自动检测         │ responseType: 'json'        │
│ 文件上传        │ body: formData   │ data: formData              │
└─────────────────┴──────────────────┴─────────────────────────────┘

recommended usage： 
1. explore environment: use fetch (no extra dependency)
2. Node.js environment: use axios (more complete features)
3. need advanced features (such as request cancellation, progress monitoring): use axios

Notes:
1. fetch uses body + JSON.stringify
2. axios uses data (automatically serialized)
3. cache control is different
4. both support unified timeoutMs、retry、interceptors etc.

*/
