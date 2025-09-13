import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { oidcStorage } from '@/lib/oidc-storage';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let grantType, code, clientId, clientSecret, redirectUri;
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      grantType = formData.get('grant_type');
      code = formData.get('code');
      clientId = formData.get('client_id');
      clientSecret = formData.get('client_secret');
      redirectUri = formData.get('redirect_uri');
    } else {
      // Handle JSON content type
      const body = await request.json();
      grantType = body.grant_type;
      code = body.code;
      clientId = body.client_id;
      clientSecret = body.client_secret;
      redirectUri = body.redirect_uri;
    }
    
    console.log('OIDC Token request:', {
      grantType,
      code,
      clientId,
      clientSecret: clientSecret ? 'PROVIDED' : 'MISSING',
      redirectUri,
      contentType
    });
    
    // Validate client credentials
    if (clientId !== 'sevis-portal-client' || 
        clientSecret !== (process.env.OIDC_CLIENT_SECRET || 'sevis-portal-secret-change-in-production')) {
      return NextResponse.json(
        { error: 'invalid_client', error_description: 'Invalid client credentials' },
        { status: 401 }
      );
    }
    
    if (grantType !== 'authorization_code') {
      return NextResponse.json(
        { error: 'unsupported_grant_type', error_description: 'Only authorization_code is supported' },
        { status: 400 }
      );
    }
    
    if (!code) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Authorization code is required' },
        { status: 400 }
      );
    }
    
    // Validate the authorization code
    const authCodeData = oidcStorage.consumeAuthorizationCode(code);
    
    if (!authCodeData) {
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'Invalid or expired authorization code' },
        { status: 400 }
      );
    }
    
    // Validate redirect URI matches
    if (authCodeData.redirectUri !== redirectUri) {
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'Redirect URI mismatch' },
        { status: 400 }
      );
    }
    
    // Get user data from database
    let userData;
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('uid', authCodeData.userId)
        .single();
        
      if (error || !user) {
        console.error('User not found for authorization code:', authCodeData.userId);
        return NextResponse.json(
          { error: 'invalid_grant', error_description: 'User not found' },
          { status: 400 }
        );
      }
      
      userData = user;
    } catch (error) {
      console.error('Database error during token exchange:', error);
      return NextResponse.json(
        { error: 'server_error', error_description: 'Database error' },
        { status: 500 }
      );
    }
    
    // Create JWT tokens
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005';
    
    const now = Math.floor(Date.now() / 1000);
    
    // Access token payload
    const accessTokenPayload = {
      sub: userData.uid,
      aud: clientId,
      iss: baseUrl,
      iat: now,
      exp: now + 3600, // 1 hour
      scope: 'openid profile email phone address'
    };
    
    // ID token payload (includes user claims)
    const idTokenPayload = {
      sub: userData.uid,
      aud: clientId,
      iss: baseUrl,
      iat: now,
      exp: now + 3600, // 1 hour
      name: `${userData.firstName} ${userData.lastName}`,
      given_name: userData.firstName,
      family_name: userData.lastName,
      preferred_username: userData.email,
      email: userData.email,
      email_verified: userData.isVerified,
      phone_number: userData.phoneNumber,
      phone_number_verified: true,
      picture: userData.profileImagePath,
      address: {
        formatted: userData.address || 'Papua New Guinea',
        country: 'Papua New Guinea'
      },
      nid: userData.nid,
      is_verified: userData.isVerified,
      updated_at: Math.floor(new Date(userData.updatedAt).getTime() / 1000),
      created_at: Math.floor(new Date(userData.createdAt).getTime() / 1000)
    };
    
    // Sign tokens
    const accessToken = jwt.sign(accessTokenPayload, jwtSecret, { algorithm: 'HS256' });
    const idToken = jwt.sign(idTokenPayload, jwtSecret, { algorithm: 'HS256' });
    const refreshToken = jwt.sign(
      { sub: userData.uid, type: 'refresh_token', iat: now },
      jwtSecret,
      { algorithm: 'HS256', expiresIn: '7d' }
    );
    
    const tokenResponse = {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: refreshToken,
      id_token: idToken,
      scope: 'openid profile email phone address'
    };
    
    console.log('OIDC tokens generated successfully for user:', userData.uid);
    
    return NextResponse.json(tokenResponse);
    
  } catch (error) {
    console.error('OIDC token endpoint error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    );
  }
}