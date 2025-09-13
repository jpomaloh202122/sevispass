import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync, readdirSync } from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

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
    throw new Error('Invalid token');
  }
}

export async function GET(request: NextRequest) {
  try {
    const userData = verifyUserToken(request);
    
    const applicationsDir = path.join(process.cwd(), 'data', 'city-pass-applications');
    
    if (!existsSync(applicationsDir)) {
      return NextResponse.json({
        success: true,
        applications: [],
        count: 0
      });
    }

    const applicationFiles = readdirSync(applicationsDir);
    const userApplications = [];

    for (const filename of applicationFiles) {
      if (filename.endsWith('.json')) {
        try {
          const filePath = path.join(applicationsDir, filename);
          const applicationData = await readFile(filePath, 'utf-8');
          const application = JSON.parse(applicationData);
          
          if (application.userId === userData.uid) {
            userApplications.push({
              id: application.id,
              category: application.category,
              status: application.status,
              validityPeriod: application.validityPeriod,
              applicationDate: application.applicationDate,
              reviewDate: application.reviewDate,
              approvalDate: application.approvalDate,
              expiryDate: application.expiryDate,
              adminNotes: application.adminNotes,
              ncdcReference: application.ncdcReference
            });
          }
        } catch (error) {
          console.error(`Error reading application file ${filename}:`, error);
        }
      }
    }

    userApplications.sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime());

    return NextResponse.json({
      success: true,
      applications: userApplications,
      count: userApplications.length
    });

  } catch (error) {
    console.error('Error loading user city pass applications:', error);

    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to load applications' },
      { status: 500 }
    );
  }
}