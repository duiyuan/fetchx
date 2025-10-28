# fetchx

支持浏览器和 Node.js 环境的TypeScript HTTP 请求库。

## 特性

- 🌐 **跨平台支持**: 同时支持浏览器和 Node.js 环境
- 🔄 **灵活的适配器**: 支持 `fetch` 和 `axios` 两种请求方式
- 🔁 **智能重试**: 仅对网络错误和特定HTTP状态码重试，避免无效重试
- ⏱️ **超时控制**: 支持请求超时配置
- 🎯 **拦截器**: 内置请求和响应拦截器
- 🌍 **全局配置**: 支持全局配置和局部配置合并
- 🔌 **代理支持**: 支持 HTTP/HTTPS 代理配置（Node.js）
- ❌ **内置取消**: 所有请求自带 `abort()` 方法，无需手动管理
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
    maxRetries: 3,  // 启用重试（默认0）
    baseDelayMs: 300,
    backoff: "exponential-jitter",
  },
});

// 注意：默认不重试，需要显式配置 maxRetries
// 启用后，只对网络错误（ECONNREFUSED等）和特定HTTP状态码（429, 502, 503, 504）重试
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

**默认策略：** FetchX 默认**不自动重试**，只有明确配置 `maxRetries > 0` 时才启用重试。

**智能重试：** 启用重试后，只对以下情况自动重试：
- ✅ **网络错误**：`ECONNREFUSED`, `ECONNRESET`, `ETIMEDOUT`（连接失败、超时）
- ✅ **HTTP状态码**：`429`（限流）, `502`, `503`, `504`（服务器错误）
- ❌ **不重试**：4xx 客户端错误（400, 401, 403, 404等）、用户手动取消

```typescript
// 基本重试配置
const data = await request("/api/users", "fetch", {
  retry: {
    maxRetries: 3, // 最大重试次数（默认0，不重试）
    baseDelayMs: 200, // 基础延迟时间（毫秒）
    maxDelayMs: 10000, // 最大延迟时间（毫秒）
    backoff: "exponential-jitter", // 退避策略
  },
});

// 自动重试的场景
// ✅ 网络连接失败（ECONNREFUSED）-> 自动重试
// ✅ 连接超时（ETIMEDOUT）-> 自动重试
// ✅ 服务器返回502/503 -> 自动重试
// ❌ 404 Not Found -> 立即失败，不重试
// ❌ 401 Unauthorized -> 立即失败，不重试

// 自定义重试逻辑
const data = await request("/api/users", "fetch", {
  retry: {
    maxRetries: 5,
    shouldRetry: (error, response, attempt) => {
      // 自定义：只重试500以上的服务器错误
      const status = response?.status || error?.status;
      return status >= 500 && attempt < 3;
    },
    onRetry: (attempt, error) => {
      console.log(`重试第 ${attempt} 次:`, error.message);
    },
  },
});

// 遵守服务器的 Retry-After 响应头
const data = await request("/api/users", "fetch", {
  retry: {
    maxRetries: 3,
    respectRetryAfter: true, // 默认 true
    // 如果服务器返回 Retry-After: 5，会等待5秒后重试
  },
});
```

### 可重试的错误类型

FetchX 智能识别可重试的错误，避免无效重试：

**✅ 自动重试的错误：**

| 错误类型 | 错误码 | 说明 | 原因 |
|---------|--------|------|------|
| 连接被拒绝 | `ECONNREFUSED` | 服务器未启动或端口不可达 | 临时性，重试可能成功 |
| 连接重置 | `ECONNRESET` | 连接被对方强制关闭 | 网络波动，重试可能成功 |
| 连接超时 | `ETIMEDOUT` | 连接建立超时 | 网络延迟，重试可能成功 |
| Socket超时 | `ESOCKETTIMEDOUT` | Socket读写超时 | 临时性超时，重试可能成功 |
| 网络不可达 | `ENETUNREACH` | 无法到达目标网络 | 路由问题，重试可能成功 |
| DNS查询超时 | `EAI_AGAIN` | DNS服务暂时不可用 | DNS临时故障，重试可能成功 |
| HTTP 429 | `429 Too Many Requests` | 请求频率限制 | 等待后重试 |
| HTTP 502 | `502 Bad Gateway` | 网关错误 | 上游服务临时故障 |
| HTTP 503 | `503 Service Unavailable` | 服务不可用 | 服务重启中 |
| HTTP 504 | `504 Gateway Timeout` | 网关超时 | 上游响应慢 |

