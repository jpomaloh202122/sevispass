import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('=== BOOKING DEBUG ===');
    console.log('Request body received:', JSON.stringify(body, null, 2));
    console.log('Request headers:', request.headers.get('content-type'));
    
    // Check which fields are present
    const hasUserUid = !!body.userUid;
    const hasLocationId = !!body.locationId;
    const hasNewLocationId = !!body.newLocationId;
    const hasAppointmentDate = !!body.appointmentDate;
    const hasNewAppointmentDate = !!body.newAppointmentDate;
    
    const analysis = {
      requestType: hasNewLocationId || hasNewAppointmentDate ? 'RESCHEDULE' : 'BOOKING',
      fields: {
        userUid: hasUserUid,
        locationId: hasLocationId,
        newLocationId: hasNewLocationId,
        appointmentDate: hasAppointmentDate,
        newAppointmentDate: hasNewAppointmentDate
      },
      suggestedEndpoint: hasNewLocationId || hasNewAppointmentDate ? '/api/biometric/reschedule' : '/api/biometric/book'
    };
    
    console.log('Analysis:', JSON.stringify(analysis, null, 2));
    console.log('=== END DEBUG ===');

    return NextResponse.json({
      success: true,
      debug: {
        receivedBody: body,
        analysis: analysis,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Debug booking error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}