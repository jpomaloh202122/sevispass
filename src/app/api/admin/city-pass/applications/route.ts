import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync, readdirSync } from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secure-admin-jwt-secret-key-2024';

// Verify admin token middleware
function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    throw new Error('No token provided');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      adminId: string; 
      username: string; 
      role: string;
      adminType: string;
      permissions: string[];
      applicationTypes: string[];
    };
    return decoded;
  } catch {
    throw new Error('Invalid token');
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminData = verifyAdminToken(request);

    console.log('=== CITY PASS APPLICATIONS REQUEST ===');
    console.log('Admin:', adminData.username);
    console.log('Admin Type:', adminData.adminType);
    console.log('Application Types:', adminData.applicationTypes);

    // Check if admin has permission to view city pass applications
    if (!adminData.applicationTypes.includes('city_pass')) {
      console.log('=== ACCESS DENIED - No city pass permission ===');
      return NextResponse.json({
        success: true,
        applications: [],
        count: 0,
        message: 'No city pass applications available for this admin type'
      });
    }
    
    console.log('=== ACCESS GRANTED - Loading city pass applications ===');

    // Load all City Pass applications
    const applicationsDir = path.join(process.cwd(), 'data', 'city-pass-applications');
    
    if (!existsSync(applicationsDir)) {
      return NextResponse.json({
        success: true,
        applications: [],
        count: 0
      });
    }

    const applicationFiles = readdirSync(applicationsDir);
    const applications = [];

    for (const filename of applicationFiles) {
      if (filename.endsWith('.json')) {
        try {
          const filePath = path.join(applicationsDir, filename);
          const applicationData = await readFile(filePath, 'utf-8');
          const application = JSON.parse(applicationData);
          
          // Return application data without sensitive file paths
          applications.push({
            id: application.id,
            userId: application.userId,
            category: application.category,
            firstName: application.firstName,
            lastName: application.lastName,
            dateOfBirth: application.dateOfBirth,
            gender: application.gender,
            email: application.email,
            phone: application.phone,
            address: application.address,
            nationality: application.nationality,
            identificationNumber: application.identificationNumber,
            identificationType: application.identificationType,
            status: application.status,
            validityPeriod: application.validityPeriod,
            applicationDate: application.applicationDate,
            reviewDate: application.reviewDate,
            approvalDate: application.approvalDate,
            expiryDate: application.expiryDate,
            adminNotes: application.adminNotes,
            reviewedBy: application.reviewedBy,
            ncdcReference: application.ncdcReference
          });
        } catch (error) {
          console.error(`Error reading application file ${filename}:`, error);
        }
      }
    }

    // Sort by application date (newest first)
    applications.sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime());

    return NextResponse.json({
      success: true,
      applications,
      count: applications.length
    });

  } catch (error) {
    console.error('Error loading City Pass applications:', error);
    
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