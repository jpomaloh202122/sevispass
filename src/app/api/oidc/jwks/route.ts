import { NextResponse } from 'next/server';

export async function GET() {
  // JWKS (JSON Web Key Set) endpoint for token verification
  // In production, these should be real RSA keys generated securely
  const jwks = {
    keys: [
      {
        kty: 'RSA',
        use: 'sig',
        kid: 'sevispass-key-1',
        alg: 'RS256',
        n: process.env.JWT_PUBLIC_KEY_N || 'mock-rsa-public-key-modulus',
        e: 'AQAB',
        x5c: [],
        x5t: 'mock-thumbprint',
        'x5t#S256': 'mock-sha256-thumbprint'
      }
    ]
  };
  
  return NextResponse.json(jwks, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    }
  });
}