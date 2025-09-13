'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { DigitalCard, WalletState, WalletContextType, CityPassCard } from '@/types/wallet';
import { WalletStorage, generateCardId, validateCard, createDefaultWallet } from '@/lib/wallet-storage';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import domtoimage from 'dom-to-image';


// Wallet reducer
type WalletAction =
  | { type: 'LOAD_WALLET'; payload: WalletState }
  | { type: 'ADD_CARD'; payload: DigitalCard }
  | { type: 'REMOVE_CARD'; payload: string }
  | { type: 'UPDATE_CARD'; payload: { id: string; updates: Partial<DigitalCard> } }
  | { type: 'SET_ACTIVE_CARD'; payload: string | null }
  | { type: 'LOCK_WALLET' }
  | { type: 'UNLOCK_WALLET' }
  | { type: 'CLEAR_WALLET' }
  | { type: 'LOAD_CITY_PASSES'; payload: CityPassCard[] }
  | { type: 'LOAD_PUBLIC_SERVANT_CARDS'; payload: any[] };

const walletReducer = (state: WalletState, action: WalletAction): WalletState => {
  switch (action.type) {
    case 'LOAD_WALLET':
      return { ...action.payload, lastAccessed: new Date().toISOString() };
    
    case 'ADD_CARD':
      return {
        ...state,
        cards: [...state.cards, action.payload],
        activeCardId: action.payload.id,
        lastAccessed: new Date().toISOString()
      };
    
    case 'REMOVE_CARD':
      const filteredCards = state.cards.filter(card => card.id !== action.payload);
      return {
        ...state,
        cards: filteredCards,
        activeCardId: state.activeCardId === action.payload ? 
          (filteredCards.length > 0 ? filteredCards[0].id : null) : state.activeCardId,
        lastAccessed: new Date().toISOString()
      };
    
    case 'UPDATE_CARD':
      return {
        ...state,
        cards: state.cards.map(card =>
          card.id === action.payload.id
            ? { ...card, ...action.payload.updates, updatedAt: new Date().toISOString() }
            : card
        ),
        lastAccessed: new Date().toISOString()
      };
    
    case 'SET_ACTIVE_CARD':
      return {
        ...state,
        activeCardId: action.payload,
        lastAccessed: new Date().toISOString()
      };
    
    case 'LOCK_WALLET':
      return { ...state, isLocked: true };
    
    case 'UNLOCK_WALLET':
      return { ...state, isLocked: false, lastAccessed: new Date().toISOString() };
    
    case 'CLEAR_WALLET':
      return createDefaultWallet();
    
    case 'LOAD_CITY_PASSES':
      const existingCityPassIds = state.cards
        .filter(card => card.type === 'city_pass')
        .map(card => card.id);
      
      const newCityPasses = action.payload.filter(pass => 
        !existingCityPassIds.includes(pass.id)
      );

      return {
        ...state,
        cards: [
          ...state.cards.filter(card => card.type !== 'city_pass'),
          ...action.payload
        ],
        lastAccessed: new Date().toISOString()
      };
    
    case 'LOAD_PUBLIC_SERVANT_CARDS':
      const existingPublicServantIds = state.cards
        .filter(card => card.type === 'public_servant_id')
        .map(card => card.id);
      
      const newPublicServantCards = action.payload.filter(card => 
        !existingPublicServantIds.includes(card.id)
      );

      return {
        ...state,
        cards: [
          ...state.cards.filter(card => card.type !== 'public_servant_id'),
          ...action.payload
        ],
        lastAccessed: new Date().toISOString()
      };
    
    default:
      return state;
  }
};

// Create context
const WalletContext = createContext<WalletContextType | null>(null);

