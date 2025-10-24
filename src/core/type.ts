export type BackoffStrategy = "fixed" | "exponential" | "exponential-jitter";

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoff?: BackoffStrategy;
  retryOn?: number[];
  timeoutMs?: number;
  respectRetryAfter?: boolean;
  shouldRetry?: (error?: any, res?: any, attempt?: number) => boolean;
  onRetry?: (attempt: number, error?: any, res?: any) => void;
}

/**
 * Axios specific config
 * only valid when adapter: 'axios'
 * 
 * @example
 * request('/api/data', {
 *   adapter: 'axios',
 *   data: { name: 'test' },          
 *   params: { page: 1 },             
 *   withCredentials: true,           
 *   responseType: 'json',            
 *   maxRedirects: 5,                 
 *   validateStatus: (s) => s < 500, 
 * })
 */
export interface AxiosSpecificConfig {
  /**
   * request data (axios uses 'data' instead of 'body')
   * will be automatically serialized to JSON
   */
  data?: any;
  
  /**
   * query parameters (axios automatically converts to query string)
   * @example { page: 1, limit: 10 } -> ?page=1&limit=10
   */
  params?: Record<string, any>;
  
  /**
   * response data type
   * @default 'json'
   */
  responseType?: "arraybuffer" | "blob" | "document" | "json" | "text" | "stream";
  
  /**
   * whether to include credentials (cookies, authentication headers, etc.) when sending cross-origin requests
   */
  withCredentials?: boolean;
  
  /**
   * @default 5
   */
  maxRedirects?: number;
  
  maxContentLength?: number;
  maxBodyLength?: number;
  decompress?: boolean;
  validateStatus?: (status: number) => boolean;
  transformRequest?: Array<(data: any, headers?: any) => any>;
  transformResponse?: Array<(data: any) => any>;
  socketPath?: string | null;
  httpAgent?: any;
  httpsAgent?: any;

  proxy?: false | {
    protocol?: string;
    host: string;
    port: number;
    auth?: {
      username: string;
      password: string;
    };
  };
  cancelToken?: any;
  signal?: AbortSignal;
  transitional?: {
    silentJSONParsing?: boolean;
    forcedJSONParsing?: boolean;
    clarifyTimeoutError?: boolean;
  };
  method?: string;
  url?: string;
}

// Base configuration that works for both fetch and axios
export interface BaseRequestConfig {
  // Common options
  baseURL?: string;
  retry?: RetryOptions;
  headers?: Record<string, string>;
  method?: string;
  timeoutMs?: number;
  
  // Interceptors
  requestInterceptors?: ((
    config: RequestConfig
  ) => RequestConfig | Promise<RequestConfig>)[];
  responseInterceptors?: ((res: any) => any | Promise<any>)[];
}

// Fetch specific options (from RequestInit)
export interface FetchSpecificConfig {
  body?: BodyInit | null;
  cache?: RequestCache;
  credentials?: RequestCredentials;
  integrity?: string;
  keepalive?: boolean;
  mode?: RequestMode;
  redirect?: RequestRedirect;
  referrer?: string;
  referrerPolicy?: ReferrerPolicy;
  window?: null;
  
  /**
   * HTTP/HTTPS proxy configuration for fetch adapter (Node.js only)
   * 
   * ⚠️ Browser Limitation: Due to browser security restrictions, JavaScript cannot 
   * directly configure proxies in browser environments. This configuration only 
   * works in Node.js.
   * 
   * For browsers, configure proxy via:
   * - System network settings (macOS/Windows/Linux)
   * - Browser proxy extensions (SwitchyOmega, FoxyProxy)
   * - Browser launch parameters: chrome --proxy-server="http://127.0.0.1:7890"
   * 
   * @example
   * // Simple URL string
   * {
   *   proxyUrl: 'http://127.0.0.1:7890'
   * }
   * 
   * @example
   * // Detailed configuration
   * {
   *   proxyUrl: {
   *     protocol: 'http',
   *     host: '127.0.0.1',
   *     port: 7890,
   *     auth: { username: 'user', password: 'pass' }
   *   }
   * }
   */
  proxyUrl?: string | {
    protocol?: string;
    host: string;
    port: number;
    auth?: {
      username: string;
      password: string;
    };
  };
}

// Combined RequestConfig that supports both fetch and axios options
export type RequestConfig = BaseRequestConfig & AxiosSpecificConfig & Partial<FetchSpecificConfig> & {
  // Allow any additional properties
  [key: string]: any;
}

export interface GlobalConfig {
  baseURL?: string;
  headers?: Record<string, string>;
  retry?: RetryOptions;
  requestInterceptors?: ((
    config: RequestConfig
  ) => RequestConfig | Promise<RequestConfig>)[];
  responseInterceptors?: ((res: any) => any | Promise<any>)[];
}

export type RequestFunction = <T = any>(
  url: string,
  config?: RequestConfig
) => Promise<T>;
