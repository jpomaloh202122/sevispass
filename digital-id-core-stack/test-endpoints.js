const http = require('http');

const services = [
  { name: 'Auth Service', port: 3001, path: '/health' },
  { name: 'Verification Service', port: 3002, path: '/health' },
  { name: 'Credentials Service', port: 3003, path: '/health' },
  { name: 'API Gateway', port: 3004, path: '/health' }
];

function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ status: res.statusCode, data: response });
        } catch (err) {
          resolve({ status: res.statusCode, data: data.substring(0, 100) + '...' });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

async function testService(service) {
  try {
    const options = {
      hostname: 'localhost',
      port: service.port,
      path: service.path,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const result = await makeRequest(options);
    
    if (result.status === 200 && result.data.status === 'ok') {
      console.log(`✅ ${service.name} - OK (${result.data.service})`);
      return true;
    } else {
      console.log(`❌ ${service.name} - FAILED (${result.status})`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${service.name} - ERROR: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🔍 Testing Digital ID Core Stack Services...\n');
  
  const results = [];
  for (const service of services) {
    const success = await testService(service);
    results.push({ service: service.name, success });
  }
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`\n📊 Test Results: ${passed}/${total} services passing`);
  
  if (passed === total) {
    console.log('🎉 All services are healthy and responding correctly!');
    process.exit(0);
  } else {
    console.log('⚠️  Some services have issues - check the logs above');
    process.exit(1);
  }
}

runTests();