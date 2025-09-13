import { NextResponse } from 'next/server';

export async function GET() {
  const issuer = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  const configuration = {
    issuer,
    authorization_endpoint: `${issuer}/api/oidc/auth`,
    token_endpoint: `${issuer}/api/oidc/token`,
    userinfo_endpoint: `${issuer}/api/oidc/me`,
    jwks_uri: `${issuer}/api/oidc/jwks`,
    end_session_endpoint: `${issuer}/api/oidc/session/end`,
    revocation_endpoint: `${issuer}/api/oidc/token/revocation`,
    introspection_endpoint: `${issuer}/api/oidc/token/introspection`,
    
    // Supported features
    scopes_supported: ['openid', 'profile', 'email', 'phone', 'address'],
    response_types_supported: ['code'],
    response_modes_supported: ['query', 'form_post'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    subject_types_supported: ['public'],
    
    // Token endpoint authentication
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    
    // ID Token signing
    id_token_signing_alg_values_supported: ['RS256'],
    
    // Claims
    claims_supported: [
      'sub',
      'name',
      'given_name',
      'family_name',
      'preferred_username',
      'email',
      'email_verified',
      'phone_number',
      'phone_number_verified',
      'address',
      'updated_at'
    ],
    
    // Additional metadata
    code_challenge_methods_supported: ['S256'],
    display_values_supported: ['page'],
    claim_types_supported: ['normal'],
    claims_parameter_supported: false,
    request_parameter_supported: false,
    request_uri_parameter_supported: false,
    require_request_uri_registration: false,
  };

  return NextResponse.json(configuration, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
    },
  });
}