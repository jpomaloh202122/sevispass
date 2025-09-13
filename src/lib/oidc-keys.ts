import { createHash, generateKeyPairSync } from 'crypto';

// Generate RSA key pair for OIDC Provider
function generateRSAKeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  return { publicKey, privateKey };
}

// Convert PEM to JWK format
function pemToJwk(pem: string, keyType: 'public' | 'private', keyId: string) {
  // This is a simplified version - in production, use a proper crypto library like node-jose
  const key = pem
    .replace(/-----BEGIN (RSA )?(PUBLIC|PRIVATE) KEY-----/, '')
    .replace(/-----END (RSA )?(PUBLIC|PRIVATE) KEY-----/, '')
    .replace(/\n/g, '');

  // For now, we'll use a static JWK - in production, implement proper PEM to JWK conversion
  return {
    kty: 'RSA',
    kid: keyId,
    use: 'sig',
    alg: 'RS256',
    // These are example values - in production, convert the actual PEM to JWK components
    n: 'xwQ72P9z9OYshiQ-ntDYaPnnfwG6u9JAdLMZ5o0dmjlcyrvwQRdoFIKPnO65Q8mh6F_LDSxjxa2Yzo_wdjhbPZLjfUJXgCzm54cClXzT5twzo7lzoAfaJlkTsoZc2HFWqmcri0BuzmTFLZx2Q4kYFadYPZSCGxIwT2pJh2mJnM7zPfO2HGjdHJ1oD1n-MtSDTXbTMZNnMZIBmH-Jpy_2VCYf4GkA6Dc-Sp_OhXvSBfnU3YzN3kCJg8MIeF2q2ZwGTGk9xGkJ0XgQ5jM9xGkJ0XgQ5jM9xGkJ0XgQ5jM9xGkJ0XgQ5jM9xGkJ0XgQ5jM9xGkJ0XgQ5jM9xGkJQ',
    e: 'AQAB',
  };
}

// Get or generate keys for OIDC provider
export function getOIDCKeys() {
  // In production, store these keys securely (environment variables, key vault, etc.)
  const keyId = 'sevispass-rsa-key-1';
  
  // For development, use a consistent key ID
  const developmentKey = {
    kty: 'RSA',
    kid: keyId,
    use: 'sig',
    alg: 'RS256',
    n: 'xwQ72P9z9OYshiQ-ntDYaPnnfwG6u9JAdLMZ5o0dmjlcyrvwQRdoFIKPnO65Q8mh6F_LDSxjxa2Yzo_wdjhbPZLjfUJXgCzm54cClXzT5twzo7lzoAfaJlkTsoZc2HFWqmcri0BuzmTFLZx2Q4kYFadYPZSCGxIwT2pJh2mJnM7zPfO2HGjdHJ1oD1n-MtSDTXbTMZNnMZIBmH-Jpy_2VCYf4GkA6Dc-Sp_OhXvSBfnU3YzN3kCJg8MIeF2q2ZwGTGk9xGkJ0XgQ5jM9xGkJ0XgQ5jM9xGkJ0XgQ5jM9xGkJ0XgQ5jM9xGkJ0XgQ5jM9xGkJ0XgQ5jM9xGkJQ',
    e: 'AQAB',
    d: 'X4cTteJY_gn4FYPsXB8rdXix5vwsg1FLN5E3EaG6RJoVH-HLLKD9M7dx5oo7GURknchnrRweUkC7hT5fJLM0WbFAKNLWYdK5IMaGVYdNO4nHo4mIW3kzj3-hREFDsLHKUqvdJC6O5Sz8UMJRH5oJzJb4tz_YTw1g-7mJj9w7AyQOLBb4UgDPxgf1B0nDDfKSA_YNgpT3_Vx0tgDgVs7lW9TJ7kK7H6H9r7W2kJQ3iGq6zKz-2Q8j8fh8W8F4Q7kF7a7vJ8F-F7dF5dF7dF8F8F9F0F1F2F3F4F5F6F7F8F9F0F1F2F3F4F5F6F7F8F9F0F1F2F3F4F5F6F7F8F9F0Q',
    p: '6NbkXwDWUhi-eR55Cgbf27FkQDDyxB-6qbhFgxFKaX9F5gq4Y5fQ6Q2Q3J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q2J1Q',
    q: '2S5GuSiN_yJGmFhBPQYZqfI3Iz-MtS6t_7K8KJdD4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q',
    dp: 'Hwi9Oqk_4cBTFk_4fk4Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q',
    dq: 'X4cTteJY_gn4FYPsXB8rdXix5vwsg1FLN5E3EaG6RJoVH-HLLKD9M7dx5oo7GURknchnrRweUkC7hT5fJLM0WbFAKNLWYdK5IMaGVYdNO4nHo4mIW3kzj3-hREFDsLHKUqvdJC6O5Sz8UMJRH5oJzJb4tz_YTw1g-7mJj9w7AyQ',
    qi: '1iJtR5i1DFzSF7Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q4F3Q'
  };

  return {
    keys: [developmentKey]
  };
}

// Generate a key ID based on the key content
export function generateKeyId(keyContent: string): string {
  return createHash('sha256').update(keyContent).digest('hex').substring(0, 16);
}