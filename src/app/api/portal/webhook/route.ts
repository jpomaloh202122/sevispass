import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPortalToken } from '@/lib/portal-auth';

interface WebhookRequest {
  event: 'user.updated' | 'appointment.created' | 'appointment.cancelled';
  data: {
    uid: string;
    timestamp: string;
    metadata?: Record<string, any>;
  };
  signature?: string;
}

interface WebhookResponse {
  success: boolean;
  message: string;
  processed?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: WebhookRequest = await request.json();

    if (!body.event || !body.data?.uid) {
      return NextResponse.json({
        success: false,
        message: 'Invalid webhook payload'
      } as WebhookResponse, { status: 400 });
    }

    // Verify webhook signature (if provided)
    if (body.signature) {
      // Add signature verification logic here
      // This would typically involve HMAC verification
    }

    // Process different webhook events
    switch (body.event) {
      case 'user.updated':
        await handleUserUpdated(body.data.uid, body.data.metadata);
        break;
      
      case 'appointment.created':
        await handleAppointmentCreated(body.data.uid, body.data.metadata);
        break;
      
      case 'appointment.cancelled':
        await handleAppointmentCancelled(body.data.uid, body.data.metadata);
        break;
      
      default:
        return NextResponse.json({
          success: false,
          message: 'Unknown event type'
        } as WebhookResponse, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      processed: true
    } as WebhookResponse);

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    } as WebhookResponse, { status: 500 });
  }
}

async function handleUserUpdated(uid: string, metadata?: Record<string, any>) {
  // Log user update event
  console.log(`User updated: ${uid}`, metadata);
  
  // Add any user update processing logic here
  // For example, sync with external systems, send notifications, etc.
}

async function handleAppointmentCreated(uid: string, metadata?: Record<string, any>) {
  // Log appointment creation
  console.log(`Appointment created for user: ${uid}`, metadata);
  
  // Add appointment creation processing logic here
  // For example, send confirmation emails, update external calendars, etc.
}

async function handleAppointmentCancelled(uid: string, metadata?: Record<string, any>) {
  // Log appointment cancellation
  console.log(`Appointment cancelled for user: ${uid}`, metadata);
  
  // Add cancellation processing logic here
  // For example, send cancellation notifications, free up time slots, etc.
}