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

export interface RequestConfig extends RequestInit {
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
