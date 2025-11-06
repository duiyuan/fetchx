/**
 * cancel request test
 */

import { describe, test, expect, jest } from '@jest/globals';
import { request } from '../src/index';

const TEST_API = 'https://jsonplaceholder.typicode.com';

describe('cancel request test', () => {
  test('cancel request by abort() method (fetch)', async () => {
    const req = request(`${TEST_API}/posts`, 'fetch');
    
    // cancel request immediately
    setTimeout(() => {
      req.abort();
    }, 10);

    try {
      await req;
      // if we can get the data, it means the request is not cancelled
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.name).toBe('AbortError');
    }
  }, 10000);

  test('cancel request by abort() method (axios)', async () => {
    const req = request(`${TEST_API}/posts`, 'axios');
    
    // cancel request immediately
    setTimeout(() => {
      req.abort();
    }, 10);

    try {
      await req;
      expect(true).toBe(false);
    } catch (error: any) {
      // Axios cancel request will also throw AbortError or CanceledError
      expect(['AbortError', 'CanceledError']).toContain(error.name);
    }
  }, 10000);

  test('manual create AbortController', async () => {
    const controller = new AbortController();
    
    const req = request(`${TEST_API}/posts`, 'fetch', {
      signal: controller.signal,
    });

    setTimeout(() => {
      controller.abort();
    }, 10);

    try {
      await req;
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.name).toBe('AbortError');
    }
  }, 10000);

  test('cancelled request should not return data', async () => {
    const req = request(`${TEST_API}/posts`, 'fetch');
    
    req.abort();

    try {
      const data = await req;
      // if we can get the data, it means the request is not cancelled
      expect(data).toBeUndefined();
    } catch (error: any) {
      expect(error.name).toBe('AbortError');
    }
  }, 10000);

  test('cancel request should not trigger retry', async () => {
    const onRetry = jest.fn();
    
    const req = request(`${TEST_API}/posts`, 'fetch', {
      retry: {
        maxRetries: 3,
        onRetry,
      },
    });

    setTimeout(() => {
      req.abort();
    }, 10);

    try {
      await req;
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.name).toBe('AbortError');
      // cancel request should not trigger retry
      expect(onRetry).not.toHaveBeenCalled();
    }
  }, 10000);

  test('cancel request before timeout', async () => {
    const startTime = Date.now();
    
    const req = request(`${TEST_API}/posts`, 'fetch', {
      timeoutMs: 5000,
    });

    setTimeout(() => {
      req.abort();
    }, 100);

    try {
      await req;
      expect(true).toBe(false);
    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      
      expect(error.name).toBe('AbortError');
      // should be cancelled before timeout
      expect(elapsed).toBeLessThan(2000);
    }
  }, 10000);

  test('multiple calls to abort() should not throw error', async () => {
    const req = request(`${TEST_API}/posts`, 'fetch');
    
    // multiple calls to abort()
    req.abort();
    req.abort();
    req.abort();

    try {
      await req;
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.name).toBe('AbortError');
    }
  }, 10000);

  test('use req.abort() and controller.abort() two ways', async () => {
    const controller = new AbortController();
    
    const req = request(`${TEST_API}/posts`, 'fetch', {
      signal: controller.signal,
    });

    // can use controller.abort() or req.abort()
    setTimeout(() => {
      if (Math.random() > 0.5) {
        controller.abort();
      } else {
        req.abort();
      }
    }, 10);

    try {
      await req;
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.name).toBe('AbortError');
    }
  }, 10000);
});

