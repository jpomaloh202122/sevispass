import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function isAppointmentLapsed(appointmentDate: string, appointmentTime: string): boolean {
  const currentDateTime = new Date();
  
  // Parse the appointment date and time
  const [year, month, day] = appointmentDate.split('-').map(Number);
  const [hours, minutes] = appointmentTime.split(':').map(Number);
  
  // Create appointment datetime object
  const appointmentDateTime = new Date(year, month - 1, day, hours, minutes);
  
  // Return true if current time is past the appointment time
  return currentDateTime > appointmentDateTime;
}

export async function POST(request: NextRequest) {
  try {
    const { userUid } = await request.json();

    if (!userUid) {
      return NextResponse.json({
        success: false,
        message: 'User UID is required'
      }, { status: 400 });
    }

    // First, find all scheduled appointments for this user
    const scheduledAppointments = await db.biometricAppointment.findMany({
      where: {
        user_uid: userUid,
        status: 'scheduled'
      }
    });

    // Check each scheduled appointment to see if it has lapsed
    for (const appointment of scheduledAppointments) {
      if (isAppointmentLapsed(appointment.appointment_date, appointment.appointment_time)) {
        // Auto-cancel the lapsed appointment
        await db.biometricAppointment.update({
          where: { id: appointment.id },
          data: { 
            status: 'cancelled',
            notes: 'Automatically cancelled - appointment time has passed',
            updated_at: new Date()
          }
        });
      }
    }

    // Now look for the most recent appointment (scheduled, cancelled, or completed)
    const appointments = await db.biometricAppointment.findMany({
      where: {
        user_uid: userUid,
        status: {
          in: ['scheduled', 'cancelled', 'completed', 'no_show']
        }
      }
    });

    // Sort appointments by created_at in descending order and take the first one
    const sortedAppointments = appointments.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    const appointment = sortedAppointments.length > 0 ? [sortedAppointments[0]] : [];

    const userAppointment = appointment.length > 0 ? appointment[0] : null;

    // If we found an appointment, fetch the location details
    let locationData = null;
    if (userAppointment) {
      const locations = await db.biometricLocation.findMany({
        where: {
          id: userAppointment.location_id
        }
      });
      locationData = locations.length > 0 ? locations[0] : null;
    }

    if (!userAppointment) {
      return NextResponse.json({
        success: true,
        hasAppointment: false,
        message: 'No biometric appointment found'
      });
    }

    return NextResponse.json({
      success: true,
      hasAppointment: true,
      appointment: {
        id: userAppointment.id,
        appointmentDate: userAppointment.appointment_date,
        appointmentTime: userAppointment.appointment_time,
        status: userAppointment.status,
        notes: userAppointment.notes,
        location: locationData ? {
          name: locationData.name,
          address: locationData.address,
          phone: locationData.phone,
          operatingHours: locationData.operating_hours,
          electorate: locationData.electorate
        } : null,
        createdAt: userAppointment.created_at
      }
    });

  } catch (error) {
    console.error('Error fetching user biometric appointment:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return NextResponse.json({
      success: false,
      message: `Failed to fetch appointment information: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}