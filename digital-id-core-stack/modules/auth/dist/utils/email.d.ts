export interface EmailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
}
export declare class EmailService {
    sendEmail(options: EmailOptions): Promise<boolean>;
    send2FACode(email: string, code: string): Promise<boolean>;
}
export declare const emailService: EmailService;
//# sourceMappingURL=email.d.ts.map