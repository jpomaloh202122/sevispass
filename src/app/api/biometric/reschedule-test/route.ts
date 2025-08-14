import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { appointmentId, newLocationId, newAppointmentDate, newAppointmentTime } = await request.json();

    console.log('Testing reschedule with:', { appointmentId, newLocationId, newAppointmentDate, newAppointmentTime });

    // Try updating with a direct SQL query that bypasses triggers
    const { data, error } = await supabaseAdmin.rpc('update_appointment_no_trigger', {
      appt_id: appointmentId,
      new_location_id: newLocationId,
      new_appointment_date: newAppointmentDate,
      new_appointment_time: newAppointmentTime
    });

    if (error) {
      console.error('RPC error:', error);
      
      // Fallback: try a simpler update without triggers
      const { data: fallbackData, error: fallbackError } = await supabaseAdmin
        .from('biometric_appointments')
        .update({
          location_id: newLocationId,
          appointment_date: newAppointmentDate,
          appointment_time: newAppointmentTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .select('*')
        .single();

      if (fallbackError) {
        throw new Error(fallbackError.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Appointment updated using fallback method',
        appointment: fallbackData
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment updated using RPC',
      data: data
    });

  } catch (error) {
    console.error('Error in reschedule test:', error);
    return NextResponse.json({
      success: false,
      message: `Failed to reschedule: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}