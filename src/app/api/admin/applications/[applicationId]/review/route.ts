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
    const decoded = jwt.verify(token, JWT_SECRET) as {adminId: string; username: string; role: string; permissions?: string[]};
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
    console.log('=== DEBUG: Admin Authorization ===');
    console.log('Admin Role:', adminData.role);
    console.log('Admin Username:', adminData.username);
    console.log('Admin Permissions:', adminData.permissions);
    console.log('Application ID:', params.applicationId);

    // Check if admin has permission to approve applications
    // SuperAdmins always have permission, others need explicit permission
    const isSuperAdmin = ['superadmin', 'dpm_superadmin', 'ncdc_superadmin'].includes(adminData.role);
    const hasApprovalPermission = adminData.permissions?.includes('approve_applications') || 
                                  adminData.permissions?.includes('approve_public_servant_applications') ||
                                  adminData.permissions?.includes('approve_city_pass_applications');
    
    console.log('Is SuperAdmin:', isSuperAdmin);
    console.log('Has Approval Permission:', hasApprovalPermission);
    
    if (!isSuperAdmin && !hasApprovalPermission) {
      console.log('=== PERMISSION DENIED ===');
      return NextResponse.json(
        { error: 'Insufficient permissions to review applications' },
        { status: 403 }
      );
    }
    
    console.log('=== PERMISSION GRANTED ===');

    const { applicationId } = params;
    const { decision, notes, reviewedBy, isOverride } = await request.json();

    if (!decision || !['approved', 'rejected'].includes(decision)) {
      return NextResponse.json(
        { error: 'Invalid decision. Must be "approved" or "rejected"' },
        { status: 400 }
      );
    }

    // Find and load the application
    const registryDir = path.join(process.cwd(), 'data', 'public-servant-id-applications');
    const applicationPath = path.join(registryDir, `${applicationId}.json`);

    console.log('=== GENERAL APPLICATION FILE LOOKUP ===');
    console.log('Application ID:', applicationId);
    console.log('Looking for file:', applicationPath);
    console.log('File exists:', existsSync(applicationPath));
    
    // List all files in the directory for debugging
    const fs = require('fs');
    if (existsSync(registryDir)) {
      const files = fs.readdirSync(registryDir);
      console.log('Available public servant files:', files);
    }

    if (!existsSync(applicationPath)) {
      console.log('=== GENERAL APPLICATION NOT FOUND ===');
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    const applicationData = await readFile(applicationPath, 'utf-8');
    const application = JSON.parse(applicationData);

    // Check if application has already been reviewed
    // SuperAdmins can override previous decisions
    if (application.status !== 'pending') {
      const canOverride = ['superadmin', 'dpm_superadmin', 'ncdc_superadmin'].includes(adminData.role);
      if (!isOverride || !canOverride) {
        return NextResponse.json(
          { error: 'Application has already been reviewed. Only SuperAdmins can override decisions.' },
          { status: 400 }
        );
      }
      // Log the override action
      console.log(`SuperAdmin ${adminData.username} is overriding decision for application ${applicationId}`);
    }

    // Update application status
    const updatedApplication = {
      ...application,
      status: decision,
      adminNotes: notes || '',
      reviewedBy: reviewedBy || adminData.username,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Track if this was an override action
      isOverride: isOverride || false,
      overrideBy: isOverride ? adminData.username : undefined,
      overrideAt: isOverride ? new Date().toISOString() : undefined,
      adminRole: adminData.role,
      previousStatus: application.status !== 'pending' ? application.status : undefined,
      // Store review history
      reviewHistory: [
        ...(application.reviewHistory || []),
        {
          decision,
          notes: notes || '',
          reviewedBy: reviewedBy || adminData.username,
          reviewedAt: new Date().toISOString(),
          adminRole: adminData.role,
          isOverride: isOverride || false,
          previousStatus: application.status
        }
      ]
    };

    // Save updated application
    await writeFile(applicationPath, JSON.stringify(updatedApplication, null, 2));

    // If approved, create the Public Servant ID card
    if (decision === 'approved') {
      try {
        await createPublicServantCard(updatedApplication);
      } catch (cardError) {
        console.error('Error creating card:', cardError);
        // Don't fail the approval if card creation fails
        // The card can be created later
      }
    }

    return NextResponse.json({
      success: true,
      message: `Application ${decision} successfully`,
      application: {
        id: updatedApplication.id,
        status: updatedApplication.status,
        reviewedBy: updatedApplication.reviewedBy,
        reviewedAt: updatedApplication.reviewedAt,
        adminNotes: updatedApplication.adminNotes
      }
    });

  } catch (error) {
    console.error('Error reviewing application:', error);
    
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

// Helper function to create Public Servant ID card
async function createPublicServantCard(application: any) {
  try {
    const cardData = {
      id: `PSC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: application.userId,
      applicationId: application.id,
      type: 'public_servant_id',
      name: `${application.firstName} ${application.lastName}`,
      holderName: `${application.firstName} ${application.lastName}`,
      cardNumber: `PS${application.employmentDetails?.employeeId || application.employeeNumber}`,
      issuer: 'Department of Personnel Management',
      employeeNumber: application.employmentDetails?.employeeId || application.employeeNumber,
      workEmail: application.employmentDetails?.governmentEmail || application.email,
      department: application.employmentDetails?.department || application.department,
      address: application.address,
      dateOfBirth: application.dateOfBirth,
      gender: application.gender,
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 years
      colors: {
        primary: '#1E40AF', // Blue for government
        secondary: '#3B82F6',
        background: '#1E293B',
        text: '#FFFFFF'
      },
      isVerified: true,
      status: 'active',
      metadata: {
        addedVia: 'admin_approval',
        approvedBy: application.reviewedBy,
        approvedAt: application.reviewedAt,
        applicationId: application.id,
        cardType: 'government_id'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save card data for wallet integration
    const cardsDir = path.join(process.cwd(), 'data', 'public-servant-cards');
    if (!existsSync(cardsDir)) {
      const { mkdir } = await import('fs/promises');
      await mkdir(cardsDir, { recursive: true });
    }
    
    const cardPath = path.join(cardsDir, `${cardData.id}.json`);
    await writeFile(cardPath, JSON.stringify(cardData, null, 2));

    console.log(`Public Servant ID card created: ${cardData.id}`);
    return cardData;

  } catch (error) {
    console.error('Error creating Public Servant ID card:', error);
    throw error;
  }
}