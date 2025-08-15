import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/resend';

export async function POST(request: NextRequest) {
  try {
    const { email, userName } = await request.json();
    
    if (!email || !userName) {
      return NextResponse.json({
        success: false,
        message: 'Email and userName are required'
      }, { status: 400 });
    }

    // Generate test code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    console.log('Testing direct 2FA email send to:', email, 'with code:', code);

    // Try to send email directly without database operations
    try {
      const emailResult = await emailService.send2FACode(email, userName, code);
      
      if (emailResult.success) {
        return NextResponse.json({
          success: true,
          message: 'Test 2FA email sent successfully!',
          testCode: code,
          email: email,
          note: 'This is a test - code is shown for verification'
        });
      } else {
        return NextResponse.json({
          success: false,
          message: 'Failed to send test 2FA email',
          error: emailResult.error,
          details: 'Email service failed'
        });
      }
    } catch (emailError) {
      return NextResponse.json({
        success: false,
        message: 'Email service exception',
        error: emailError instanceof Error ? emailError.message : 'Unknown error'
      });
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}