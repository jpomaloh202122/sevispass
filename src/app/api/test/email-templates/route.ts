import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/resend';

export async function POST(request: NextRequest) {
  try {
    const { testEmail, testName } = await request.json();

    if (!testEmail) {
      return NextResponse.json({
        success: false,
        message: 'Test email address is required'
      }, { status: 400 });
    }

    const userName = testName || 'Test User';
    const results = [];

    console.log('Testing all email templates with:', { testEmail, userName });

    // Test 1: Appointment Confirmation
    try {
      const result1 = await emailService.sendAppointmentConfirmationEmail(
        testEmail,
        userName,
        {
          date: 'Monday, December 16, 2024',
          time: '10:00 AM',
          location: 'Port Moresby Central Office',
          address: '123 Independence Drive, Port Moresby',
          phone: '+675 123 4567'
        }
      );
      
      results.push({
        template: 'appointment_confirmation',
        success: result1.success,
        error: result1.error
      });
    } catch (error) {
      results.push({
        template: 'appointment_confirmation',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 2: Appointment Cancellation
    try {
      const result2 = await emailService.sendAppointmentCancellationEmail(
        testEmail,
        userName,
        {
          date: 'Monday, December 16, 2024',
          time: '10:00 AM',
          location: 'Port Moresby Central Office'
        }
      );
      
      results.push({
        template: 'appointment_cancellation',
        success: result2.success,
        error: result2.error
      });
    } catch (error) {
      results.push({
        template: 'appointment_cancellation',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 3: Appointment Reschedule
    try {
      const result3 = await emailService.sendAppointmentRescheduleEmail(
        testEmail,
        userName,
        {
          newDate: 'Wednesday, December 18, 2024',
          newTime: '2:00 PM',
          newLocation: 'Lae Branch Office',
          newAddress: '456 Markham Road, Lae',
          newPhone: '+675 987 6543'
        }
      );
      
      results.push({
        template: 'appointment_reschedule',
        success: result3.success,
        error: result3.error
      });
    } catch (error) {
      results.push({
        template: 'appointment_reschedule',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    return NextResponse.json({
      success: successCount === totalCount,
      message: `Email template testing completed: ${successCount}/${totalCount} templates sent successfully`,
      results,
      summary: {
        total: totalCount,
        successful: successCount,
        failed: totalCount - successCount
      }
    });

  } catch (error) {
    console.error('Email template test API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Email template testing failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}