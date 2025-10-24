# fetchx

支持浏览器和 Node.js 环境的TypeScript HTTP 请求库。

## 特性

- 🌐 **跨平台支持**: 同时支持浏览器和 Node.js 环境
- 🔄 **灵活的适配器**: 支持 `fetch` 和 `axios` 两种请求方式
- 🔁 **智能重试**: 内置多种退避策略（固定、指数、指数抖动）
- ⏱️ **超时控制**: 支持请求超时配置
- 🎯 **拦截器**: 内置请求和响应拦截器
- 🌍 **全局配置**: 支持全局配置和局部配置合并
- 🔌 **代理支持**: 支持 HTTP/HTTPS 代理配置（Node.js）
- 📦 **Tree-shakable**: 支持按需引入，减小打包体积
- 🔒 **类型安全**: 完整的 TypeScript 类型支持

## 安装

```bash
npm install @dioxide-js/fetchx
```

如果使用 axios 适配器，需要额外安装：

```bash
npm install axios
```

如果需要在 Node.js 环境中使用 fetch 适配器的代理功能，需要额外安装：

```bash
npm install https-proxy-agent
```

## 快速开始

### 基础使用

```typescript
import { request } from "@dioxide-js/fetchx";

// 简单的 GET 请求
const data = await request("https://api.example.com/users");

// POST 请求
const result = await request("https://api.example.com/users", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ name: "John" }),
});
```

### 全局配置

```typescript
import { setGlobalConfig } from "@dioxide-js/fetchx";

setGlobalConfig({
  baseURL: "https://api.example.com",
  headers: {
    Authorization: "Bearer token",
  },
  retry: {
    maxRetries: 3,
    baseDelayMs: 300,
    backoff: "exponential-jitter",
  },
});
```

### 选择适配器

```typescript
// 使用 fetch (默认在浏览器中)
const data = await request("/api/users", {
  adapter: "fetch",
});

// 使用 axios
const data = await request("/api/users", {
  adapter: "axios",
});

// 自动选择 (浏览器用 fetch, Node.js 用 axios)
const data = await request("/api/users", {
  adapter: "auto", // 默认值
});
```

## 高级功能

### 重试配置

```typescript
const data = await request("/api/users", {
  retry: {
    maxRetries: 5, // 最大重试次数
    baseDelayMs: 200, // 基础延迟时间（毫秒）
    maxDelayMs: 10000, // 最大延迟时间（毫秒）
    backoff: "exponential-jitter", // 退避策略
    retryOn: [429, 502, 503, 504], // 需要重试的状态码
    respectRetryAfter: true, // 是否遵守 Retry-After 响应头
    shouldRetry: (error, response, attempt) => {
      // 自定义重试逻辑
      return attempt < 3 && error.status >= 500;
    },
    onRetry: (attempt, error) => {
      console.log(`重试第 ${attempt} 次:`, error.message);
    },
  },
});
```

### 回退策略

支持三种回退策略：

- **`fixed`**: 固定延迟时间
- **`exponential`**: 指数增长延迟（2^attempt \* baseDelayMs）
- **`exponential-jitter`**: 指数增长 + 随机抖动（推荐）

```typescript
// 固定延迟：每次都等待 1 秒
retry: {
  backoff: 'fixed',
  baseDelayMs: 1000,
}

// 指数延迟：200ms, 400ms, 800ms, 1600ms...
retry: {
  backoff: 'exponential',
  baseDelayMs: 200,
}

// 指数延迟 + 抖动（避免惊群效应）
retry: {
  backoff: 'exponential-jitter',
  baseDelayMs: 200,
}
```

### 超时控制

```typescript
const data = await request("/api/users", {
  timeoutMs: 5000, // 5 秒超时
});
```

### 请求拦截

```typescript
import { setGlobalConfig } from "@dioxide-js/fetchx";

setGlobalConfig({
  requestInterceptors: [
    async (config) => {
      // 添加认证 token
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
      // 添加请求日志
      console.log("发送请求:", config);
      return config;
    },
  ],
});
```

### 响应拦截

```typescript
import { setGlobalConfig } from "@dioxide-js/fetchx";

setGlobalConfig({
  responseInterceptors: [
    async (data) => {
      // 处理响应数据
      console.log("收到响应:", data);
      return data;
    },
    async (data) => {
      // 数据转换
      if (data.code !== 0) {
        throw new Error(data.message);
      }
      return data.data;
    },
  ],
});
```

### 局部配置覆盖全局配置

```typescript
// 全局配置
setGlobalConfig({
  baseURL: "https://api.example.com",
  retry: { maxRetries: 3 },
});

// 局部配置会与全局配置合并
const data = await request("/users", {
  retry: { maxRetries: 5 }, // 覆盖全局的 maxRetries
  headers: { "X-Custom": "value" }, // 添加额外的 header
});
```

## API 参考

### `request<T>(url: string, config?: RequestConfig): Promise<T>`

发送 HTTP 请求。

**参数:**

- `url`: 请求 URL
- `config`: 请求配置（可选）

**返回:** Promise，解析为响应数据

### `setGlobalConfig(config: Partial<GlobalConfig>): void`

设置全局配置。

### 类型定义

```typescript
interface RequestConfig extends RequestInit {
  baseURL?: string;
  retry?: RetryOptions;
  headers?: Record<string, string>;
  adapter?: "fetch" | "axios" | "auto";
  timeoutMs?: number;
  requestInterceptors?: ((
    config: RequestConfig
  ) => RequestConfig | Promise<RequestConfig>)[];
  responseInterceptors?: ((res: any) => any | Promise<any>)[];
}

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoff?: "fixed" | "exponential" | "exponential-jitter";
  retryOn?: number[];
  timeoutMs?: number;
  respectRetryAfter?: boolean;
  shouldRetry?: (error?: any, res?: any, attempt?: number) => boolean;
  onRetry?: (attempt: number, error?: any, res?: any) => void;
}
```

