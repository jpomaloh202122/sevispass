import { readFile, writeFile } from 'fs/promises';
import { existsSync, mkdir } from 'fs/promises';
import path from 'path';

export interface DuplicateNotification {
  id: string;
  type: 'critical_duplicate' | 'high_risk_duplicate' | 'manual_review_required' | 'auto_resolution_applied' | 'duplicate_resolved';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  applicationId: string;
  adminId?: string;
  adminName?: string;
  metadata: {
    matchTypes: string[];
    riskLevel: string;
    confidence: string;
    duplicateCount: number;
    autoResolutionApplied?: boolean;
    resolutionAction?: string;
  };
  createdAt: string;
  readAt?: string;
  acknowledgedAt?: string;
  expiresAt?: string;
}

export interface NotificationPreferences {
  adminId: string;
  emailNotifications: boolean;
  inAppNotifications: boolean;
  notificationTypes: {
    critical_duplicate: boolean;
    high_risk_duplicate: boolean;
    manual_review_required: boolean;
    auto_resolution_applied: boolean;
    duplicate_resolved: boolean;
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  lastNotificationSent?: string;
}

export class DuplicateNotificationSystem {
  private notificationsDir: string;
  private preferencesDir: string;

  constructor() {
    this.notificationsDir = path.join(process.cwd(), 'data', 'notifications');
    this.preferencesDir = path.join(process.cwd(), 'data', 'notification-preferences');
    this.ensureDirectories();
  }

  /**
   * Ensure notification directories exist
   */
  private async ensureDirectories(): Promise<void> {
    try {
      if (!existsSync(this.notificationsDir)) {
        await mkdir(this.notificationsDir, { recursive: true });
      }
      if (!existsSync(this.preferencesDir)) {
        await mkdir(this.preferencesDir, { recursive: true });
      }
    } catch (error) {
      console.error('Error creating notification directories:', error);
    }
  }

  /**
   * Create a new notification
   */
  async createNotification(notification: Omit<DuplicateNotification, 'id' | 'createdAt'>): Promise<DuplicateNotification> {
    const newNotification: DuplicateNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };

    // Save notification to file
    const notificationPath = path.join(this.notificationsDir, `${newNotification.id}.json`);
    await writeFile(notificationPath, JSON.stringify(newNotification, null, 2));

    // Send notifications based on preferences
    await this.sendNotifications(newNotification);

    return newNotification;
  }

