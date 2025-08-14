import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';
import { emailService } from '@/lib/resend';
import { format } from 'date-fns';

interface RescheduleRequest {
  userUid: string;
  newLocationId: number;
  newAppointmentDate: string;
  newAppointmentTime: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userUid, newLocationId, newAppointmentDate, newAppointmentTime }: RescheduleRequest = await request.json();

    console.log('Reschedule request received:', { userUid, newLocationId, newAppointmentDate, newAppointmentTime });

    // Validate required fields
    if (!userUid || !newLocationId || !newAppointmentDate || !newAppointmentTime) {
      console.log('Validation failed - missing required fields');
      return NextResponse.json({
        success: false,
        message: 'All reschedule details are required'
      }, { status: 400 });
    }

    // Check if user exists
    const user = await db.user.findUnique({
      where: { uid: userUid },
      select: { uid: true, firstName: true, lastName: true, email: true, isVerified: true }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    if (!user.isVerified) {
      return NextResponse.json({
        success: false,
        message: 'User must complete verification before rescheduling appointment'
      }, { status: 400 });
    }

    // Find the user's existing scheduled appointment
    const existingAppointments = await db.biometricAppointment.findMany({
      where: { 
        user_uid: userUid,
        status: 'scheduled'
      }
    });

    if (existingAppointments.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No scheduled appointment found to reschedule'
      }, { status: 404 });
    }

    const existingAppointment = existingAppointments[0];

    // Validate the new date (must be in the future and weekday)
    const appointmentDateObj = new Date(newAppointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (appointmentDateObj <= today) {
      return NextResponse.json({
        success: false,
        message: 'New appointment date must be in the future'
      }, { status: 400 });
    }

    const dayOfWeek = appointmentDateObj.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
      return NextResponse.json({
        success: false,
        message: 'Appointments are only available Monday through Friday'
      }, { status: 400 });
    }

    // Check if the new time slot is available
    const ourDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    const timeSlot = await db.appointmentTimeSlot.findFirst({
      where: {
        location_id: newLocationId,
        day_of_week: ourDayOfWeek,
        start_time: newAppointmentTime,
        is_active: true
      }
    });

    if (!timeSlot) {
      return NextResponse.json({
        success: false,
        message: 'Invalid time slot selected for new appointment'
      }, { status: 400 });
    }

    // Count existing appointments for the new slot
    const existingCount = await db.biometricAppointment.count({
      where: {
        location_id: newLocationId,
        appointment_date: newAppointmentDate,
        appointment_time: newAppointmentTime,
        status: 'scheduled'
      }
    });

    if (existingCount >= timeSlot.max_appointments) {
      return NextResponse.json({
        success: false,
        message: 'The selected time slot is fully booked. Please select another time.'
      }, { status: 409 });
    }

    // Update the existing appointment with new details using direct Supabase
    console.log('Rescheduling appointment with data:', {
      location_id: newLocationId,
      appointment_date: newAppointmentDate,
      appointment_time: newAppointmentTime
    });

    // First, try updating without returning data to avoid trigger issues
    const { error: updateError } = await supabaseAdmin
      .from('biometric_appointments')
      .update({
        location_id: newLocationId,
        appointment_date: newAppointmentDate,
        appointment_time: newAppointmentTime,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingAppointment.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Now fetch the updated appointment data
    const { data: updatedAppointment, error: fetchError } = await supabaseAdmin
      .from('biometric_appointments')
      .select('id, user_uid, location_id, appointment_date, appointment_time, status, notes, created_at, updated_at')
      .eq('id', existingAppointment.id)
      .single();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    // Get location details
    const { data: locationData, error: locationError } = await supabaseAdmin
      .from('biometric_locations')
      .select('name, address, phone, operating_hours, electorate')
      .eq('id', newLocationId)
      .single();

    if (locationError) {
      throw new Error(locationError.message);
    }

    // Combine appointment and location data
    const appointmentWithLocation = {
      ...updatedAppointment,
      location: {
        ...locationData,
        operatingHours: locationData.operating_hours
      }
    };

    console.log('Appointment rescheduled successfully:', appointmentWithLocation);

    // Send reschedule confirmation email (non-blocking)
    if (user && appointmentWithLocation?.location) {
      try {
        const emailResult = await emailService.sendAppointmentRescheduleEmail(
          user.email,
          `${user.firstName} ${user.lastName}`,
          {
            newDate: format(new Date(appointmentWithLocation.appointment_date), 'EEEE, MMMM d, yyyy'),
            newTime: appointmentWithLocation.appointment_time,
            newLocation: appointmentWithLocation.location.name,
            newAddress: appointmentWithLocation.location.address,
            newPhone: appointmentWithLocation.location.phone
          }
        );
        
        if (emailResult.success) {
          console.log('Appointment reschedule email sent successfully');
        } else {
          console.error('Failed to send appointment reschedule email:', emailResult.error);
        }
      } catch (emailError) {
        console.error('Email service error during appointment rescheduling:', emailError);
        // Don't fail reschedule if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Biometric appointment rescheduled successfully',
      appointment: {
        id: appointmentWithLocation?.id,
        appointmentDate: appointmentWithLocation?.appointment_date,
        appointmentTime: appointmentWithLocation?.appointment_time,
        location: appointmentWithLocation?.location,
        status: appointmentWithLocation?.status
      }
    });

  } catch (error) {
    console.error('Error rescheduling biometric appointment:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json({
      success: false,
      message: `Failed to reschedule appointment: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}