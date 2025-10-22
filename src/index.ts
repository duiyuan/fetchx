import { isNode } from "./env";
import { fetchAdapter } from "./adapters/fetchAdapter";
import { axiosAdapter } from "./adapters/axiosAdapter";
import { getGlobalConfig } from "./config";
import type { RequestConfig } from "./core/type";

export async function request<T = any>(
  url: string,
  adapter: "fetch" | "axios" | "auto" = "fetch",
  config?: RequestConfig
): Promise<T> {
  const global = getGlobalConfig();
  const mergedConfig: RequestConfig = {
    ...global,
    ...config,
    headers: { ...global.headers, ...config?.headers },
    requestInterceptors: [
      ...(global.requestInterceptors || []),
      ...(config?.requestInterceptors || []),
    ],
    responseInterceptors: [
      ...(global.responseInterceptors || []),
      ...(config?.responseInterceptors || []),
    ],
  };

  if (adapter === "fetch") {
    return fetchAdapter(url, mergedConfig);
  }

  if (adapter === "axios") {
    return axiosAdapter(url, mergedConfig);
  }

  // auto: automatically choose based on environment
  if (adapter === "auto") {
    return !isNode ? fetchAdapter(url, mergedConfig) : axiosAdapter(url, mergedConfig);
  }

  // Default to fetch if unknown adapter
  return fetchAdapter(url, mergedConfig);
}

export { setGlobalConfig } from "./config";
export * from "./core/type";
