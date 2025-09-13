import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { PublicServantIdApplication } from '@/types/wallet';

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secure-jwt-secret-key-2024';

function verifyUserToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    throw new Error('No token provided');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded;
  } catch (error) {
    console.error('JWT verification error:', error.message);
    throw new Error('Invalid token');
  }
}

export async function GET(request: NextRequest) {
  try {
    const userData = verifyUserToken(request);
    
    const applicationsDir = path.join(process.cwd(), 'data', 'public-servant-id-applications');
    
    if (!existsSync(applicationsDir)) {
      return NextResponse.json({
        success: true,
        applications: []
      });
    }

    const files = await readdir(applicationsDir);
    const applications: PublicServantIdApplication[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(applicationsDir, file);
          const fileContent = await readFile(filePath, 'utf-8');
          const application = JSON.parse(fileContent) as PublicServantIdApplication;
          
          // Only return applications for the current user
          if (application.userId === userData.uid) {
            applications.push(application);
          }
        } catch (error) {
          console.error(`Error reading application file ${file}:`, error);
        }
      }
    }

    // Sort applications by application date (newest first)
    applications.sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime());

    return NextResponse.json({
      success: true,
      applications
    });

  } catch (error) {
    console.error('Error fetching public servant ID applications:', error);

    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}
