import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { locationId, date } = await request.json();

    if (!locationId || !date) {
      return NextResponse.json({
        success: false,
        message: 'Location ID and date are required'
      }, { status: 400 });
    }

    // Parse the date
    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.getDay(); // 0=Sunday, 1=Monday, etc.
    
    // Convert to our format (1=Monday, 5=Friday)
    const ourDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek; // Sunday becomes 7
    
    // Only allow Monday-Friday (1-5)
    if (ourDayOfWeek > 5) {
      return NextResponse.json({
        success: false,
        message: 'Appointments are only available Monday through Friday'
      }, { status: 400 });
    }

    // Get available time slots for this location and day
    const timeSlots = await db.appointmentTimeSlot.findMany({
      where: {
        location_id: locationId,
        day_of_week: ourDayOfWeek,
        is_active: true
      },
      orderBy: { start_time: 'asc' }
    });

    // Get existing appointments for this date and location
    const existingAppointments = await db.biometricAppointment.findMany({
      where: {
        location_id: locationId,
        appointment_date: appointmentDate.toISOString().split('T')[0],
        status: { in: ['scheduled'] } // Only count scheduled appointments
      },
      select: {
        appointmentTime: true
      }
    });

    // Count appointments per time slot
    const appointmentCounts = existingAppointments.reduce((acc, appointment) => {
      const timeKey = appointment.appointment_time;
      acc[timeKey] = (acc[timeKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Build available slots
    const availableSlots = timeSlots.map(slot => {
      const startTime = slot.start_time;
      const bookedCount = appointmentCounts[startTime] || 0;
      const spotsRemaining = slot.max_appointments - bookedCount;

      return {
        id: slot.id,
        startTime: slot.start_time,
        endTime: slot.end_time,
        maxAppointments: slot.max_appointments,
        bookedCount,
        spotsRemaining,
        isAvailable: spotsRemaining > 0
      };
    });

    return NextResponse.json({
      success: true,
      date: date,
      availableSlots: availableSlots
    });

  } catch (error) {
    console.error('Error fetching appointment availability:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch appointment availability'
    }, { status: 500 });
  }
}