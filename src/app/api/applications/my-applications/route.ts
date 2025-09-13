import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, unlink } from 'fs/promises';
import { existsSync, readdirSync } from 'fs';
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
    const decoded = jwt.verify(token, JWT_SECRET) as { uid: string; email: string };
    return decoded;
  } catch {
    throw new Error('Invalid token');
  }
}

// GET - Fetch user's applications
export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const userData = verifyUserToken(request);
    const userApplications = [];

    // Check Public Servant ID applications
    const psiDir = path.join(process.cwd(), 'data', 'public-servant-id-applications');
    if (existsSync(psiDir)) {
      const psiFiles = readdirSync(psiDir);
      for (const filename of psiFiles) {
        if (filename.endsWith('.json')) {
          try {
            const filePath = path.join(psiDir, filename);
            const applicationData = JSON.parse(await readFile(filePath, 'utf-8'));
            
            if (applicationData.userId === userData.uid) {
              userApplications.push({
                ...applicationData,
                type: 'public_servant_id',
                canEdit: applicationData.status === 'pending',
                canDelete: applicationData.status === 'pending'
              });
            }
          } catch (error) {
            console.error(`Error reading PSI application ${filename}:`, error);
          }
        }
      }
    }

    // Check City Pass applications
    const cpDir = path.join(process.cwd(), 'data', 'city-pass-applications');
    if (existsSync(cpDir)) {
      const cpFiles = readdirSync(cpDir);
      for (const filename of cpFiles) {
        if (filename.endsWith('.json')) {
          try {
            const filePath = path.join(cpDir, filename);
            const applicationData = JSON.parse(await readFile(filePath, 'utf-8'));
            
            if (applicationData.userId === userData.uid) {
              userApplications.push({
                ...applicationData,
                type: 'city_pass',
                canEdit: applicationData.status === 'pending',
                canDelete: applicationData.status === 'pending'
              });
            }
          } catch (error) {
            console.error(`Error reading City Pass application ${filename}:`, error);
          }
        }
      }
    }

    // Sort by application date (newest first)
    userApplications.sort((a, b) => 
      new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime()
    );

    return NextResponse.json({
      success: true,
      applications: userApplications,
      count: userApplications.length
    });

  } catch (error) {
    console.error('Error fetching user applications:', error);
    
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

// DELETE - Delete pending application
export async function DELETE(request: NextRequest) {
  try {
    // Verify user authentication
    const userData = verifyUserToken(request);
    const { applicationId, applicationType } = await request.json();

    if (!applicationId || !applicationType) {
      return NextResponse.json(
        { error: 'Application ID and type are required' },
        { status: 400 }
      );
    }

    // Determine application directory
    const applicationDir = applicationType === 'public_servant_id' ? 
      'public-servant-id-applications' : 
      'city-pass-applications';
    
    const applicationPath = path.join(
      process.cwd(), 
      'data', 
      applicationDir, 
      `${applicationId}.json`
    );

    if (!existsSync(applicationPath)) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Read and verify ownership and status
    const applicationData = JSON.parse(await readFile(applicationPath, 'utf-8'));
    
    if (applicationData.userId !== userData.uid) {
      return NextResponse.json(
        { error: 'Access denied: You can only delete your own applications' },
        { status: 403 }
      );
    }

    if (applicationData.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cannot delete application: Only pending applications can be deleted' },
        { status: 400 }
      );
    }

    // Delete associated uploaded files
    if (applicationData.supportingDocuments) {
      for (const [key, filePath] of Object.entries(applicationData.supportingDocuments)) {
        if (filePath && typeof filePath === 'string') {
          try {
            let fullPath = filePath;
            if (filePath.startsWith('/uploads/')) {
              fullPath = path.join(process.cwd(), 'public', filePath);
            }
            
            if (existsSync(fullPath)) {
              await unlink(fullPath);
              console.log(`Deleted document file: ${fullPath}`);
            }
          } catch (fileError) {
            console.error(`Error deleting document file ${filePath}:`, fileError);
          }
        }
      }
    }

    // Delete application file
    await unlink(applicationPath);
    console.log(`Deleted application: ${applicationPath}`);

    return NextResponse.json({
      success: true,
      message: 'Application deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting application:', error);
    
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete application' },
      { status: 500 }
    );
  }
}