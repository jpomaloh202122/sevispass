import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secure-jwt-secret-key-2024';

// Verify user token middleware
function verifyUserToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    throw new Error('No token provided');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    return decoded;
  } catch {
    throw new Error('Invalid token');
  }
}

// GET - Fetch application for editing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userData = verifyUserToken(request);

    // Try to find the application in both directories
    let applicationData = null;
    let applicationType = null;

    // Check Public Servant ID applications
    const psiPath = path.join(process.cwd(), 'data', 'public-servant-id-applications', `${id}.json`);
    if (existsSync(psiPath)) {
      applicationData = JSON.parse(await readFile(psiPath, 'utf-8'));
      applicationType = 'public_servant_id';
    } else {
      // Check City Pass applications
      const cpPath = path.join(process.cwd(), 'data', 'city-pass-applications', `${id}.json`);
      if (existsSync(cpPath)) {
        applicationData = JSON.parse(await readFile(cpPath, 'utf-8'));
        applicationType = 'city_pass';
      }
    }

    if (!applicationData) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (applicationData.userId !== userData.userId) {
      return NextResponse.json(
        { error: 'Access denied: You can only edit your own applications' },
        { status: 403 }
      );
    }

    // Check if application can be edited
    if (applicationData.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cannot edit application: Only pending applications can be edited' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      application: {
        ...applicationData,
        type: applicationType,
        canEdit: true
      }
    });

  } catch (error) {
    console.error('Error fetching application for edit:', error);
    
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch application' },
      { status: 500 }
    );
  }
}

// PUT - Update application
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userData = verifyUserToken(request);
    const updateData = await request.json();

    // Try to find the application in both directories
    let applicationPath = null;
    let applicationData = null;

    // Check Public Servant ID applications
    const psiPath = path.join(process.cwd(), 'data', 'public-servant-id-applications', `${id}.json`);
    if (existsSync(psiPath)) {
      applicationData = JSON.parse(await readFile(psiPath, 'utf-8'));
      applicationPath = psiPath;
    } else {
      // Check City Pass applications
      const cpPath = path.join(process.cwd(), 'data', 'city-pass-applications', `${id}.json`);
      if (existsSync(cpPath)) {
        applicationData = JSON.parse(await readFile(cpPath, 'utf-8'));
        applicationPath = cpPath;
      }
    }

    if (!applicationData || !applicationPath) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (applicationData.userId !== userData.userId) {
      return NextResponse.json(
        { error: 'Access denied: You can only edit your own applications' },
        { status: 403 }
      );
    }

    // Check if application can be edited
    if (applicationData.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cannot edit application: Only pending applications can be edited' },
        { status: 400 }
      );
    }

    // Merge updated data while preserving system fields
    const updatedApplication = {
      ...applicationData,
      ...updateData,
      // Preserve system fields that shouldn't be changed
      id: applicationData.id,
      userId: applicationData.userId,
      status: applicationData.status,
      applicationDate: applicationData.applicationDate,
      // Update timestamp
      updatedAt: new Date().toISOString(),
      // Preserve review data
      adminNotes: applicationData.adminNotes,
      reviewedBy: applicationData.reviewedBy,
      reviewedAt: applicationData.reviewedAt,
      reviewHistory: applicationData.reviewHistory
    };

    // Save updated application
    await writeFile(applicationPath, JSON.stringify(updatedApplication, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Application updated successfully',
      application: updatedApplication
    });

  } catch (error) {
    console.error('Error updating application:', error);
    
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    );
  }
}