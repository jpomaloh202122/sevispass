import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('Testing database connection...');

    // Test 1: Check if tables exist
    const tablesResult = await supabaseAdmin.rpc('check_table_exists', { table_name: 'biometric_locations' });
    console.log('Tables check result:', tablesResult);

    // Test 2: Count locations
    const { data: locations, error: locError, count: locationCount } = await supabaseAdmin
      .from('biometric_locations')
      .select('*', { count: 'exact' });

    console.log('Locations count:', locationCount);
    console.log('Locations error:', locError);

    // Test 3: Count time slots
    const { data: timeSlots, error: timeError, count: timeSlotCount } = await supabaseAdmin
      .from('appointment_time_slots')
      .select('*', { count: 'exact' });

    console.log('Time slots count:', timeSlotCount);
    console.log('Time slots error:', timeError);

    // Test 4: Count appointments
    const { data: appointments, error: apptError, count: appointmentCount } = await supabaseAdmin
      .from('biometric_appointments')
      .select('*', { count: 'exact' });

    console.log('Appointments count:', appointmentCount);
    console.log('Appointments error:', apptError);

    // Test 5: Sample location data
    const { data: sampleLocation, error: sampleError } = await supabaseAdmin
      .from('biometric_locations')
      .select('*')
      .limit(1)
      .single();

    console.log('Sample location:', sampleLocation);
    console.log('Sample location error:', sampleError);

    return NextResponse.json({
      success: true,
      message: 'Database connection test completed',
      results: {
        locationCount: locationCount || 0,
        timeSlotCount: timeSlotCount || 0,
        appointmentCount: appointmentCount || 0,
        sampleLocation,
        errors: {
          locations: locError?.message,
          timeSlots: timeError?.message,
          appointments: apptError?.message,
          sample: sampleError?.message
        }
      }
    });

  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Database test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}