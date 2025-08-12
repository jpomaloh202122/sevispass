import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, validateEmail } from '@/lib/auth';
import { db } from '@/lib/db';

interface LoginData {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  uid?: string;
  user?: {
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    let body: LoginData;
    
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return NextResponse.json({
        success: false,
        message: 'Invalid request format'
      } as LoginResponse, { status: 400 });
    }

    // Validate required fields
    if (!body.email || !body.password) {
      return NextResponse.json({
        success: false,
        message: 'Email and password are required'
      } as LoginResponse, { status: 400 });
    }

    // Validate email format
    if (!validateEmail(body.email)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid email format'
      } as LoginResponse, { status: 400 });
    }

    // Find user by email
    let user;
    try {
      user = await db.user.findUnique({
        where: {
          email: body.email
        }
      });
    } catch (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Database connection error'
      } as LoginResponse, { status: 503 });
    }

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'Invalid email or password'
      } as LoginResponse, { status: 401 });
    }

    // Verify password
    let isValidPassword;
    try {
      isValidPassword = await verifyPassword(body.password, user.password);
    } catch (verifyError) {
      console.error('Password verification error:', verifyError);
      return NextResponse.json({
        success: false,
        message: 'Authentication error'
      } as LoginResponse, { status: 500 });
    }
    
    if (!isValidPassword) {
      return NextResponse.json({
        success: false,
        message: 'Invalid email or password'
      } as LoginResponse, { status: 401 });
    }

    console.log('User logged in successfully:', { uid: user.uid, email: user.email });

    return NextResponse.json({
      success: true,
      uid: user.uid,
      user: {
        uid: user.uid,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        nid: user.nid,
        phoneNumber: user.phoneNumber,
        address: user.address,
        createdAt: user.createdAt.toISOString()
      },
      message: 'Login successful'
    } as LoginResponse);

  } catch (error) {
    console.error('Login error:', error);
    
    // Ensure we always return a valid JSON response
    return new NextResponse(JSON.stringify({
      success: false,
      message: 'Internal server error'
    } as LoginResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}