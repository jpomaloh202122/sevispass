import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { awsVerificationService } from '@/lib/aws-verification';

interface UpdateFacePhotoResponse {
  success: boolean;
  message: string;
  user?: {
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
    isVerified: boolean;
    createdAt: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const facePhoto = formData.get('facePhoto') as File;
    const uid = formData.get('uid') as string;
    const livenessVerified = formData.get('livenessVerified') === 'true';

    console.log('Update face photo debug:', {
      facePhoto: facePhoto?.name,
      facePhotoType: facePhoto?.type,
      facePhotoSize: facePhoto?.size,
      uid: uid,
      livenessVerified: livenessVerified
    });

    if (!facePhoto) {
      return NextResponse.json({
        success: false,
        message: 'Face photo is required'
      } as UpdateFacePhotoResponse, { status: 400 });
    }

    if (!uid) {
      return NextResponse.json({
        success: false,
        message: 'User ID is required'
      } as UpdateFacePhotoResponse, { status: 400 });
    }

    if (!livenessVerified) {
      return NextResponse.json({
        success: false,
        message: 'Liveness verification is required for security'
      } as UpdateFacePhotoResponse, { status: 400 });
    }

    // Find user by UID
    let user;
    try {
      user = await db.user.findUnique({
        where: {
          uid: uid
        }
      });
    } catch (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Database connection error'
      } as UpdateFacePhotoResponse, { status: 503 });
    }

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      } as UpdateFacePhotoResponse, { status: 404 });
    }

    // Validate image file format
    if (!facePhoto.type.startsWith('image/')) {
      return NextResponse.json({
        success: false,
        message: 'Only image files are allowed'
      } as UpdateFacePhotoResponse, { status: 400 });
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (facePhoto.size > maxSize) {
      return NextResponse.json({
        success: false,
        message: 'Image file size must be less than 5MB'
      } as UpdateFacePhotoResponse, { status: 400 });
    }

    // Convert uploaded face photo to buffer
    const faceBuffer = Buffer.from(await facePhoto.arrayBuffer());

    // Basic image validation using Jimp
    try {
      const Jimp = await import('jimp');
      const faceImage = await Jimp.Jimp.fromBuffer(faceBuffer);

      // Ensure image is valid and reasonable size
      if (faceImage.bitmap.width < 100 || faceImage.bitmap.height < 100) {
        return NextResponse.json({
          success: false,
          message: 'Face image is too small. Please ensure the image is at least 100x100 pixels.'
        } as UpdateFacePhotoResponse, { status: 400 });
      }

      console.log('Image validation passed:', {
        width: faceImage.bitmap.width,
        height: faceImage.bitmap.height,
        type: facePhoto.type,
        size: facePhoto.size
      });
    } catch (imageError) {
      console.error('Image validation error:', imageError);
      return NextResponse.json({
        success: false,
        message: 'Invalid image format. Please ensure the file is a valid image (JPEG, PNG, etc.)'
      } as UpdateFacePhotoResponse, { status: 400 });
    }

    // Check if AWS is configured for face verification
    if (awsVerificationService.isConfigured()) {
      console.log('🚀 Using AWS Rekognition for face photo verification...');
      
      // Check for inappropriate content
      const moderationResult = await awsVerificationService.moderateContent(faceBuffer);

      if (!moderationResult.safe) {
        return NextResponse.json({
          success: false,
          message: 'Image content moderation failed - inappropriate content detected'
        } as UpdateFacePhotoResponse, { status: 422 });
      }

      // If user has an existing face photo, verify it matches
      if (user.facePhoto) {
        try {
          const existingFaceBuffer = Buffer.from(user.facePhoto, 'base64');
          
          // Perform face comparison with existing photo
          const verificationResult = await awsVerificationService.compareFaces(
            existingFaceBuffer, 
            faceBuffer, 
            60 // 60% threshold for updating face photo
          );
          
          console.log('🔍 Face photo update verification result:', {
            success: verificationResult.success,
            confidence: verificationResult.confidence,
            similarity: verificationResult.similarity
          });

          if (!verificationResult.success) {
            return NextResponse.json({
              success: false,
              message: `Face verification failed - new photo doesn't match existing face photo (${verificationResult.confidence?.toFixed(1) || 0}% similarity). Please ensure you're the same person.`
            } as UpdateFacePhotoResponse, { status: 422 });
          }

          if (verificationResult.confidence && verificationResult.confidence < 60) {
            return NextResponse.json({
              success: false,
              message: `Face verification failed - insufficient similarity (${verificationResult.confidence.toFixed(1)}% < 60% required). Please ensure the photo clearly shows your face.`
            } as UpdateFacePhotoResponse, { status: 422 });
          }
        } catch (verificationError) {
          console.error('Face verification error:', verificationError);
          return NextResponse.json({
            success: false,
            message: 'Face verification failed. Please try again.'
          } as UpdateFacePhotoResponse, { status: 500 });
        }
      }
    } else {
      console.warn('⚠️ AWS credentials not configured, skipping face verification');
    }

    // Convert new face photo to base64
    let facePhotoPath = '';
    try {
      const facePhotoBase64 = faceBuffer.toString('base64');
      facePhotoPath = `data:${facePhoto.type || 'image/jpeg'};base64,${facePhotoBase64}`;
    } catch (fileError) {
      console.error('File processing error:', fileError);
      return NextResponse.json({
        success: false,
        message: 'Failed to process face photo'
      } as UpdateFacePhotoResponse, { status: 500 });
    }

    // Update user's face photo in database
    try {
      console.log('Updating face photo for user:', { uid, email: user.email, facePhotoPathLength: facePhotoPath.length });
      
      const updatedUser = await db.user.update({
        where: {
          uid: uid
        },
        data: {
          facePhotoPath: facePhotoPath
        }
      });

      console.log('Face photo updated successfully for user:', user.email);

      return NextResponse.json({
        success: true,
        message: 'Face photo updated successfully! This will be used for facial recognition login.',
        user: {
          uid: updatedUser.uid,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          isVerified: updatedUser.isVerified,
          createdAt: typeof updatedUser.createdAt === 'string' 
            ? updatedUser.createdAt 
            : updatedUser.createdAt.toISOString()
        }
      } as UpdateFacePhotoResponse);

    } catch (updateError) {
      console.error('Database update error:', {
        error: updateError,
        message: updateError instanceof Error ? updateError.message : 'Unknown error',
        stack: updateError instanceof Error ? updateError.stack : undefined,
        uid: uid,
        facePhotoPathLength: facePhotoPath.length
      });
      return NextResponse.json({
        success: false,
        message: `Failed to update face photo in database: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`
      } as UpdateFacePhotoResponse, { status: 500 });
    }

  } catch (error) {
    console.error('Update face photo error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error during face photo update'
    } as UpdateFacePhotoResponse, { status: 500 });
  }
}