// Provider component
export const WalletProvider: React.FC<{ children: React.ReactNode; userId?: string | null }> = ({ children, userId }) => {
  const [wallet, dispatch] = useReducer(walletReducer, createDefaultWallet());
  const storage = WalletStorage.getInstance();
  
  // Set user ID for storage
  useEffect(() => {
    storage.setUserId(userId || null);
  }, [userId, storage]);

  // Load wallet on mount and when user changes
  useEffect(() => {
    const loadWallet = async () => {
      if (userId) {
        const savedWallet = await storage.loadWallet();
        if (savedWallet) {
          // Remove any duplicates from saved wallet
          const uniqueCards = savedWallet.cards.filter((card: DigitalCard, index: number, self: DigitalCard[]) => 
            index === self.findIndex((c: DigitalCard) => c.id === card.id)
          );
          const deduplicatedWallet = { ...savedWallet, cards: uniqueCards };
          dispatch({ type: 'LOAD_WALLET', payload: deduplicatedWallet });
        } else {
          // No saved wallet for this user, start with default
          dispatch({ type: 'LOAD_WALLET', payload: createDefaultWallet() });
        }
        
        // Load approved city passes
        await loadCityPasses();
        
        // Load Public Servant ID cards
        await loadPublicServantCards();
      }
    };
    loadWallet();
  }, [userId, storage]);

  // Load city passes from API
  const loadCityPasses = useCallback(async () => {
    if (!userId) return;
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`/api/wallet/city-pass/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.cityPasses.length > 0) {
          // Deduplicate cards by ID before dispatching
          const uniqueCards = data.cityPasses.filter((card: any, index: number, self: any[]) => 
            index === self.findIndex((c: any) => c.id === card.id)
          );
          dispatch({ type: 'LOAD_CITY_PASSES', payload: uniqueCards });
        }
      }
    } catch (error) {
      // Failed to load city passes
    }
  }, [userId]);

  // Load Public Servant ID cards from API
  const loadPublicServantCards = useCallback(async () => {
    if (!userId) {
      return;
    }
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('No auth token found for public servant cards');
        return;
      }

      console.log('Fetching public servant cards from API...');
      const response = await fetch(`/api/wallet/public-servant-cards/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Public servant cards API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Public servant cards API response:', data);
        
        if (data.success && data.publicServantCards.length > 0) {
          // Deduplicate cards by ID before dispatching
          const uniqueCards = data.publicServantCards.filter((card: any, index: number, self: any[]) => 
            index === self.findIndex((c: any) => c.id === card.id)
          );
          dispatch({ type: 'LOAD_PUBLIC_SERVANT_CARDS', payload: uniqueCards });
        }
      } else {
        console.error('API response not OK:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to load Public Servant ID cards:', error);
      // Failed to load Public Servant ID cards
    }
  }, [userId]);

  // Save wallet whenever it changes (only if user is logged in)
  useEffect(() => {
    const saveWallet = async () => {
      if (userId) {
        await storage.saveWallet(wallet);
      }
    };
    saveWallet();
  }, [wallet, userId, storage]);

  // Add card to wallet
  const addCard = useCallback(async (cardData: Omit<DigitalCard, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    try {
      const errors = validateCard(cardData);
      if (errors.length > 0) {
        // Card validation failed
        return false;
      }

      const newCard: DigitalCard = {
        ...cardData,
        id: generateCardId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Generate QR code if not provided
      if (!newCard.qrCode) {
        const qrData = {
          type: 'SevisPassVC',
          version: '1.0',
          cardId: newCard.id,
          holderName: newCard.holderName,
          cardNumber: newCard.cardNumber,
          issuer: newCard.issuer,
          metadata: newCard.metadata
        };
        newCard.qrCode = await QRCode.toDataURL(JSON.stringify(qrData));
      }

      dispatch({ type: 'ADD_CARD', payload: newCard });
      return true;
    } catch (error) {
      // Failed to add card
      return false;
    }
  }, []);

  // Remove card from wallet
  const removeCard = useCallback(async (cardId: string): Promise<boolean> => {
    try {
      dispatch({ type: 'REMOVE_CARD', payload: cardId });
      return true;
    } catch (error) {
      // Failed to remove card
      return false;
    }
  }, []);

  // Update card
  const updateCard = useCallback(async (cardId: string, updates: Partial<DigitalCard>): Promise<boolean> => {
    try {
      dispatch({ type: 'UPDATE_CARD', payload: { id: cardId, updates } });
      return true;
    } catch (error) {
      // Failed to update card
      return false;
    }
  }, []);

  // Set active card
  const setActiveCard = useCallback((cardId: string | null) => {
    dispatch({ type: 'SET_ACTIVE_CARD', payload: cardId });
  }, []);

  // Export card in various formats
  const exportCard = useCallback(async (cardId: string, format: 'json' | 'qr' | 'pdf' | 'png'): Promise<string | Blob> => {
    const card = wallet.cards.find(c => c.id === cardId);
    if (!card) throw new Error('Card not found');

    switch (format) {
      case 'json':
        return JSON.stringify(card, null, 2);
      
      case 'qr':
        if (card.qrCode) {
          return card.qrCode;
        }
        const qrData = {
          type: 'SevisPassVC',
          cardId: card.id,
          holderName: card.holderName,
          cardNumber: card.cardNumber
        };
        return await QRCode.toDataURL(JSON.stringify(qrData));
      
      case 'pdf':
        const pdf = new jsPDF();
        pdf.setFontSize(16);
        pdf.text(`${card.name}`, 20, 30);
        pdf.setFontSize(12);
        pdf.text(`Holder: ${card.holderName}`, 20, 50);
        pdf.text(`Card Number: ${card.cardNumber}`, 20, 70);
        pdf.text(`Issuer: ${card.issuer}`, 20, 90);
        
        if (card.qrCode) {
          pdf.addImage(card.qrCode, 'PNG', 20, 100, 50, 50);
        }
        
        return pdf.output('blob');
      
      case 'png':
        // This would require rendering the card component to canvas
        // For now, return the QR code
        return card.qrCode || '';
      
      default:
        throw new Error('Unsupported export format');
    }
  }, [wallet.cards]);

  // Import card from data
  const importCard = useCallback(async (data: string | File): Promise<boolean> => {
    try {
      let cardData: any;
      
      if (typeof data === 'string') {
        cardData = JSON.parse(data);
      } else {
        // Handle file import
        const text = await data.text();
        cardData = JSON.parse(text);
      }

      // Validate and add the card
      return await addCard(cardData);
    } catch (error) {
      console.error('Failed to import card:', error);
      return false;
    }
  }, [addCard]);

  // Lock wallet
  const lockWallet = useCallback(() => {
    dispatch({ type: 'LOCK_WALLET' });
  }, []);

  // Unlock wallet
  const unlockWallet = useCallback((pin?: string): boolean => {
    // Simple unlock for demo (in production, implement proper authentication)
    dispatch({ type: 'UNLOCK_WALLET' });
    return true;
  }, []);

  // Search cards
  const searchCards = useCallback((query: string): DigitalCard[] => {
    if (!query.trim()) return wallet.cards;
    
    const lowerQuery = query.toLowerCase();
    return wallet.cards.filter(card =>
      card.name.toLowerCase().includes(lowerQuery) ||
      card.holderName.toLowerCase().includes(lowerQuery) ||
      card.cardNumber.toLowerCase().includes(lowerQuery) ||
      card.issuer.toLowerCase().includes(lowerQuery)
    );
  }, [wallet.cards]);

  // Get cards by type
  const getCardsByType = useCallback((type: DigitalCard['type']): DigitalCard[] => {
    return wallet.cards.filter(card => card.type === type);
  }, [wallet.cards]);

  const contextValue: WalletContextType = {
    wallet,
    addCard,
    removeCard,
    updateCard,
    setActiveCard,
    exportCard,
    importCard,
    lockWallet,
    unlockWallet,
    searchCards,
    getCardsByType,
    loadCityPasses,
    loadPublicServantCards
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

// Hook to use wallet context
export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};