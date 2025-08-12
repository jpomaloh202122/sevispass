import { NextRequest, NextResponse } from 'next/server';
import { validateEmail, validatePhoneNumber } from '@/lib/auth';
import { db } from '@/lib/db';

interface UpdateProfileData {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  address?: string;
}

interface ProfileResponse {
  success: boolean;
  user?: {
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
    nid: string;
    phoneNumber: string;
    address?: string;
    createdAt: string;
  };
  message: string;
}

export async function PUT(request: NextRequest) {
  try {
    let body: UpdateProfileData;
    
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return NextResponse.json({
        success: false,
        message: 'Invalid request format'
      } as ProfileResponse, { status: 400 });
    }

    // Validate required fields
    if (!body.uid || !body.firstName || !body.lastName || !body.email || !body.phoneNumber) {
      return NextResponse.json({
        success: false,
        message: 'All fields are required'
      } as ProfileResponse, { status: 400 });
    }

    // Validate email format
    if (!validateEmail(body.email)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid email format'
      } as ProfileResponse, { status: 400 });
    }

    // Validate phone number format
    const phoneValidation = validatePhoneNumber(body.phoneNumber);
    if (!phoneValidation.isValid) {
      return NextResponse.json({
        success: false,
        message: phoneValidation.message || 'Invalid phone number format'
      } as ProfileResponse, { status: 400 });
    }

    // Check if user exists
    let currentUser;
    try {
      currentUser = await db.user.findUnique({
        where: { uid: body.uid }
      });
    } catch (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Database connection error'
      } as ProfileResponse, { status: 503 });
    }

    if (!currentUser) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      } as ProfileResponse, { status: 404 });
    }

    // Check if email or phone number is already taken by another user
    let existingUser;
    try {
      existingUser = await db.user.findFirst({
        where: {
          AND: [
            { uid: { not: body.uid } }, // Exclude current user
            {
              OR: [
                { email: body.email },
                { phoneNumber: body.phoneNumber }
              ]
            }
          ]
        }
      });
    } catch (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Database connection error'
      } as ProfileResponse, { status: 503 });
    }

    if (existingUser) {
      if (existingUser.email === body.email) {
        return NextResponse.json({
          success: false,
          message: 'Email already exists'
        } as ProfileResponse, { status: 409 });
      } else if (existingUser.phoneNumber === body.phoneNumber) {
        return NextResponse.json({
          success: false,
          message: 'Phone Number already exists'
        } as ProfileResponse, { status: 409 });
      }
    }

    // Update user profile
    let updatedUser;
    try {
      updatedUser = await db.user.update({
        where: { uid: body.uid },
        data: {
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          phoneNumber: body.phoneNumber,
          address: body.address,
          updatedAt: new Date().toISOString()
        }
      });
    } catch (updateError) {
      console.error('User update error:', updateError);
      return NextResponse.json({
        success: false,
        message: 'Failed to update profile'
      } as ProfileResponse, { status: 500 });
    }

    console.log('User profile updated successfully:', { uid: updatedUser.uid, email: updatedUser.email });

    return NextResponse.json({
      success: true,
      user: {
        uid: updatedUser.uid,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        nid: updatedUser.nid,
        phoneNumber: updatedUser.phoneNumber,
        address: updatedUser.address,
        createdAt: updatedUser.createdAt.toISOString()
      },
      message: 'Profile updated successfully'
    } as ProfileResponse);

  } catch (error) {
    console.error('Profile update error:', error);
    
    return new NextResponse(JSON.stringify({
      success: false,
      message: 'Internal server error'
    } as ProfileResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}