describe('real-world scenarios test', () => {
  test('scenario 1: auto cancel previous request', async () => {
    let currentRequest: any = null;
    const results: any[] = [];

    async function fetchData(id: number) {
      // cancel previous request
      if (currentRequest) {
        currentRequest.abort();
      }

      currentRequest = request(`${TEST_API}/posts/${id}`, 'fetch');

      try {
        const data = await currentRequest;
        results.push(data);
        currentRequest = null;
        return data;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          return null;
        }
        throw error;
      }
    }

    // send several requests quickly
    fetchData(1); // should be cancelled
    fetchData(2); // should be cancelled
    const result = await fetchData(3); // should be successful

    // wait a moment to ensure previous requests are cancelled
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(result).toBeDefined();
    expect(result.id).toBe(3);
    // only the last request should be successful
    expect(results.length).toBe(1);
    expect(results[0].id).toBe(3);
  }, 15000);

  test('scenario 2: search debounce - only keep the last search', async () => {
    let currentSearch: any = null;
    const searchResults: any[] = [];

    async function search(userId: number) {
      if (currentSearch) {
        currentSearch.abort();
      }

      currentSearch = request(`${TEST_API}/posts`, 'axios', {
        params: { userId },
      });

      try {
        const results = await currentSearch;
        searchResults.push({ userId, count: results.length });
        currentSearch = null;
        return results;
      } catch (error: any) {
        if (error.name === 'AbortError' || error.name === 'CanceledError') {
          return null;
        }
        throw error;
      }
    }

    // simulate user quickly input
    search(1); // cancel
    search(2); // cancel
    const finalResult = await search(3); // should be successful

    await new Promise(resolve => setTimeout(resolve, 500));

    expect(finalResult).toBeDefined();
    expect(Array.isArray(finalResult)).toBe(true);
    // only the last search should have result
    expect(searchResults.length).toBe(1);
    expect(searchResults[0].userId).toBe(3);
  }, 15000);

  test('scenario 3: manual timeout control', async () => {
    async function requestWithTimeout(url: string, timeoutMs: number) {
      const req = request(url, 'fetch');
      
      const timeoutId = setTimeout(() => {
        req.abort();
      }, timeoutMs);

      try {
        const data = await req;
        clearTimeout(timeoutId);
        return data;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout (${timeoutMs}ms)`);
        }
        throw error;
      }
    }

    try {
      // set a very short timeout
      await requestWithTimeout(`${TEST_API}/posts`, 1);
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.message).toContain('timeout');
    }
  }, 10000);

  test('scenario 4: user click cancel button', async () => {
    const uploadStates: string[] = [];
    let uploadRequest: any = null;

    function startUpload() {
      if (uploadRequest) {
        uploadRequest.abort();
      }

      uploadStates.push('started');
      
      uploadRequest = request(`${TEST_API}/posts`, 'fetch');

      uploadRequest
        .then(() => {
          uploadStates.push('completed');
          uploadRequest = null;
        })
        .catch((error: any) => {
          if (error.name === 'AbortError') {
            uploadStates.push('cancelled');
          } else {
            uploadStates.push('failed');
          }
          uploadRequest = null;
        });

      return uploadRequest;
    }

    function cancelUpload() {
      if (uploadRequest) {
        uploadRequest.abort();
      }
    }

    // start upload
    startUpload();
    
    // user click cancel
    setTimeout(() => {
      cancelUpload();
    }, 50);

    // wait for processing to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(uploadStates).toContain('started');
    expect(uploadStates).toContain('cancelled');
    expect(uploadStates).not.toContain('completed');
  }, 10000);
});

describe('AbortController compatibility test', () => {
  test('create AbortController', () => {
    const controller = new AbortController();
    expect(controller).toBeDefined();
    expect(controller.signal).toBeDefined();
    expect(typeof controller.abort).toBe('function');
  });

  test('test signal.aborted', () => {
    const controller = new AbortController();
    
    expect(controller.signal.aborted).toBe(false);
    
    controller.abort();
    
    expect(controller.signal.aborted).toBe(true);
  });

  test('listen to abort event', (done) => {
    const controller = new AbortController();
    
    controller.signal.addEventListener('abort', () => {
      expect(controller.signal.aborted).toBe(true);
      done();
    });

    controller.abort();
  }, 10000);
});

