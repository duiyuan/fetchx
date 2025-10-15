import type { AxiosRequestConfig } from "axios";
import { withRetry } from "../core/retry";
import type { RequestConfig } from "../core/type";

export async function axiosAdapter<T = any>(
  url: string,
  config: RequestConfig = {}
): Promise<T> {
  const {
    baseURL = "",
    retry,
    headers,
    timeoutMs,
    requestInterceptors = [],
    responseInterceptors = [],
    ...rest
  } = config;
  const fullUrl = baseURL ? new URL(url, baseURL).toString() : url;

  let axiosConfig: AxiosRequestConfig = {
    url: fullUrl,
    headers,
    timeout: timeoutMs,
    ...rest,
  };

  for (const interceptor of requestInterceptors) {
    axiosConfig = (await interceptor(axiosConfig as any)) as any;
  }

  return withRetry(async () => {
    try {
      // Dynamic import of axios to avoid bundling when not used
      const axios = (await import("axios")).default;
      const res = await axios(axiosConfig);
      let data = res.data;
      for (const interceptor of responseInterceptors) {
        data = await interceptor(data);
      }
      return data as T;
    } catch (err: any) {
      // Normalize axios error structure
      if (err.response) {
        const error: any = new Error(`HTTP ${err.response.status}`);
        error.status = err.response.status;
        error.response = err.response;
        throw error;
      }
      throw err;
    }
  }, retry);
}
