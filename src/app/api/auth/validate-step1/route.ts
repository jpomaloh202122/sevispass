import { NextRequest, NextResponse } from 'next/server';
import { validateEmail, validateNidOrPassport, validatePhoneNumber } from '@/lib/auth';
import { db } from '@/lib/db';

interface StepOneData {
  firstName: string;
  lastName: string;
  email: string;
  nid: string;
  phoneNumber: string;
}

interface StepOneResponse {
  success: boolean;
  message: string;
  duplicates?: {
    email?: boolean;
    nid?: boolean;
    phoneNumber?: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    let body: StepOneData;
    
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return NextResponse.json({
        success: false,
        message: 'Invalid request format'
      } as StepOneResponse, { status: 400 });
    }

    // Validate required fields
    if (!body.firstName || !body.lastName || !body.email || !body.nid || !body.phoneNumber) {
      return NextResponse.json({
        success: false,
        message: 'All fields are required'
      } as StepOneResponse, { status: 400 });
    }

    // Validate email format
    if (!validateEmail(body.email)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid email format'
      } as StepOneResponse, { status: 400 });
    }

    // Validate NID or Passport format
    const nidValidation = validateNidOrPassport(body.nid);
    if (!nidValidation.isValid) {
      return NextResponse.json({
        success: false,
        message: nidValidation.message || 'Invalid NID or Passport format'
      } as StepOneResponse, { status: 400 });
    }

    // Validate phone number format
    const phoneValidation = validatePhoneNumber(body.phoneNumber);
    if (!phoneValidation.isValid) {
      return NextResponse.json({
        success: false,
        message: phoneValidation.message || 'Invalid phone number format'
      } as StepOneResponse, { status: 400 });
    }

    // Check for existing users with same email, NID, or phone number
    let existingUser;
    try {
      existingUser = await db.user.findFirst({
        where: {
          OR: [
            { email: body.email },
            { nid: body.nid },
            { phoneNumber: body.phoneNumber }
          ]
        }
      });
    } catch (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Database connection error'
      } as StepOneResponse, { status: 503 });
    }

    if (existingUser) {
      const duplicates = {
        email: existingUser.email === body.email,
        nid: existingUser.nid === body.nid,
        phoneNumber: existingUser.phoneNumber === body.phoneNumber
      };

      // Determine which field conflicts
      let errorMessage = '';
      if (duplicates.email) {
        errorMessage = 'Email already exists';
      } else if (duplicates.nid) {
        errorMessage = 'NID/Passport number already exists';
      } else if (duplicates.phoneNumber) {
        errorMessage = 'Phone number already exists';
      }

      return NextResponse.json({
        success: false,
        message: errorMessage,
        duplicates
      } as StepOneResponse, { status: 409 });
    }

    // All validations passed
    return NextResponse.json({
      success: true,
      message: 'Step 1 validation successful'
    } as StepOneResponse);

  } catch (error) {
    console.error('Step 1 validation error:', error);
    
    return new NextResponse(JSON.stringify({
      success: false,
      message: 'Internal server error'
    } as StepOneResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}