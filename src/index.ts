import { isNode } from "./env";
import { fetchAdapter } from "./adapters/fetchAdapter";
import { axiosAdapter } from "./adapters/axiosAdapter";
import { getGlobalConfig } from "./config";
import type { RequestConfig, AbortableRequest } from "./core/type";

/**
 * Create an abortable request that can be cancelled
 * @param executor - Function that executes the request with a signal
 * @param userSignal - Optional user-provided AbortSignal
 */
function createAbortableRequest<T>(
  executor: (signal: AbortSignal) => Promise<T>,
  userSignal?: AbortSignal
): AbortableRequest<T> {
  // Always create internal controller for the abort() method
  const controller = new AbortController();
  
  // Determine which signal to use
  let effectiveSignal: AbortSignal;
  
  if (userSignal) {
    // If user provided signal, we need to listen to both signals
    // Create a combined signal that aborts when either signal is aborted
    effectiveSignal = controller.signal;
    
    // Listen to user's signal
    if (!userSignal.aborted) {
      userSignal.addEventListener('abort', () => {
        controller.abort();
      }, { once: true });
    } else {
      // User's signal is already aborted
      controller.abort();
    }
  } else {
    // No user signal, just use internal controller
    effectiveSignal = controller.signal;
  }
  
  // Execute the request
  const promise = executor(effectiveSignal);
  
  // Create abortable promise by extending the promise
  const abortablePromise = promise as AbortableRequest<T>;
  
  // Add abort method
  abortablePromise.abort = () => {
    if (!controller.signal.aborted) {
      controller.abort();
    }
  };
  
  // Add controller reference
  abortablePromise.controller = controller;
  
  return abortablePromise;
}

export function request<T = any>(
  url: string,
  adapter: "fetch" | "axios" | "auto" = "fetch",
  config?: RequestConfig
): AbortableRequest<T> {
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

  // Extract user's signal if provided
  const userSignal = mergedConfig.signal;

  return createAbortableRequest<T>(
    (signal) => {
      // Merge the signal into config
      const finalConfig = { ...mergedConfig, signal };

      if (adapter === "fetch") {
        return fetchAdapter(url, finalConfig);
      }

      if (adapter === "axios") {
        return axiosAdapter(url, finalConfig);
      }

      // auto: automatically choose based on environment
      if (adapter === "auto") {
        return !isNode ? fetchAdapter(url, finalConfig) : axiosAdapter(url, finalConfig);
      }

      // Default to fetch if unknown adapter
      return fetchAdapter(url, finalConfig);
    },
    userSignal
  );
}

export { setGlobalConfig } from "./config";
export * from "./core/type";
