import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { db } from '@/lib/db';

interface UpdateImageResponse {
  success: boolean;
  message: string;
  profileImagePath?: string;
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
      select: { id: true, profileImagePath: true }
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
      const uploadsDir = path.join(process.cwd(), 'uploads', uid);
      await fs.mkdir(uploadsDir, { recursive: true });

      // Delete old profile image if it exists
      if (user.profileImagePath) {
        try {
          await fs.unlink(user.profileImagePath);
        } catch (deleteError) {
          console.warn('Failed to delete old profile image:', deleteError);
          // Continue even if old image deletion fails
        }
      }

      // Save new profile image
      const imageBuffer = Buffer.from(await profileImage.arrayBuffer());
      const timestamp = Date.now();
      const fileExtension = profileImage.name.split('.').pop() || 'jpg';
      const newProfileImagePath = path.join(uploadsDir, `profile-${timestamp}.${fileExtension}`);
      
      await fs.writeFile(newProfileImagePath, imageBuffer);

      // Update user in database
      await db.user.update({
        where: { uid },
        data: { profileImagePath: newProfileImagePath }
      });

      return NextResponse.json({
        success: true,
        message: 'Profile image updated successfully',
        profileImagePath: newProfileImagePath
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