**❌ 不会重试的错误：**
- 4xx 客户端错误（400, 401, 403, 404等）- 请求本身有问题
- 用户手动取消（AbortError）- 用户意图取消
- 其他网络错误（EHOSTUNREACH等）- 重试无意义

```typescript
// 示例：网络错误自动重试
const data = await request("/api/users", "fetch", {
  retry: {
    maxRetries: 3,
    baseDelayMs: 1000,
  },
});

// 场景1: ECONNREFUSED（服务器未启动）
// ✅ 自动重试3次：1秒后 -> 2秒后 -> 4秒后

// 场景2: 404 Not Found
// ❌ 立即失败，不重试（客户端错误，重试无意义）

// 场景3: 503 Service Unavailable
// ✅ 自动重试3次（服务器临时故障，可能恢复）
```

### 回退策略

支持三种回退策略：

- **`fixed`**: 固定延迟时间
- **`exponential`**: 指数增长延迟（2^attempt \* baseDelayMs）
- **`exponential-jitter`**: 指数增长 + 随机抖动（推荐，避免惊群效应）

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

### 请求取消（Abort）

FetchX 支持多种方式取消请求，所有请求都内置可取消功能。

> **注意**: Axios 的 `CancelToken` API 已被废弃，FetchX 统一使用现代的 `AbortController` 标准。

#### 方式 1: 直接调用 abort() 方法（推荐）

**最简单的方式**：每个请求都自带 `abort()` 方法，无需手动管理 AbortController。

```typescript
// 发起请求
const req = request("/api/users", "fetch");

// 随时可以取消
setTimeout(() => {
  req.abort();  // 直接调用 abort() 方法
  console.log("请求已取消");
}, 2000);

try {
  const data = await req;
  console.log(data);
} catch (error: any) {
  if (error.name === "AbortError") {
    console.log("请求被取消");
  }
}
```

```typescript
// Axios 适配器也支持
const req = request("/api/posts", "axios", {
  data: { title: "New Post" },
  method: "POST"
});

// 用户点击取消按钮
cancelButton.onclick = () => req.abort();

try {
  const data = await req;
} catch (error: any) {
  if (error.name === "AbortError") {
    console.log("用户取消了请求");
  }
}
```

#### 方式 2: 使用 AbortController（手动管理）

如果需要更细粒度的控制或共享一个 controller，可以手动管理：

```typescript
// 手动创建 controller
const controller = new AbortController();

// 传入 signal
const req = request("/api/users", "fetch", {
  signal: controller.signal,
});

// 仍然可以使用 req.abort()，也可以使用 controller.abort()
setTimeout(() => {
  controller.abort();  // 或 req.abort()
}, 5000);

try {
  const data = await req;
  console.log(data);
} catch (error: any) {
  if (error.name === "AbortError") {
    console.log("请求被取消");
  }
}
```

```typescript
// 多个请求共享一个 controller
const controller = new AbortController();

const req1 = request("/api/users", "fetch", { signal: controller.signal });
const req2 = request("/api/posts", "axios", { signal: controller.signal });
const req3 = request("/api/comments", "fetch", { signal: controller.signal });

// 一次性取消所有请求
controller.abort();

// 或者单独取消某个请求
req1.abort();  // 只取消第一个请求
```

#### 实际应用场景

