import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; applicationId: string; documentType: string }> }
) {
  try {
    const { type, applicationId, documentType } = await params;
    
    // Verify admin authentication
    const adminData = verifyAdminToken(request);

    // Check if admin has permission for this application type
    const applicationTypeMap = {
      'public-servant-id': 'public_servant_id',
      'city-pass': 'city_pass'
    };

    const requiredType = applicationTypeMap[type];
    if (!requiredType || !adminData.applicationTypes.includes(requiredType)) {
      return NextResponse.json(
        { error: 'Access denied: You do not have permission to view documents for this application type' },
        { status: 403 }
      );
    }

    // Load application data to get document path
    const applicationDir = type === 'public-servant-id' ? 
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

    const applicationData = JSON.parse(await readFile(applicationPath, 'utf-8'));
    const documents = applicationData.supportingDocuments;

    if (!documents || !documents[documentType]) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    let documentPath = documents[documentType];
    
    // Handle different path formats
    if (documentPath.startsWith('/uploads/')) {
      // Relative path from public directory
      documentPath = path.join(process.cwd(), 'public', documentPath);
    } else if (documentPath.includes('uploads')) {
      // Absolute path
      documentPath = documentPath;
    } else {
      return NextResponse.json(
        { error: 'Invalid document path' },
        { status: 400 }
      );
    }

    if (!existsSync(documentPath)) {
      return NextResponse.json(
        { error: 'Document file not found on disk' },
        { status: 404 }
      );
    }

    // Get file info
    const fileStats = await stat(documentPath);
    const fileBuffer = await readFile(documentPath);
    
    // Determine content type based on file extension
    const ext = path.extname(documentPath).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.doc':
        contentType = 'application/msword';
        break;
      case '.docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
    }

    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileStats.size.toString(),
        'Content-Disposition': `inline; filename="${path.basename(documentPath)}"`,
        'Cache-Control': 'private, no-cache',
      },
    });

  } catch (error) {
    console.error('Error serving document:', error);
    
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to serve document' },
      { status: 500 }
    );
  }
}