import { v4 as uuidv4 } from 'uuid';
import { TwoFactorCode, TwoFactorRequest, TwoFactorResponse } from '../types';
import { db } from '../database/connection';
import { emailService } from '../utils/email';
import { logger } from '../utils/logger';

export class TwoFactorService {
  private readonly codeExpiryMinutes = 10;
  private readonly maxAttempts = 5;

  /**
   * Generate and send a 2FA code to user's email
   */
  async generateAndSendCode(userUid: string, email: string, ipAddress?: string, userAgent?: string): Promise<string> {
    try {
      // Clean up expired codes for this user
      await this.cleanupExpiredCodes(userUid);

      // Check if user already has an active code
      const existingCode = await this.getActiveCode(userUid);
      if (existingCode) {
        // If code is still valid and not used, don't generate a new one
        if (!existingCode.isUsed && existingCode.expiresAt > new Date()) {
          logger.info(`User ${userUid} already has an active 2FA code`);
          return existingCode.id;
        }
      }

      // Generate new 6-digit code
      const code = this.generateCode();
      const expiresAt = new Date(Date.now() + this.codeExpiryMinutes * 60 * 1000);

      // Create 2FA code record
      const twoFactorCode: TwoFactorCode = {
        id: uuidv4(),
        userUid,
        code,
        expiresAt,
        attempts: 0,
        maxAttempts: this.maxAttempts,
        isUsed: false,
        ipAddress,
        userAgent,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database
      await db.from('two_factor_codes').insert(twoFactorCode);

      // Send email
      await this.sendCodeEmail(email, code);

      logger.info(`2FA code generated for user ${userUid}`);
      return twoFactorCode.id;

    } catch (error) {
      logger.error('Error generating 2FA code:', error);
      throw new Error('Failed to generate 2FA code');
    }
  }

  /**
   * Verify a 2FA code
   */
  async verifyCode(request: TwoFactorRequest): Promise<TwoFactorResponse> {
    try {
      const { uid, code, deviceId } = request;

      // Get the most recent active code for the user
      const twoFactorCode = await this.getActiveCode(uid);
      
      if (!twoFactorCode) {
        return {
          success: false,
          message: 'No active verification code found. Please request a new code.'
        };
      }

      // Check if code has expired
      if (twoFactorCode.expiresAt <= new Date()) {
        await this.markCodeAsUsed(twoFactorCode.id);
        return {
          success: false,
          message: 'Verification code has expired. Please request a new code.'
        };
      }

      // Check if code is already used
      if (twoFactorCode.isUsed) {
        return {
          success: false,
          message: 'Verification code has already been used. Please request a new code.'
        };
      }

      // Check if max attempts exceeded
      if (twoFactorCode.attempts >= twoFactorCode.maxAttempts) {
        await this.markCodeAsUsed(twoFactorCode.id);
        return {
          success: false,
          message: 'Maximum verification attempts exceeded. Please request a new code.'
        };
      }

      // Verify the code
      if (twoFactorCode.code !== code) {
        // Increment attempt count
        await this.incrementAttempts(twoFactorCode.id);
        
        const remainingAttempts = twoFactorCode.maxAttempts - (twoFactorCode.attempts + 1);
        
        return {
          success: false,
          message: `Invalid verification code. ${remainingAttempts} attempts remaining.`
        };
      }

      // Code is valid - mark as used
      await this.markCodeAsUsed(twoFactorCode.id);

      // Get user data
      const { data: user } = await db.from('users').select('*').eq('uid', uid).single();

      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      logger.info(`2FA verification successful for user ${uid}`);

      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          nid: user.nid,
          phoneNumber: user.phoneNumber,
          address: user.address,
          isVerified: user.isVerified,
          createdAt: user.createdAt.toISOString()
        },
        message: 'Verification successful'
      };

    } catch (error) {
      logger.error('Error verifying 2FA code:', error);
      return {
        success: false,
        message: 'Internal server error during verification'
      };
    }
  }

  /**
   * Get active 2FA code for a user
   */
  private async getActiveCode(userUid: string): Promise<TwoFactorCode | null> {
    try {
      const { data: code } = await db
        .from('two_factor_codes')
        .select('*')
        .eq('user_uid', userUid)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return code;
    } catch (error) {
      logger.error('Error getting active 2FA code:', error);
      return null;
    }
  }

  /**
   * Mark a code as used
   */
  private async markCodeAsUsed(codeId: string): Promise<void> {
    try {
      await db.twoFactorCode.update({
        where: { id: codeId },
        data: {
          isUsed: true,
          usedAt: new Date(),
          updatedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Error marking code as used:', error);
    }
  }

  /**
   * Increment attempt count for a code
   */
  private async incrementAttempts(codeId: string): Promise<void> {
    try {
      await db.twoFactorCode.update({
        where: { id: codeId },
        data: {
          attempts: {
            increment: 1
          },
          updatedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Error incrementing attempts:', error);
    }
  }

  /**
   * Clean up expired codes for a user
   */
  private async cleanupExpiredCodes(userUid: string): Promise<void> {
    try {
      await db.twoFactorCode.deleteMany({
        where: {
          userUid,
          OR: [
            { expiresAt: { lt: new Date() } },
            { isUsed: true }
          ]
        }
      });
    } catch (error) {
      logger.error('Error cleaning up expired codes:', error);
    }
  }

  /**
   * Generate a 6-digit verification code
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send 2FA code via email
   */
  private async sendCodeEmail(email: string, code: string): Promise<void> {
    try {
      const subject = 'Your Digital ID Verification Code';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Digital ID Verification</h2>
          <p>Your verification code is:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${code}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message from Digital ID Core Stack. Please do not reply to this email.
          </p>
        </div>
      `;

      await emailService.sendEmail({
        to: email,
        subject: subject,
        html: html
      });
      logger.info(`2FA code email sent to ${email}`);
    } catch (error) {
      logger.error('Error sending 2FA code email:', error);
      throw new Error('Failed to send verification code');
    }
  }

  /**
   * Validate 2FA code format
   */
  validateCodeFormat(code: string): boolean {
    return /^\d{6}$/.test(code);
  }

  /**
   * Get 2FA statistics for a user
   */
  async get2FAStats(userUid: string): Promise<{
    totalCodes: number;
    successfulVerifications: number;
    failedAttempts: number;
    lastUsed?: Date;
  }> {
    try {
      const codes = await db.twoFactorCode.findMany({
        where: { userUid },
        orderBy: { createdAt: 'desc' }
      });

      const totalCodes = codes.length;
      const successfulVerifications = codes.filter((c: any) => c.isUsed).length;
      const failedAttempts = codes.reduce((sum: number, c: any) => sum + c.attempts, 0);
      const lastUsed = codes.find((c: any) => c.isUsed)?.usedAt;

      return {
        totalCodes,
        successfulVerifications,
        failedAttempts,
        lastUsed
      };
    } catch (error) {
      logger.error('Error getting 2FA stats:', error);
      return {
        totalCodes: 0,
        successfulVerifications: 0,
        failedAttempts: 0
      };
    }
  }
}

export const twoFactorService = new TwoFactorService();
