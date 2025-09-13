import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    console.log('Testing face photo update functionality...');

    // Test 1: Check if we can find a user
    const testUser = await db.user.findFirst({
      where: { isVerified: true }
    });

    if (!testUser) {
      return NextResponse.json({
        success: false,
        message: 'No verified users found to test with'
      });
    }

    console.log('Found test user:', { uid: testUser.uid, email: testUser.email });

    // Test 2: Try to update a simple field first
    try {
      const updatedUser = await db.user.update({
        where: { uid: testUser.uid },
        data: { 
          updatedAt: new Date().toISOString()
        }
      });
      console.log('✅ Basic update successful');
    } catch (updateError) {
      console.error('❌ Basic update failed:', updateError);
      return NextResponse.json({
        success: false,
        message: `Basic update failed: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`,
        error: updateError
      });
    }

    // Test 3: Try to update facePhotoPath field
    try {
      const testFacePhoto = 'data:image/jpeg;base64,test123';
      const updatedUser = await db.user.update({
        where: { uid: testUser.uid },
        data: { 
          facePhotoPath: testFacePhoto,
          updatedAt: new Date().toISOString()
        }
      });
      console.log('✅ Face photo update successful');
      
      return NextResponse.json({
        success: true,
        message: 'Face photo update test successful',
        user: {
          uid: updatedUser.uid,
          email: updatedUser.email,
          hasFacePhoto: !!updatedUser.facePhotoPath
        }
      });
    } catch (facePhotoError) {
      console.error('❌ Face photo update failed:', facePhotoError);
      return NextResponse.json({
        success: false,
        message: `Face photo update failed: ${facePhotoError instanceof Error ? facePhotoError.message : 'Unknown error'}`,
        error: facePhotoError
      });
    }

  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({
      success: false,
      message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error
    });
  }
}

