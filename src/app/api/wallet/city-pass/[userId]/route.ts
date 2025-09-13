import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync, readdirSync } from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { CityPassApplication, CityPassCard } from '@/types/wallet';

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

function getCategoryColors(category: string) {
  const colorMap = {
    student: {
      primary: '#3B82F6',
      secondary: '#1E40AF',
      background: '#EFF6FF',
      text: '#1E40AF'
    },
    employee: {
      primary: '#10B981',
      secondary: '#047857',
      background: '#ECFDF5',
      text: '#047857'
    },
    business_owner: {
      primary: '#F59E0B',
      secondary: '#D97706',
      background: '#FFFBEB',
      text: '#D97706'
    },
    property_owner: {
      primary: '#8B5CF6',
      secondary: '#7C3AED',
      background: '#F5F3FF',
      text: '#7C3AED'
    },
    visitor: {
      primary: '#EF4444',
      secondary: '#DC2626',
      background: '#FEF2F2',
      text: '#DC2626'
    }
  };

  return colorMap[category] || colorMap.visitor;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const userData = verifyUserToken(request);
    const { userId } = await params;

    if (userData.uid !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    const applicationsDir = path.join(process.cwd(), 'data', 'city-pass-applications');
    
    if (!existsSync(applicationsDir)) {
      return NextResponse.json({
        success: true,
        cityPasses: []
      });
    }

    const applicationFiles = readdirSync(applicationsDir);
    const cityPasses: CityPassCard[] = [];

    for (const filename of applicationFiles) {
      if (filename.endsWith('.json')) {
        try {
          const filePath = path.join(applicationsDir, filename);
          const applicationData = await readFile(filePath, 'utf-8');
          const application: CityPassApplication = JSON.parse(applicationData);
          
          if (application.userId === userId && application.status === 'approved') {
            const currentDate = new Date();
            const expiryDate = application.expiryDate ? new Date(application.expiryDate) : null;
            
            if (!expiryDate || currentDate <= expiryDate) {
              const colors = getCategoryColors(application.category);
              
              const cityPassCard: CityPassCard = {
                id: application.id,
                type: 'city_pass',
                name: `${application.category.replace('_', ' ').toUpperCase()} CITY PASS`,
                holderName: `${application.firstName} ${application.lastName}`,
                cardNumber: application.id,
                issueDate: application.approvalDate || application.applicationDate,
                expiryDate: application.expiryDate,
                issuer: 'National Capital Development Commission (NCDC)',
                qrCode: application.ncdcReference,
                profileImage: '',
                metadata: {
                  category: application.category,
                  validityPeriod: application.validityPeriod,
                  nationality: application.nationality,
                  identificationNumber: application.identificationNumber,
                  email: application.email,
                  phone: application.phone,
                  address: application.address,
                  dateOfBirth: application.dateOfBirth,
                  gender: application.gender,
                  identificationType: application.identificationType,
                  categorySpecificData: application.categorySpecificData
                },
                colors,
                isVerified: true,
                createdAt: application.approvalDate || application.applicationDate,
                updatedAt: application.reviewDate || application.applicationDate,
                passCategory: application.category,
                ncdcReference: application.ncdcReference || '',
                validityPeriod: application.validityPeriod
              };

              cityPasses.push(cityPassCard);
            }
          }
        } catch (error) {
          console.error(`Error reading application file ${filename}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      cityPasses
    });

  } catch (error) {
    console.error('Error loading city passes:', error);

    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to load city passes' },
      { status: 500 }
    );
  }
}