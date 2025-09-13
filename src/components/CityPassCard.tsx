'use client';

import React from 'react';
import { CityPassCard } from '@/types/wallet';

interface CityPassCardProps {
  card: CityPassCard;
  onClick?: () => void;
  className?: string;
}

const CityPassCard: React.FC<CityPassCardProps> = ({ card, onClick, className = '' }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleDateString('en', { month: 'short' });
    const year = date.getFullYear();
    return `${day} - ${month} - ${year}`;
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      student: '🎓',
      employee: '💼',
      business_owner: '🏢',
      property_owner: '🏠',
      visitor: '✈️'
    };
    return icons[category] || '🎫';
  };

  const isExpiringSoon = () => {
    if (!card.expiryDate) return false;
    const expiry = new Date(card.expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isExpired = () => {
    if (!card.expiryDate) return false;
    return new Date(card.expiryDate) < new Date();
  };

  return (
    <div
      className={`relative overflow-hidden cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl ${className}`}
      style={{
        width: '400px',
        height: '320px',
        background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
        borderRadius: '16px',
        boxShadow: '0 10px 25px rgba(139, 92, 246, 0.3)'
      }}
      onClick={onClick}
    >
      {/* Header Section */}
      <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-r from-purple-900 to-purple-800 flex items-center justify-center">
        <p className="text-white text-xs font-bold tracking-wider">
          INDEPENDENT STATE OF PAPUA NEW GUINEA
        </p>
      </div>

      {/* Card Content */}
      <div className="relative z-10 h-full flex flex-col p-6 pt-12">
        
        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-white text-2xl font-bold">CITY PASS</h2>
          <p className="text-white/80 text-sm">PORT MORESBY</p>
        </div>

        {/* REQUIRED INFORMATION - YOUR 5 REQUIREMENTS */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 space-y-4">
          
          {/* 1. Name of Applicant */}
          <div>
            <p className="text-white/70 text-sm font-medium">Name of Applicant</p>
            <p className="text-white text-lg font-bold">
              {card.holderName || 'N/A'}
            </p>
          </div>

          {/* 2. City Pass ID Number */}
          <div>
            <p className="text-white/70 text-sm font-medium">City Pass ID Number</p>
            <p className="text-white text-lg font-mono font-bold tracking-wider">
              {card.cardNumber?.replace(/(.{4})/g, '$1 ').trim() || 'N/A'}
            </p>
          </div>

          {/* 3 & 4. Issue Date and Expiry Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-white/70 text-sm font-medium">Issue Date</p>
              <p className="text-white text-base font-bold">
                {card.issueDate ? formatDate(card.issueDate) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-white/70 text-sm font-medium">Expiry Date</p>
              <p className={`text-base font-bold ${
                isExpired() ? 'text-red-300' : isExpiringSoon() ? 'text-orange-300' : 'text-white'
              }`}>
                {card.expiryDate ? formatDate(card.expiryDate) : 'N/A'}
              </p>
            </div>
          </div>

          {/* 5. Issuer */}
          <div>
            <p className="text-white/70 text-sm font-medium">Issuer</p>
            <p className="text-white text-base font-bold">
              {card.issuer || 'National Capital Development Commission (NCDC)'}
            </p>
          </div>

        </div>

        {/* Status Indicators */}
        <div className="mt-4 flex justify-center space-x-2">
          {card.isVerified && (
            <div className="flex items-center space-x-1 bg-green-500/20 px-3 py-1 rounded-full">
              <svg className="w-4 h-4 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-green-300 font-medium">Verified</span>
            </div>
          )}
          {isExpired() && (
            <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              Expired
            </div>
          )}
          {isExpiringSoon() && !isExpired() && (
            <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              Expiring Soon
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CityPassCard;