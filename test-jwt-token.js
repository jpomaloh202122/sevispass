// Test JWT token format
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secure-jwt-secret-key-2024';

// Test token creation and verification
const testPayload = {
  uid: 'test-user-123',
  email: 'test@example.com',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
};

try {
  const token = jwt.sign(testPayload, JWT_SECRET);
  console.log('✅ JWT token created successfully');
  console.log('Token length:', token.length);
  console.log('Token preview:', token.substring(0, 50) + '...');
  
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('✅ JWT token verified successfully');
  console.log('Decoded payload:', decoded);
  
} catch (error) {
  console.error('❌ JWT error:', error.message);
}

