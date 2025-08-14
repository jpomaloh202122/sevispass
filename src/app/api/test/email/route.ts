import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/resend';

export async function POST(request: NextRequest) {
  try {
    const { testEmail } = await request.json();

    if (!testEmail) {
      return NextResponse.json({
        success: false,
        message: 'Test email address is required'
      }, { status: 400 });
    }

    console.log('Testing Resend configuration with email:', testEmail);

    // Test basic email sending
    const result = await emailService.sendEmail({
      to: [testEmail],
      subject: 'Resend Configuration Test - SevisPass',
      htmlBody: `
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Resend Test Email</h1>
          </div>
          <div style="padding: 20px;">
            <h2>SevisPass Email Configuration Test</h2>
            <p>This is a test email to verify that Resend is properly configured for SevisPass.</p>
            <p><strong>Test Details:</strong></p>
            <ul>
              <li>Service: Resend</li>
              <li>Application: SevisPass Digital ID Platform</li>
              <li>Test Time: ${new Date().toLocaleString()}</li>
            </ul>
            <p style="color: #059669;">✅ If you receive this email, Resend is working correctly!</p>
          </div>
          <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
            © 2024 SevisPass - Government of Papua New Guinea
          </div>
        </body>
        </html>
      `,
      textBody: `
Resend Configuration Test - SevisPass

This is a test email to verify that Resend is properly configured for SevisPass.

Test Details:
- Service: Resend  
- Application: SevisPass Digital ID Platform
- Test Time: ${new Date().toLocaleString()}

✅ If you receive this email, Resend is working correctly!

© 2024 SevisPass - Government of Papua New Guinea
      `
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully',
        messageId: result.messageId
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to send test email',
        error: result.error
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Email test API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Email service test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Also add a GET endpoint to test welcome email template
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const testEmail = url.searchParams.get('email');
  const testName = url.searchParams.get('name') || 'Test User';

  if (!testEmail) {
    return NextResponse.json({
      success: false,
      message: 'Test email parameter is required (?email=test@example.com)'
    }, { status: 400 });
  }

  try {
    console.log('Testing welcome email template with:', { testEmail, testName });

    const result = await emailService.sendWelcomeEmail(testEmail, testName);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Welcome email test sent successfully'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to send welcome email test',
        error: result.error
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Welcome email test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Welcome email test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}