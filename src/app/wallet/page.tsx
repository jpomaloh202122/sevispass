'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ProtectedRoute from '@/components/ProtectedRoute';
import VirtualWallet from '@/components/VirtualWallet';
import AddCardModal from '@/components/AddCardModal';
import { WalletProvider, useWallet } from '@/contexts/WalletContext';
import { useAuth } from '@/contexts/AuthContext';

function WalletContent() {
  const [showAddCard, setShowAddCard] = useState(false);
  const [importMode, setImportMode] = useState<'manual' | 'import'>('manual');
  const { wallet, addCard } = useWallet();
  const { user } = useAuth();

  // Auto-add SEVIS Pass if user is logged in and wallet is empty
  useEffect(() => {
    const autoAddSevisPass = async () => {
      if (user && wallet.cards.length === 0 && !wallet.cards.some(card => card.metadata?.uid === user.uid && card.metadata?.autoAdded)) {
        const sevisPassCard = {
          name: 'SEVIS Pass Digital ID',
          holderName: `${user.firstName} ${user.lastName}`,
          cardNumber: user.nid || `SP${Date.now().toString().slice(-8)}`,
          issuer: 'SEVIS Authority',
          type: 'sevispass' as const,
          issueDate: new Date().toISOString().split('T')[0],
          colors: {
            primary: '#DC2626',
            secondary: '#EAB308',
            background: '#000000',
            text: '#FBBF24'
          },
          isVerified: true,
          metadata: {
            uid: user.uid,
            autoAdded: true,
            addedAt: new Date().toISOString()
          }
        };

        await addCard(sevisPassCard);
      }
    };

    // Only run when user first loads or changes
    if (user?.uid) {
      autoAddSevisPass();
    }
  }, [user?.uid]); // Remove addCard and wallet.cards.length from dependencies


  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 via-black to-yellow-500/10">
      <Header />
      
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Virtual Wallet
              <span className="inline-block ml-3 px-3 py-1 bg-red-600/20 text-yellow-400 text-lg font-medium rounded-full border border-yellow-400/30">
                Beta
              </span>
            </h1>
            <p className="text-white text-lg">
              Securely store and manage your digital identity cards
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setImportMode('import');
                setShowAddCard(true);
              }}
              className="flex items-center px-4 py-3 bg-black border-2 border-yellow-400 text-yellow-400 font-medium rounded-xl hover:bg-red-950/50 transition-all shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Import JSON
            </button>
            
            <button
              onClick={() => {
                setImportMode('manual');
                setShowAddCard(true);
              }}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-red-600 to-yellow-400 text-black font-bold rounded-xl hover:scale-105 transition-all shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Card
            </button>
          </div>
        </div>

        {/* Features Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-black/70 backdrop-blur-sm rounded-2xl p-6 border border-yellow-400/20 hover:border-yellow-400/40 transition-colors">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-600/20 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Secure Storage</h3>
            </div>
            <p className="text-white">
              Your cards are encrypted and stored locally on your device for maximum security.
            </p>
          </div>

          <div className="bg-black/70 backdrop-blur-sm rounded-2xl p-6 border border-yellow-400/20 hover:border-yellow-400/40 transition-colors">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-yellow-400/20 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Import & Export</h3>
            </div>
            <p className="text-white">
              Import credentials from JSON files or export your cards as QR codes and PDFs.
            </p>
          </div>

          <div className="bg-black/70 backdrop-blur-sm rounded-2xl p-6 border border-yellow-400/20 hover:border-yellow-400/40 transition-colors">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-600/30 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Quick Access</h3>
            </div>
            <p className="text-white">
              Access all your digital identity cards from one convenient location.
            </p>
          </div>
        </div>

        {/* Wallet Component */}
        <VirtualWallet />

        {/* Usage Statistics */}
        {wallet.cards.length > 0 && (
          <div className="mt-12 bg-black/60 backdrop-blur-sm rounded-2xl p-6 border border-yellow-400/20">
            <h3 className="text-lg font-semibold text-white mb-4">Wallet Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-red-950/40 rounded-xl border border-yellow-400/10">
                <p className="text-2xl font-bold text-yellow-400">{wallet.cards.length}</p>
                <p className="text-sm text-white">Total Cards</p>
              </div>
              <div className="text-center p-4 bg-red-950/40 rounded-xl border border-yellow-400/10">
                <p className="text-2xl font-bold text-red-400">
                  {wallet.cards.filter(card => card.isVerified).length}
                </p>
                <p className="text-sm text-white">Verified</p>
              </div>
              <div className="text-center p-4 bg-red-950/40 rounded-xl border border-yellow-400/10">
                <p className="text-2xl font-bold text-yellow-400">
                  {wallet.cards.filter(card => card.type === 'sevispass').length}
                </p>
                <p className="text-sm text-white">SEVIS Pass</p>
              </div>
              <div className="text-center p-4 bg-red-950/40 rounded-xl border border-yellow-400/10">
                <p className="text-2xl font-bold text-blue-400">
                  {wallet.cards.filter(card => card.type === 'public_servant_id').length}
                </p>
                <p className="text-sm text-white">Public Servant ID</p>
              </div>
              <div className="text-center p-4 bg-red-950/40 rounded-xl border border-yellow-400/10">
                <p className="text-2xl font-bold text-red-400">
                  {new Date(wallet.lastAccessed).toLocaleDateString()}
                </p>
                <p className="text-sm text-white">Last Access</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <AddCardModal 
        isOpen={showAddCard} 
        onClose={() => setShowAddCard(false)}
        initialMode={importMode}
      />
    </div>
  );
}

export default function WalletPage() {
  return (
    <ProtectedRoute>
      <WalletProviderWithUser />
    </ProtectedRoute>
  );
}

function WalletProviderWithUser() {
  const { user } = useAuth();
  
  return (
    <WalletProvider userId={user?.uid || null}>
      <WalletContent />
    </WalletProvider>
  );
}