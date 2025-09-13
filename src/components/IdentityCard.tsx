'use client';

// React imports
import { useEffect, useRef, useState } from 'react';

// Next.js imports
import Image from 'next/image';

// Third-party imports
import QRCode from 'qrcode';
import domtoimage from 'dom-to-image';
import jsPDF from 'jspdf';

// Internal imports
import { getDownloadFilename, downloadOptions } from '@/lib/download-utils';

// Constants for card dates
const CARD_ISSUE_DATE = '05 - Sept - 2025';
const CARD_EXPIRY_DATE = '05 - Sept - 2030';

interface IdentityCardProps {
  name: string;
  nric: string;
  profileImage?: string;
  isVerified?: boolean;
  uid?: string;
}

export default function IdentityCard({ name, nric, profileImage, isVerified = true, uid }: IdentityCardProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Generate QR code when component mounts
  useEffect(() => {
    const generateQRCode = async () => {
      try {
        // Create SevisWallet-compatible QR code data with W3C VC format
        const qrData = {
          type: "SevisPassVC",
          version: "1.0",
          deepLink: `seviswallet://import?type=vc&uid=${uid || nric}&name=${encodeURIComponent(name)}&nric=${encodeURIComponent(nric)}`,
          verificationUrl: `https://sevispass.gov.sg/verify/${uid || nric}`,
          metadata: {
            id: uid || nric,
            name: name,
            nric: nric,
            platform: 'SevisPass',
            verified: isVerified,
            timestamp: new Date().toISOString()
          }
        };
        
        const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M', // Medium error correction to handle logo overlay
          type: 'image/png',
          quality: 0.92,
          rendererOpts: {
            quality: 0.92
          }
        });
        
        setQrCodeUrl(qrCodeDataURL);
      } catch (error) {
        // QR code generation error - implement proper error handling
      }
    };

    generateQRCode();
  }, [name, nric, uid, isVerified]);

  // Focus management for modal
  useEffect(() => {
    if (isViewModalOpen) {
      // Focus the modal when it opens
      modalRef.current?.focus();
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isViewModalOpen]);

  const downloadDigitalId = async (format: 'png' | 'pdf' = 'png') => {
    if (!cardRef.current) return;

    try {
      // Use dom-to-image to capture the card with all content
      const dataUrl = await domtoimage.toPng(cardRef.current, {
        quality: 1,
        width: 500,
        height: 350,
        bgcolor: 'transparent',
        cacheBust: true,
        // Don't override styles - let the original card styles show through
        filter: () => {
          // Include all elements including QR codes and text
          return true;
        }
      });

      if (format === 'pdf') {
        // Convert to PDF - match the expected output exactly
        const pdf = new jsPDF(downloadOptions.pdf);
        
        // Keep clean white background for PDF
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        // Use the same aspect ratio as PNG (500x350) for consistency
        const cardAspectRatio = 350 / 500; // Height / Width from PNG dimensions
        
        // Calculate dimensions to fit well on page - use about 80% of width for bigger size
        let imgWidth = pageWidth * 0.8;
        let imgHeight = imgWidth * cardAspectRatio;
        
        // If height exceeds reasonable page space, scale down
        const maxHeight = pageHeight * 0.7;
        if (imgHeight > maxHeight) {
          imgHeight = maxHeight;
          imgWidth = imgHeight / cardAspectRatio;
        }
        
        // Center the card perfectly on the page
        const x = (pageWidth - imgWidth) / 2;
        const y = (pageHeight - imgHeight) / 2;
        
        pdf.addImage(dataUrl, 'PNG', x, y, imgWidth, imgHeight);
        
        // Add minimal title above card
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('SevisPass Digital Identity Card', pageWidth / 2, y - 10, { align: 'center' });
        
        // Download PDF
        pdf.save(getDownloadFilename(name, 'pdf'));
      } else {
        // Download as PNG
        const link = document.createElement('a');
        link.download = getDownloadFilename(name, 'png');
        link.href = dataUrl;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      // Download error - implement proper error handling
      alert(`Failed to download digital ID as ${format.toUpperCase()}. Please try again.`);
    }
  };

  const addToSevisWallet = async () => {
    try {
      // Show loading state
      const button = document.querySelector('button[onclick*="addToSevisWallet"]');
      const originalText = 'Add to SevisWallet';
      if (button) {
        button.innerHTML = `
          <svg class="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          Adding to Wallet...
        `;
        button.disabled = true;
      }

      const response = await fetch('/api/wallet/generate-pass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: uid || `me8u0943-${nric.slice(-6)}`,
          name,
          nric,
          type: 'seviswallet'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to generate SevisWallet credential');
      }

      const data = await response.json();
      
      // Try to open SevisWallet app with deep link
      const deepLinkUrl = data.deepLink;
      
      // Success notification
      if (button) {
        button.innerHTML = `
          <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          </svg>
          Opening SevisWallet...
        `;
      }
      
      // Try to open the deep link
      window.location.href = deepLinkUrl;
      
      // Fallback: If app is not installed, show options after delay
      setTimeout(() => {
        // Reset button
        if (button) {
          button.innerHTML = `
            <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v13Z"/>
              <path d="M3 7h18M8 11h2M8 15h6"/>
            </svg>
            ${originalText}
          `;
          button.disabled = false;
        }

        const userChoice = confirm(
          'SevisWallet app not detected on this device.\n\n' +
          'Choose an option:\n' +
          '✓ OK - Download credential file to import manually\n' +
          '✗ Cancel - Use QR code to scan with SevisWallet app'
        );
        
        if (userChoice) {
          // Download VC as JSON file
          const link = document.createElement('a');
          link.href = data.downloadUrl;
          link.download = `${name.replace(/[^a-zA-Z0-9]/g, '_')}_SevisPass_Credential.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          alert('✅ Credential downloaded successfully!\n\nOpen SevisWallet app and import the downloaded file.');
        } else {
          // Show QR code instruction
          alert('📱 To add this credential to SevisWallet:\n\n1. Open the SevisWallet app\n2. Tap "Scan QR Code"\n3. Scan the QR code on this identity card\n\nThe credential will be automatically added to your wallet.');
        }
      }, 2000);
      
    } catch (error) {
      // SevisWallet integration error - implement proper error handling
      
      // Reset button on error
      const button = document.querySelector('button[onclick*="addToSevisWallet"]');
      if (button) {
        button.innerHTML = `
          <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v13Z"/>
            <path d="M3 7h18M8 11h2M8 15h6"/>
          </svg>
          Add to SevisWallet
        `;
        button.disabled = false;
      }
      
      alert(`❌ Failed to add credential to SevisWallet.\n\nError: ${error.message}\n\nPlease try again or contact support if the issue persists.`);
    }
  };
  return (
    <div className="relative">
      <div 
        ref={cardRef} 
        className="relative bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 rounded-2xl overflow-hidden shadow-2xl border-4 border-amber-700"
        style={{ minWidth: '500px', minHeight: '320px' }}
      >
        {/* Top Gold Header */}
        <div className="bg-gradient-to-r from-amber-500 to-yellow-500 px-6 py-3 border-b-4 border-amber-800">
          <h1 className="text-center text-black font-bold text-sm tracking-wide font-sans">
            INDEPENDENT STATE OF PAPUA NEW GUINEA
          </h1>
        </div>

        {/* Main Card Body */}
        <div className="bg-gradient-to-br from-orange-600 via-amber-600 to-orange-700 px-6 py-4 flex-1 relative overflow-hidden">
          {/* Papua New Guinea Emblem Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-15 pointer-events-none">
            <Image
              src="/png-emblem.png"
              alt="Papua New Guinea Emblem"
              width={225}
              height={225}
              className="w-56 h-56 object-contain"
            />
          </div>
          
          {/* Content Layer */}
          <div className="relative z-10">
          
          {/* Header Section */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Image
                src="/newlogo.png"
                alt="SevisPass Logo"
                width={46}
                height={46}
                className="h-12 w-12"
              />
              <div>
                <h2 className="text-xl font-bold text-yellow-100 font-sans">SEVISPASS</h2>
                <p className="text-xs text-yellow-200 italic font-sans">Secure Identity, Seamless Service Access</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white text-xs font-bold mb-1 font-sans">UID NUMBER</p>
              <div className="bg-white rounded px-2 py-1">
                <p className="text-black text-xs font-mono">{uid || `me8u0943-${nric.slice(-6)}`}</p>
              </div>
            </div>
          </div>

          {/* Main Content Section */}
          <div className="flex items-center space-x-6">
            {/* Profile Photo */}
            <div className="flex-shrink-0">
              {profileImage ? (
                <img
                  src={profileImage.startsWith('data:') ? profileImage : `data:image/jpeg;base64,${profileImage}`}
                  alt="Profile"
                  className="w-24 h-24 rounded-full border-4 border-yellow-400 shadow-lg object-cover"
                  onError={(e) => {
                    // Profile image load error
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.setAttribute('style', 'display: flex');
                  }}
                />
              ) : null}
              <div 
                className="w-24 h-24 bg-gradient-to-br from-yellow-400/20 to-amber-500/10 rounded-full flex items-center justify-center border-4 border-yellow-400"
                style={{ display: profileImage ? 'none' : 'flex' }}
              >
                <svg className="w-12 h-12 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            {/* Identity Information */}
            <div className="flex-1">
              <p className="text-yellow-200 text-sm font-medium mb-1 font-sans">Name</p>
              <h3 className="text-3xl font-bold text-black mb-3 tracking-wide font-sans">{name.toUpperCase()}</h3>
              
              <p className="text-yellow-200 text-sm font-medium mb-1 font-sans">Passport/NID Number</p>
              <p className="text-white text-lg font-bold mb-4 font-sans">{nric}</p>
              
              <div className="flex space-x-8">
                <div>
                  <p className="text-yellow-200 text-sm font-medium mb-1 font-sans">Issue Date</p>
                  <p className="text-white text-sm font-bold font-sans">{CARD_ISSUE_DATE}</p>
                </div>
                <div>
                  <p className="text-yellow-200 text-sm font-medium mb-1 font-sans">Expiry Date</p>
                  <p className="text-white text-sm font-bold font-sans">{CARD_EXPIRY_DATE}</p>
                </div>
              </div>
            </div>
            
            {/* QR Code Section */}
            <div className="flex-shrink-0">
              <div className="text-center">
                <div className="bg-white p-3 rounded-lg shadow-xl">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="SevisPass QR Code"
                      className="w-24 h-24"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <svg className="w-8 h-8 text-gray-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        <p className="text-xs text-gray-500">Loading...</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full mt-2 font-sans shadow-lg">
                  SCAN ME
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="bg-gradient-to-r from-amber-500 to-yellow-500 px-6 py-3">
          <div className="text-center mb-2">
            <div className="bg-gradient-to-r from-red-800 to-red-900 text-yellow-400 px-4 py-2 rounded-full inline-block">
              <p className="text-sm font-bold italic font-sans">Verified Credential</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-black text-xs font-bold mb-1 font-sans">
              This SEVISPASS is valid for national identification access to services
            </p>
            <p className="text-black text-xs font-sans">
              Keep it secured and report issues to the Department of Information and Communications Technology
            </p>
          </div>
        </div>
      </div>
    
      {/* Action Buttons - positioned outside the card */}
    <div className="mt-6 space-y-4">
      {/* Primary Actions */}
      <div className="flex justify-center space-x-3">
        <button
          onClick={() => setIsViewModalOpen(true)}
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-sevis-primary to-sevis-secondary hover:from-sevis-secondary hover:to-sevis-primary text-black font-bold rounded-xl transition-all shadow-xl hover:shadow-2xl transform hover:scale-105"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          View Card
        </button>
      </div>

      {/* Wallet Actions */}
      <div className="flex justify-center items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="h-px bg-gray-300 flex-1 w-20"></div>
          <span className="text-sm text-gray-500 font-medium">Add to SevisWallet</span>
          <div className="h-px bg-gray-300 flex-1 w-20"></div>
        </div>
      </div>
      
      <div className="flex justify-center">
        <div className="flex justify-center space-x-4">
          <button
            onClick={addToSevisWallet}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-sevis-primary to-sevis-secondary hover:from-sevis-secondary hover:to-sevis-primary text-black font-bold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v13Z"/>
              <path d="M3 7h18M8 11h2M8 15h6"/>
            </svg>
            Add to SevisWallet
          </button>
          
          <button
            onClick={() => {
              // Add some user feedback before navigation
              const button = event.currentTarget;
              const originalContent = button.innerHTML;
              button.innerHTML = `
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                </svg>
                Opening Wallet...
              `;
              button.disabled = true;
              
              // Navigate after brief delay for feedback
              setTimeout(() => {
                window.location.href = '/wallet';
              }, 500);
            }}
            className="inline-flex items-center px-6 py-3 bg-white/90 hover:bg-white text-sevis-primary border-2 border-sevis-primary hover:border-sevis-secondary font-bold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-70 disabled:transform-none"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Open Wallet
          </button>
        </div>
      </div>
    </div>
    
    {/* View Modal */}
    {isViewModalOpen && (
      <div 
        ref={modalRef}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={(e) => {
          // Close modal when clicking outside the card
          if (e.target === e.currentTarget) {
            setIsViewModalOpen(false);
          }
        }}
        onKeyDown={(e) => {
          // Close modal on Escape key
          if (e.key === 'Escape') {
            setIsViewModalOpen(false);
          }
        }}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="relative max-w-2xl w-full">
          {/* Close Button */}
          <button
            onClick={() => setIsViewModalOpen(false)}
            className="absolute -top-12 right-0 text-white hover:text-yellow-400 transition-colors z-10 p-2 rounded-full hover:bg-white/10"
            title="Close (ESC)"
            aria-label="Close modal"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Modal Card - Printable/Downloadable Format */}
          <div className="relative bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 rounded-2xl overflow-hidden shadow-2xl border-4 border-amber-700 transform scale-110" style={{ minWidth: '600px', minHeight: '400px' }}>
            {/* Top Gold Header */}
            <div className="bg-gradient-to-r from-amber-500 to-yellow-500 px-6 py-3 border-b-4 border-amber-800">
              <h1 className="text-center text-black font-bold text-sm tracking-wide font-sans">
                INDEPENDENT STATE OF PAPUA NEW GUINEA
              </h1>
            </div>

            {/* Main Card Body - Printable Format */}
            <div className="bg-gradient-to-br from-orange-600 via-amber-600 to-orange-700 px-8 py-6 flex-1 relative overflow-hidden">
              {/* Papua New Guinea Emblem Watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-15 pointer-events-none">
                <Image
                  src="/png-emblem.png"
                  alt="Papua New Guinea Emblem"
                  width={250}
                  height={250}
                  className="w-64 h-64 object-contain"
                />
              </div>
              
              {/* Content Layer */}
              <div className="relative z-10">
              
              {/* Header Section */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <Image
                    src="/newlogo.png"
                    alt="SevisPass Logo"
                    width={52}
                    height={52}
                    className="h-14 w-14"
                  />
                  <div>
                    <h2 className="text-2xl font-bold text-yellow-100 font-sans">SEVISPASS</h2>
                    <p className="text-sm text-yellow-200 italic font-sans">Secure Identity, Seamless Service Access</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-bold mb-2 font-sans">UID NUMBER</p>
                  <div className="bg-white rounded-lg px-3 py-2 shadow-md">
                    <p className="text-black text-sm font-mono font-bold">{uid || `me8u0943-${nric.slice(-6)}`}</p>
                  </div>
                </div>
              </div>

              {/* Main Content Section - Enhanced for Printing */}
              <div className="grid grid-cols-3 gap-8 items-start">
                {/* Profile Photo */}
                <div className="flex flex-col items-center">
                  {profileImage ? (
                    <img
                      src={profileImage.startsWith('data:') ? profileImage : `data:image/jpeg;base64,${profileImage}`}
                      alt="Profile"
                      className="w-32 h-32 rounded-full border-4 border-yellow-400 shadow-xl object-cover"
                      onError={(e) => {
                        // Profile image load error
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.setAttribute('style', 'display: flex');
                      }}
                    />
                  ) : null}
                  <div 
                    className="w-32 h-32 bg-gradient-to-br from-yellow-400/20 to-amber-500/10 rounded-full flex items-center justify-center border-4 border-yellow-400 shadow-xl"
                    style={{ display: profileImage ? 'none' : 'flex' }}
                  >
                    <svg className="w-16 h-16 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  
                  {/* Verification Status */}
                  <div className="mt-4 bg-green-600 text-white px-4 py-2 rounded-full">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-bold font-sans">VERIFIED</span>
                    </div>
                  </div>
                </div>

                {/* Identity Information - Detailed */}
                <div className="space-y-4">
                  <div>
                    <p className="text-yellow-200 text-sm font-medium mb-1 font-sans">Full Name</p>
                    <h3 className="text-2xl font-bold text-black mb-2 tracking-wide font-sans">{name.toUpperCase()}</h3>
                  </div>
                  
                  <div>
                    <p className="text-yellow-200 text-sm font-medium mb-1 font-sans">Passport/NID Number</p>
                    <p className="text-white text-xl font-bold mb-3 font-sans">{nric}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <p className="text-yellow-200 text-sm font-medium mb-1 font-sans">Issue Date</p>
                      <p className="text-white text-lg font-bold font-sans">05 - Sept - 2025</p>
                    </div>
                    <div>
                      <p className="text-yellow-200 text-sm font-medium mb-1 font-sans">Expiry Date</p>
                      <p className="text-white text-lg font-bold font-sans">05 - Sept - 2030</p>
                    </div>
                    <div>
                      <p className="text-yellow-200 text-sm font-medium mb-1 font-sans">Card Type</p>
                      <p className="text-white text-lg font-bold font-sans">DIGITAL IDENTITY</p>
                    </div>
                    <div>
                      <p className="text-yellow-200 text-sm font-medium mb-1 font-sans">Authority</p>
                      <p className="text-white text-sm font-bold font-sans">Department of ICT, PNG</p>
                    </div>
                  </div>
                </div>
                
                {/* QR Code and Security Features */}
                <div className="flex flex-col items-center space-y-4">
                  <div className="text-center">
                    <div className="bg-white p-4 rounded-lg shadow-xl">
                      {qrCodeUrl ? (
                        <img
                          src={qrCodeUrl}
                          alt="SevisPass QR Code"
                          className="w-28 h-28"
                        />
                      ) : (
                        <div className="w-28 h-28 bg-gray-100 rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <svg className="w-10 h-10 text-gray-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                            <p className="text-xs text-gray-500">Loading...</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-sm font-bold px-4 py-2 rounded-full mt-3 font-sans shadow-lg">
                      SCAN ME
                    </div>
                  </div>
                  
                  {/* Security Features */}
                  <div className="text-center bg-black/20 rounded-lg p-3">
                    <p className="text-yellow-100 text-xs font-bold mb-1 font-sans">SECURITY FEATURES</p>
                    <div className="space-y-1">
                      <p className="text-white text-xs font-sans">• Encrypted QR Code</p>
                      <p className="text-white text-xs font-sans">• Biometric Verification</p>
                      <p className="text-white text-xs font-sans">• Digital Watermark</p>
                      <p className="text-white text-xs font-sans">• Blockchain Verified</p>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </div>

            {/* Bottom Footer */}
            <div className="bg-gradient-to-r from-amber-500 to-yellow-500 px-6 py-3">
              <div className="text-center mb-2">
                <div className="bg-gradient-to-r from-red-800 to-red-900 text-yellow-400 px-4 py-2 rounded-full inline-block">
                  <p className="text-sm font-bold italic font-sans">Verified Credential</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-black text-xs font-bold mb-1 font-sans">
                  This SEVISPASS is valid for national identification access to services
                </p>
                <p className="text-black text-xs font-sans">
                  Keep it secured and report issues to the Department of Information and Communications Technology
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
  );
}