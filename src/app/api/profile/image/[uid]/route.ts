import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
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

    // Check if file exists
    try {
      await fs.access(user.profileImagePath);
    } catch {
      return NextResponse.json({
        error: 'Profile image file not found'
      }, { status: 404 });
    }

    // Read the image file
    const imageBuffer = await fs.readFile(user.profileImagePath);
    
    // Determine content type based on file extension
    const ext = path.extname(user.profileImagePath).toLowerCase();
    let contentType = 'image/jpeg'; // default
    
    switch (ext) {
      case '.png':
        contentType = 'image/png';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      default:
        contentType = 'image/jpeg';
    }

    // Return the image
    return new NextResponse(imageBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'Content-Length': imageBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Profile image retrieval error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}