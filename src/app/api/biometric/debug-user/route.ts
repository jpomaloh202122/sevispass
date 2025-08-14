import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userUid } = await request.json();
    
    console.log('Debug user appointment check for userUid:', userUid);

    // Test the user-appointment endpoint directly
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3005';
    const response = await fetch(`${baseUrl}/api/biometric/user-appointment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userUid })
    });

    const data = await response.json();
    
    console.log('User appointment API response:', data);

    return NextResponse.json({
      success: true,
      userUid: userUid,
      userAppointmentResponse: data,
      responseStatus: response.status,
      debug_info: {
        hasAppointment: data.hasAppointment,
        appointment: data.appointment,
        shouldShowScheduling: !data.hasAppointment,
        shouldShowReschedule: data.hasAppointment && data.appointment?.status === 'scheduled'
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}