import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/resend';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get('email') || 'test@example.com';
    const name = url.searchParams.get('name') || 'Test User';
    
    console.log('Testing 2FA email with:', { email, name });

    // Generate test code
    const testCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Send 2FA email
    const result = await emailService.send2FACode(email, name, testCode);
    
    console.log('2FA email send result:', result);

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Test 2FA email sent successfully!' : 'Failed to send 2FA email',
      details: {
        email: email,
        name: name,
        testCode: testCode,
        result: result
      }
    });

  } catch (error) {
    console.error('Test 2FA email error:', error);
    return NextResponse.json({
      success: false,
      message: 'Test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}