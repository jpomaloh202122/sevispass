import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface UserInfoRequest {
  uid?: string;
  email?: string;
  nid?: string;
}

interface UserInfoResponse {
  success: boolean;
  user?: {
    uid: string;
    email: string;
    firstName: string;
    lastName: string;
    nid: string;
    phoneNumber: string;
    address?: string;
    verified: boolean;
    appointments?: {
      id: string;
      date: string;
      time: string;
      location: string;
      status: string;
    }[];
  };
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: UserInfoRequest = await request.json();

    if (!body.uid && !body.email && !body.nid) {
      return NextResponse.json({
        success: false,
        message: 'User identifier (uid, email, or nid) is required'
      } as UserInfoResponse, { status: 400 });
    }

    // Build where condition based on provided identifier
    const whereCondition: any = {};
    if (body.uid) whereCondition.uid = body.uid;
    else if (body.email) whereCondition.email = body.email;
    else if (body.nid) whereCondition.nid = body.nid;

    // Get user with appointments
    const user = await db.user.findUnique({
      where: whereCondition,
      include: {
        appointments: {
          select: {
            id: true,
            appointmentDate: true,
            appointmentTime: true,
            location: true,
            status: true
          },
          orderBy: {
            appointmentDate: 'desc'
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      } as UserInfoResponse, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        nid: user.nid,
        phoneNumber: user.phoneNumber,
        address: user.address || undefined,
        verified: true,
        appointments: user.appointments.map(apt => ({
          id: apt.id,
          date: apt.appointmentDate,
          time: apt.appointmentTime,
          location: apt.location,
          status: apt.status
        }))
      },
      message: 'User information retrieved successfully'
    } as UserInfoResponse);

  } catch (error) {
    console.error('User info retrieval error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    } as UserInfoResponse, { status: 500 });
  }
}