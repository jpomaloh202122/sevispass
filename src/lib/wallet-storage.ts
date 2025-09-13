import { DigitalCard, WalletState } from '@/types/wallet';

const WALLET_STORAGE_PREFIX = 'sevispass-wallet';
const WALLET_VERSION = '1.0';

// Simple encryption for demo purposes (in production, use proper encryption)
const encrypt = (data: string, key: string = 'sevispass-key'): string => {
  return btoa(data); // Base64 encoding for demo
};

const decrypt = (encryptedData: string, key: string = 'sevispass-key'): string => {
  try {
    return atob(encryptedData); // Base64 decoding for demo
  } catch {
    throw new Error('Invalid encrypted data');
  }
};

export class WalletStorage {
  private static instance: WalletStorage;
  private isSupported: boolean;
  private userId: string | null = null;

  constructor() {
    this.isSupported = typeof Storage !== 'undefined';
  }

  static getInstance(): WalletStorage {
    if (!WalletStorage.instance) {
      WalletStorage.instance = new WalletStorage();
    }
    return WalletStorage.instance;
  }

  // Set user ID for user-specific storage
  setUserId(userId: string | null) {
    this.userId = userId;
  }

  // Get storage key for current user
  private getStorageKey(): string {
    return this.userId ? `${WALLET_STORAGE_PREFIX}-${this.userId}` : WALLET_STORAGE_PREFIX;
  }

  // Check if storage is available
  isStorageAvailable(): boolean {
    return this.isSupported;
  }

  // Save wallet state
  async saveWallet(wallet: WalletState): Promise<boolean> {
    if (!this.isSupported) return false;

    try {
      const walletData = {
        version: WALLET_VERSION,
        timestamp: new Date().toISOString(),
        userId: this.userId,
        data: wallet
      };

      const serialized = JSON.stringify(walletData);
      const encrypted = encrypt(serialized);
      
      localStorage.setItem(this.getStorageKey(), encrypted);
      return true;
    } catch (error) {
      // Wallet save error - implement proper error handling
      return false;
    }
  }

  // Load wallet state
  async loadWallet(): Promise<WalletState | null> {
    if (!this.isSupported) return null;

    try {
      const encrypted = localStorage.getItem(this.getStorageKey());
      if (!encrypted) return null;

      const decrypted = decrypt(encrypted);
      const walletData = JSON.parse(decrypted);

      // Version check
      if (walletData.version !== WALLET_VERSION) {
        console.warn('Wallet version mismatch, migration needed');
      }

      // User check for security
      if (this.userId && walletData.userId && walletData.userId !== this.userId) {
        console.warn('Wallet user mismatch, returning null');
        return null;
      }

      return walletData.data as WalletState;
    } catch (error) {
      // Wallet load error - implement proper error handling
      return null;
    }
  }

  // Clear wallet data
  async clearWallet(): Promise<boolean> {
    if (!this.isSupported) return false;

    try {
      localStorage.removeItem(this.getStorageKey());
      return true;
    } catch (error) {
      // Wallet clear error - implement proper error handling
      return false;
    }
  }

  // Export wallet data
  async exportWallet(): Promise<string | null> {
    const wallet = await this.loadWallet();
    if (!wallet) return null;

    return JSON.stringify({
      version: WALLET_VERSION,
      exportDate: new Date().toISOString(),
      wallet
    }, null, 2);
  }

  // Import wallet data
  async importWallet(walletJson: string): Promise<boolean> {
    try {
      const importData = JSON.parse(walletJson);
      
      if (!importData.wallet) {
        throw new Error('Invalid wallet format');
      }

      return await this.saveWallet(importData.wallet);
    } catch (error) {
      // Wallet import error - implement proper error handling
      return false;
    }
  }

  // Get storage size
  getStorageSize(): number {
    if (!this.isSupported) return 0;
    
    const data = localStorage.getItem(this.getStorageKey());
    return data ? data.length : 0;
  }

  // Check storage quota (approximate)
  async getStorageQuota(): Promise<{ used: number; available: number } | null> {
    if (!navigator.storage || !navigator.storage.estimate) {
      return null;
    }

    try {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        available: estimate.quota || 0
      };
    } catch {
      return null;
    }
  }
}

// Utility functions for card operations
export const generateCardId = (): string => {
  return `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const validateCard = (card: Partial<DigitalCard>): string[] => {
  const errors: string[] = [];
  
  if (!card.name?.trim()) errors.push('Card name is required');
  if (!card.holderName?.trim()) errors.push('Holder name is required');
  if (!card.cardNumber?.trim()) errors.push('Card number is required');
  if (!card.issuer?.trim()) errors.push('Issuer is required');
  if (!card.type) errors.push('Card type is required');

  return errors;
};

export const createDefaultWallet = (): WalletState => {
  return {
    cards: [],
    activeCardId: null,
    isLocked: false,
    lastAccessed: new Date().toISOString()
  };
};