**场景 1: 用户导航离开页面时取消请求（新API）**

```typescript
class DataService {
  private currentRequest: any = null;

  async fetchData(url: string) {
    // 取消之前的请求
    if (this.currentRequest) {
      this.currentRequest.abort();  // ✅ 直接调用 abort()
    }

    // 发起新请求
    this.currentRequest = request(url, "fetch");

    try {
      const data = await this.currentRequest;
      this.currentRequest = null;
      return data;
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("上一个请求被取消");
        return null;
      }
      throw error;
    }
  }

  // 清理方法
  cancelAll() {
    if (this.currentRequest) {
      this.currentRequest.abort();
      this.currentRequest = null;
    }
  }
}

// 使用示例
const service = new DataService();
await service.fetchData("/api/users");
// 用户快速切换页面
await service.fetchData("/api/posts"); // 自动取消上一个请求
```

**场景 2: 搜索防抖 + 自动取消（新API）**

```typescript
let currentSearch: any = null;

async function search(keyword: string) {
  // 取消上一次搜索
  if (currentSearch) {
    currentSearch.abort();  // ✅ 简单！
  }

  // 发起新搜索
  currentSearch = request(`/api/search?q=${keyword}`, "fetch");

  try {
    const results = await currentSearch;
    console.log("搜索结果:", results);
    currentSearch = null;
    return results;
  } catch (error: any) {
    if (error.name !== "AbortError") {
      console.error("搜索失败:", error);
    }
    return null;
  }
}

// 用户快速输入时，只有最后一次搜索会完成
search("rea");    // 被取消
search("reac");   // 被取消
search("react");  // 完成
```

**场景 3: React 组件中使用（推荐模式 - 新API）**

```typescript
import { useEffect, useState } from "react";
import { request } from "@dioxide-js/fetchx";

function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 直接发起请求
    const req = request("/api/users", "fetch");

    req
      .then(data => {
        setUsers(data);
        setLoading(false);
      })
      .catch(error => {
        if (error.name !== "AbortError") {
          console.error("加载失败:", error);
          setLoading(false);
        }
      });

    // 组件卸载时自动取消请求 - 超级简单！
    return () => req.abort();  // ✅ 一行代码搞定
  }, []);

  return <div>{loading ? "加载中..." : `共 ${users.length} 个用户`}</div>;
}
```

**场景 4: Vue 3 组合式 API（新API）**

```typescript
import { ref, onUnmounted } from "vue";
import { request } from "@dioxide-js/fetchx";

export function useUsers() {
  const users = ref([]);
  const loading = ref(true);
  
  // 发起请求
  const req = request("/api/users", "axios");

  req
    .then(data => {
      users.value = data;
      loading.value = false;
    })
    .catch(error => {
      if (error.name !== "AbortError") {
        console.error("加载失败:", error);
        loading.value = false;
      }
    });

  // 组件卸载时取消请求 - 简洁优雅
  onUnmounted(() => req.abort());  // ✅ 一行搞定

  return { users, loading };
}
```

**场景 5: 手动超时控制（新API）**

```typescript
async function requestWithManualTimeout(url: string, timeoutMs: number) {
  const req = request(url, "fetch");
  
  // 设置超时自动取消
  const timeoutId = setTimeout(() => {
    req.abort();  // ✅ 直接取消
  }, timeoutMs);

  try {
    const data = await req;
    clearTimeout(timeoutId);
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error(`请求超时 (${timeoutMs}ms)`);
    }
    throw error;
  }
}

// 使用
try {
  const data = await requestWithManualTimeout("/api/large-data", 3000);
  console.log(data);
} catch (error) {
  console.error(error.message); // "请求超时 (3000ms)"
}
```

**场景 6: 按钮点击取消上传**

