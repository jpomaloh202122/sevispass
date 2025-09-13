'use client';

import React from 'react';
import { DigitalCard, CityPassCard } from '@/types/wallet';

interface EnhancedWalletCardProps {
  card: DigitalCard;
  isActive: boolean;
  onClick: () => void;
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


// Default wallet card component (for all card types)
const DefaultWalletCard = ({ card, isActive, onClick }: { 
  card: DigitalCard; 
  isActive: boolean; 
  onClick: () => void;
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        w-80 h-48 cursor-pointer transition-all duration-300 transform
        ${isActive ? 'scale-105' : 'hover:scale-102'}
        ${isActive ? 'shadow-2xl' : 'shadow-lg hover:shadow-xl'}
      `}
    >
      <div
        className={`w-full h-full rounded-xl text-white relative overflow-hidden ${
          card.type === 'public_servant_id' ? 'p-4' : 'p-6'
        }`}
        style={{
          background: card.type === 'sevispass' 
            ? 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)'
            : card.type === 'government' 
            ? 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)'
            : card.type === 'city_pass'
            ? 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)'
            : card.type === 'public_servant_id'
            ? 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)'
            : 'linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)'
        }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 w-20 h-20 border-2 border-white/30 rounded-full"></div>
          <div className="absolute bottom-4 left-4 w-16 h-16 border border-white/20 rounded-lg rotate-45"></div>
        </div>

        {/* Card Content */}
        <div className="relative z-10 h-full flex flex-col justify-between">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <CardTypeIcon type={card.type} />
              </div>
              <div>
                <h3 className={`font-bold leading-tight ${
                  card.type === 'public_servant_id' ? 'text-sm' : 'text-lg'
                }`}>{card.name}</h3>
                <p className="text-white/80 text-xs uppercase tracking-wider">
                  {card.type === 'public_servant_id' ? 'PUBLIC SERVANT ID' : card.type}
                </p>
              </div>
            </div>
            {card.isVerified && (
              <div className="flex items-center space-x-1 bg-green-500/20 px-2 py-1 rounded-full">
                <svg className="w-3 h-3 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs text-green-300">Verified</span>
              </div>
            )}
          </div>

          {/* Card Number */}
          <div className="my-4">
            <p className="text-white/60 text-xs mb-1">
              {card.type === 'public_servant_id' ? 'Employee ID' : 'Card Number'}
            </p>
            <p className={`font-mono tracking-wider ${
              card.type === 'public_servant_id' ? 'text-sm' : 'text-lg'
            }`}>
              {card.cardNumber?.replace(/(.{4})/g, '$1 ').trim() || 'N/A'}
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-end">
            <div>
              <p className="text-white/60 text-xs mb-1">Holder</p>
              <p className={`font-semibold ${
                card.type === 'public_servant_id' ? 'text-xs leading-tight' : 'text-sm'
              }`}>{card.holderName}</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs mb-1">Issuer</p>
              <p className={`font-semibold ${
                card.type === 'public_servant_id' ? 'text-xs leading-tight' : 'text-sm'
              }`}>{card.issuer}</p>
            </div>
          </div>
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
      </div>
    </div>
  );
};

export default function EnhancedWalletCard({ card, isActive, onClick, className = '' }: EnhancedWalletCardProps) {
  // Use default card for all types
  return <DefaultWalletCard card={card} isActive={isActive} onClick={onClick} />;
}