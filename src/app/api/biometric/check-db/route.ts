import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Check the structure of biometric_appointments table
    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from('biometric_appointments')
      .select('*')
      .limit(1);

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError);
    }

    // Test a simple update to see if it works
    let updateTest = null;
    let updateError = null;
    
    if (appointments && appointments.length > 0) {
      try {
        const testResult = await supabaseAdmin
          .from('biometric_appointments')
          .update({ notes: 'Test update at ' + new Date().toISOString() })
          .eq('id', appointments[0].id)
          .select('*')
          .single();
        
        updateTest = testResult.data;
        updateError = testResult.error;
      } catch (err) {
        updateError = err instanceof Error ? err.message : 'Unknown update error';
      }
    }

    // Check the structure of biometric_locations table  
    const { data: locations, error: locationsError } = await supabaseAdmin
      .from('biometric_locations')
      .select('*')
      .limit(1);

    if (locationsError) {
      console.error('Error fetching locations:', locationsError);
    }

    return NextResponse.json({
      success: true,
      data: {
        sampleAppointment: appointments?.[0] || null,
        appointmentKeys: appointments?.[0] ? Object.keys(appointments[0]) : [],
        sampleLocation: locations?.[0] || null,
        locationKeys: locations?.[0] ? Object.keys(locations[0]) : [],
        updateTest: updateTest,
        updateError: updateError
      }
    });

  } catch (error) {
    console.error('Error checking database structure:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to check database structure',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}