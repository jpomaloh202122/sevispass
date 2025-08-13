import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

    // Update appointment status to cancelled
    await db.biometricAppointment.update({
      where: { user_uid: userUid },
      data: { status: 'cancelled' }
    });

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