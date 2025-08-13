import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const locations = await db.biometricLocation.findMany({
      where: { is_active: true }
    });

    // Transform the data to match the expected format
    const transformedLocations = locations.map(location => ({
      id: location.id,
      name: location.name,
      address: location.address,
      electorate: location.electorate,
      phone: location.phone,
      operatingHours: location.operating_hours
    }));

    return NextResponse.json({
      success: true,
      locations: transformedLocations
    });

  } catch (error) {
    console.error('Error fetching biometric locations:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch biometric collection locations'
    }, { status: 500 });
  }
}