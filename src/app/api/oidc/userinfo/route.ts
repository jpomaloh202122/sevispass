import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'invalid_token', error_description: 'Bearer token required' },
        { status: 401 }
      );
    }
    
    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
    
    // Verify the access token
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret) as any;
    } catch (error) {
      return NextResponse.json(
        { error: 'invalid_token', error_description: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    // Get user data from database
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('uid', decoded.sub)
      .single();
    
    if (error || !userData) {
      return NextResponse.json(
        { error: 'invalid_token', error_description: 'User not found' },
        { status: 401 }
      );
    }
    
    // Return user info claims
    const userInfo = {
      sub: userData.uid,
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
    
    return NextResponse.json(userInfo);
    
  } catch (error) {
    console.error('OIDC userinfo endpoint error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Internal server error' },
      { status: 500 }
    );
  }
}