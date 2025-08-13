import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface BookingRequest {
  userUid: string;
  locationId: number;
  appointmentDate: string;
  appointmentTime: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userUid, locationId, appointmentDate, appointmentTime }: BookingRequest = await request.json();

    console.log('Direct booking request received:', { userUid, locationId, appointmentDate, appointmentTime });

    // Validate required fields
    if (!userUid || !locationId || !appointmentDate || !appointmentTime) {
      console.log('Validation failed - missing required fields');
      return NextResponse.json({
        success: false,
        message: 'All booking details are required'
      }, { status: 400 });
    }

    // Check if user exists using direct Supabase query
    console.log('Checking if user exists:', userUid);
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('uid, "firstName", "lastName", "isVerified"')
      .eq('uid', userUid)
      .single();

    if (userError || !user) {
      console.log('User not found:', userError?.message);
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    if (!user.isVerified) {
      console.log('User not verified');
      return NextResponse.json({
        success: false,
        message: 'User must complete face verification before booking biometric appointment'
      }, { status: 400 });
    }

    // Check if user already has an appointment
    console.log('Checking for existing appointment for user:', userUid);
    const { data: existingAppointment, error: existingError } = await supabaseAdmin
      .from('biometric_appointments')
      .select('id')
      .eq('user_uid', userUid)
      .single();

    if (!existingError && existingAppointment) {
      console.log('User already has appointment');
      return NextResponse.json({
        success: false,
        message: 'You already have a biometric appointment scheduled'
      }, { status: 409 });
    }

    // Validate the date (must be in the future and weekday)
    const appointmentDateObj = new Date(appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (appointmentDateObj <= today) {
      console.log('Invalid date - must be in future');
      return NextResponse.json({
        success: false,
        message: 'Appointment date must be in the future'
      }, { status: 400 });
    }

    const dayOfWeek = appointmentDateObj.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
      console.log('Invalid date - weekends not allowed');
      return NextResponse.json({
        success: false,
        message: 'Appointments are only available Monday through Friday'
      }, { status: 400 });
    }

    // Check if the time slot is still available
    const ourDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    console.log('Checking time slot availability:', { locationId, ourDayOfWeek, appointmentTime });
    
    const { data: timeSlot, error: timeSlotError } = await supabaseAdmin
      .from('appointment_time_slots')
      .select('id, start_time, end_time, max_appointments')
      .eq('location_id', locationId)
      .eq('day_of_week', ourDayOfWeek)
      .eq('start_time', appointmentTime)
      .eq('is_active', true)
      .single();

    if (timeSlotError || !timeSlot) {
      console.log('Invalid time slot:', timeSlotError?.message);
      return NextResponse.json({
        success: false,
        message: 'Invalid time slot selected'
      }, { status: 400 });
    }

    // Count existing appointments for this slot
    console.log('Counting existing appointments for slot');
    const { count: existingCount, error: countError } = await supabaseAdmin
      .from('biometric_appointments')
      .select('id', { count: 'exact', head: true })
      .eq('location_id', locationId)
      .eq('appointment_date', appointmentDate)
      .eq('appointment_time', appointmentTime)
      .eq('status', 'scheduled');

    if (countError) {
      console.log('Error counting appointments:', countError.message);
      throw new Error(countError.message);
    }

    console.log('Existing appointments count:', existingCount, 'Max:', timeSlot.max_appointments);

    if ((existingCount || 0) >= timeSlot.max_appointments) {
      return NextResponse.json({
        success: false,
        message: 'This time slot is fully booked. Please select another time.'
      }, { status: 409 });
    }

    // Create the appointment using direct Supabase query
    console.log('Creating appointment with data:', {
      user_uid: userUid,
      location_id: locationId,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      status: 'scheduled'
    });

    const { data: appointment, error: createError } = await supabaseAdmin
      .from('biometric_appointments')
      .insert({
        user_uid: userUid,
        location_id: locationId,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        status: 'scheduled'
      })
      .select()
      .single();

    if (createError || !appointment) {
      console.log('Error creating appointment:', createError?.message);
      throw new Error(createError?.message || 'Failed to create appointment');
    }

    console.log('Appointment created successfully:', appointment);

    // Get location details for response
    const { data: location, error: locationError } = await supabaseAdmin
      .from('biometric_locations')
      .select('name, address, phone, operating_hours')
      .eq('id', locationId)
      .single();

    if (locationError) {
      console.log('Error fetching location details:', locationError.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Biometric appointment booked successfully',
      appointment: {
        id: appointment.id,
        appointmentDate: appointment.appointment_date,
        appointmentTime: appointment.appointment_time,
        location: location,
        status: appointment.status
      }
    });

  } catch (error) {
    console.error('Error booking biometric appointment:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json({
      success: false,
      message: `Failed to book appointment: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}