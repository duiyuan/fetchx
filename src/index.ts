import { isNode } from "./env";
import { fetchAdapter } from "./adapters/fetchAdapter";
import { axiosAdapter } from "./adapters/axiosAdapter";
import { getGlobalConfig } from "./config";
import type { RequestConfig } from "./core/type";

export async function request<T = any>(
  url: string,
  config: RequestConfig = {}
): Promise<T> {
  const global = getGlobalConfig();
  const mergedConfig: RequestConfig = {
    ...global,
    ...config,
    headers: { ...global.headers, ...config.headers },
    requestInterceptors: [
      ...(global.requestInterceptors || []),
      ...(config.requestInterceptors || []),
    ],
    responseInterceptors: [
      ...(global.responseInterceptors || []),
      ...(config.responseInterceptors || []),
    ],
  };

  const adapter = config.adapter || "auto";

  if (adapter === "fetch" || (!isNode && adapter === "auto")) {
    return fetchAdapter(url, mergedConfig);
  }

  return axiosAdapter(url, mergedConfig);
}

export { setGlobalConfig } from "./config";
export * from "./core/type";
