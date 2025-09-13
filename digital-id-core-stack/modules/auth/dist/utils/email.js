"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
class EmailService {
    async sendEmail(options) {
        // Placeholder implementation - integrate with your email provider
        console.log(`Sending email to ${options.to}: ${options.subject}`);
        return true;
    }
    async send2FACode(email, code) {
        const options = {
            to: email,
            subject: '2FA Verification Code',
            text: `Your verification code is: ${code}`,
            html: `<p>Your verification code is: <strong>${code}</strong></p>`
        };
        return this.sendEmail(options);
    }
}
exports.EmailService = EmailService;
exports.emailService = new EmailService();
//# sourceMappingURL=email.js.map