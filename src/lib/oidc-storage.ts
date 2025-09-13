// Simple in-memory storage for OIDC authorization codes
// In production, use Redis or database storage

interface AuthorizationCodeData {
  code: string;
  userId: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  state?: string;
  expiresAt: Date;
}

interface SessionData {
  sessionToken: string;
  userId: string;
  expiresAt: Date;
}

class OIDCStorage {
  private authCodes = new Map<string, AuthorizationCodeData>();
  private sessions = new Map<string, SessionData>();

  // Authorization Code Management
  storeAuthorizationCode(data: AuthorizationCodeData): void {
    this.authCodes.set(data.code, data);
    
    // Auto-cleanup expired codes after 10 minutes
    setTimeout(() => {
      this.authCodes.delete(data.code);
    }, 10 * 60 * 1000);
  }

  getAuthorizationCode(code: string): AuthorizationCodeData | undefined {
    const data = this.authCodes.get(code);
    if (!data) return undefined;
    
    // Check if expired
    if (new Date() > data.expiresAt) {
      this.authCodes.delete(code);
      return undefined;
    }
    
    return data;
  }

  consumeAuthorizationCode(code: string): AuthorizationCodeData | undefined {
    const data = this.getAuthorizationCode(code);
    if (data) {
      this.authCodes.delete(code); // One-time use
    }
    return data;
  }

  // Session Management
  storeSession(data: SessionData): void {
    this.sessions.set(data.sessionToken, data);
    
    // Auto-cleanup expired sessions
    setTimeout(() => {
      this.sessions.delete(data.sessionToken);
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  getSession(sessionToken: string): SessionData | undefined {
    const data = this.sessions.get(sessionToken);
    if (!data) return undefined;
    
    // Check if expired
    if (new Date() > data.expiresAt) {
      this.sessions.delete(sessionToken);
      return undefined;
    }
    
    return data;
  }

  getUserFromSession(sessionToken: string): string | undefined {
    const session = this.getSession(sessionToken);
    return session?.userId;
  }

  // Cleanup expired items
  cleanup(): void {
    const now = new Date();
    
    // Cleanup expired auth codes
    for (const [code, data] of this.authCodes.entries()) {
      if (now > data.expiresAt) {
        this.authCodes.delete(code);
      }
    }
    
    // Cleanup expired sessions
    for (const [token, data] of this.sessions.entries()) {
      if (now > data.expiresAt) {
        this.sessions.delete(token);
      }
    }
  }
}

export const oidcStorage = new OIDCStorage();

// Cleanup expired items every 5 minutes
setInterval(() => {
  oidcStorage.cleanup();
}, 5 * 60 * 1000);