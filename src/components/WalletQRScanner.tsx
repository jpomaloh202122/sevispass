'use client';

import { useState, useRef, useEffect } from 'react';

interface WalletQRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export default function WalletQRScanner({ onScan, onClose }: WalletQRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      setIsScanning(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Use back camera
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        videoRef.current.onloadedmetadata = () => {
          scanQRCode();
        };
      }
    } catch {
      setError('Unable to access camera. Please ensure camera permissions are granted.');
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(scanQRCode);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      // Note: In a real implementation, you'd use a QR code library like jsQR
      // For this demo, we'll simulate QR code detection
      
      // Simulate QR code detection (replace with actual QR detection library)
      const mockQRData = detectMockQR();
      if (mockQRData) {
        stopCamera();
        onScan(mockQRData);
        return;
      }
    } catch (err) {
      console.error('QR scanning error:', err);
    }

    animationRef.current = requestAnimationFrame(scanQRCode);
  };

  // Mock QR detection - replace with actual library like jsQR
  const detectMockQR = (): string | null => {
    // This is a mock function - in reality you'd use jsQR or similar
    // Return null to continue scanning
    return null;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (!canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);
        
        // const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Mock QR detection from uploaded image - SevisWallet format
        const mockData = JSON.stringify({
          type: "SevisPassVC",
          version: "1.0",
          deepLink: "seviswallet://import?type=vc&uid=sample-123&name=Sample%20User&nric=S1234567A",
          verificationUrl: "https://sevispass.gov.sg/verify/sample-123",
          metadata: {
            id: 'sample-123',
            name: 'Sample User',
            nric: 'S1234567A',
            platform: 'SevisPass',
            verified: true,
            timestamp: new Date().toISOString()
          }
        });
        
        onScan(mockData);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full mx-auto overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-black">Scan QR Code</h3>
            <button
              onClick={onClose}
              className="text-black hover:text-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-black/80 text-sm mt-1">
            Point your camera at a SevisPass QR code to add it to SevisWallet
          </p>
        </div>

        {/* Scanner Area */}
        <div className="p-6">
          <div className="relative bg-gray-100 rounded-xl overflow-hidden mb-4" style={{ aspectRatio: '4/3' }}>
            {error ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-gray-600 mb-4">{error}</p>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 bg-yellow-500 text-black rounded-lg font-medium hover:bg-yellow-600 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                
                {/* Scanning overlay */}
                {isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="border-2 border-yellow-400 w-48 h-48 relative">
                      <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-yellow-400"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-yellow-400"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-yellow-400"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-yellow-400"></div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Alternative upload option */}
          <div className="border-t pt-4">
            <p className="text-sm text-gray-600 text-center mb-3">
              Or upload an image containing a SevisPass QR code
            </p>
            <label className="block w-full">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-yellow-400 hover:bg-yellow-50 transition-colors">
                <svg className="w-6 h-6 text-gray-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-600">Upload Image</span>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}