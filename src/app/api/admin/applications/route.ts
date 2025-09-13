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

    console.log('=== GENERAL APPLICATIONS REQUEST ===');
    console.log('Admin:', adminData.username);
    console.log('Admin Type:', adminData.adminType);
    console.log('Application Types:', adminData.applicationTypes);

    const allApplications = [];

    // Load Public Servant ID applications (for DPM admins)
    if (adminData.applicationTypes.includes('public_servant_id')) {
      console.log('=== LOADING PUBLIC SERVANT ID APPLICATIONS ===');
      const psiRegistryDir = path.join(process.cwd(), 'data', 'public-servant-id-applications');
      
      if (existsSync(psiRegistryDir)) {
        const psiApplicationFiles = readdirSync(psiRegistryDir);

        for (const filename of psiApplicationFiles) {
          if (filename.endsWith('.json')) {
            try {
              const filePath = path.join(psiRegistryDir, filename);
              const applicationData = await readFile(filePath, 'utf-8');
              const application = JSON.parse(applicationData);
              
              // Return application data without sensitive file paths
              allApplications.push({
                ...application,
                applicationType: 'public_servant_id',
                workEmail: application.workEmail || application.email,
                createdAt: application.createdAt || application.applicationDate
              });
            } catch (error) {
              console.error(`Error reading PSI application file ${filename}:`, error);
            }
          }
        }
      }
    }

    // Load City Pass applications (for NCDC admins)
    if (adminData.applicationTypes.includes('city_pass')) {
      const cpRegistryDir = path.join(process.cwd(), 'data', 'city-pass-applications');
      
      if (existsSync(cpRegistryDir)) {
        const cpApplicationFiles = readdirSync(cpRegistryDir);

        for (const filename of cpApplicationFiles) {
          if (filename.endsWith('.json')) {
            try {
              const filePath = path.join(cpRegistryDir, filename);
              const applicationData = await readFile(filePath, 'utf-8');
              const application = JSON.parse(applicationData);
              
              // Return application data without sensitive file paths
              allApplications.push({
                ...application,
                applicationType: 'city_pass',
                createdAt: application.createdAt || application.applicationDate
              });
            } catch (error) {
              console.error(`Error reading City Pass application file ${filename}:`, error);
            }
          }
        }
      }
    }

    // Sort by creation date (newest first)
    allApplications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      applications: allApplications,
      count: allApplications.length,
      adminType: adminData.adminType,
      applicationTypes: adminData.applicationTypes
    });

  } catch (error) {
    console.error('Error loading applications:', error);
    
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