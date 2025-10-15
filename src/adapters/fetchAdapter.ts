import { withRetry } from "../core/retry";
import type { RequestConfig } from "../core/type";

export async function fetchAdapter<T = any>(
  url: string,
  config: RequestConfig = {}
): Promise<T> {
  const {
    baseURL = "",
    retry,
    timeoutMs,
    headers,
    requestInterceptors = [],
    responseInterceptors = [],
    ...rest
  } = config;
  const fullUrl = baseURL ? new URL(url, baseURL).toString() : url;

  let finalConfig: RequestConfig = { ...rest, headers };

  for (const interceptor of requestInterceptors) {
    finalConfig = await interceptor(finalConfig);
  }

  return withRetry(async () => {
    const controller = new AbortController();
    const timeout = timeoutMs
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

    try {
      const res = await fetch(fullUrl, {
        ...finalConfig,
        signal: controller.signal,
      });

      if (!res.ok) {
        const err: any = new Error(`HTTP ${res.status}`);
        err.status = res.status;
        err.response = { status: res.status, headers: res.headers };
        throw err;
      }

      const contentType = res.headers.get("content-type");
      let data: any;

      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      for (const interceptor of responseInterceptors) {
        data = await interceptor(data);
      }

      return data as T;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }, retry);
}
