export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export class EmailService {
  async sendEmail(options: EmailOptions): Promise<boolean> {
    // Placeholder implementation - integrate with your email provider
    console.log(`Sending email to ${options.to}: ${options.subject}`);
    return true;
  }

  async send2FACode(email: string, code: string): Promise<boolean> {
    const options: EmailOptions = {
      to: email,
      subject: '2FA Verification Code',
      text: `Your verification code is: ${code}`,
      html: `<p>Your verification code is: <strong>${code}</strong></p>`
    };
    
    return this.sendEmail(options);
  }
}

export const emailService = new EmailService();