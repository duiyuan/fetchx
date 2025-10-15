/**
 * fetchx 使用示例
 * 这个文件展示了库的各种使用方式
 */

import { request, setGlobalConfig } from "./src/index";

// ============================================
// 示例 1: 基础使用
// ============================================
async function example1_basic() {
  // 简单的 GET 请求
  const users = await request("https://api.example.com/users");
  console.log(users);

  // POST 请求
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
// 示例 2: 全局配置
// ============================================
async function example2_globalConfig() {
  // 设置全局配置
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

  // 之后的请求会自动使用全局配置
  const data = await request("/users"); // 实际请求: https://api.example.com/users
}

// ============================================
// 示例 3: 重试配置
// ============================================
async function example3_retry() {
  const data = await request("/api/unstable-endpoint", {
    retry: {
      maxRetries: 5,
      baseDelayMs: 200,
      maxDelayMs: 10000,
      backoff: "exponential-jitter",
      retryOn: [429, 502, 503, 504], // 这些状态码会触发重试
      respectRetryAfter: true, // 遵守服务器的 Retry-After 响应头
      shouldRetry: (error?: any, response?: any, attempt?: number) => {
        // 自定义重试逻辑
        console.log(`第 ${attempt} 次尝试失败`);
        return !!attempt && attempt < 3 && error && error.status >= 500;
      },
      onRetry: (attempt, error) => {
        console.log(`正在进行第 ${attempt} 次重试...`);
      },
    },
  });
}

// ============================================
// 示例 4: 超时控制
// ============================================
async function example4_timeout() {
  try {
    const data = await request("/api/slow-endpoint", {
      timeoutMs: 5000, // 5 秒超时
    });
  } catch (error) {
    console.error("请求超时:", error);
  }
}

// ============================================
// 示例 5: 选择适配器
// ============================================
async function example5_adapters() {
  // 使用 fetch (浏览器原生)
  const data1 = await request("/api/users", {
    adapter: "fetch",
  });

  // 使用 axios
  const data2 = await request("/api/users", {
    adapter: "axios",
  });

  // 自动选择 (浏览器用 fetch, Node.js 用 axios)
  const data3 = await request("/api/users", {
    adapter: "auto", // 默认值
  });
}

// ============================================
// 示例 6: 请求拦截器
// ============================================
async function example6_requestInterceptors() {
  setGlobalConfig({
    requestInterceptors: [
      // 拦截器 1: 添加认证 token
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
      // 拦截器 2: 添加时间戳
      async (config) => {
        return {
          ...config,
          headers: {
            ...config.headers,
            "X-Request-Time": new Date().toISOString(),
          },
        };
      },
      // 拦截器 3: 日志记录
      async (config) => {
        console.log("发送请求:", config);
        return config;
      },
    ],
  });
}

// ============================================
// 示例 7: 响应拦截器
// ============================================
async function example7_responseInterceptors() {
  setGlobalConfig({
    responseInterceptors: [
      // 拦截器 1: 日志记录
      async (data) => {
        console.log("收到响应:", data);
        return data;
      },
      // 拦截器 2: 统一错误处理
      async (data) => {
        if (data.code !== 0) {
          throw new Error(data.message || "请求失败");
        }
        return data.data; // 只返回实际数据
      },
      // 拦截器 3: 数据转换
      async (data) => {
        // 将时间戳转换为 Date 对象
        if (data.timestamp) {
          data.createdAt = new Date(data.timestamp);
        }
        return data;
      },
    ],
  });
}

// ============================================
// 示例 8: 处理 API 限流
// ============================================
async function example8_rateLimiting() {
  const data = await request("/api/rate-limited", {
    retry: {
      maxRetries: 5,
      retryOn: [429], // 只重试 429 Too Many Requests
      respectRetryAfter: true, // 遵守服务器的 Retry-After 响应头
      backoff: "exponential-jitter",
      onRetry: (attempt, error) => {
        console.log(`遇到限流，等待后第 ${attempt} 次重试...`);
      },
    },
  });
}

// ============================================
// 示例 9: 微服务架构
// ============================================
async function example9_microservices() {
  // 服务 A 的全局配置
  setGlobalConfig({
    baseURL: "https://service-a.example.com",
    headers: { "X-Service": "A" },
  });

  const dataA = await request("/api/data");

  // 调用服务 B 时覆盖全局配置
  const dataB = await request("https://service-b.example.com/api/data", {
    baseURL: "", // 清空全局 baseURL
    headers: { "X-Service": "B" },
  });
}

// ============================================
// 示例 10: 完整的实际应用
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
            // 处理未授权
            window.location.href = "/login";
            throw new Error("未授权");
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

// 类型定义
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

// 辅助函数
async function getAuthToken(): Promise<string> {
  // 实际应用中从 localStorage 或其他地方获取
  return "your-auth-token";
}

// 导出示例
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
