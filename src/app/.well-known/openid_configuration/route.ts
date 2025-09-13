import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  const openidConfig = {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/oidc/auth`,
    token_endpoint: `${baseUrl}/api/oidc/token`,
    userinfo_endpoint: `${baseUrl}/api/oidc/userinfo`,
    jwks_uri: `${baseUrl}/api/oidc/jwks`,
    end_session_endpoint: `${baseUrl}/api/oidc/session/end`,
    scopes_supported: ['openid', 'profile', 'email', 'phone', 'address'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    claims_supported: [
      'sub', 'name', 'given_name', 'family_name', 'preferred_username',
      'email', 'email_verified', 'phone_number', 'phone_number_verified',
      'address', 'picture', 'updated_at', 'nid', 'is_verified', 'created_at'
    ],
    code_challenge_methods_supported: ['S256']
  };

  return NextResponse.json(openidConfig);
}