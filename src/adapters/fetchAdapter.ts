import { withRetry } from "../core/retry";
import type { RequestConfig } from "../core/type";
import { isNode } from "../env";

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
    signal: externalSignal, // Extract the signal from config
    // Extract fetch-specific options
    body,
    cache,
    credentials,
    integrity,
    keepalive,
    mode,
    redirect,
    referrer,
    referrerPolicy,
    window,
    method,
    proxyUrl,
    ...rest
  } = config;
  const fullUrl = baseURL ? new URL(url, baseURL).toString() : url;

  // Build fetch config with only fetch-compatible options
  let finalConfig: RequestInit = {
    method,
    headers,
    body,
    cache,
    credentials,
    integrity,
    keepalive,
    mode,
    redirect,
    referrer,
    referrerPolicy,
    window,
  };
  
  // Remove undefined values
  Object.keys(finalConfig).forEach(key => {
    if (finalConfig[key as keyof RequestInit] === undefined) {
      delete finalConfig[key as keyof RequestInit];
    }
  });

  for (const interceptor of requestInterceptors) {
    finalConfig = await interceptor(finalConfig as any) as RequestInit;
  }

  return withRetry(async () => {
    const controller = new AbortController();
    
    // Listen to external signal if provided
    if (externalSignal) {
      // If external signal is already aborted, abort immediately
      if (externalSignal.aborted) {
        controller.abort();
      } else {
        // Listen to external signal's abort event
        externalSignal.addEventListener('abort', () => {
          controller.abort();
        }, { once: true });
      }
    }
    
    const timeout = timeoutMs
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

    try {
      // Setup proxy agent for Node.js environment
      let dispatcher: any;
      if (isNode && proxyUrl) {
        try {
          const { HttpsProxyAgent } = await import("https-proxy-agent");
          const proxyUrlString = typeof proxyUrl === 'string' 
            ? proxyUrl 
            : `${proxyUrl.protocol || 'http'}://${proxyUrl.auth ? `${proxyUrl.auth.username}:${proxyUrl.auth.password}@` : ''}${proxyUrl.host}:${proxyUrl.port}`;
          
          dispatcher = new HttpsProxyAgent(proxyUrlString);
        } catch (err) {
          console.warn('https-proxy-agent not available, proxy will be ignored. Install it with: npm install https-proxy-agent');
        }
      }

      const res = await fetch(fullUrl, {
        ...finalConfig,
        signal: controller.signal,
        ...(dispatcher ? { dispatcher } : {}),
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