  /**
   * Send notifications based on admin preferences
   */
  private async sendNotifications(notification: DuplicateNotification): Promise<void> {
    try {
      // Get all admin preferences
      const preferences = await this.getAllNotificationPreferences();
      
      for (const preference of preferences) {
        // Check if admin wants this type of notification
        if (preference.notificationTypes[notification.type]) {
          // Check frequency settings
          if (this.shouldSendNotification(preference, notification)) {
            if (preference.emailNotifications) {
              await this.sendEmailNotification(preference.adminId, notification);
            }
            
            if (preference.inAppNotifications) {
              await this.createInAppNotification(preference.adminId, notification);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }

  /**
   * Check if notification should be sent based on frequency settings
   */
  private shouldSendNotification(preference: NotificationPreferences, notification: DuplicateNotification): boolean {
    if (preference.frequency === 'immediate') {
      return true;
    }

    if (!preference.lastNotificationSent) {
      return true;
    }

    const lastSent = new Date(preference.lastNotificationSent);
    const now = new Date();
    const timeDiff = now.getTime() - lastSent.getTime();

    switch (preference.frequency) {
      case 'hourly':
        return timeDiff >= 60 * 60 * 1000; // 1 hour
      case 'daily':
        return timeDiff >= 24 * 60 * 60 * 1000; // 1 day
      case 'weekly':
        return timeDiff >= 7 * 24 * 60 * 60 * 1000; // 1 week
      default:
        return true;
    }
  }

  /**
   * Send email notification (placeholder for actual email service)
   */
  private async sendEmailNotification(adminId: string, notification: DuplicateNotification): Promise<void> {
    // This would integrate with your email service (e.g., Resend, SendGrid, etc.)
    console.log(`Sending email notification to admin ${adminId}:`, {
      subject: notification.title,
      message: notification.message,
      priority: notification.priority
    });

    // Update last notification sent time
    await this.updateLastNotificationSent(adminId);
  }

  /**
   * Create in-app notification
   */
  private async createInAppNotification(adminId: string, notification: DuplicateNotification): Promise<void> {
    // This would create an in-app notification for the admin dashboard
    console.log(`Creating in-app notification for admin ${adminId}:`, notification.title);
  }

  /**
   * Update last notification sent time for admin
   */
  private async updateLastNotificationSent(adminId: string): Promise<void> {
    try {
      const preferencePath = path.join(this.preferencesDir, `${adminId}.json`);
      if (existsSync(preferencePath)) {
        const preference = JSON.parse(await readFile(preferencePath, 'utf-8'));
        preference.lastNotificationSent = new Date().toISOString();
        await writeFile(preferencePath, JSON.stringify(preference, null, 2));
      }
    } catch (error) {
      console.error('Error updating last notification sent time:', error);
    }
  }

  /**
   * Get notifications for a specific admin
   */
  async getNotificationsForAdmin(adminId: string, limit: number = 50): Promise<DuplicateNotification[]> {
    try {
      const notifications: DuplicateNotification[] = [];
      
      if (!existsSync(this.notificationsDir)) {
        return notifications;
      }

      const fs = await import('fs');
      const files = fs.readdirSync(this.notificationsDir);
      
      for (const filename of files) {
        if (filename.endsWith('.json')) {
          try {
            const filePath = path.join(this.notificationsDir, filename);
            const notification = JSON.parse(await readFile(filePath, 'utf-8'));
            
            // Check if notification is for this admin or is a general notification
            if (!notification.adminId || notification.adminId === adminId) {
              notifications.push(notification);
            }
          } catch (error) {
            console.error(`Error reading notification file ${filename}:`, error);
          }
        }
      }

      // Sort by creation date (newest first) and limit results
      return notifications
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting notifications for admin:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, adminId: string): Promise<boolean> {
    try {
      const notificationPath = path.join(this.notificationsDir, `${notificationId}.json`);
      
      if (!existsSync(notificationPath)) {
        return false;
      }

      const notification = JSON.parse(await readFile(notificationPath, 'utf-8'));
      notification.readAt = new Date().toISOString();
      
      await writeFile(notificationPath, JSON.stringify(notification, null, 2));
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Acknowledge notification
   */
  async acknowledgeNotification(notificationId: string, adminId: string): Promise<boolean> {
    try {
      const notificationPath = path.join(this.notificationsDir, `${notificationId}.json`);
      
      if (!existsSync(notificationPath)) {
        return false;
      }

      const notification = JSON.parse(await readFile(notificationPath, 'utf-8'));
      notification.acknowledgedAt = new Date().toISOString();
      notification.adminId = adminId;
      
      await writeFile(notificationPath, JSON.stringify(notification, null, 2));
      return true;
    } catch (error) {
      console.error('Error acknowledging notification:', error);
      return false;
    }
  }

  /**
   * Get notification preferences for an admin
   */
  async getNotificationPreferences(adminId: string): Promise<NotificationPreferences | null> {
    try {
      const preferencePath = path.join(this.preferencesDir, `${adminId}.json`);
      
      if (!existsSync(preferencePath)) {
        return null;
      }

      return JSON.parse(await readFile(preferencePath, 'utf-8'));
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return null;
    }
  }

  /**
   * Update notification preferences for an admin
   */
  async updateNotificationPreferences(adminId: string, preferences: Partial<NotificationPreferences>): Promise<boolean> {
    try {
      const preferencePath = path.join(this.preferencesDir, `${adminId}.json`);
      
      let currentPreferences: NotificationPreferences;
      
      if (existsSync(preferencePath)) {
        currentPreferences = JSON.parse(await readFile(preferencePath, 'utf-8'));
      } else {
        // Create default preferences
        currentPreferences = {
          adminId,
          emailNotifications: true,
          inAppNotifications: true,
          notificationTypes: {
            critical_duplicate: true,
            high_risk_duplicate: true,
            manual_review_required: true,
            auto_resolution_applied: false,
            duplicate_resolved: false
          },
          frequency: 'immediate'
        };
      }

      // Update preferences
      const updatedPreferences = { ...currentPreferences, ...preferences };
      
      await writeFile(preferencePath, JSON.stringify(updatedPreferences, null, 2));
      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  }

  /**
   * Get all notification preferences
   */
  private async getAllNotificationPreferences(): Promise<NotificationPreferences[]> {
    try {
      const preferences: NotificationPreferences[] = [];
      
      if (!existsSync(this.preferencesDir)) {
        return preferences;
      }

      const fs = await import('fs');
      const files = fs.readdirSync(this.preferencesDir);
      
      for (const filename of files) {
        if (filename.endsWith('.json')) {
          try {
            const filePath = path.join(this.preferencesDir, filename);
            const preference = JSON.parse(await readFile(filePath, 'utf-8'));
            preferences.push(preference);
          } catch (error) {
            console.error(`Error reading preference file ${filename}:`, error);
          }
        }
      }

      return preferences;
    } catch (error) {
      console.error('Error getting all notification preferences:', error);
      return [];
    }
  }

  /**
   * Create notification for duplicate detection
   */
  async notifyDuplicateDetected(applicationId: string, duplicateResult: any, adminId?: string): Promise<void> {
    const priority = duplicateResult.overallRiskLevel === 'critical' ? 'urgent' : 
                    duplicateResult.overallRiskLevel === 'high' ? 'high' : 'medium';

    const notificationType = duplicateResult.overallRiskLevel === 'critical' ? 'critical_duplicate' :
                            duplicateResult.overallRiskLevel === 'high' ? 'high_risk_duplicate' :
                            'manual_review_required';

    await this.createNotification({
      type: notificationType,
      priority,
      title: `Duplicate Detected - ${duplicateResult.overallRiskLevel.toUpperCase()} Risk`,
      message: `Application ${applicationId} has ${duplicateResult.matches.length} potential duplicate(s) requiring attention.`,
      applicationId,
      adminId,
      metadata: {
        matchTypes: duplicateResult.matches.map((m: any) => m.matchType),
        riskLevel: duplicateResult.overallRiskLevel,
        confidence: 'high',
        duplicateCount: duplicateResult.matches.length
      }
    });
  }

  /**
   * Create notification for auto-resolution
   */
  async notifyAutoResolution(applicationId: string, resolutionResult: any): Promise<void> {
    await this.createNotification({
      type: 'auto_resolution_applied',
      priority: 'medium',
      title: 'Auto-Resolution Applied',
      message: `Application ${applicationId} was automatically processed: ${resolutionResult.message}`,
      applicationId,
      metadata: {
        matchTypes: [],
        riskLevel: 'low',
        confidence: 'high',
        duplicateCount: 0,
        autoResolutionApplied: true,
        resolutionAction: resolutionResult.finalAction
      }
    });
  }

  /**
   * Create notification for duplicate resolution
   */
  async notifyDuplicateResolved(applicationId: string, resolution: string, adminId: string, adminName: string): Promise<void> {
    await this.createNotification({
      type: 'duplicate_resolved',
      priority: 'low',
      title: 'Duplicate Resolved',
      message: `Application ${applicationId} duplicate issue resolved by ${adminName}: ${resolution}`,
      applicationId,
      adminId,
      adminName,
      metadata: {
        matchTypes: [],
        riskLevel: 'low',
        confidence: 'high',
        duplicateCount: 0,
        resolutionAction: resolution
      }
    });
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      let cleanedCount = 0;
      
      if (!existsSync(this.notificationsDir)) {
        return cleanedCount;
      }

      const fs = await import('fs');
      const files = fs.readdirSync(this.notificationsDir);
      
      for (const filename of files) {
        if (filename.endsWith('.json')) {
          try {
            const filePath = path.join(this.notificationsDir, filename);
            const notification = JSON.parse(await readFile(filePath, 'utf-8'));
            
            // Check if notification has expired
            if (notification.expiresAt && new Date(notification.expiresAt) < new Date()) {
              await fs.promises.unlink(filePath);
              cleanedCount++;
            }
          } catch (error) {
            console.error(`Error processing notification file ${filename}:`, error);
          }
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
      return 0;
    }
  }
}

