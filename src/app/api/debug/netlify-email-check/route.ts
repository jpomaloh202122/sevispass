import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function GET() {
  const results: string[] = [];
  
  try {
    results.push('🔍 **NETLIFY EMAIL SERVICE DIAGNOSTIC**');
    results.push(`⏰ Time: ${new Date().toISOString()}`);
    results.push(`🌐 Environment: ${process.env.NODE_ENV || 'unknown'}`);
    results.push('');

    // Check environment variables
    results.push('🔍 **Environment Variables Check**');
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFromEmail = process.env.RESEND_FROM_EMAIL;
    
    if (!resendApiKey) {
      results.push('❌ RESEND_API_KEY is missing');
      results.push('🔧 Add RESEND_API_KEY to Netlify environment variables');
      return NextResponse.json({ results, error: 'Missing API key' });
    } else {
      results.push(`✅ RESEND_API_KEY: ${resendApiKey.substring(0, 8)}...${resendApiKey.slice(-4)}`);
      
      // Validate API key format
      if (!resendApiKey.startsWith('re_')) {
        results.push('⚠️  Warning: API key doesn\'t start with "re_" - this might be invalid');
      }
      
      if (resendApiKey.length < 20) {
        results.push('⚠️  Warning: API key seems too short - this might be invalid');
      }
    }
    
    if (!resendFromEmail) {
      results.push('❌ RESEND_FROM_EMAIL is missing');
      results.push('🔧 Add RESEND_FROM_EMAIL to Netlify environment variables');
      return NextResponse.json({ results, error: 'Missing from email' });
    } else {
      results.push(`✅ RESEND_FROM_EMAIL: ${resendFromEmail}`);
      
      // Check domain validation
      const domain = resendFromEmail.split('@')[1];
      results.push(`📧 Domain: ${domain}`);
      
      if (domain === 'sevispng.com') {
        results.push('⚠️  Using sevispng.com - ensure this domain is verified in Resend dashboard');
      }
    }
    
    results.push('');

    // Test Resend client creation
    results.push('🔍 **Resend Client Test**');
    let resendClient: Resend;
    try {
      resendClient = new Resend(resendApiKey);
      results.push('✅ Resend client created successfully');
    } catch (clientError) {
      results.push(`❌ Resend client creation failed: ${clientError}`);
      return NextResponse.json({ results, error: 'Client creation failed' });
    }
    
    results.push('');

    // Test actual email sending with detailed error capture
    results.push('🔍 **Email Send Test (Minimal)**');
    const testEmail = 'test@example.com'; // Using a safe test email
    
    try {
      const emailData = {
        from: resendFromEmail,
        to: [testEmail],
        subject: 'Netlify Production Test - SevisPass',
        html: '<p>This is a test email from Netlify production environment.</p>',
        text: 'This is a test email from Netlify production environment.'
      };
      
      results.push('📤 Attempting to send test email...');
      const response = await resendClient.emails.send(emailData);
      
      if (response.data && response.data.id) {
        results.push('✅ Test email sent successfully!');
        results.push(`📋 Message ID: ${response.data.id}`);
        results.push('🎉 Email service is working in production');
      } else if (response.error) {
        results.push(`❌ Email sending failed with Resend error:`);
        results.push(`   Error: ${JSON.stringify(response.error, null, 2)}`);
        
        // Common error analysis
        if (response.error.message?.includes('domain')) {
          results.push('🔧 Domain verification issue:');
          results.push('   1. Go to https://resend.com/domains');
          results.push('   2. Verify sevispng.com is listed and verified');
          results.push('   3. Check DNS records are properly configured');
        }
        
        if (response.error.message?.includes('api key') || response.error.message?.includes('unauthorized')) {
          results.push('🔧 API key issue:');
          results.push('   1. Check API key in Resend dashboard');
          results.push('   2. Ensure key has sending permissions');
          results.push('   3. Verify key is not expired or revoked');
        }
        
        return NextResponse.json({ 
          results, 
          error: 'Email sending failed',
          resendError: response.error 
        });
      } else {
        results.push('⚠️  Unexpected response format from Resend');
        results.push(`Response: ${JSON.stringify(response, null, 2)}`);
      }
    } catch (emailError: any) {
      results.push(`❌ Email sending exception: ${emailError.message || emailError}`);
      
      // Detailed error analysis
      if (emailError.message?.includes('fetch')) {
        results.push('🔧 Network connectivity issue:');
        results.push('   1. Check Netlify function timeout settings');
        results.push('   2. Verify Resend API is accessible from Netlify');
      }
      
      if (emailError.message?.includes('domain')) {
        results.push('🔧 Domain not verified in Resend:');
        results.push('   1. Add sevispng.com to your Resend account');
        results.push('   2. Complete DNS verification process');
      }
      
      if (emailError.message?.includes('401') || emailError.message?.includes('403')) {
        results.push('🔧 Authentication issue:');
        results.push('   1. Verify RESEND_API_KEY is correctly set in Netlify');
        results.push('   2. Check API key permissions in Resend dashboard');
      }
      
      return NextResponse.json({ 
        results, 
        error: 'Email sending exception',
        exception: emailError.message || emailError.toString(),
        stack: emailError.stack
      });
    }
    
    results.push('');
    results.push('🎉 **ALL TESTS PASSED**');
    results.push('✅ Email service is fully functional in Netlify production');

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });

  } catch (error: any) {
    results.push(`💥 Diagnostic test failed: ${error.message || error}`);
    return NextResponse.json({ 
      success: false,
      results,
      error: error.message || error.toString(),
      stack: error.stack
    }, { status: 500 });
  }
}