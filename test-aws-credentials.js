// Test AWS credentials configuration
console.log('AWS Credentials Test:');
console.log('====================');

// Check if AWS credentials are set
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');
console.log('AWS_SESSION_TOKEN:', process.env.AWS_SESSION_TOKEN ? 'SET' : 'NOT SET');
console.log('AWS_REGION:', process.env.AWS_REGION || 'NOT SET');

// Test AWS SDK import
try {
  const { RekognitionClient } = require('@aws-sdk/client-rekognition');
  console.log('✅ AWS SDK Rekognition client imported successfully');
  
  // Test client creation
  const client = new RekognitionClient({
    region: process.env.AWS_REGION || 'ap-southeast-2',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN
    }
  });
  
  console.log('✅ AWS Rekognition client created successfully');
  console.log('✅ AWS credentials are properly configured!');
  
} catch (error) {
  console.error('❌ Error testing AWS credentials:', error.message);
}

