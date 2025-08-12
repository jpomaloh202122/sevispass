'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import domtoimage from 'dom-to-image';
import jsPDF from 'jspdf';
import { getDownloadFilename, downloadOptions } from '@/lib/download-utils';

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

  // Generate QR code when component mounts
  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const qrData = {
          id: uid || nric,
          name: name,
          nric: nric,
          platform: 'SevisPass',
          verified: isVerified,
          timestamp: new Date().toISOString(),
          url: `https://sevispass.gov.sg/verify/${uid || nric}`
        };
        
        const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
          width: 128,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        setQrCodeUrl(qrCodeDataURL);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };

    generateQRCode();
  }, [name, nric, uid, isVerified]);

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
        filter: (node) => {
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
      console.error(`Error downloading digital ID as ${format}:`, error);
      alert(`Failed to download digital ID as ${format.toUpperCase()}. Please try again.`);
    }
  };
  return (
    <div className="relative">
      <div 
        ref={cardRef} 
        className="bg-gradient-to-br from-black via-gray-800 to-yellow-500 rounded-xl p-8 text-white shadow-2xl border-2 border-yellow-400 shadow-yellow-400/20"
        style={{ minWidth: '400px', minHeight: '280px' }}
      >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Image
            src="/newlogo.png"
            alt="SevisPass Logo"
            width={20}
            height={20}
            className="h-5 w-5"
          />
          <h2 className="text-lg font-semibold bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent">SevisPass Digital ID</h2>
          {isVerified && (
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-full p-1">
              <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
        <div className="text-sm text-yellow-300 font-medium">
          Digital Identity
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          {profileImage ? (
            <img
              src={profileImage}
              alt="Profile"
              className="w-20 h-20 rounded-full border-4 border-gradient-to-r from-yellow-400 to-yellow-200 shadow-lg"
              style={{ border: '4px solid', borderImage: 'linear-gradient(135deg, #fbbf24, #fde047) 1' }}
            />
          ) : (
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400/20 to-yellow-200/10 rounded-full flex items-center justify-center border-4 border-yellow-400/50">
              <svg className="w-10 h-10 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>

        <div className="flex-1">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-yellow-100 bg-clip-text text-transparent">{name}</h3>
          <p className="text-yellow-200 text-sm font-medium mt-1">NID/Passport Number: {nric}</p>
          <div className="mt-2 flex items-center text-sm">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-400 to-yellow-300 text-black shadow-lg">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              VERIFIED
            </span>
          </div>
        </div>
        
        {/* QR Code Section */}
        <div className="flex-shrink-0 ml-6">
          <div className="bg-white p-3 rounded-xl shadow-xl border border-yellow-400/30">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt="SevisPass QR Code"
                className="w-24 h-24"
              />
            ) : (
              <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 pt-4 border-t border-yellow-400/30">
        <div className="flex justify-between items-center text-sm">
          <div className="text-yellow-200">
            <span className="text-yellow-300">Valid Until: </span>
            <span className="font-semibold text-white">Dec 31, 2030</span>
          </div>
          <div className="text-xs font-mono text-yellow-300 bg-black/30 px-2 py-1 rounded">
            ID: {uid || nric.slice(-4)}
          </div>
        </div>
      </div>
    </div>
    
    {/* Action Buttons - positioned outside the card */}
    <div className="mt-6 flex justify-center space-x-3">
      <button
        onClick={() => setIsViewModalOpen(true)}
        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold rounded-xl transition-all shadow-xl hover:shadow-2xl transform hover:scale-105"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        View Card
      </button>
      
      <button
        onClick={() => downloadDigitalId('png')}
        className="inline-flex items-center px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        PNG
      </button>
      
      <button
        onClick={() => downloadDigitalId('pdf')}
        className="inline-flex items-center px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        PDF
      </button>
    </div>
    
    {/* View Modal */}
    {isViewModalOpen && (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="relative max-w-2xl w-full">
          {/* Close Button */}
          <button
            onClick={() => setIsViewModalOpen(false)}
            className="absolute -top-12 right-0 text-white hover:text-yellow-400 transition-colors z-10"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Modal Card - Larger Version */}
          <div className="bg-gradient-to-br from-black via-gray-800 to-yellow-500 rounded-2xl p-12 text-white shadow-2xl border-2 border-yellow-400 shadow-yellow-400/20 transform scale-110">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Image
                  src="/newlogo.png"
                  alt="SevisPass Logo"
                  width={32}
                  height={32}
                  className="h-8 w-8"
                />
                <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent">SevisPass Digital ID</h2>
                {isVerified && (
                  <div className="bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-full p-1">
                    <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="text-lg text-yellow-300 font-medium">
                Digital Identity
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex-shrink-0">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="w-32 h-32 rounded-full border-4 border-gradient-to-r from-yellow-400 to-yellow-200 shadow-2xl"
                    style={{ border: '6px solid', borderImage: 'linear-gradient(135deg, #fbbf24, #fde047) 1' }}
                  />
                ) : (
                  <div className="w-32 h-32 bg-gradient-to-br from-yellow-400/20 to-yellow-200/10 rounded-full flex items-center justify-center border-6 border-yellow-400/50">
                    <svg className="w-16 h-16 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h3 className="text-4xl font-bold bg-gradient-to-r from-white to-yellow-100 bg-clip-text text-transparent mb-2">{name}</h3>
                <p className="text-yellow-200 text-lg font-medium mb-4">NID/Passport Number: {nric}</p>
                <div className="mt-4 flex items-center text-lg">
                  <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-yellow-400 to-yellow-300 text-black shadow-lg">
                    <span className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></span>
                    VERIFIED
                  </span>
                </div>
              </div>
              
              {/* QR Code Section */}
              <div className="flex-shrink-0">
                <div className="bg-white p-4 rounded-2xl shadow-2xl border border-yellow-400/50">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="SevisPass QR Code"
                      className="w-32 h-32"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-gray-100 rounded-xl flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-12 pt-6 border-t border-yellow-400/30">
              <div className="flex justify-between items-center text-lg">
                <div className="text-yellow-200">
                  <span className="text-yellow-300">Valid Until: </span>
                  <span className="font-bold text-white text-xl">Dec 31, 2030</span>
                </div>
                <div className="text-sm font-mono text-yellow-300 bg-black/40 px-4 py-2 rounded-lg border border-yellow-500/30">
                  ID: {uid || nric.slice(-4)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
  );
}