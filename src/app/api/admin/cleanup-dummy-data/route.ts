import { NextRequest, NextResponse } from 'next/server';
import { readFile, unlink, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

interface CleanupResult {
  applicationsRemoved: number;
  filesChecked: number;
  errors: string[];
  summary: string;
}

export async function POST(request: NextRequest) {
  try {
    const { confirmCleanup } = await request.json();

    if (!confirmCleanup) {
      return NextResponse.json({
        success: false,
        message: 'Cleanup confirmation required. Set confirmCleanup to true.'
      }, { status: 400 });
    }

    console.log('🧹 Starting admin cleanup of dummy applications...');

    const result = await cleanupDummyApplications();

    return NextResponse.json({
      success: true,
      message: 'Dummy data cleanup completed',
      result
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({
      success: false,
      message: 'Cleanup failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    console.log('🔍 Scanning for dummy applications...');

    const result = await scanDummyApplications();

    return NextResponse.json({
      success: true,
      message: 'Dummy data scan completed',
      result
    });

  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json({
      success: false,
      message: 'Scan failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function cleanupDummyApplications(): Promise<CleanupResult> {
  const applicationDirs = [
    'data/public-servant-id-applications',
    'data/city-pass-applications'
  ];

  let applicationsRemoved = 0;
  let filesChecked = 0;
  const errors: string[] = [];

  for (const dir of applicationDirs) {
    console.log(`📁 Checking directory: ${dir}`);
    
    if (!existsSync(dir)) {
      console.log(`   ⚠️  Directory doesn't exist: ${dir}`);
      continue;
    }

    try {
      const files = await readdir(dir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      console.log(`   📄 Found ${jsonFiles.length} application files`);
      filesChecked += jsonFiles.length;

      for (const file of jsonFiles) {
        const filePath = path.join(dir, file);
        
        try {
          const content = await readFile(filePath, 'utf-8');
          const application = JSON.parse(content);
          
          const isDummy = isDummyApplication(application);
          
          if (isDummy) {
            console.log(`   🗑️  Removing dummy application: ${file}`);
            console.log(`      - User: ${application.firstName} ${application.lastName}`);
            console.log(`      - Email: ${application.email || 'N/A'}`);
            
            await unlink(filePath);
            applicationsRemoved++;
          } else {
            console.log(`   ✅ Keeping real application: ${file}`);
          }
          
        } catch (fileError) {
          const errorMsg = `Error processing ${file}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`;
          console.log(`   ❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
      
    } catch (dirError) {
      const errorMsg = `Error reading directory ${dir}: ${dirError instanceof Error ? dirError.message : 'Unknown error'}`;
      console.log(`   ❌ ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  const summary = `Checked ${filesChecked} files, removed ${applicationsRemoved} dummy applications`;
  console.log(`🎉 Cleanup completed: ${summary}`);

  return {
    applicationsRemoved,
    filesChecked,
    errors,
    summary
  };
}

async function scanDummyApplications(): Promise<CleanupResult> {
  const applicationDirs = [
    'data/public-servant-id-applications',
    'data/city-pass-applications'
  ];

  let applicationsRemoved = 0;
  let filesChecked = 0;
  const errors: string[] = [];

  for (const dir of applicationDirs) {
    console.log(`📁 Scanning directory: ${dir}`);
    
    if (!existsSync(dir)) {
      console.log(`   ⚠️  Directory doesn't exist: ${dir}`);
      continue;
    }

    try {
      const files = await readdir(dir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      console.log(`   📄 Found ${jsonFiles.length} application files`);
      filesChecked += jsonFiles.length;

      for (const file of jsonFiles) {
        const filePath = path.join(dir, file);
        
        try {
          const content = await readFile(filePath, 'utf-8');
          const application = JSON.parse(content);
          
          const isDummy = isDummyApplication(application);
          
          if (isDummy) {
            console.log(`   🚨 Found dummy application: ${file}`);
            console.log(`      - User: ${application.firstName} ${application.lastName}`);
            console.log(`      - Email: ${application.email || 'N/A'}`);
            applicationsRemoved++; // Count as found, not removed
          } else {
            console.log(`   ✅ Real application: ${file}`);
          }
          
        } catch (fileError) {
          const errorMsg = `Error processing ${file}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`;
          console.log(`   ❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
      
    } catch (dirError) {
      const errorMsg = `Error reading directory ${dir}: ${dirError instanceof Error ? dirError.message : 'Unknown error'}`;
      console.log(`   ❌ ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  const summary = `Scanned ${filesChecked} files, found ${applicationsRemoved} dummy applications`;
  console.log(`🔍 Scan completed: ${summary}`);

  return {
    applicationsRemoved,
    filesChecked,
    errors,
    summary
  };
}

function isDummyApplication(application: any): boolean {
  // Check for common dummy/test patterns
  const dummyPatterns = [
    // Test emails
    /test.*@.*\.com/i,
    /dummy.*@.*\.com/i,
    /sample.*@.*\.com/i,
    /example.*@.*\.com/i,
    /mock.*@.*\.com/i,
    
    // Test names
    /^test\s+/i,
    /^dummy\s+/i,
    /^sample\s+/i,
    /^mock\s+/i,
    /^demo\s+/i,
    
    // Test user IDs
    /^test-/i,
    /^dummy-/i,
    /^sample-/i,
    /^mock-/i,
    /^demo-/i,
    
    // Test phone numbers
    /^\+6750000000/i,
    /^\+6751234567/i,
    
    // Test NIDs
    /^NIDTEST/i,
    /^NIDDUMMY/i,
    /^NIDSAMPLE/i,
    /^NIDMOCK/i,
    
    // Test addresses
    /test.*address/i,
    /dummy.*address/i,
    /sample.*address/i,
    /mock.*address/i,
    /123.*test.*street/i,
    /test.*city/i
  ];
  
  // Check various fields for dummy patterns
  const fieldsToCheck = [
    application.email,
    application.firstName,
    application.lastName,
    application.userId,
    application.phoneNumber,
    application.nid,
    application.address,
    application.workEmail,
    application.employeeNumber
  ].filter(Boolean);
  
  for (const field of fieldsToCheck) {
    for (const pattern of dummyPatterns) {
      if (pattern.test(field)) {
        return true;
      }
    }
  }
  
  // Check for test-specific values
  if (application.firstName === 'Test' && application.lastName === 'User') {
    return true;
  }
  
  if (application.email && application.email.includes('test') && application.email.includes('example')) {
    return true;
  }
  
  return false;
}