```typescript
let uploadRequest: any = null;

function uploadFile(file: File) {
  // 取消之前的上传
  if (uploadRequest) {
    uploadRequest.abort();
  }
  
  const formData = new FormData();
  formData.append('file', file);
  
  uploadRequest = request("/api/upload", "axios", {
    method: "POST",
    data: formData,
  });
  
  return uploadRequest;
}

// HTML按钮
<button onclick="uploadRequest?.abort()">取消上传</button>
```

#### AbortController 兼容性

- ✅ **现代浏览器**: Chrome 66+, Firefox 57+, Safari 12.1+, Edge 16+
- ✅ **Node.js**: v15.0.0+ 原生支持，更早版本可使用 polyfill
- ✅ **Fetch API**: 原生支持
- ✅ **Axios**: v0.22.0+ 支持（推荐使用最新版本）

#### API 对比总结

| 方式 | 代码复杂度 | 推荐场景 |
|------|-----------|---------|
| **`req.abort()`** | ⭐ 最简单 | ✅ 大多数场景（推荐） |
| **`AbortController`** | ⭐⭐ 需要手动管理 | 多请求共享一个controller |
| **`timeoutMs`** | ⭐ 内置配置 | 简单的超时需求 |

```typescript
// ✅ 推荐：直接使用 abort() 方法
const req = request("/api/users", "fetch");
cancelButton.onclick = () => req.abort();

// ⚠️ 进阶：手动管理 AbortController
const controller = new AbortController();
const req = request("/api/users", "fetch", { signal: controller.signal });
controller.abort();

// ✅ 简单超时：使用 timeoutMs
const data = await request("/api/users", "fetch", {
  timeoutMs: 5000, // 5秒后自动超时
});

// 💡 组合使用：手动取消 + 超时保护
const req = request("/api/users", "fetch", { timeoutMs: 10000 });
cancelButton.onclick = () => req.abort();  // 可以提前取消
```

**推荐做法:**
- ✅ **默认使用** `req.abort()` - 最简单直接
- 📦 **进阶使用** `AbortController` - 需要多请求共享
- ⏱️ **超时配置** `timeoutMs` - 防止请求hanging
- 🔥 **两者结合** - 既有超时保护，又可手动取消

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
- **`signal`** - 请求取消（推荐使用 AbortController.signal）
  - ✅ 完全支持现代 AbortController API
  - ✅ 与 fetch 适配器保持一致的行为
  - ⚠️ `cancelToken` 已废弃，请使用 `signal` 代替
- `httpAgent` / `httpsAgent` - 自定义 HTTP/HTTPS Agent
- `validateStatus` - 自定义状态验证
- `transformRequest` / `transformResponse` - 数据转换
- `socketPath` - Unix Socket 路径
- 以及其他所有 Axios 配置选项

**Axios 完整配置示例：**

```typescript
// 示例1: 基本POST请求 + 代理
const result = await request("/api/data", "axios", {
  method: "POST",
  data: { key: "value" },
  params: { page: 1 },
  proxy: {
    protocol: "http",
    host: "127.0.0.1",
    port: 7890,
  },
  timeoutMs: 5000,
  responseType: "json",
  withCredentials: true,
});

// 示例2: 使用 AbortController 取消请求
const controller = new AbortController();

const promise = request("/api/users", "axios", {
  signal: controller.signal,  // ✅ 推荐：使用 AbortController
  proxy: {
    host: "127.0.0.1",
    port: 7890,
  },
});

// 可以随时取消请求
setTimeout(() => controller.abort(), 3000);

try {
  const data = await promise;
  console.log(data);
} catch (error: any) {
  if (error.name === 'AbortError') {
    console.log('请求已取消');
  }
}
```

**注意事项：**

- ✅ **推荐使用 `signal`（AbortController）** - 现代标准，与 fetch 一致
- ⚠️ **避免使用 `cancelToken`** - 已被 Axios 官方废弃
- 📦 Axios 需要 >= 0.22.0 版本才支持 AbortController


## 示例

查看 [examples.ts](./examples.ts)

---

© 2025 FetchX. MIT License

