import { NextResponse } from 'next/server';
import { emailService } from '@/lib/resend';

export async function GET() {
  try {
    // Check environment variables
    const config = {
      NODE_ENV: process.env.NODE_ENV,
      hasResendApiKey: !!process.env.RESEND_API_KEY,
      hasResendFromEmail: !!process.env.RESEND_FROM_EMAIL,
      resendFromEmail: process.env.RESEND_FROM_EMAIL,
      // Don't expose the actual API key, just check if it exists and its format
      resendApiKeyFormat: process.env.RESEND_API_KEY ? 
        `${process.env.RESEND_API_KEY.substring(0, 3)}...${process.env.RESEND_API_KEY.slice(-3)}` : 
        'Not set'
    };

    // Test email service availability
    let emailServiceTest = 'Not tested';
    try {
      if (typeof emailService.send2FACode === 'function') {
        emailServiceTest = 'Method available';
      } else {
        emailServiceTest = 'Method not available';
      }
    } catch (error) {
      emailServiceTest = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    return NextResponse.json({
      success: true,
      environment: config,
      emailService: emailServiceTest,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}