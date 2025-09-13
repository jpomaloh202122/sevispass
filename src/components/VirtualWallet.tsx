'use client';

import React, { useState, useRef } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { DigitalCard } from '@/types/wallet';
import EnhancedWalletCard from './EnhancedWalletCard';

interface VirtualWalletProps {
  className?: string;
}

const CardTypeIcon = ({ type }: { type: DigitalCard['type'] }) => {
  const iconClass = "w-6 h-6";
  
  switch (type) {
    case 'sevispass':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
        </svg>
      );
    case 'government':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    case 'medical':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      );
    case 'education':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
      );
    case 'city_pass':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
        </svg>
      );
    case 'public_servant_id':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    default:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      );
  }
};


export default function VirtualWallet({ className = '' }: VirtualWalletProps) {
  const { wallet, setActiveCard, removeCard, exportCard } = useWallet();
  const [showOptions, setShowOptions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const carouselRef = useRef<HTMLDivElement>(null);

  const filteredCards = wallet.cards.filter(card =>
    card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.holderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.cardNumber.includes(searchQuery)
  );

  const activeCard = wallet.cards.find(card => card.id === wallet.activeCardId);

  const handleCardClick = (cardId: string) => {
    setActiveCard(cardId);
    setShowOptions(false);
  };

  const handleExport = async (format: 'json' | 'qr' | 'pdf' | 'png') => {
    if (!activeCard) return;
    
    try {
      const exportedData = await exportCard(activeCard.id, format);
      
      if (typeof exportedData === 'string') {
        // For string data (JSON, QR)
        const blob = new Blob([exportedData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeCard.name}_${format}.${format === 'json' ? 'json' : 'txt'}`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // For blob data (PDF)
        const url = URL.createObjectURL(exportedData);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeCard.name}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      }
      
      setShowOptions(false);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleRemove = async () => {
    if (!activeCard) return;
    
    const confirmed = confirm(`Are you sure you want to remove "${activeCard.name}" from your wallet?`);
    if (confirmed) {
      await removeCard(activeCard.id);
      setShowOptions(false);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Wallet Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Virtual Wallet</h1>
          <p className="text-white">
            {wallet.cards.length} {wallet.cards.length === 1 ? 'card' : 'cards'} in your wallet
          </p>
        </div>
        
        {/* Search */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 bg-black/70 backdrop-blur-sm border border-yellow-400/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 text-white placeholder-gray-400 w-64"
            />
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-yellow-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredCards.length === 0 && wallet.cards.length === 0 && (
        <div className="text-center py-20">
          <div className="w-24 h-24 mx-auto mb-6 bg-red-600/10 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-yellow-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Your wallet is empty</h3>
          <p className="text-white mb-6">Add your first digital identity card to get started</p>
          <button className="bg-gradient-to-r from-red-600 to-yellow-400 text-black px-6 py-3 rounded-xl font-medium hover:scale-105 transition-transform">
            Add First Card
          </button>
        </div>
      )}

      {/* Cards Carousel */}
      {filteredCards.length > 0 && (
        <div className="mb-8">
          <div 
            ref={carouselRef}
            className="flex space-x-6 overflow-x-auto pb-4 px-2"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {filteredCards.map((card, index) => (
              <div key={`${card.id}-${index}`}>
                <EnhancedWalletCard
                  card={card}
                  isActive={card.id === wallet.activeCardId}
                  onClick={() => handleCardClick(card.id)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Card Actions */}
      {activeCard && (
        <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border border-yellow-400/20">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-1">{activeCard.name}</h3>
              <p className="text-white">Click the buttons below to manage this card</p>
            </div>
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="p-3 bg-red-600/10 hover:bg-red-600/20 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => handleExport('qr')}
              className="flex flex-col items-center p-4 bg-red-950/40 hover:bg-red-950/60 rounded-xl transition-colors border border-yellow-400/20 hover:border-yellow-400/40"
            >
              <svg className="w-6 h-6 text-yellow-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span className="text-sm font-medium text-white">QR Code</span>
            </button>

            <button
              onClick={() => handleExport('pdf')}
              className="flex flex-col items-center p-4 bg-red-950/40 hover:bg-red-950/60 rounded-xl transition-colors border border-yellow-400/20 hover:border-yellow-400/40"
            >
              <svg className="w-6 h-6 text-yellow-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-medium text-white">PDF</span>
            </button>

            <button
              onClick={() => handleExport('json')}
              className="flex flex-col items-center p-4 bg-red-950/40 hover:bg-red-950/60 rounded-xl transition-colors border border-yellow-400/20 hover:border-yellow-400/40"
            >
              <svg className="w-6 h-6 text-yellow-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium text-white">Backup</span>
            </button>

            <button
              onClick={handleRemove}
              className="flex flex-col items-center p-4 bg-red-800/40 hover:bg-red-800/60 rounded-xl transition-colors border border-red-500/30 hover:border-red-500/50"
            >
              <svg className="w-6 h-6 text-red-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="text-sm font-medium text-white">Remove</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}