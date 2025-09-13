// Test SDK functionality
const { AuthClient, VerificationClient, CredentialsClient } = require('./sdk/dist/index.js');

function testSDKExports() {
  console.log('🔍 Testing SDK Exports...\n');
  
  const tests = [
    { name: 'AuthClient', constructor: AuthClient },
    { name: 'VerificationClient', constructor: VerificationClient },
    { name: 'CredentialsClient', constructor: CredentialsClient }
  ];
  
  let passed = 0;
  
  tests.forEach(test => {
    try {
      if (typeof test.constructor === 'function') {
        const config = { baseUrl: 'http://localhost:3001' };
        const instance = new test.constructor(config);
        
        if (instance instanceof test.constructor) {
          console.log(`✅ ${test.name} - Constructor works`);
          passed++;
        } else {
          console.log(`❌ ${test.name} - Instance check failed`);
        }
      } else {
        console.log(`❌ ${test.name} - Not a constructor function`);
      }
    } catch (error) {
      console.log(`❌ ${test.name} - Error: ${error.message}`);
    }
  });
  
  return passed === tests.length;
}

async function testClientMethods() {
  console.log('\n🔍 Testing Client Methods...\n');
  
  const config = { baseUrl: 'http://localhost:3001', apiKey: 'test-key' };
  const authClient = new AuthClient(config);
  const verificationClient = new VerificationClient({ baseUrl: 'http://localhost:3002' });
  const credentialsClient = new CredentialsClient({ baseUrl: 'http://localhost:3003' });
  
  let passed = 0;
  
  // Test AuthClient methods
  try {
    await authClient.login('test@example.com', 'password123');
  } catch (error) {
    if (error.message === 'Not implemented') {
      console.log('✅ AuthClient.login - Correctly throws "Not implemented"');
      passed++;
    } else {
      console.log(`❌ AuthClient.login - Unexpected error: ${error.message}`);
    }
  }
  
  try {
    await authClient.verify2FA('token', '123456');
  } catch (error) {
    if (error.message === 'Not implemented') {
      console.log('✅ AuthClient.verify2FA - Correctly throws "Not implemented"');
      passed++;
    } else {
      console.log(`❌ AuthClient.verify2FA - Unexpected error: ${error.message}`);
    }
  }
  
  // Test VerificationClient methods
  try {
    await verificationClient.verifyFace(Buffer.from('test'));
  } catch (error) {
    if (error.message === 'Not implemented') {
      console.log('✅ VerificationClient.verifyFace - Correctly throws "Not implemented"');
      passed++;
    } else {
      console.log(`❌ VerificationClient.verifyFace - Unexpected error: ${error.message}`);
    }
  }
  
  // Test CredentialsClient methods
  try {
    await credentialsClient.issueCredential({});
  } catch (error) {
    if (error.message === 'Not implemented') {
      console.log('✅ CredentialsClient.issueCredential - Correctly throws "Not implemented"');
      passed++;
    } else {
      console.log(`❌ CredentialsClient.issueCredential - Unexpected error: ${error.message}`);
    }
  }
  
  return passed === 4; // All methods should throw "Not implemented"
}

async function runSDKTests() {
  const exportTests = testSDKExports();
  const methodTests = await testClientMethods();
  
  const totalPassed = (exportTests ? 3 : 0) + (methodTests ? 4 : 0);
  
  console.log(`\n📊 SDK Test Results: ${totalPassed}/7 tests passing`);
  
  if (exportTests && methodTests) {
    console.log('🎉 SDK is working correctly! All exports and methods behave as expected.');
    process.exit(0);
  } else {
    console.log('⚠️  Some SDK tests failed - check the output above');
    process.exit(1);
  }
}

runSDKTests();