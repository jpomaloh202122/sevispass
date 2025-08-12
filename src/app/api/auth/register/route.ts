import { NextRequest, NextResponse } from 'next/server';
import { generateUID } from '@/lib/uid-generator';
import { hashPassword, validateEmail, validatePassword, validateNidOrPassport, validatePhoneNumber } from '@/lib/auth';
import { db } from '@/lib/db';
import { UserRegistrationData, UserRegistrationResponse } from '@/types/user';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    // Handle FormData instead of JSON for file uploads
    const formData = await request.formData();
    
    const body: UserRegistrationData = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      nid: formData.get('nid') as string,
      phoneNumber: formData.get('phoneNumber') as string,
    };

    const nidPhoto = formData.get('nidPhoto') as File;
    const facePhoto = formData.get('facePhoto') as File;

    // Validate required fields
    if (!body.firstName || !body.lastName || !body.email || !body.nid || !body.phoneNumber || !body.password) {
      return NextResponse.json({
        success: false,
        message: 'All fields are required'
      } as UserRegistrationResponse, { status: 400 });
    }

    // Validate required files
    if (!nidPhoto || !facePhoto) {
      return NextResponse.json({
        success: false,
        message: 'Both NID/Passport photo and face photo are required'
      } as UserRegistrationResponse, { status: 400 });
    }

    // Skip password confirmation validation as it's handled on frontend

    // Validate email format
    if (!validateEmail(body.email)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid email format'
      } as UserRegistrationResponse, { status: 400 });
    }

    // Validate password strength
    const passwordValidation = validatePassword(body.password);
    if (!passwordValidation.isValid) {
      return NextResponse.json({
        success: false,
        message: passwordValidation.message || 'Password is not strong enough'
      } as UserRegistrationResponse, { status: 400 });
    }

    // Validate NID or Passport format
    const nidValidation = validateNidOrPassport(body.nid);
    if (!nidValidation.isValid) {
      return NextResponse.json({
        success: false,
        message: nidValidation.message || 'Invalid NID or Passport format'
      } as UserRegistrationResponse, { status: 400 });
    }

    // Validate phone number format
    const phoneValidation = validatePhoneNumber(body.phoneNumber);
    if (!phoneValidation.isValid) {
      return NextResponse.json({
        success: false,
        message: phoneValidation.message || 'Invalid phone number format'
      } as UserRegistrationResponse, { status: 400 });
    }

    // Perform document OCR validation
    try {
      const documentValidationFormData = new FormData();
      documentValidationFormData.append('documentImage', nidPhoto);
      documentValidationFormData.append('expectedNumber', body.nid);
      
      // Determine document type based on NID format (basic heuristic)
      const isPassport = /^[A-Z]{1,2}\d{6,9}$/i.test(body.nid) || body.nid.length >= 8;
      documentValidationFormData.append('documentType', isPassport ? 'passport' : 'nid');

      const docValidationResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/validate-document`, {
        method: 'POST',
        body: documentValidationFormData
      });

      const docValidationResult = await docValidationResponse.json();
      
      console.log('Document validation result:', docValidationResult);

      // For development, make OCR validation optional (confidence threshold)
      // Only block registration if OCR is working and has high confidence in failure
      if (docValidationResult.success && !docValidationResult.isValid && docValidationResult.confidence > 80) {
        return NextResponse.json({
          success: false,
          message: `Document validation failed: ${docValidationResult.details}`
        } as UserRegistrationResponse, { status: 422 });
      }

      if (docValidationResult.success && docValidationResult.isValid) {
        console.log(`Document validation successful with confidence: ${docValidationResult.confidence}%`);
      } else {
        console.warn(`Document validation inconclusive or failed: ${docValidationResult.details}`);
      }
    } catch (docValidationError) {
      console.error('Document validation error:', docValidationError);
      // Continue with registration - OCR is supplementary validation
      console.warn('Proceeding with registration despite document validation error');
    }

    // Perform face verification before creating account
    try {
      const verificationFormData = new FormData();
      verificationFormData.append('nidPhoto', nidPhoto);
      verificationFormData.append('facePhoto', facePhoto);

      const verificationResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/verify-face`, {
        method: 'POST',
        body: verificationFormData
      });

      const verificationResult = await verificationResponse.json();

      if (!verificationResult.success) {
        return NextResponse.json({
          success: false,
          message: `Face verification failed: ${verificationResult.message}`
        } as UserRegistrationResponse, { status: 422 });
      }

      console.log(`Face verification successful with confidence: ${verificationResult.confidence}`);
    } catch (verificationError) {
      console.error('Face verification error:', verificationError);
      return NextResponse.json({
        success: false,
        message: 'Face verification service unavailable'
      } as UserRegistrationResponse, { status: 503 });
    }

    // Check if user already exists
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
      } as UserRegistrationResponse, { status: 503 });
    }

    if (existingUser) {
      // Determine which field conflicts
      if (existingUser.email === body.email) {
        return NextResponse.json({
          success: false,
          message: 'Email already exists'
        } as UserRegistrationResponse, { status: 409 });
      } else if (existingUser.nid === body.nid) {
        return NextResponse.json({
          success: false,
          message: 'Passport Number or NID already exists'
        } as UserRegistrationResponse, { status: 409 });
      } else if (existingUser.phoneNumber === body.phoneNumber) {
        return NextResponse.json({
          success: false,
          message: 'Phone Number already exists'
        } as UserRegistrationResponse, { status: 409 });
      }
    }

    // Generate UID and hash password
    const { uid } = generateUID();
    let hashedPassword;
    
    try {
      hashedPassword = await hashPassword(body.password);
    } catch (hashError) {
      console.error('Password hashing error:', hashError);
      return NextResponse.json({
        success: false,
        message: 'Password processing error'
      } as UserRegistrationResponse, { status: 500 });
    }

    // Save uploaded files
    let nidPhotoPath = '';
    let facePhotoPath = '';
    let profileImagePath = '';
    
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads', uid);
      await fs.mkdir(uploadsDir, { recursive: true });

      // Save NID/Passport photo
      const nidPhotoBuffer = Buffer.from(await nidPhoto.arrayBuffer());
      nidPhotoPath = path.join(uploadsDir, `nid-${Date.now()}.jpg`);
      await fs.writeFile(nidPhotoPath, nidPhotoBuffer);

      // Save face photo
      const facePhotoBuffer = Buffer.from(await facePhoto.arrayBuffer());
      const timestamp = Date.now();
      facePhotoPath = path.join(uploadsDir, `face-${timestamp}.jpg`);
      await fs.writeFile(facePhotoPath, facePhotoBuffer);

      // Copy face photo as profile image
      profileImagePath = path.join(uploadsDir, `profile-${timestamp}.jpg`);
      await fs.writeFile(profileImagePath, facePhotoBuffer);
    } catch (fileError) {
      console.error('File save error:', fileError);
      return NextResponse.json({
        success: false,
        message: 'Failed to save verification photos'
      } as UserRegistrationResponse, { status: 500 });
    }

    // Create user in database
    let user;
    try {
      user = await db.user.create({
        data: {
          uid,
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          nid: body.nid,
          phoneNumber: body.phoneNumber,
          password: hashedPassword,
          nidPhotoPath: nidPhotoPath,
          facePhotoPath: facePhotoPath,
          profileImagePath: profileImagePath,
          isVerified: true // Mark as verified since face verification passed
        }
      });
    } catch (createError) {
      console.error('User creation error:', createError);
      return NextResponse.json({
        success: false,
        message: 'Failed to create user account'
      } as UserRegistrationResponse, { status: 500 });
    }

    console.log('User registered successfully:', { uid: user.uid, email: user.email });

    return NextResponse.json({
      success: true,
      uid: user.uid,
      message: 'User registered successfully'
    } as UserRegistrationResponse);

  } catch (error) {
    console.error('Registration error:', error);
    
    // Ensure we always return a valid JSON response
    return new NextResponse(JSON.stringify({
      success: false,
      message: 'Internal server error'
    } as UserRegistrationResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}