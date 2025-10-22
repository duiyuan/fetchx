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
    // Extract axios-specific options only
    method,
    data,
    params,
    responseType,
    withCredentials,
    maxRedirects,
    maxContentLength,
    maxBodyLength,
    decompress,
    validateStatus,
    transformRequest,
    transformResponse,
    socketPath,
    httpAgent,
    httpsAgent,
    proxy,
    cancelToken,
    signal,
    transitional,
    // Ignore fetch-specific options (body, cache, etc.)
    ...rest
  } = config;
  const fullUrl = baseURL ? new URL(url, baseURL).toString() : url;

  // Build axios config with only axios-compatible options
  let axiosConfig: any = {
    url: fullUrl,
    method: method || 'GET',
    headers,
    timeout: timeoutMs,
    data,
    params,
    responseType,
    withCredentials,
    maxRedirects,
    maxContentLength,
    maxBodyLength,
    decompress,
    validateStatus,
    transformRequest,
    transformResponse,
    socketPath,
    httpAgent,
    httpsAgent,
    proxy,
    cancelToken,
    signal,
    transitional,
  };
  
  // Remove undefined values
  Object.keys(axiosConfig).forEach(key => {
    if (axiosConfig[key] === undefined) {
      delete axiosConfig[key];
    }
  });

  for (const interceptor of requestInterceptors) {
    axiosConfig = (await interceptor(axiosConfig as any)) as any;
  }

  return withRetry(async () => {
    try {
      // Dynamic import of axios
      const axiosModule = await import("axios");
      const axios = axiosModule.default || axiosModule;
      
      // Make the request directly
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
