import { SESClient, SendEmailCommand, SendEmailCommandInput } from '@aws-sdk/client-ses';

// Configure AWS SES Client
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface EmailOptions {
  to: string[];
  subject: string;
  htmlBody?: string;
  textBody?: string;
  from?: string;
}

export class EmailService {
  private static instance: EmailService;
  private defaultFromEmail: string;

  private constructor() {
    this.defaultFromEmail = process.env.SES_FROM_EMAIL || 'noreply@sevispass.gov.pg';
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { to, subject, htmlBody, textBody, from } = options;

      if (!to || to.length === 0) {
        throw new Error('At least one recipient email is required');
      }

      if (!subject) {
        throw new Error('Email subject is required');
      }

      if (!htmlBody && !textBody) {
        throw new Error('Either HTML body or text body is required');
      }

      const params: SendEmailCommandInput = {
        Source: from || this.defaultFromEmail,
        Destination: {
          ToAddresses: to,
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            ...(htmlBody && {
              Html: {
                Data: htmlBody,
                Charset: 'UTF-8',
              },
            }),
            ...(textBody && {
              Text: {
                Data: textBody,
                Charset: 'UTF-8',
              },
            }),
          },
        },
      };

      const command = new SendEmailCommand(params);
      const response = await sesClient.send(command);

      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (error) {
      console.error('AWS SES Email sending failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async sendWelcomeEmail(userEmail: string, userName: string): Promise<{ success: boolean; error?: string }> {
    const subject = 'Welcome to SevisPass - Your Digital ID Account Created Successfully';
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to SevisPass</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f7f7f7;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Welcome to SevisPass</h1>
            <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 16px;">Your Digital Identity Platform</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 20px;">
            <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${userName}!</h2>
            
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
              Congratulations! Your SevisPass account has been created successfully. You're now one step closer to having your secure Digital ID.
            </p>
            
            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 30px 0;">
              <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">Next Steps:</h3>
              <ol style="color: #92400e; margin: 0; padding-left: 20px;">
                <li style="margin: 8px 0;">Log in to your SevisPass account</li>
                <li style="margin: 8px 0;">Schedule your biometric fingerprint collection appointment</li>
                <li style="margin: 8px 0;">Complete your biometric collection to activate your Digital ID</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/auth/login" 
                 style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); 
                        color: white; text-decoration: none; padding: 15px 30px; 
                        border-radius: 8px; font-weight: bold; font-size: 16px;">
                Login to SevisPass
              </a>
            </div>
            
            <div style="background-color: #dbeafe; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 30px 0;">
              <h3 style="color: #1e40af; margin: 0 0 10px 0; font-size: 16px;">Important:</h3>
              <p style="color: #1e40af; margin: 0; font-size: 14px; line-height: 1.5;">
                Your biometric appointment is required to complete your Digital ID application. 
                This ensures the security and authenticity of your digital identity.
              </p>
            </div>
            
            <p style="color: #6b7280; line-height: 1.6; margin: 30px 0 0 0; font-size: 14px;">
              If you have any questions or need assistance, please contact our support team.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              © 2024 SevisPass - Government of Papua New Guinea<br>
              Digital Identity Platform
            </p>
            <p style="color: #9ca3af; margin: 10px 0 0 0; font-size: 12px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textBody = `
Welcome to SevisPass!

Hello ${userName},

Congratulations! Your SevisPass account has been created successfully. You're now one step closer to having your secure Digital ID.

Next Steps:
1. Log in to your SevisPass account
2. Schedule your biometric fingerprint collection appointment  
3. Complete your biometric collection to activate your Digital ID

Login to SevisPass: ${process.env.NEXT_PUBLIC_APP_URL}/auth/login

Important: Your biometric appointment is required to complete your Digital ID application. This ensures the security and authenticity of your digital identity.

If you have any questions or need assistance, please contact our support team.

© 2024 SevisPass - Government of Papua New Guinea
This is an automated message. Please do not reply to this email.
    `;

    return await this.sendEmail({
      to: [userEmail],
      subject,
      htmlBody,
      textBody,
    });
  }

  async sendAppointmentConfirmationEmail(
    userEmail: string, 
    userName: string, 
    appointmentDetails: {
      date: string;
      time: string;
      location: string;
      address: string;
      phone: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const subject = 'Biometric Appointment Confirmed - SevisPass Digital ID';
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Appointment Confirmed</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f7f7f7;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Appointment Confirmed</h1>
            <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">Biometric Collection Scheduled</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 20px;">
            <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${userName}!</h2>
            
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;">
              Your biometric fingerprint collection appointment has been successfully scheduled. Please find your appointment details below:
            </p>
            
            <!-- Appointment Details -->
            <div style="background-color: #f0fdf4; border: 1px solid #10b981; border-radius: 12px; padding: 30px; margin: 30px 0;">
              <h3 style="color: #047857; margin: 0 0 20px 0; font-size: 20px; text-align: center;">Appointment Details</h3>
              
              <div style="display: table; width: 100%; border-collapse: collapse;">
                <div style="display: table-row;">
                  <div style="display: table-cell; padding: 10px 0; font-weight: bold; color: #047857; width: 30%;">Date:</div>
                  <div style="display: table-cell; padding: 10px 0; color: #1f2937;">${appointmentDetails.date}</div>
                </div>
                <div style="display: table-row;">
                  <div style="display: table-cell; padding: 10px 0; font-weight: bold; color: #047857; width: 30%;">Time:</div>
                  <div style="display: table-cell; padding: 10px 0; color: #1f2937;">${appointmentDetails.time}</div>
                </div>
                <div style="display: table-row;">
                  <div style="display: table-cell; padding: 10px 0; font-weight: bold; color: #047857; width: 30%;">Location:</div>
                  <div style="display: table-cell; padding: 10px 0; color: #1f2937;">${appointmentDetails.location}</div>
                </div>
                <div style="display: table-row;">
                  <div style="display: table-cell; padding: 10px 0; font-weight: bold; color: #047857; width: 30%;">Address:</div>
                  <div style="display: table-cell; padding: 10px 0; color: #1f2937;">${appointmentDetails.address}</div>
                </div>
                <div style="display: table-row;">
                  <div style="display: table-cell; padding: 10px 0; font-weight: bold; color: #047857; width: 30%;">Phone:</div>
                  <div style="display: table-cell; padding: 10px 0; color: #1f2937;">${appointmentDetails.phone}</div>
                </div>
              </div>
            </div>
            
            <!-- Important Reminders -->
            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 30px 0;">
              <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">Important Reminders:</h3>
              <ul style="color: #92400e; margin: 0; padding-left: 20px;">
                <li style="margin: 8px 0;">Please bring a valid form of identification</li>
                <li style="margin: 8px 0;">Arrive 10 minutes early for check-in</li>
                <li style="margin: 8px 0;">The biometric collection process takes approximately 15 minutes</li>
                <li style="margin: 8px 0;">Ensure your hands are clean for fingerprint collection</li>
              </ul>
            </div>
            
            <p style="color: #6b7280; line-height: 1.6; margin: 30px 0 0 0; font-size: 14px;">
              If you need to reschedule or cancel your appointment, please log in to your SevisPass account or contact our support team.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              © 2024 SevisPass - Government of Papua New Guinea<br>
              Digital Identity Platform
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textBody = `
Appointment Confirmed - SevisPass Digital ID

Hello ${userName},

Your biometric fingerprint collection appointment has been successfully scheduled.

Appointment Details:
- Date: ${appointmentDetails.date}
- Time: ${appointmentDetails.time}  
- Location: ${appointmentDetails.location}
- Address: ${appointmentDetails.address}
- Phone: ${appointmentDetails.phone}

Important Reminders:
- Please bring a valid form of identification
- Arrive 10 minutes early for check-in
- The biometric collection process takes approximately 15 minutes
- Ensure your hands are clean for fingerprint collection

If you need to reschedule or cancel your appointment, please log in to your SevisPass account or contact our support team.

© 2024 SevisPass - Government of Papua New Guinea
    `;

    return await this.sendEmail({
      to: [userEmail],
      subject,
      htmlBody,
      textBody,
    });
  }

  async sendAppointmentCancellationEmail(
    userEmail: string, 
    userName: string, 
    cancelledAppointment: {
      date: string;
      time: string;
      location: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const subject = 'Biometric Appointment Cancelled - SevisPass Digital ID';
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Appointment Cancelled</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f7f7f7;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Appointment Cancelled</h1>
            <p style="color: #fecaca; margin: 10px 0 0 0; font-size: 16px;">Biometric Collection Cancelled</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 20px;">
            <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${userName}!</h2>
            
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;">
              Your biometric fingerprint collection appointment has been successfully cancelled.
            </p>
            
            <!-- Cancelled Appointment Details -->
            <div style="background-color: #fef2f2; border: 1px solid #ef4444; border-radius: 12px; padding: 30px; margin: 30px 0;">
              <h3 style="color: #dc2626; margin: 0 0 20px 0; font-size: 18px;">Cancelled Appointment:</h3>
              
              <div style="color: #7f1d1d;">
                <p style="margin: 5px 0;"><strong>Date:</strong> ${cancelledAppointment.date}</p>
                <p style="margin: 5px 0;"><strong>Time:</strong> ${cancelledAppointment.time}</p>
                <p style="margin: 5px 0;"><strong>Location:</strong> ${cancelledAppointment.location}</p>
              </div>
            </div>
            
            <div style="background-color: #dbeafe; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 30px 0;">
              <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">Next Steps:</h3>
              <p style="color: #1e40af; margin: 0; line-height: 1.5;">
                To complete your Digital ID application, you'll need to schedule a new biometric appointment. 
                You can do this anytime by logging into your SevisPass account.
              </p>
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
                 style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); 
                        color: white; text-decoration: none; padding: 15px 30px; 
                        border-radius: 8px; font-weight: bold; font-size: 16px;">
                Schedule New Appointment
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              © 2024 SevisPass - Government of Papua New Guinea<br>
              Digital Identity Platform
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textBody = `
Appointment Cancelled - SevisPass Digital ID

Hello ${userName},

Your biometric fingerprint collection appointment has been successfully cancelled.

Cancelled Appointment:
- Date: ${cancelledAppointment.date}
- Time: ${cancelledAppointment.time}
- Location: ${cancelledAppointment.location}

Next Steps:
To complete your Digital ID application, you'll need to schedule a new biometric appointment. You can do this anytime by logging into your SevisPass account.

Schedule New Appointment: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard

© 2024 SevisPass - Government of Papua New Guinea
    `;

    return await this.sendEmail({
      to: [userEmail],
      subject,
      htmlBody,
      textBody,
    });
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance();