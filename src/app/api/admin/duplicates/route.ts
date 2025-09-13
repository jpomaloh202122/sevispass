import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { existsSync, readdirSync } from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { PublicServantDuplicateDetector } from '@/lib/duplicate-detector';

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secure-admin-jwt-secret-key-2024';

// Verify admin token middleware
function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    throw new Error('No token provided');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { permissions?: string[]; username?: string };
    return decoded;
  } catch (_error) {
    throw new Error('Invalid token');
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminData = verifyAdminToken(request);

    if (!adminData.permissions?.includes('view_applications')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view duplicate reports' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'all'; // all, flagged, blocking
    const applicationId = url.searchParams.get('applicationId');

    // If requesting specific application duplicate analysis
    if (applicationId) {
      const duplicateDetector = new PublicServantDuplicateDetector();
      const report = await duplicateDetector.getDuplicateReport(applicationId);
      return NextResponse.json(report);
    }

    // Get all applications with duplicate information
    const registryDir = path.join(process.cwd(), 'data', 'public-servant-applications');
    
    if (!existsSync(registryDir)) {
      return NextResponse.json({
        duplicateApplications: [],
        summary: { total: 0, flagged: 0, blocking: 0 }
      });
    }

    const applicationFiles = readdirSync(registryDir);
    const duplicateApplications: Array<{
      id: string;
      name: string;
      email: string;
      employeeNumber: string;
      department: string;
      status: string;
      createdAt: string;
      duplicateInfo: {
        hasWarning: boolean;
        warningMessage?: string;
        potentialMatches: Array<{
          applicationId: string;
          matchType: string;
          matchScore: number;
          duplicateFields: string[];
          riskLevel: string;
        }>;
      };
    }> = [];
    let flaggedCount = 0;
    let blockingCount = 0;

    for (const filename of applicationFiles) {
      if (filename.endsWith('.json')) {
        try {
          const filePath = path.join(registryDir, filename);
          const applicationData = await readFile(filePath, 'utf-8');
          const application = JSON.parse(applicationData);

          // Check if application has duplicate warnings or issues
          const hasDuplicateWarning = application.duplicateCheck?.hasWarning;
          const hasHighRiskMatches = application.duplicateCheck?.potentialMatches?.some((m: { matchScore: number }) => m.matchScore >= 70);
          
          if (type === 'all' || 
              (type === 'flagged' && hasDuplicateWarning) || 
              (type === 'blocking' && hasHighRiskMatches)) {
            
            const appSummary = {
              id: application.id,
              name: `${application.firstName} ${application.lastName}`,
              email: application.workEmail,
              employeeNumber: application.employeeNumber,
              department: application.department,
              status: application.status,
              createdAt: application.createdAt,
              duplicateInfo: {
                hasWarning: hasDuplicateWarning,
                warningMessage: application.duplicateCheck?.warningMessage,
                potentialMatches: application.duplicateCheck?.potentialMatches?.map((match: { applicationId: string; matchType: string; matchScore: number; duplicateFields: string[] }) => ({
                  applicationId: match.applicationId,
                  matchType: match.matchType,
                  matchScore: match.matchScore,
                  duplicateFields: match.duplicateFields,
                  riskLevel: match.matchScore >= 70 ? 'HIGH' : match.matchScore >= 40 ? 'MEDIUM' : 'LOW'
                })) || []
              }
            };

            duplicateApplications.push(appSummary);

            if (hasDuplicateWarning) flaggedCount++;
            if (hasHighRiskMatches) blockingCount++;
          }
        } catch (error) {
          console.error(`Error reading application file ${filename}:`, error);
        }
      }
    }

    // Sort by creation date (newest first)
    duplicateApplications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      duplicateApplications,
      summary: {
        total: duplicateApplications.length,
        flagged: flaggedCount,
        blocking: blockingCount
      }
    });

  } catch (error) {
    console.error('Error fetching duplicate reports:', error);
    
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch duplicate reports' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const adminData = verifyAdminToken(request);

    if (!adminData.permissions?.includes('approve_applications')) {
      return NextResponse.json(
        { error: 'Insufficient permissions to resolve duplicates' },
        { status: 403 }
      );
    }

    const { action, applicationId, targetApplicationId, reason } = await request.json();

    if (!action || !applicationId) {
      return NextResponse.json(
        { error: 'Missing required fields: action, applicationId' },
        { status: 400 }
      );
    }

    const registryDir = path.join(process.cwd(), 'data', 'public-servant-applications');
    const applicationPath = path.join(registryDir, `${applicationId}.json`);

    if (!existsSync(applicationPath)) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    const applicationData = JSON.parse(await readFile(applicationPath, 'utf-8'));

    switch (action) {
      case 'resolve_as_unique':
        // Mark as reviewed and unique
        applicationData.duplicateCheck.resolved = true;
        applicationData.duplicateCheck.resolvedBy = adminData.username;
        applicationData.duplicateCheck.resolvedAt = new Date().toISOString();
        applicationData.duplicateCheck.resolution = 'unique';
        applicationData.duplicateCheck.resolutionReason = reason || 'Admin verified as unique application';
        break;

      case 'merge_with_existing':
        if (!targetApplicationId) {
          return NextResponse.json(
            { error: 'Target application ID required for merge action' },
            { status: 400 }
          );
        }
        
        // Mark current application as duplicate and reference the original
        applicationData.duplicateCheck.resolved = true;
        applicationData.duplicateCheck.resolvedBy = adminData.username;
        applicationData.duplicateCheck.resolvedAt = new Date().toISOString();
        applicationData.duplicateCheck.resolution = 'duplicate';
        applicationData.duplicateCheck.mergedWith = targetApplicationId;
        applicationData.duplicateCheck.resolutionReason = reason || 'Merged with existing application';
        applicationData.status = 'duplicate';
        break;

      case 'flag_for_review':
        // Add admin flag for further review
        applicationData.duplicateCheck.flaggedForReview = true;
        applicationData.duplicateCheck.flaggedBy = adminData.username;
        applicationData.duplicateCheck.flaggedAt = new Date().toISOString();
        applicationData.duplicateCheck.flagReason = reason || 'Requires additional review';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be: resolve_as_unique, merge_with_existing, or flag_for_review' },
          { status: 400 }
        );
    }

    applicationData.updatedAt = new Date().toISOString();

    // Save updated application
    await writeFile(applicationPath, JSON.stringify(applicationData, null, 2));

    return NextResponse.json({
      success: true,
      message: `Duplicate issue resolved: ${action}`,
      application: {
        id: applicationData.id,
        status: applicationData.status,
        duplicateResolution: applicationData.duplicateCheck.resolution
      }
    });

  } catch (error) {
    console.error('Error resolving duplicate:', error);
    
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to resolve duplicate issue' },
      { status: 500 }
    );
  }
}