### HTTP 代理支持

FetchX 支持在 Node.js 环境中使用 HTTP/HTTPS 代理。

#### 使用 Fetch 适配器配置代理

如果使用 fetch 适配器，需要先安装 `https-proxy-agent`：

```bash
npm install https-proxy-agent
```

然后配置代理：

```typescript
// 方式 1: 使用代理 URL 字符串
const data = await request("/api/users", {
  adapter: "fetch",
  proxyUrl: "http://127.0.0.1:7890",
});

// 方式 2: 使用详细配置对象
const data = await request("/api/users", {
  adapter: "fetch",
  proxyUrl: {
    protocol: "http",
    host: "127.0.0.1",
    port: 7890,
  },
});

// 方式 3: 带认证的代理
const data = await request("/api/users", {
  adapter: "fetch",
  proxyUrl: {
    protocol: "http",
    host: "proxy.example.com",
    port: 8080,
    auth: {
      username: "user",
      password: "pass",
    },
  },
});
```

#### 使用 Axios 适配器配置代理

Axios 适配器原生支持代理配置，无需额外安装依赖：

```typescript
// 方式 1: 基本代理配置（推荐）
const data = await request("/api/users", "axios", {
  proxy: {
    protocol: "http",  // 或 "https"
    host: "127.0.0.1",
    port: 7890,
  },
});

// 方式 2: 带认证的代理
const data = await request("/api/users", "axios", {
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

// 方式 3: HTTPS 代理
const data = await request("https://api.example.com/data", "axios", {
  proxy: {
    protocol: "https",
    host: "secure-proxy.example.com",
    port: 443,
  },
});

// 方式 4: 显式禁用代理（忽略环境变量）
const data = await request("/api/users", "axios", {
  proxy: false,
});

// 方式 5: 在全局配置中设置（仅对axios生效）
import { setGlobalConfig, request } from "@dioxide-js/fetchx";

// 注意：全局代理配置需要在每个请求中单独设置
// 因为axios的proxy配置不能合并
const proxyConfig = {
  protocol: "http",
  host: "127.0.0.1",
  port: 7890,
};

// 每次请求都需要传入proxy配置
const data1 = await request("/api/users", "axios", { proxy: proxyConfig });
const data2 = await request("/api/posts", "axios", { proxy: proxyConfig });
```

**Axios 代理工作原理：**

在 Node.js 环境中，axios 会根据目标 URL 的协议自动选择合适的代理：
- 对于 `http://` 请求，使用 HTTP 代理
- 对于 `https://` 请求，使用 HTTPS 代理或 HTTP 隧道（CONNECT 方法）

**环境变量支持：**

Axios 也支持通过环境变量配置代理（Node.js环境）：
```bash
# HTTP 代理
export HTTP_PROXY=http://127.0.0.1:7890
export http_proxy=http://127.0.0.1:7890

# HTTPS 代理
export HTTPS_PROXY=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890

# 不使用代理的主机列表
export NO_PROXY=localhost,127.0.0.1
export no_proxy=localhost,127.0.0.1
```

如果设置了环境变量，axios 会自动使用。使用 `proxy: false` 可以忽略环境变量。

**注意：**
- **代理配置仅在 Node.js 环境中生效** - 这是浏览器安全限制，JavaScript无法直接配置代理
- **浏览器环境中如何使用代理？**
  - 通过操作系统的网络代理设置（系统偏好设置/网络设置）
  - 使用浏览器代理扩展（如 SwitchyOmega、FoxyProxy）
  - 浏览器启动参数：`chrome --proxy-server="http://127.0.0.1:7890"`
  - 所有通过浏览器发送的请求会自动使用已配置的代理
- Fetch 适配器的代理支持需要安装 `https-proxy-agent`（Node.js环境）
- Axios 适配器原生支持代理，无需额外安装（Node.js环境）

## Axios 特有配置

FetchX 完整支持所有 Axios 配置参数！当使用 `adapter: 'axios'` 时，你可以访问：

- `data` - 请求体（自动序列化）
- `params` - 查询参数（自动转换为 URL）
- `withCredentials` - 发送凭证
- `responseType` - 响应类型（'arraybuffer' | 'blob' | 'document' | 'json' | 'text' | 'stream'）
- `maxRedirects` - 最大重定向数
- **`proxy`** - HTTP/HTTPS 代理配置（Node.js环境，浏览器自动忽略）
  - 支持 HTTP 和 HTTPS 代理
  - 支持代理认证
  - 支持环境变量（HTTP_PROXY, HTTPS_PROXY, NO_PROXY）
  - 可设置为 `false` 禁用代理
- `httpAgent` / `httpsAgent` - 自定义 HTTP/HTTPS Agent
- `validateStatus` - 自定义状态验证
- `transformRequest` / `transformResponse` - 数据转换
- `signal` - 请求取消（AbortSignal）
- `socketPath` - Unix Socket 路径
- 以及其他所有 Axios 配置选项

**代理配置示例：**

```typescript
// Axios适配器完整示例（包含代理）
const result = await request("/api/data", "axios", {
  method: "POST",
  data: { key: "value" },
  params: { page: 1 },
  proxy: {
    protocol: "http",
    host: "127.0.0.1",
    port: 7890,
  },
  timeout: 5000,
  responseType: "json",
  withCredentials: true,
});
```


## 示例

查看 [examples.ts](./examples.ts)

---

© 2025 FetchX. MIT License

