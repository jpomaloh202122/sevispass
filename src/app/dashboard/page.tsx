'use client';

import Header from '@/components/Header';
import IdentityCard from '@/components/IdentityCard';
import ServiceCard from '@/components/ServiceCard';
import ProtectedRoute from '@/components/ProtectedRoute';
import BiometricDashboard from '@/components/BiometricDashboard';
import WalletQRScanner from '@/components/WalletQRScanner';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const { user, updateUser } = useAuth();
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);

  // Load user profile data including face photo
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user?.uid && !user.facePhoto) {
        try {
          const response = await fetch(`/api/auth/profile?uid=${user.uid}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
              updateUser(data.user);
            }
          }
        } catch (error) {
          console.error('Failed to load user profile:', error);
        }
      }
    };

    loadUserProfile();
  }, [user?.uid, user?.facePhoto, updateUser]);

  const handleQRScan = (data: string) => {
    try {
      const qrData = JSON.parse(data);
      
      // Process SevisWallet-compatible QR code
      if (qrData.type === 'SevisPassVC' && qrData.metadata) {
        const { name: scannedName, nric: scannedNric, id } = qrData.metadata;
        
        // Show success message and offer to add to SevisWallet
        const addToWallet = confirm(
          `Successfully scanned SevisPass for ${scannedName}.\n\n` +
          `Would you like to add this credential to your SevisWallet?`
        );
        
        if (addToWallet) {
          // Open SevisWallet app with deep link
          if (qrData.deepLink) {
            window.location.href = qrData.deepLink;
            
            // Fallback message
            setTimeout(() => {
              alert(
                'If SevisWallet didn\'t open automatically, please:\n' +
                '1. Install the SevisWallet app from your app store\n' +
                '2. Try scanning the QR code again'
              );
            }, 2000);
          }
        }
        
        setShowQRScanner(false);
      } else if (qrData.metadata?.platform === 'SevisPass') {
        // Handle legacy format
        alert(`Scanned SevisPass for ${qrData.metadata.name}, but this QR code uses an older format. Please use a current SevisPass identity card.`);
        setShowQRScanner(false);
      } else {
        alert('Invalid QR code. Please scan a valid SevisPass identity card.');
        setShowQRScanner(false);
      }
    } catch {
      alert('Could not read QR code data. Please try scanning again.');
      setShowQRScanner(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-sevis-light to-sevis-primary/5">
        <Header />
        
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome back, {user?.firstName} {user?.lastName}
            </h1>
            <p className="text-gray-600">Manage your digital identity and access government services</p>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <IdentityCard
              name={`${user?.firstName} ${user?.lastName}`}
              nric={user?.nid || ''}
              profileImage={user?.facePhoto}
              uid={user?.uid}
              isVerified={true}
            />
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-sevis-primary hover:bg-sevis-primary/10 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-sevis-primary/20 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-sevis-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-sm font-medium block">Download Digital ID</span>
                    <span className="text-xs text-gray-500">PNG or PDF with QR code</span>
                  </div>
                </div>
              </button>
              
              <button 
                onClick={() => setShowQRScanner(true)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-sevis-primary hover:bg-sevis-primary/10 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-sevis-primary/20 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-sevis-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-sm font-medium block">Scan QR Code</span>
                    <span className="text-xs text-gray-500">Add pass to wallet by scanning</span>
                  </div>
                </div>
              </button>
              
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-sevis-primary hover:bg-sevis-primary/10 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-sevis-primary/20 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-sevis-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium">Verify Identity</span>
                </div>
              </button>
              
              <button 
                onClick={() => setShowBiometricModal(true)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-sevis-primary hover:bg-sevis-primary/10 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-sevis-primary/20 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-sevis-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a2 2 0 012-2h4a2 2 0 012 2v2h4a2 2 0 012 2v2a2 2 0 01-2 2h-1l-.764 10.074A2 2 0 0118.263 21H5.737a2 2 0 01-1.973-1.926L3 9H2a2 2 0 01-1-1V6a2 2 0 012-2h4z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-sm font-medium block">Biometric Appointment</span>
                    <span className="text-xs text-gray-500">Schedule fingerprint collection</span>
                  </div>
                </div>
              </button>
              
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-sevis-primary hover:bg-sevis-primary/10 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-sevis-primary/20 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-sevis-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium">Security Settings</span>
                </div>
              </button>
            </div>
          </div>
        </div>




        {/* My Applications Section */}
        <div className="bg-white rounded-lg p-6 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">My Applications</h2>
            <button className="px-4 py-2 bg-gradient-to-r from-sevis-primary to-sevis-secondary hover:from-sevis-primary/90 hover:to-sevis-secondary/90 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg">
              + New Application
            </button>
          </div>
          
          <div className="space-y-4">
            {/* City Pass Application */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">City Pass Application</h4>
                  <p className="text-xs text-gray-500">Senior Citizen Pass - Transportation</p>
                  <p className="text-xs text-gray-400">Submitted: Dec 15, 2024</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  Under Review
                </span>
                <button className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Voter Pass Application */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Voter Pass Application</h4>
                  <p className="text-xs text-gray-500">Digital Voting Credential</p>
                  <p className="text-xs text-gray-400">Approved: Dec 10, 2024</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  Approved
                </span>
                <button className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Town Pass Application */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Town Pass Application</h4>
                  <p className="text-xs text-gray-500">Community Services Access</p>
                  <p className="text-xs text-gray-400">Submitted: Dec 8, 2024</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  Documents Required
                </span>
                <button className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Education Pass Application */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow opacity-60">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Education Pass Application</h4>
                  <p className="text-xs text-gray-500">Academic Credentials Verification</p>
                  <p className="text-xs text-gray-400">Draft saved</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  Draft
                </span>
                <button className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Application Statistics */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">1</div>
                <div className="text-xs text-gray-600">Under Review</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">1</div>
                <div className="text-xs text-gray-600">Approved</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">1</div>
                <div className="text-xs text-gray-600">Action Required</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-600">1</div>
                <div className="text-xs text-gray-600">Drafts</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activities</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
              <div className="w-10 h-10 bg-sevis-primary/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-sevis-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900">Identity Verified</h4>
                <p className="text-sm text-gray-500">Your digital identity has been successfully verified</p>
              </div>
              <div className="text-sm text-gray-500">2 hours ago</div>
            </div>
            
            <div className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
              <div className="w-10 h-10 bg-sevis-primary/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-sevis-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900">CPF Statement Downloaded</h4>
                <p className="text-sm text-gray-500">Downloaded annual CPF statement for 2024</p>
              </div>
              <div className="text-sm text-gray-500">1 day ago</div>
            </div>
            
            <div className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
              <div className="w-10 h-10 bg-sevis-primary/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-sevis-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900">Security Settings Updated</h4>
                <p className="text-sm text-gray-500">Two-factor authentication enabled</p>
              </div>
              <div className="text-sm text-gray-500">3 days ago</div>
            </div>
          </div>
        </div>
      </main>
      </div>
      
      {/* QR Scanner Modal */}
      {showQRScanner && (
        <WalletQRScanner
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
        />
      )}

      {/* Biometric Appointment Modal */}
      {showBiometricModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Biometric Appointment</h3>
              <button
                onClick={() => setShowBiometricModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6">
              <BiometricDashboard 
                userUid={user?.uid || ''} 
                userName={`${user?.firstName} ${user?.lastName}`} 
              />
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}