import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
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
    const decoded = jwt.verify(token, JWT_SECRET) as {id: string; username: string; role: string; permissions?: string[]};
    return decoded;
  } catch {
    throw new Error('Invalid token');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { applicationId: string } }
) {
  try {
    // Verify admin authentication
    const adminData = verifyAdminToken(request);
    
    // Debug logging
    console.log('=== DEBUG: City Pass Admin Authorization ===');
    console.log('Admin Role:', adminData.role);
    console.log('Admin Username:', adminData.username);
    console.log('Admin Permissions:', adminData.permissions);
    console.log('Application ID:', params.applicationId);
    
    // Check if admin has permission to approve city pass applications
    const isSuperAdmin = ['superadmin', 'dpm_superadmin', 'ncdc_superadmin'].includes(adminData.role);
    const hasApprovalPermission = adminData.permissions?.includes('approve_applications') || 
                                  adminData.permissions?.includes('approve_city_pass_applications');
    
    console.log('Is SuperAdmin:', isSuperAdmin);
    console.log('Has Approval Permission:', hasApprovalPermission);
    
    if (!isSuperAdmin && !hasApprovalPermission) {
      console.log('=== CITY PASS PERMISSION DENIED ===');
      return NextResponse.json(
        { error: 'Insufficient permissions to review city pass applications' },
        { status: 403 }
      );
    }
    
    console.log('=== CITY PASS PERMISSION GRANTED ===');
    
    const body = await request.json();
    console.log('=== REQUEST BODY ===', body);
    
    // Handle both old and new request formats
    let decision, notes, reviewedBy;
    if (body.decision) {
      // New format from superadmin dashboard
      decision = body.decision;
      notes = body.notes;
      reviewedBy = body.reviewedBy;
    } else if (body.action) {
      // Old format from city pass page
      decision = body.action === 'approve' ? 'approved' : 'rejected';
      notes = body.adminNotes;
      reviewedBy = adminData.username;
    }

    if (!decision || !['approved', 'rejected'].includes(decision)) {
      return NextResponse.json(
        { error: 'Invalid decision. Must be "approved" or "rejected"' },
        { status: 400 }
      );
    }

    const applicationId = params.applicationId;
    const applicationFile = path.join(process.cwd(), 'data', 'city-pass-applications', `${applicationId}.json`);

    console.log('=== CITY PASS FILE LOOKUP ===');
    console.log('Application ID:', applicationId);
    console.log('Looking for file:', applicationFile);
    console.log('File exists:', existsSync(applicationFile));
    
    // List all files in the directory for debugging
    const fs = require('fs');
    const dirPath = path.join(process.cwd(), 'data', 'city-pass-applications');
    if (existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      console.log('Available city pass files:', files);
    }

    if (!existsSync(applicationFile)) {
      console.log('=== CITY PASS APPLICATION NOT FOUND ===');
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Read current application
    const applicationData = await readFile(applicationFile, 'utf-8');
    const application = JSON.parse(applicationData);

    // Update application status
    const now = new Date().toISOString();
    application.status = decision;
    application.reviewDate = now;
    application.reviewedBy = reviewedBy || adminData.username;
    application.adminNotes = notes || '';

    if (decision === 'approved') {
      application.approvalDate = now;
      // Set expiry date based on validity period
      const validityMonths = application.validityPeriod || 12;
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + validityMonths);
      application.expiryDate = expiryDate.toISOString();
    }

    // Save updated application
    await writeFile(applicationFile, JSON.stringify(application, null, 2));

    return NextResponse.json({
      success: true,
      message: `Application ${decision} successfully`,
      application: {
        id: application.id,
        status: application.status,
        reviewDate: application.reviewDate,
        reviewedBy: application.reviewedBy,
        adminNotes: application.adminNotes
      }
    });

  } catch (error) {
    console.error('Error reviewing City Pass application:', error);
    
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to review application' },
      { status: 500 }
    );
  }
}