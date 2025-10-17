/**
 * fetchx examples
 */

import { request, setGlobalConfig } from "./src/index";

// ============================================
// example 1: basic usage
// ============================================
async function example1_basic() {
  const users = await request("https://api.example.com/users");
  console.log(users);

  const newUser = await request("https://api.example.com/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: "John", email: "john@example.com" }),
  });
  console.log(newUser);
}

// ============================================
// example 2: global config
// ============================================
async function example2_globalConfig() {
  setGlobalConfig({
    baseURL: "https://api.example.com",
    headers: {
      Authorization: "Bearer your-token-here",
      "X-App-Version": "1.0.0",
    },
    retry: {
      maxRetries: 3,
      baseDelayMs: 300,
      backoff: "exponential-jitter",
    },
  });

  const data = await request("/users");
}

// ============================================
// example 3: retry config
// ============================================
async function example3_retry() {
  const data = await request("/api/unstable-endpoint", {
    retry: {
      maxRetries: 5,
      baseDelayMs: 200,
      maxDelayMs: 10000,
      backoff: "exponential-jitter",
      retryOn: [429, 502, 503, 504],
      respectRetryAfter: true,
      shouldRetry: (error?: any, response?: any, attempt?: number) => {
        console.log(`Attempt ${attempt} failed`);
        return !!attempt && attempt < 3 && error && error.status >= 500;
      },
      onRetry: (attempt, error) => {
        console.log(`Retrying attempt ${attempt}...`);
      },
    },
  });
}

// ============================================
// example 4: timeout control
// ============================================
async function example4_timeout() {
  try {
    const data = await request("/api/slow-endpoint", {
      timeoutMs: 5000,
    });
  } catch (error) {
    console.error("Request timeout:", error);
  }
}

// ============================================
// example 5: choose adapter
// ============================================
async function example5_adapters() {
  const data1 = await request("/api/users", {
    adapter: "fetch",
  });

  const data2 = await request("/api/users", {
    adapter: "axios",
  });

  const data3 = await request("/api/users", {
    adapter: "auto",
  });
}

// ============================================
// example 6: request interceptors
// ============================================
async function example6_requestInterceptors() {
  setGlobalConfig({
    requestInterceptors: [
      async (config) => {
        const token = await getAuthToken();
        return {
          ...config,
          headers: {
            ...config.headers,
            Authorization: `Bearer ${token}`,
          },
        };
      },
      async (config) => {
        return {
          ...config,
          headers: {
            ...config.headers,
            "X-Request-Time": new Date().toISOString(),
          },
        };
      },
      async (config) => {
        console.log("Sending request:", config);
        return config;
      },
    ],
  });
}

// ============================================
// example 7: response interceptors
// ============================================
async function example7_responseInterceptors() {
  setGlobalConfig({
    responseInterceptors: [
      async (data) => {
        console.log("Received response:", data);
        return data;
      },
      async (data) => {
        if (data.code !== 0) {
          throw new Error(data.message || "Request failed");
        }
        return data.data;
      },
      async (data) => {
        if (data.timestamp) {
          data.createdAt = new Date(data.timestamp);
        }
        return data;
      },
    ],
  });
}

// ============================================
// example 8: handle API rate limiting
// ============================================
async function example8_rateLimiting() {
  const data = await request("/api/rate-limited", {
    retry: {
      maxRetries: 5,
      retryOn: [429],
      respectRetryAfter: true,
      backoff: "exponential-jitter",
      onRetry: (attempt, error) => {
        console.log(`遇到限流，等待后第 ${attempt} 次重试...`);
      },
    },
  });
}

// ============================================
// example 9: microservices architecture
// ============================================
async function example9_microservices() {
  setGlobalConfig({
    baseURL: "https://service-a.example.com",
    headers: { "X-Service": "A" },
  });

  const dataA = await request("/api/data");

  const dataB = await request("https://service-b.example.com/api/data", {
    baseURL: "",
    headers: { "X-Service": "B" },
  });
}

// ============================================
// example 10: complete real-world application
// ============================================
class UserService {
  constructor() {
    setGlobalConfig({
      baseURL: "https://api.example.com",
      retry: {
        maxRetries: 3,
        backoff: "exponential-jitter",
      },
      requestInterceptors: [
        async (config) => {
          const token = localStorage.getItem("auth_token");
          if (token) {
            return {
              ...config,
              headers: {
                ...config.headers,
                Authorization: `Bearer ${token}`,
              },
            };
          }
          return config;
        },
      ],
      responseInterceptors: [
        async (data) => {
          if (data.code === 401) {
            window.location.href = "/login";
            throw new Error("Unauthorized");
          }
          if (data.code !== 0) {
            throw new Error(data.message);
          }
          return data.data;
        },
      ],
    });
  }

  async getUsers() {
    return request<User[]>("/users", {
      timeoutMs: 5000,
    });
  }

  async getUser(id: string) {
    return request<User>(`/users/${id}`);
  }

  async createUser(userData: CreateUserDto) {
    return request<User>("/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, userData: Partial<User>) {
    return request<User>(`/users/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: string) {
    return request<void>(`/users/${id}`, {
      method: "DELETE",
    });
  }
}

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

interface CreateUserDto {
  name: string;
  email: string;
  password: string;
}

async function getAuthToken(): Promise<string> {
  return "your-auth-token";
}

export {
  example1_basic,
  example2_globalConfig,
  example3_retry,
  example4_timeout,
  example5_adapters,
  example6_requestInterceptors,
  example7_responseInterceptors,
  example8_rateLimiting,
  example9_microservices,
  UserService,
};
