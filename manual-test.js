const { request, setGlobalConfig } = require('./lib/index.cjs.js');

async function testBasicRequest() {
  console.log('\n=== test basic get request ===');
  try {
    const data = await request('https://jsonplaceholder.typicode.com/posts/1', 'fetch');
    console.log('success:', data.title);
  } catch (error) {
    console.error('failed:', error.message);
  }
}

async function testPostRequest() {
  console.log('\n=== test post request ===');
  try {
    const data = await request('https://jsonplaceholder.typicode.com/posts', 'fetch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Test Post',
        body: 'This is a test',
        userId: 1,
      }),
    });
    console.log('success:', data.title);
  } catch (error) {
    console.error('failed:', error.message);
  }
}

async function testRetry() {
  console.log('\n=== test retry mechanism ===');
  let retryCount = 0;
  try {
    await request('https://this-domain-does-not-exist-12345.com', 'fetch', {
      retry: {
        maxRetries: 3,
        baseDelayMs: 200,
        onRetry: (attempt) => {
          retryCount = attempt;
          console.log(`retry ${attempt} times...`);
        },
      },
      timeoutMs: 1000,
    });
  } catch (error) {
    if (retryCount > 0) {
      console.log(`retry mechanism works, retry ${retryCount} times`);
    } else {
      console.log('retry not triggered (maybe network configuration problem)');
    }
  }
}

async function testAbort() {
  console.log('\n=== test request cancel ===');
  try {
    const req = request('https://jsonplaceholder.typicode.com/posts', 'fetch');
    
    // cancel request after 100ms
    setTimeout(() => {
      console.log('cancel request...');
      req.abort();
    }, 100);
    
    await req;
    console.log('request should be cancelled but not');
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('request cancelled successfully');
    } else {
      console.log('request cancelled, but error type is not AbortError:', error.name);
    }
  }
}

async function testInterceptors() {
  console.log('\n=== test interceptors ===');
  try {
    const data = await request('https://jsonplaceholder.typicode.com/posts/1', 'fetch', {
      requestInterceptors: [
        (config) => {
          console.log('request interceptor executed');
          return config;
        },
      ],
      responseInterceptors: [
        (data) => {
          console.log('response interceptor executed');
          return { ...data, intercepted: true };
        },
      ],
    });
    
    if (data.intercepted) {
      console.log('interceptor works');
    } else {
      console.log('interceptor not working');
    }
  } catch (error) {
    console.error('failed:', error.message);
  }
}

async function testGlobalConfig() {
  console.log('\n=== test global config ===');
  try {
    setGlobalConfig({
      baseURL: 'https://jsonplaceholder.typicode.com',
      headers: {
        'X-Custom-Header': 'test-value',
      },
    });
    
    const data = await request('/posts/1', 'fetch');
    console.log('global config works:', data.title);
    
    // reset global config
    setGlobalConfig({});
  } catch (error) {
    console.error('failed:', error.message);
  }
}

async function testAdapters() {
  console.log('\n=== test adapters ===');
  
  // test fetch adapter
  try {
    await request('https://jsonplaceholder.typicode.com/posts/1', 'fetch');
    console.log('fetch adapter works');
  } catch (error) {
    console.error('fetch adapter failed:', error.message);
  }
  
  // test axios adapter
  try {
    await request('https://jsonplaceholder.typicode.com/posts/1', 'axios');
    console.log('axios adapter works');
  } catch (error) {
    console.error('axios adapter failed:', error.message);
  }
}

// run all tests
async function runAllTests() {
  console.log('\n🚀 start fetchx feature verification\n');
  console.log('='.repeat(50));
  
  await testBasicRequest();
  await testPostRequest();
  await testAdapters();
  await testGlobalConfig();
  await testInterceptors();
  await testAbort();
  await testRetry();
  
  console.log('\n' + '='.repeat(50));
  console.log('\n✨ test completed!\n');
}

runAllTests().catch(console.error);

