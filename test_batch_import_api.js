/**
 * Test script for batch import API endpoints
 * Run this after restarting the server to verify the fixes
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';

function testEndpoint(endpoint, method = 'GET', headers = {}) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: endpoint,
      method: method,
      headers: headers
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data,
          endpoint: endpoint
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        error: error.message,
        endpoint: endpoint
      });
    });

    if (method === 'POST') {
      req.write('');
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Batch Import API Endpoints\n');
  
  console.log('1. Testing template endpoint (should return 401 without auth):');
  const result1 = await testEndpoint('/api/v1/batch-import/template/residents');
  console.log(`   Status: ${result1.status}`);
  if (result1.data && result1.data.includes('batch-import')) {
    console.log('   ✅ Endpoint is registered!');
  } else {
    console.log('   ❌ Endpoint not found');
  }
  
  console.log('\n2. Testing history endpoint (should return 401 without auth):');
  const result2 = await testEndpoint('/api/v1/batch-import/history');
  console.log(`   Status: ${result2.status}`);
  
  console.log('\n3. Testing status endpoint (should return 401 without auth):');
  const result3 = await testEndpoint('/api/v1/batch-import/status/test-id');
  console.log(`   Status: ${result3.status}`);
  
  console.log('\n✨ Tests completed!');
}

runTests().catch(console.error);
