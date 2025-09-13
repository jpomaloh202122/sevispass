'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import domtoimage from 'dom-to-image';
import jsPDF from 'jspdf';
import { getDownloadFilename, downloadOptions } from '@/lib/download-utils';

interface EnhancedIdentityCardProps {
  name: string;
  nric: string;
  profileImage?: string;
  isVerified?: boolean;
  uid?: string;
  cardTheme?: 'premium' | 'standard' | 'government';
}

export default function EnhancedIdentityCard({ 
  name, 
  nric, 
  profileImage, 
  isVerified = true, 
  uid,
  cardTheme = 'premium' 
}: EnhancedIdentityCardProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Theme configurations
  const themes = {
    premium: {
      gradient: 'from-slate-900 via-slate-800 to-slate-900',
      accent: 'from-amber-400 to-yellow-500',
      accentText: 'text-slate-900',
      border: 'border-amber-400/50',
      shadow: 'shadow-amber-400/20'
    },
    standard: {
      gradient: 'from-sevis-dark via-sevis-slate to-sevis-primary',
      accent: 'from-sevis-primary to-sevis-secondary',
      accentText: 'text-black',
      border: 'border-sevis-primary/50',
      shadow: 'shadow-sevis-primary/20'
    },
    government: {
      gradient: 'from-blue-900 via-blue-800 to-blue-900',
      accent: 'from-red-500 to-red-600',
      accentText: 'text-white',
      border: 'border-red-500/50',
      shadow: 'shadow-red-500/20'
    }
  };

  const theme = themes[cardTheme];

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const qrData = {
          type: "SevisPassVC",
          version: "2.0",
          deepLink: `seviswallet://import?type=vc&uid=${uid || nric}&name=${encodeURIComponent(name)}&nric=${encodeURIComponent(nric)}`,
          verificationUrl: `https://sevispass.gov.sg/verify/${uid || nric}`,
          metadata: {
            id: uid || nric,
            name: name,
            nric: nric,
            platform: 'SevisPass',
            verified: isVerified,
            timestamp: new Date().toISOString(),
            theme: cardTheme
          }
        };
        
        const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'H',
          type: 'image/png',
          quality: 0.95,
          rendererOpts: {
            quality: 0.95
          }
        });
        
        setQrCodeUrl(qrCodeDataURL);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };

    generateQRCode();
  }, [name, nric, uid, isVerified, cardTheme]);

  const downloadDigitalId = async (format: 'png' | 'pdf' = 'png') => {
    if (!cardRef.current) return;

    try {
      const dataUrl = await domtoimage.toPng(cardRef.current, {
        quality: 1,
        width: 500,
        height: 350,
        bgcolor: 'transparent',
        cacheBust: true,
        filter: () => true
      });

      if (format === 'pdf') {
        const pdf = new jsPDF(downloadOptions.pdf);
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        const cardAspectRatio = 350 / 500;
        let imgWidth = pageWidth * 0.8;
        let imgHeight = imgWidth * cardAspectRatio;
        
        const maxHeight = pageHeight * 0.7;
        if (imgHeight > maxHeight) {
          imgHeight = maxHeight;
          imgWidth = imgHeight / cardAspectRatio;
        }
        
        const x = (pageWidth - imgWidth) / 2;
        const y = (pageHeight - imgHeight) / 2;
        
        pdf.addImage(dataUrl, 'PNG', x, y, imgWidth, imgHeight);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('SevisPass Enhanced Digital Identity Card', pageWidth / 2, y - 10, { align: 'center' });
        
        pdf.save(getDownloadFilename(name, 'pdf'));
      } else {
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
        className={`relative bg-gradient-to-br ${theme.gradient} rounded-2xl p-8 text-white shadow-2xl border-2 ${theme.border} ${theme.shadow} overflow-hidden backdrop-blur-sm`}
        style={{ minWidth: '450px', minHeight: '300px' }}
      >
        {/* Enhanced geometric background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-4 w-32 h-32 border border-white/20 rounded-full"></div>
          <div className="absolute top-8 left-8 w-24 h-24 border border-white/10 rounded-full"></div>
          <div className="absolute bottom-4 right-4 w-40 h-40 border border-white/10 rounded-lg transform rotate-45"></div>
          <div className="absolute bottom-8 right-8 w-32 h-32 border border-white/5 rounded-lg transform rotate-45"></div>
        </div>
        
        {/* Watermark background - more subtle */}
        <div className="absolute inset-0 opacity-5">
          <div className="flex items-center justify-center h-full transform rotate-12">
            <Image
              src="/newlogo.png"
              alt="SevisPass Watermark"
              width={200}
              height={200}
              className="w-48 h-48"
            />
          </div>
        </div>
        
        {/* Content overlay */}
        <div className="relative z-10">
          {/* Enhanced header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className={`bg-gradient-to-r ${theme.accent} rounded-xl p-2 shadow-xl`}>
                <Image
                  src="/newlogo.png"
                  alt="SevisPass Logo"
                  width={36}
                  height={36}
                  className="h-9 w-9"
                />
              </div>
              <div>
                <h2 className={`text-xl font-black bg-gradient-to-r ${theme.accent} bg-clip-text text-transparent drop-shadow-sm tracking-wide`}>
                  SEVISPASS
                </h2>
                <p className="text-xs text-gray-300 font-medium tracking-wider">DIGITAL IDENTITY</p>
              </div>
              {isVerified && (
                <div className={`bg-gradient-to-r ${theme.accent} rounded-full p-1.5 shadow-lg`}>
                  <svg className={`w-5 h-5 ${theme.accentText}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className={`text-xs font-bold bg-gradient-to-r ${theme.accent} bg-clip-text text-transparent tracking-wider`}>
                ID CARD
              </div>
              <div className="text-xs text-gray-400 font-mono mt-1">
                #{uid?.slice(-6) || nric.slice(-4)}
              </div>
            </div>
          </div>

          {/* Main content area */}
          <div className="flex items-center space-x-6">
            {/* Profile section */}
            <div className="flex-shrink-0">
              {profileImage ? (
                <div className="relative">
                  <img
                    src={profileImage}
                    alt="Profile"
                    className={`w-24 h-24 rounded-xl object-cover shadow-xl ring-4 ring-gradient-to-r ${theme.border.replace('border-', 'ring-')}`}
                    style={{ 
                      border: '4px solid', 
                      borderImage: `linear-gradient(135deg, ${cardTheme === 'premium' ? '#fbbf24, #fde047' : '#f59e0b, #eab308'}) 1` 
                    }}
                  />
                  {/* Verification badge overlay */}
                  {isVerified && (
                    <div className={`absolute -bottom-1 -right-1 bg-gradient-to-r ${theme.accent} rounded-full p-1 shadow-lg`}>
                      <svg className={`w-4 h-4 ${theme.accentText}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`w-24 h-24 bg-gradient-to-br from-gray-600/20 to-gray-700/10 rounded-xl flex items-center justify-center ring-4 ${theme.border.replace('border-', 'ring-')}`}>
                  <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            {/* Identity information */}
            <div className="flex-1">
              <h3 className="text-2xl font-black text-white mb-1 tracking-tight">{name}</h3>
              <p className="text-gray-300 font-mono text-sm tracking-wider mb-3">{nric}</p>
              <div className="flex items-center space-x-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r ${theme.accent} ${theme.accentText} shadow-lg tracking-wide`}>
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                  VERIFIED
                </span>
                <span className="text-xs text-gray-400 font-medium">
                  Valid until Dec 31, 2030
                </span>
              </div>
            </div>
            
            {/* Enhanced QR Code Section */}
            <div className="flex-shrink-0">
              <div className="text-center">
                <div className={`relative bg-white p-4 rounded-2xl shadow-2xl ${theme.border} border-2 inline-block backdrop-blur-sm`}>
                  {qrCodeUrl ? (
                    <>
                      <img
                        src={qrCodeUrl}
                        alt="SevisPass QR Code"
                        className="w-32 h-32"
                      />
                      {/* Enhanced logo overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className={`bg-gradient-to-r ${theme.accent} rounded-full p-1.5 shadow-lg ring-2 ring-white`}>
                          <Image
                            src="/newlogo.png"
                            alt="SevisPass"
                            width={18}
                            height={18}
                            className="w-4.5 h-4.5"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-32 h-32 bg-gray-100 rounded-xl flex items-center justify-center">
                      <div className="text-center">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        <p className="text-xs text-gray-500">Generating...</p>
                      </div>
                    </div>
                  )}
                </div>
                {qrCodeUrl && (
                  <div className="mt-3">
                    <span className={`bg-gradient-to-r ${theme.accent} ${theme.accentText} text-xs font-black px-3 py-1.5 rounded-full shadow-xl tracking-wide`}>
                      SCAN TO VERIFY
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced footer */}
          <div className="mt-8 pt-4 border-t border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`bg-gradient-to-r ${theme.accent} rounded-full p-1`}>
                  <Image
                    src="/newlogo.png"
                    alt="SevisPass"
                    width={16}
                    height={16}
                    className="w-4 h-4"
                  />
                </div>
                <span className="text-xs text-gray-300 font-medium">Powered by SevisPass Technology</span>
                <div className="h-1 w-1 bg-white/40 rounded-full"></div>
                <span className="text-xs text-gray-400">Secure Digital Identity</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="font-medium">Blockchain Verified</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Enhanced Action Buttons */}
      <div className="mt-8 space-y-4">
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => setIsViewModalOpen(true)}
            className={`inline-flex items-center px-8 py-4 bg-gradient-to-r ${theme.accent} hover:from-amber-500 hover:to-yellow-600 ${theme.accentText} font-black rounded-2xl transition-all shadow-2xl hover:shadow-3xl transform hover:scale-105 tracking-wide`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            VIEW CARD
          </button>
          
          <button
            onClick={() => downloadDigitalId('png')}
            className="inline-flex items-center px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-2xl transition-all shadow-xl hover:shadow-2xl"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            PNG
          </button>
          
          <button
            onClick={() => downloadDigitalId('pdf')}
            className="inline-flex items-center px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-2xl transition-all shadow-xl hover:shadow-2xl"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF
          </button>
        </div>
      </div>
    </div>
  );
}