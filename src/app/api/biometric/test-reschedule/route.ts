import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST() {
  try {
    console.log('Testing reschedule scenario...');

    // Step 1: Create a test user
    const testUserUid = 'test-user-' + Math.random().toString(36).substr(2, 9);
    console.log('Creating test user:', testUserUid);

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        uid: testUserUid,
        nid: 'NID' + Math.random().toString(36).substr(2, 8).toUpperCase(),
        email: 'test-' + Math.random().toString(36).substr(2, 5) + '@example.com',
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: '+675' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0'),
        password: 'hashed_password',
        isVerified: true,
        email_verified: true
      })
      .select()
      .single();

    if (userError) {
      throw new Error(`User creation failed: ${userError.message}`);
    }

    console.log('User created:', user);

    // Step 2: Create a test appointment
    const appointmentDate = '2025-08-18'; // Next Monday
    const appointmentTime = '08:00:00';
    
    console.log('Creating test appointment...');
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('biometric_appointments')
      .insert({
        user_uid: testUserUid,
        location_id: 1, // Waigani Police Station
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        status: 'scheduled',
        notes: 'Test appointment for rescheduling'
      })
      .select()
      .single();

    if (appointmentError) {
      throw new Error(`Appointment creation failed: ${appointmentError.message}`);
    }

    console.log('Appointment created:', appointment);

    // Step 3: Test the reschedule API
    const newDate = '2025-08-19'; // Tuesday
    const newTime = '10:00:00';
    const newLocationId = 2; // Gordons Police Station

    console.log('Testing reschedule with:', {
      userUid: testUserUid,
      newLocationId,
      newAppointmentDate: newDate,
      newAppointmentTime: newTime
    });

    const rescheduleResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3005'}/api/biometric/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userUid: testUserUid,
        newLocationId,
        newAppointmentDate: newDate,
        newAppointmentTime: newTime
      })
    });

    const rescheduleResult = await rescheduleResponse.json();
    
    console.log('Reschedule response:', rescheduleResult);

    // Cleanup: Delete test data
    await supabaseAdmin.from('biometric_appointments').delete().eq('user_uid', testUserUid);
    await supabaseAdmin.from('users').delete().eq('uid', testUserUid);

    return NextResponse.json({
      success: true,
      message: 'Reschedule test completed',
      results: {
        userCreated: !!user,
        appointmentCreated: !!appointment,
        rescheduleTest: {
          success: rescheduleResult.success,
          message: rescheduleResult.message,
          statusCode: rescheduleResponse.status,
          error: rescheduleResult.error
        }
      }
    });

  } catch (error) {
    console.error('Reschedule test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Reschedule test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}