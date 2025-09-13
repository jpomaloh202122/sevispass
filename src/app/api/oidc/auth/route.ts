import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { oidcStorage } from '@/lib/oidc-storage';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const params = url.searchParams;
  
  const clientId = params.get('client_id');
  const redirectUri = params.get('redirect_uri');
  const state = params.get('state');
  const scope = params.get('scope');
  const responseType = params.get('response_type');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005';
  
  console.log('OIDC Authorization request:', {
    clientId,
    redirectUri,
    state,
    scope,
    responseType
  });
  
  // Validate client_id
  if (clientId !== 'sevis-portal-client') {
    const errorUrl = `${redirectUri}?error=invalid_client&error_description=Unknown+client_id&state=${state}`;
    return NextResponse.redirect(errorUrl);
  }
  
  // Validate redirect_uri
  const allowedRedirectUris = [
    'http://localhost:3000/auth/callback',
    'https://sevis-portal.gov.pg/auth/callback'
  ];
  
  if (!redirectUri || !allowedRedirectUris.includes(redirectUri)) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Invalid redirect_uri' },
      { status: 400 }
    );
  }
  
  // Check if user is already authenticated
  const sessionCookie = request.cookies.get('session');
  
  if (sessionCookie?.value) {
    // Get user from session
    const userId = oidcStorage.getUserFromSession(sessionCookie.value);
    
    if (userId) {
      // User is authenticated, generate authorization code and redirect
      const code = `auth_code_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store the authorization code with user info
      oidcStorage.storeAuthorizationCode({
        code,
        userId,
        clientId: clientId!,
        redirectUri: redirectUri!,
        scope: scope || 'openid profile email',
        state,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      });
      
      console.log('Generated authorization code for user:', { userId, code: code.substring(0, 20) + '...' });
      
      const callbackUrl = `${redirectUri}?code=${code}&state=${state}`;
      return NextResponse.redirect(callbackUrl);
    }
  }
  
  // User not authenticated, redirect to login with OIDC parameters
  const loginUrl = new URL('/auth/login', baseUrl);
  loginUrl.searchParams.set('client_id', clientId);
  loginUrl.searchParams.set('redirect_uri', redirectUri);
  loginUrl.searchParams.set('state', state || '');
  loginUrl.searchParams.set('scope', scope || 'openid profile email');
  
  return NextResponse.redirect(loginUrl.toString());
}