import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { CityPassApplication, CityPassCategory } from '@/types/wallet';
import { CityPassQualificationService } from '@/lib/city-pass-qualification';

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secure-jwt-secret-key-2024';

console.log('JWT_SECRET configured:', JWT_SECRET ? 'YES' : 'NO');

interface ApplicationData {
  category: CityPassCategory;
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
  categorySpecificData: {
    [key: string]: any;
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
    console.error('JWT_SECRET being used:', JWT_SECRET.substring(0, 20) + '...');
    console.error('Token format check:', { 
      length: token.length, 
      parts: token.split('.').length,
      startsCorrectly: token.startsWith('eyJ')
    });
    throw new Error('Invalid token');
  }
}

function getValidityPeriod(category: CityPassCategory): number {
  return category === 'visitor' ? 3 : 12;
}

function generateCityPassId(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `CP${timestamp}${random}`;
}

export async function POST(request: NextRequest) {
  try {
    console.log('City Pass API: Starting request processing');
    
    let userData;
    try {
      userData = verifyUserToken(request);
      console.log('City Pass API: User authenticated:', userData.uid);
    } catch (authError) {
      console.error('City Pass API: Authentication failed:', authError.message);
      return NextResponse.json(
        { error: 'Authentication required', details: authError.message },
        { status: 401 }
      );
    }
    
    // Handle both JSON and FormData requests
    let applicationData: ApplicationData;
    let formDataInstance: FormData | null = null;
    const contentType = request.headers.get('content-type');
    console.log('City Pass API: Content-Type:', contentType);
    
    if (contentType && contentType.includes('multipart/form-data')) {
      console.log('City Pass API: Processing FormData request');
      try {
        // Handle FormData and store the instance for later use
        formDataInstance = await request.formData();
        applicationData = {
          category: formDataInstance.get('category') as CityPassCategory,
          firstName: formDataInstance.get('firstName') as string,
          lastName: formDataInstance.get('lastName') as string,
          dateOfBirth: formDataInstance.get('dateOfBirth') as string,
          gender: formDataInstance.get('gender') as string,
          email: formDataInstance.get('email') as string,
          phone: formDataInstance.get('phone') as string,
          address: formDataInstance.get('address') as string,
          nationality: formDataInstance.get('nationality') as string,
          identificationNumber: formDataInstance.get('identificationNumber') as string,
          identificationType: formDataInstance.get('identificationType') as 'national_id' | 'passport' | 'drivers_license',
          categorySpecificData: formDataInstance.get('categorySpecificData') ? JSON.parse(formDataInstance.get('categorySpecificData') as string) : {}
        };
      } catch (formDataError) {
        console.error('City Pass API: FormData parsing error:', formDataError.message);
        return NextResponse.json(
          { error: 'Invalid form data', details: formDataError.message },
          { status: 400 }
        );
      }
    } else {
      // Handle JSON
      console.log('City Pass API: Processing JSON request');
      try {
        applicationData = await request.json();
      } catch (jsonError) {
        console.error('City Pass API: JSON parsing error:', jsonError.message);
        return NextResponse.json(
          { error: 'Invalid JSON data', details: jsonError.message },
          { status: 400 }
        );
      }
    }
    
    console.log('City Pass API: Parsed application data:', {
      category: applicationData.category,
      firstName: applicationData.firstName,
      lastName: applicationData.lastName,
      email: applicationData.email
    });

    if (!applicationData.category || !['student', 'employee', 'business_owner', 'property_owner', 'visitor'].includes(applicationData.category)) {
      return NextResponse.json(
        { error: 'Invalid or missing city pass category' },
        { status: 400 }
      );
    }

    // Special handling for employee category - check qualification
    if (applicationData.category === 'employee') {
      try {
        const qualificationReport = await CityPassQualificationService.getQualificationReport(userData.uid);
        
        // If user qualifies for automatic approval, process it immediately
        if (qualificationReport.qualification.autoApprovalEligible) {
          const autoApprovalResult = await CityPassQualificationService.autoApproveCityPass(userData.uid);
          
          if (autoApprovalResult.success) {
            return NextResponse.json({
              success: true,
              message: 'Congratulations! Your City Pass employee category has been automatically approved.',
              applicationId: autoApprovalResult.cityPassId,
              status: 'auto_approved',
              qualificationBasis: 'SevisPass + Public Servant Pass + Port Moresby Address',
              validityPeriod: 12,
              processingTime: 'Instant',
              nextSteps: [
                'Your City Pass is now active and available in your digital wallet',
                'You can immediately access city employee benefits and services',
                'Present your digital pass for verification when needed',
                'Pass will expire in 12 months and can be renewed'
              ]
            });
          }
        }
        
        // If not auto-eligible but still qualified, allow manual application
        else if (qualificationReport.qualification.isQualified) {
          console.log('User qualifies for manual employee city pass application');
          // Continue with normal application process below
        }
        
        // If not qualified at all, return guidance
        else {
          return NextResponse.json({
            success: false,
            error: 'Not qualified for employee category',
            message: qualificationReport.qualification.qualificationReason,
            missingRequirements: qualificationReport.qualification.missingRequirements,
            recommendedActions: qualificationReport.qualification.recommendedActions,
            alternativeCategories: ['visitor', 'property_owner', 'business_owner'].filter(cat => cat !== 'employee')
          }, { status: 400 });
        }
        
      } catch (qualError) {
        console.warn('Qualification check failed, proceeding with manual application:', qualError.message);
        // Continue with normal application process if qualification check fails
      }
    }

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

    const applicationId = generateCityPassId();
    const now = new Date().toISOString();
    const validityPeriod = getValidityPeriod(applicationData.category);

    // Handle file uploads if FormData was used
    let supportingDocuments = {
      identificationDocument: '',
      proofOfAddress: '',
      categorySpecificDocument: ''
    };

    if (formDataInstance) {
      const uploadsDir = path.join(process.cwd(), 'uploads', 'city-pass', applicationId);
      
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      // Process uploaded files using the stored FormData instance
      for (const [key, file] of formDataInstance.entries()) {
        if (file instanceof File && file.size > 0) {
          const fileName = `${key}_${Date.now()}_${file.name}`;
          const filePath = path.join(uploadsDir, fileName);
          const buffer = Buffer.from(await file.arrayBuffer());
          await writeFile(filePath, buffer);
          
          // Map file keys to document types
          if (key === 'document_0') {
            supportingDocuments.identificationDocument = `/uploads/city-pass/${applicationId}/${fileName}`;
          } else if (key === 'document_1') {
            supportingDocuments.proofOfAddress = `/uploads/city-pass/${applicationId}/${fileName}`;
          } else if (key === 'document_2') {
            supportingDocuments.categorySpecificDocument = `/uploads/city-pass/${applicationId}/${fileName}`;
          }
        }
      }
    }

    const application: CityPassApplication = {
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
      supportingDocuments,
      categorySpecificData: applicationData.categorySpecificData || {},
      status: 'pending',
      validityPeriod,
      applicationDate: now
    };

    const applicationsDir = path.join(process.cwd(), 'data', 'city-pass-applications');
    
    if (!existsSync(applicationsDir)) {
      await mkdir(applicationsDir, { recursive: true });
    }

    const applicationFile = path.join(applicationsDir, `${applicationId}.json`);
    await writeFile(applicationFile, JSON.stringify(application, null, 2));

    return NextResponse.json({
      success: true,
      message: 'City pass application submitted successfully',
      applicationId,
      status: 'pending',
      validityPeriod,
      estimatedProcessingTime: '5-7 business days'
    });

  } catch (error) {
    console.error('Error submitting city pass application:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    // Ensure we always return a proper JSON response
    try {
      if (error.message === 'No token provided' || error.message === 'Invalid token') {
        console.log('Returning 401 - Authentication required');
        return NextResponse.json(
          { error: 'Authentication required', details: error.message },
          { status: 401 }
        );
      }

      console.log('Returning 500 - Internal server error');
      return NextResponse.json(
        { error: 'Failed to submit application', details: error.message },
        { status: 500 }
      );
    } catch (responseError) {
      console.error('Failed to create error response:', responseError);
      // Last resort - return a simple text response
      return new Response('Internal Server Error', { status: 500 });
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const userData = verifyUserToken(request);
    
    return NextResponse.json({
      success: true,
      categories: {
        student: {
          name: 'Student Pass',
          validityPeriod: 12,
          description: 'For registered students in recognized institutions',
          requiredDocuments: ['Student ID', 'Enrollment Certificate']
        },
        employee: {
          name: 'Employee Pass',
          validityPeriod: 12,
          description: 'For employees working within the city',
          requiredDocuments: ['Employment Letter', 'Company Registration']
        },
        business_owner: {
          name: 'Business Owner Pass',
          validityPeriod: 12,
          description: 'For registered business owners operating in the city',
          requiredDocuments: ['Business License', 'Tax Certificate']
        },
        property_owner: {
          name: 'Property Owner Pass',
          validityPeriod: 12,
          description: 'For property owners within city limits',
          requiredDocuments: ['Property Title', 'Property Tax Receipt']
        },
        visitor: {
          name: 'Visitor Pass',
          validityPeriod: 3,
          description: 'For temporary visitors to the city',
          requiredDocuments: ['Hotel Booking', 'Travel Itinerary']
        }
      }
    });

  } catch (error) {
    console.error('Error getting city pass info:', error);

    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to get city pass information' },
      { status: 500 }
    );
  }
}