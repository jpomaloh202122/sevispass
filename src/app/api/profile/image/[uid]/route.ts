import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;

    if (!uid) {
      return NextResponse.json({
        error: 'User ID is required'
      }, { status: 400 });
    }

    // Find user by UID
    const user = await db.user.findUnique({
      where: { uid },
      select: { profileImagePath: true }
    });

    if (!user) {
      return NextResponse.json({
        error: 'User not found'
      }, { status: 404 });
    }

    if (!user.profileImagePath) {
      return NextResponse.json({
        error: 'Profile image not found'
      }, { status: 404 });
    }

    // Check if it's base64 data or file path
    if (user.profileImagePath.startsWith('data:')) {
      // Handle base64 data
      const [mimeInfo, base64Data] = user.profileImagePath.split(',');
      const mimeType = mimeInfo.split(':')[1].split(';')[0];
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      return new NextResponse(imageBuffer as unknown as BodyInit, {
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=31536000',
          'Content-Length': imageBuffer.length.toString(),
        },
      });
    } else {
      // Legacy file path handling (for existing users)
      return NextResponse.json({
        error: 'Legacy file storage not supported in production'
      }, { status: 404 });
    }

  } catch (error) {
    console.error('Profile image retrieval error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}