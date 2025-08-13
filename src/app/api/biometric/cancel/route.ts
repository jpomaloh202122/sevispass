import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailService } from '@/lib/aws-ses';
import { format } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const { userUid } = await request.json();

    if (!userUid) {
      return NextResponse.json({
        success: false,
        message: 'User UID is required'
      }, { status: 400 });
    }

    // Check if user has an appointment
    const existingAppointment = await db.biometricAppointment.findUnique({
      where: { user_uid: userUid }
    });

    if (!existingAppointment) {
      return NextResponse.json({
        success: false,
        message: 'No appointment found to cancel'
      }, { status: 404 });
    }

    // Check if appointment is in the future (allow cancellation up to 24 hours before)
    const appointmentDate = new Date(existingAppointment.appointment_date);
    const now = new Date();
    const timeDiff = appointmentDate.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);

    if (hoursDiff < 24) {
      return NextResponse.json({
        success: false,
        message: 'Cannot cancel appointment less than 24 hours before scheduled time'
      }, { status: 400 });
    }

    // Get appointment details before cancellation for email
    const appointmentWithLocation = await db.biometricAppointment.findUnique({
      where: { user_uid: userUid },
      include: { location: true }
    });

    // Update appointment status to cancelled
    await db.biometricAppointment.update({
      where: { user_uid: userUid },
      data: { status: 'cancelled' }
    });

    // Get user details for email
    const userData = await db.user.findUnique({
      where: { uid: userUid },
      select: { email: true, firstName: true, lastName: true }
    });

    // Send appointment cancellation email (non-blocking)
    if (userData && appointmentWithLocation && appointmentWithLocation.location) {
      try {
        const emailResult = await emailService.sendAppointmentCancellationEmail(
          userData.email,
          `${userData.firstName} ${userData.lastName}`,
          {
            date: format(new Date(appointmentWithLocation.appointment_date), 'EEEE, MMMM d, yyyy'),
            time: appointmentWithLocation.appointment_time,
            location: appointmentWithLocation.location.name
          }
        );
        
        if (emailResult.success) {
          console.log('Appointment cancellation email sent successfully');
        } else {
          console.error('Failed to send appointment cancellation email:', emailResult.error);
        }
      } catch (emailError) {
        console.error('Email service error during appointment cancellation:', emailError);
        // Don't fail cancellation if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Biometric appointment cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling biometric appointment:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to cancel appointment'
    }, { status: 500 });
  }
}