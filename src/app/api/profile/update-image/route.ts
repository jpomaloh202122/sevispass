import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface UpdateImageResponse {
  success: boolean;
  message: string;
  profileImageData?: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const profileImage = formData.get('profileImage') as File;
    const uid = formData.get('uid') as string;

    if (!profileImage || !uid) {
      return NextResponse.json({
        success: false,
        message: 'Profile image and user ID are required'
      } as UpdateImageResponse, { status: 400 });
    }

    // Find user by UID
    const user = await db.user.findUnique({
      where: { uid },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      } as UpdateImageResponse, { status: 404 });
    }

    // Validate image file
    if (!profileImage.type.startsWith('image/')) {
      return NextResponse.json({
        success: false,
        message: 'Only image files are allowed'
      } as UpdateImageResponse, { status: 400 });
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (profileImage.size > maxSize) {
      return NextResponse.json({
        success: false,
        message: 'Image file size must be less than 5MB'
      } as UpdateImageResponse, { status: 400 });
    }

    try {
      // Convert image to base64
      const imageBuffer = Buffer.from(await profileImage.arrayBuffer());
      const base64Image = imageBuffer.toString('base64');
      const mimeType = profileImage.type || 'image/jpeg';
      const profileImageData = `data:${mimeType};base64,${base64Image}`;

      // Update user in database with base64 data
      await db.user.update({
        where: { uid },
        data: { profileImagePath: profileImageData }
      });

      return NextResponse.json({
        success: true,
        message: 'Profile image updated successfully',
        profileImageData: profileImageData
      } as UpdateImageResponse);

    } catch (fileError) {
      console.error('File save error:', fileError);
      return NextResponse.json({
        success: false,
        message: 'Failed to save profile image'
      } as UpdateImageResponse, { status: 500 });
    }

  } catch (error) {
    console.error('Profile image update error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    } as UpdateImageResponse, { status: 500 });
  }
}