import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { PublicServantIdApplication, PublicServantIdCategory } from '@/types/wallet';

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secure-jwt-secret-key-2024';

interface ApplicationData {
  category: PublicServantIdCategory;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phone: string;
  address: string;
  nationality: string;
  identificationNumber: string;
  identificationType: 'national_id' | 'passport' | 'drivers_license';
  employmentDetails: {
    department: string;
    position: string;
    employeeId: string;
    governmentEmail: string;
    startDate: string;
    contractType: 'permanent' | 'contract' | 'temporary' | 'consultant';
  };
}

function verifyUserToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  console.log('Auth verification - Header:', authHeader);
  console.log('Auth verification - Token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');

  if (!token) {
    throw new Error('No token provided');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log('Token decoded successfully:', { uid: decoded.uid, email: decoded.email });
    return decoded;
  } catch (error) {
    console.error('JWT verification error:', error.message);
    throw new Error('Invalid token');
  }
}

function getValidityPeriod(category: PublicServantIdCategory): number {
  // All public servant IDs have 12 months validity
  return 12;
}

function generatePublicServantId(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `PSI${timestamp}${random}`;
}

export async function POST(request: NextRequest) {
  try {
    const userData = verifyUserToken(request);
    const formData = await request.formData();

    // Extract form data
    const applicationData: ApplicationData = {
      category: formData.get('category') as PublicServantIdCategory,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      dateOfBirth: formData.get('dateOfBirth') as string,
      gender: formData.get('gender') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      address: formData.get('address') as string,
      nationality: formData.get('nationality') as string,
      identificationNumber: formData.get('identificationNumber') as string,
      identificationType: formData.get('identificationType') as 'national_id' | 'passport' | 'drivers_license',
      employmentDetails: JSON.parse(formData.get('employmentDetails') as string)
    };

    if (!applicationData.category || !['government_employee', 'contractor', 'consultant', 'volunteer'].includes(applicationData.category)) {
      return NextResponse.json(
        { error: 'Invalid or missing public servant ID category' },
        { status: 400 }
      );
    }

    // Validate required fields
    const requiredFields = [
      'firstName', 'lastName', 'dateOfBirth', 'gender', 'email', 'phone',
      'address', 'nationality', 'identificationNumber', 'identificationType'
    ];

    for (const field of requiredFields) {
      if (!applicationData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate employment details
    const requiredEmploymentFields = [
      'department', 'position', 'employeeId', 'governmentEmail', 'startDate', 'contractType'
    ];

    for (const field of requiredEmploymentFields) {
      if (!applicationData.employmentDetails[field]) {
        return NextResponse.json(
          { error: `Missing required employment field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate government email format
    if (!applicationData.employmentDetails.governmentEmail.endsWith('.gov.pg')) {
      return NextResponse.json(
        { error: 'Must use official government email (.gov.pg)' },
        { status: 400 }
      );
    }

    // Handle document uploads
    const documentsDir = path.join(process.cwd(), 'uploads', 'public-servant-id', `PSI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    
    if (!existsSync(documentsDir)) {
      await mkdir(documentsDir, { recursive: true });
    }

    const supportingDocuments: { [key: string]: string } = {};

    // Process uploaded documents
    const documentMetadata = JSON.parse(formData.get('documentMetadata') as string || '[]');
    
    for (const docMeta of documentMetadata) {
      const file = formData.get(docMeta.key) as File;
      if (file) {
        const fileExtension = path.extname(file.name);
        const fileName = `${docMeta.originalName.replace(/[^a-zA-Z0-9]/g, '_')}${fileExtension}`;
        const filePath = path.join(documentsDir, fileName);
        
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);
        
        // Map document types to the expected structure
        if (docMeta.originalName.toLowerCase().includes('nid') || docMeta.originalName.toLowerCase().includes('national')) {
          supportingDocuments.nidDocument = filePath;
        } else if (docMeta.originalName.toLowerCase().includes('police') || docMeta.originalName.toLowerCase().includes('clearance')) {
          supportingDocuments.policeClearance = filePath;
        } else if (docMeta.originalName.toLowerCase().includes('medical') || docMeta.originalName.toLowerCase().includes('certificate')) {
          supportingDocuments.medicalCertificate = filePath;
        }
      }
    }

    const applicationId = generatePublicServantId();
    const now = new Date().toISOString();
    const validityPeriod = getValidityPeriod(applicationData.category);

    const application: PublicServantIdApplication = {
      id: applicationId,
      userId: userData.uid,
      category: applicationData.category,
      firstName: applicationData.firstName,
      lastName: applicationData.lastName,
      dateOfBirth: applicationData.dateOfBirth,
      gender: applicationData.gender,
      email: applicationData.email,
      phone: applicationData.phone,
      address: applicationData.address,
      nationality: applicationData.nationality,
      identificationNumber: applicationData.identificationNumber,
      identificationType: applicationData.identificationType,
      supportingDocuments: {
        nidDocument: supportingDocuments.nidDocument || '',
        policeClearance: supportingDocuments.policeClearance || '',
        medicalCertificate: supportingDocuments.medicalCertificate || ''
      },
      employmentDetails: applicationData.employmentDetails,
      status: 'pending',
      validityPeriod,
      applicationDate: now
    };

    const applicationsDir = path.join(process.cwd(), 'data', 'public-servant-id-applications');
    
    if (!existsSync(applicationsDir)) {
      await mkdir(applicationsDir, { recursive: true });
    }

    const applicationFile = path.join(applicationsDir, `${applicationId}.json`);
    await writeFile(applicationFile, JSON.stringify(application, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Public Servant ID application submitted successfully',
      applicationId,
      status: 'pending',
      validityPeriod,
      estimatedProcessingTime: '7-10 business days'
    });

  } catch (error) {
    console.error('Error submitting public servant ID application:', error);

    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userData = verifyUserToken(request);
    
    return NextResponse.json({
      success: true,
      categories: {
        government_employee: {
          name: 'Government Employee',
          validityPeriod: 12,
          description: 'For permanent government employees with official contracts',
          requiredDocuments: ['National ID', 'Police Clearance Certificate', 'Medical Certificate']
        },
        contractor: {
          name: 'Government Contractor',
          validityPeriod: 12,
          description: 'For contractors providing services to government departments',
          requiredDocuments: ['National ID', 'Police Clearance Certificate', 'Medical Certificate']
        },
        consultant: {
          name: 'Government Consultant',
          validityPeriod: 12,
          description: 'For consultants working on government projects',
          requiredDocuments: ['National ID', 'Police Clearance Certificate', 'Medical Certificate']
        },
        volunteer: {
          name: 'Government Volunteer',
          validityPeriod: 12,
          description: 'For volunteers working with government programs',
          requiredDocuments: ['National ID', 'Police Clearance Certificate', 'Medical Certificate']
        }
      }
    });

  } catch (error) {
    console.error('Error getting public servant ID info:', error);

    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get public servant ID information' },
      { status: 500 }
    );
  }
}
