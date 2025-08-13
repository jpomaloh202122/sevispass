import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailService } from '@/lib/aws-ses';
import { format } from 'date-fns';

interface BookingRequest {
  userUid: string;
  locationId: number;
  appointmentDate: string;
  appointmentTime: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userUid, locationId, appointmentDate, appointmentTime }: BookingRequest = await request.json();

    console.log('Booking request received:', { userUid, locationId, appointmentDate, appointmentTime });

    // Validate required fields
    if (!userUid || !locationId || !appointmentDate || !appointmentTime) {
      console.log('Validation failed - missing required fields');
      return NextResponse.json({
        success: false,
        message: 'All booking details are required'
      }, { status: 400 });
    }

    // Check if user exists
    const user = await db.user.findUnique({
      where: { uid: userUid },
      select: { uid: true, firstName: true, lastName: true, isVerified: true }
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
        message: 'User must complete face verification before booking biometric appointment'
      }, { status: 400 });
    }

    // Check if user already has a scheduled appointment
    console.log('Checking for existing scheduled appointment for user:', userUid);
    const existingAppointments = await db.biometricAppointment.findMany({
      where: { 
        user_uid: userUid,
        status: 'scheduled'
      }
    });
    
    const existingAppointment = existingAppointments.length > 0 ? existingAppointments[0] : null;

    console.log('Existing appointment check result:', existingAppointment);

    if (existingAppointment) {
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
      return NextResponse.json({
        success: false,
        message: 'Appointment date must be in the future'
      }, { status: 400 });
    }

    const dayOfWeek = appointmentDateObj.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
      return NextResponse.json({
        success: false,
        message: 'Appointments are only available Monday through Friday'
      }, { status: 400 });
    }

    // Check if the time slot is still available
    const ourDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    const timeSlot = await db.appointmentTimeSlot.findFirst({
      where: {
        location_id: locationId,
        day_of_week: ourDayOfWeek,
        start_time: appointmentTime,
        is_active: true
      }
    });

    if (!timeSlot) {
      return NextResponse.json({
        success: false,
        message: 'Invalid time slot selected'
      }, { status: 400 });
    }

    // Count existing appointments for this slot
    const existingCount = await db.biometricAppointment.count({
      where: {
        location_id: locationId,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        status: 'scheduled'
      }
    });

    if (existingCount >= timeSlot.max_appointments) {
      return NextResponse.json({
        success: false,
        message: 'This time slot is fully booked. Please select another time.'
      }, { status: 409 });
    }

    // Create the appointment
    console.log('Creating appointment with data:', {
      user_uid: userUid,
      location_id: locationId,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      status: 'scheduled'
    });

    const appointment = await db.biometricAppointment.create({
      data: {
        user_uid: userUid,
        location_id: locationId,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        status: 'scheduled'
      },
      include: {
        location: true
      }
    });

    console.log('Appointment created successfully:', appointment);

    // Get user details for email
    const userData = await db.user.findUnique({
      where: { uid: userUid },
      select: { email: true, firstName: true, lastName: true }
    });

    // Send appointment confirmation email (non-blocking)
    if (userData && appointment.location) {
      try {
        const emailResult = await emailService.sendAppointmentConfirmationEmail(
          userData.email,
          `${userData.firstName} ${userData.lastName}`,
          {
            date: format(new Date(appointment.appointment_date), 'EEEE, MMMM d, yyyy'),
            time: appointment.appointment_time,
            location: appointment.location.name,
            address: appointment.location.address,
            phone: appointment.location.phone
          }
        );
        
        if (emailResult.success) {
          console.log('Appointment confirmation email sent successfully');
        } else {
          console.error('Failed to send appointment confirmation email:', emailResult.error);
        }
      } catch (emailError) {
        console.error('Email service error during appointment booking:', emailError);
        // Don't fail booking if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Biometric appointment booked successfully',
      appointment: {
        id: appointment.id,
        appointmentDate: appointment.appointment_date,
        appointmentTime: appointment.appointment_time,
        location: appointment.location,
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