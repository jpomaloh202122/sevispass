import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const issuer = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    return NextResponse.json({
      status: 'OIDC Provider is configured and ready',
      issuer,
      endpoints: {
        authorization: `${issuer}/api/oidc/auth`,
        token: `${issuer}/api/oidc/token`,
        userinfo: `${issuer}/api/oidc/me`,
        jwks: `${issuer}/api/oidc/jwks`,
        discovery: `${issuer}/.well-known/openid-configuration`
      },
      supported_scopes: ['openid', 'profile', 'email', 'phone', 'address'],
      supported_response_types: ['code'],
      supported_grant_types: ['authorization_code', 'refresh_token'],
      client_configured: true,
      client_id: 'sevis-portal-client',
      test_authorization_url: `${issuer}/api/oidc/auth?response_type=code&client_id=sevis-portal-client&redirect_uri=${encodeURIComponent(process.env.SEVIS_PORTAL_REDIRECT_URI || 'http://localhost:3001/auth/callback')}&scope=openid%20profile%20email&state=test-state`
    });
  } catch (error) {
    console.error('OIDC Provider test error:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: 'OIDC Provider configuration error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}