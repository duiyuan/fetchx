# fetchx

，支持浏览器和 Node.js 环境的TypeScript HTTP 请求库。

## 特性

- 🌐 **跨平台支持**: 同时支持浏览器和 Node.js 环境
- 🔄 **灵活的适配器**: 支持 `fetch` 和 `axios` 两种请求方式
- 🔁 **智能重试**: 内置多种退避策略（固定、指数、指数抖动）
- ⏱️ **超时控制**: 支持请求超时配置
- 🎯 **拦截器**: 内置请求和响应拦截器
- 🌍 **全局配置**: 支持全局配置和局部配置合并
- 📦 **Tree-shakable**: 支持按需引入，减小打包体积
- 🔒 **类型安全**: 完整的 TypeScript 类型支持

## 安装

```bash
npm install @your-scope/retry-request
```

如果使用 axios 适配器，需要额外安装：

```bash
npm install axios
```

## 快速开始

### 基础使用

```typescript
import { request } from '@your-scope/retry-request';

// 简单的 GET 请求
const data = await request('https://api.example.com/users');

// POST 请求
const result = await request('https://api.example.com/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ name: 'John' }),
});
```

### 全局配置

```typescript
import { setGlobalConfig } from '@your-scope/retry-request';

setGlobalConfig({
  baseURL: 'https://api.example.com',
  headers: {
    'Authorization': 'Bearer token',
  },
  retry: {
    maxRetries: 3,
    baseDelayMs: 300,
    backoff: 'exponential-jitter',
  },
});
```

### 选择适配器

```typescript
// 使用 fetch (默认在浏览器中)
const data = await request('/api/users', {
  adapter: 'fetch',
});

// 使用 axios
const data = await request('/api/users', {
  adapter: 'axios',
});

// 自动选择 (浏览器用 fetch, Node.js 用 axios)
const data = await request('/api/users', {
  adapter: 'auto', // 默认值
});
```

## 高级功能

### 重试配置

```typescript
const data = await request('/api/users', {
  retry: {
    maxRetries: 5,              // 最大重试次数
    baseDelayMs: 200,           // 基础延迟时间（毫秒）
    maxDelayMs: 10000,          // 最大延迟时间（毫秒）
    backoff: 'exponential-jitter', // 退避策略
    retryOn: [429, 502, 503, 504], // 需要重试的状态码
    respectRetryAfter: true,    // 是否遵守 Retry-After 响应头
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

### 退避策略

支持三种退避策略：

- **`fixed`**: 固定延迟时间
- **`exponential`**: 指数增长延迟（2^attempt * baseDelayMs）
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
const data = await request('/api/users', {
  timeoutMs: 5000, // 5 秒超时
});
```

### 请求拦截器

```typescript
import { setGlobalConfig } from '@your-scope/retry-request';

setGlobalConfig({
  requestInterceptors: [
    async (config) => {
      // 添加认证 token
      const token = await getAuthToken();
      return {
        ...config,
        headers: {
          ...config.headers,
          'Authorization': `Bearer ${token}`,
        },
      };
    },
    async (config) => {
      // 添加请求日志
      console.log('发送请求:', config);
      return config;
    },
  ],
});
```

### 响应拦截器

```typescript
import { setGlobalConfig } from '@your-scope/retry-request';

setGlobalConfig({
  responseInterceptors: [
    async (data) => {
      // 处理响应数据
      console.log('收到响应:', data);
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
  baseURL: 'https://api.example.com',
  retry: { maxRetries: 3 },
});

// 局部配置会与全局配置合并
const data = await request('/users', {
  retry: { maxRetries: 5 }, // 覆盖全局的 maxRetries
  headers: { 'X-Custom': 'value' }, // 添加额外的 header
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
  requestInterceptors?: ((config: RequestConfig) => RequestConfig | Promise<RequestConfig>)[];
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

## 使用场景

### 处理 API 限流

```typescript
const data = await request('/api/rate-limited', {
  retry: {
    maxRetries: 5,
    retryOn: [429], // 只重试 429 Too Many Requests
    respectRetryAfter: true, // 遵守服务器的 Retry-After 响应头
    backoff: 'exponential-jitter',
  },
});
```

### 处理不稳定的网络

```typescript
const data = await request('/api/unstable', {
  timeoutMs: 10000, // 10 秒超时
  retry: {
    maxRetries: 3,
    retryOn: [502, 503, 504], // 重试服务器错误
    onRetry: (attempt, error) => {
      console.warn(`网络不稳定，第 ${attempt} 次重试...`);
    },
  },
});
```

### 微服务架构

```typescript
// 服务 A
setGlobalConfig({
  baseURL: 'https://service-a.example.com',
  headers: { 'X-Service': 'A' },
  retry: { maxRetries: 3 },
});

// 服务 B 使用不同配置
const dataB = await request('https://service-b.example.com/api', {
  baseURL: '', // 清空全局 baseURL
  retry: { maxRetries: 5 },
});
```

## 构建

```bash
npm run build
```

构建产物：

- `lib/index.cjs.js` - CommonJS 格式
- `lib/index.esm.js` - ES Module 格式
- `lib/index.d.ts` - TypeScript 类型定义

## License

MIT
