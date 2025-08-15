import { NextResponse } from 'next/server';
import { emailService } from '@/lib/resend';

export async function GET() {
  const results: string[] = [];
  
  try {
    results.push('🔍 **EMAIL SERVICE PRODUCTION TEST**');
    results.push(`⏰ Time: ${new Date().toISOString()}`);
    results.push('');

    // Check environment variables
    results.push('🔍 **Environment Variables**');
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFromEmail = process.env.RESEND_FROM_EMAIL;
    
    if (!resendApiKey) {
      results.push('❌ RESEND_API_KEY is missing');
      return NextResponse.json({ results, error: 'Missing API key' });
    } else {
      results.push(`✅ RESEND_API_KEY: ${resendApiKey.substring(0, 8)}...${resendApiKey.slice(-4)}`);
    }
    
    if (!resendFromEmail) {
      results.push('❌ RESEND_FROM_EMAIL is missing');
      return NextResponse.json({ results, error: 'Missing from email' });
    } else {
      results.push(`✅ RESEND_FROM_EMAIL: ${resendFromEmail}`);
    }
    
    results.push('');

    // Test email service import and instantiation
    results.push('🔍 **Email Service Import Test**');
    try {
      if (typeof emailService.send2FACode === 'function') {
        results.push('✅ Email service imported and 2FA method available');
      } else {
        results.push('❌ 2FA method not available');
        return NextResponse.json({ results, error: '2FA method missing' });
      }
    } catch (importError) {
      results.push(`❌ Email service error: ${importError}`);
      return NextResponse.json({ results, error: 'Email service import failed' });
    }
    
    results.push('');

    // Test actual email sending with a test code
    results.push('🔍 **Test Email Send (2FA Code)**');
    const testEmail = 'test@example.com'; // Using a test email
    const testCode = '123456';
    const testUser = 'Test User';
    
    try {
      const emailResult = await emailService.send2FACode(testEmail, testUser, testCode);
      
      if (emailResult.success) {
        results.push('✅ Test email sent successfully!');
        results.push('📧 Email service is working in production');
      } else {
        results.push(`❌ Email sending failed: ${emailResult.error}`);
        results.push('🔧 Check Resend API key permissions and from email domain verification');
        return NextResponse.json({ 
          results, 
          error: 'Email sending failed',
          emailError: emailResult.error 
        });
      }
    } catch (emailError) {
      results.push(`❌ Email sending exception: ${emailError}`);
      results.push('🔧 Check network connectivity and Resend service status');
      return NextResponse.json({ 
        results, 
        error: 'Email sending exception',
        exception: emailError instanceof Error ? emailError.message : 'Unknown error'
      });
    }
    
    results.push('');
    results.push('🎉 **ALL TESTS PASSED**');
    results.push('✅ Email service is fully functional in production');
    results.push('📋 If you\'re still getting errors, check:');
    results.push('   1. Database connectivity');
    results.push('   2. User data in send-2fa-code endpoint');
    results.push('   3. Browser network errors');

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    results.push(`💥 Test failed: ${error}`);
    return NextResponse.json({ 
      success: false,
      results,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}