import type { GlobalConfig } from "./core/type";

let globalConfig: GlobalConfig = {
  baseURL: "",
  headers: {},
  retry: {
    maxRetries: 2,
    baseDelayMs: 200,
    backoff: "exponential-jitter",
  },
  requestInterceptors: [],
  responseInterceptors: [],
};

export function setGlobalConfig(config: Partial<GlobalConfig>) {
  globalConfig = {
    ...globalConfig,
    ...config,
    headers: { ...globalConfig.headers, ...config.headers },
    retry: { ...globalConfig.retry, ...config.retry },
    requestInterceptors: [
      ...(globalConfig.requestInterceptors || []),
      ...(config.requestInterceptors || []),
    ],
    responseInterceptors: [
      ...(globalConfig.responseInterceptors || []),
      ...(config.responseInterceptors || []),
    ],
  };
}

export function getGlobalConfig(): GlobalConfig {
  return globalConfig;
}
