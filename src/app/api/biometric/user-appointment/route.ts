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

    // Only look for scheduled appointments for dashboard purposes
    const appointment = await db.biometricAppointment.findMany({
      where: {
        user_uid: userUid,
        status: 'scheduled'
      }
    });

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
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch appointment information'
    }, { status: 500 });
  }
}