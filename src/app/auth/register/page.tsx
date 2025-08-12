'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserRegistrationResponse } from '@/types/user';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  nid: string;
  phoneNumber: string;
  nidPhoto: File | null;
  facePhoto: File | null;
}

type RegistrationStep = 'personal' | 'verification' | 'password' | 'complete';

interface VerificationResult {
  success: boolean;
  message: string;
  confidence?: number;
}

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    nid: '',
    phoneNumber: '',
    nidPhoto: null,
    facePhoto: null
  });
  
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('personal');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isCapturingFace, setIsCapturingFace] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handlePersonalInfoNext = () => {
    // Validate personal information
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.nid || !formData.phoneNumber) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }
    
    setMessage(null);
    setCurrentStep('verification');
  };

  const handleVerificationSubmit = async () => {
    if (!formData.nidPhoto) {
      setMessage({ type: 'error', text: 'Please upload your NID/Passport photo' });
      return;
    }

    if (!formData.facePhoto) {
      setMessage({ type: 'error', text: 'Please capture your face photo for verification' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // Perform document validation
      const docFormData = new FormData();
      docFormData.append('documentImage', formData.nidPhoto);
      docFormData.append('expectedNumber', formData.nid);
      const isPassport = /^[A-Z]{1,2}\d{6,9}$/i.test(formData.nid) || formData.nid.length >= 8;
      docFormData.append('documentType', isPassport ? 'passport' : 'nid');

      // Perform face verification
      const faceFormData = new FormData();
      faceFormData.append('nidPhoto', formData.nidPhoto);
      faceFormData.append('facePhoto', formData.facePhoto);

      const [docResponse, faceResponse] = await Promise.all([
        fetch('/api/auth/validate-document', {
          method: 'POST',
          body: docFormData,
        }),
        fetch('/api/auth/verify-face', {
          method: 'POST',
          body: faceFormData,
        })
      ]);

      const docResult = await docResponse.json();
      const faceResult = await faceResponse.json();

      console.log('Document validation:', docResult);
      console.log('Face verification:', faceResult);

      if (!faceResult.success) {
        setMessage({ type: 'error', text: faceResult.message });
        setIsLoading(false);
        return;
      }

      // Success - show match confirmation
      setVerificationResult({
        success: true,
        message: 'Success Match',
        confidence: faceResult.confidence
      });
      
      setMessage({ 
        type: 'success', 
        text: `Success Match! Face verification passed with ${(faceResult.confidence * 100).toFixed(1)}% confidence` 
      });

      // Wait 2 seconds then proceed to password step
      setTimeout(() => {
        setCurrentStep('password');
        setMessage(null);
      }, 2000);

    } catch (error) {
      console.error('Verification error:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Verification failed. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (formData.password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('firstName', formData.firstName);
      formDataToSend.append('lastName', formData.lastName);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('nid', formData.nid);
      formDataToSend.append('phoneNumber', formData.phoneNumber);
      if (formData.nidPhoto) {
        formDataToSend.append('nidPhoto', formData.nidPhoto);
      }
      if (formData.facePhoto) {
        formDataToSend.append('facePhoto', formData.facePhoto);
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Registration failed: ${errorText}`);
      }

      const result: UserRegistrationResponse = await response.json();

      if (result.success && result.uid) {
        setCurrentStep('complete');
        setMessage({ 
          type: 'success', 
          text: 'Account created successfully! Redirecting to home...' 
        });
        
        // Redirect to home page after a short delay
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        setMessage({ type: 'error', text: result.message || 'Registration failed' });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Network error. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'nidPhoto' | 'facePhoto') => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        [fieldName]: file
      }));
    }
  };

  const startFaceCapture = async () => {
    try {
      setIsCapturingFace(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: false 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to access camera. Please ensure camera permissions are granted.' 
      });
      setIsCapturingFace(false);
    }
  };

  const captureFacePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'face-capture.jpg', { type: 'image/jpeg' });
            setFormData(prev => ({
              ...prev,
              facePhoto: file
            }));
            setIsCapturingFace(false);
            
            // Stop camera stream
            const stream = videoRef.current!.srcObject as MediaStream;
            if (stream) {
              stream.getTracks().forEach(track => track.stop());
            }
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const stopFaceCapture = () => {
    setIsCapturingFace(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Registration Progress</span>
        <span className="text-sm text-gray-500">
          Step {currentStep === 'personal' ? '1' : currentStep === 'verification' ? '2' : currentStep === 'password' ? '3' : '4'} of 4
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-yellow-400 to-amber-500 h-2 rounded-full transition-all duration-500"
          style={{
            width: currentStep === 'personal' ? '25%' : 
                   currentStep === 'verification' ? '50%' : 
                   currentStep === 'password' ? '75%' : '100%'
          }}
        ></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-100 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center mb-6">
            <svg className="h-12 w-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Create SevisPass Account</h2>
          <p className="mt-2 text-sm text-gray-600">
            {currentStep === 'personal' ? 'Enter your personal information' :
             currentStep === 'verification' ? 'Verify your identity' :
             currentStep === 'password' ? 'Set your password' :
             'Registration complete'}
          </p>
        </div>

        {renderProgressBar()}

        {message && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Step 1: Personal Information */}
        {currentStep === 'personal' && (
          <form className="mt-8 space-y-6">
            <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="sr-only">First Name</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className="relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="sr-only">Last Name</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className="relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="nid" className="sr-only">NID or Passport Number</label>
              <input
                id="nid"
                name="nid"
                type="text"
                required
                className="relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                placeholder="NID or Passport Number"
                value={formData.nid}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                placeholder="Email address"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label htmlFor="phoneNumber" className="sr-only">Phone Number</label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                required
                className="relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                placeholder="Phone Number (+675 1234 5678)"
                value={formData.phoneNumber}
                onChange={handleInputChange}
              />
            </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handlePersonalInfoNext}
                className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
              >
                Continue to Verification
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Identity Verification */}
        {currentStep === 'verification' && (
          <div className="mt-8 space-y-6">
            <div className="space-y-4">
              {/* NID/Passport Photo Upload */}
            <div>
              <label htmlFor="nidPhoto" className="block text-sm font-medium text-gray-700 mb-2">
                Upload NID/Passport Bio Page *
              </label>
              <div className="relative">
                <input
                  id="nidPhoto"
                  name="nidPhoto"
                  type="file"
                  accept="image/*"
                  required
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                  onChange={(e) => handleFileChange(e, 'nidPhoto')}
                />
                {formData.nidPhoto && (
                  <p className="mt-2 text-sm text-green-600">
                    ✓ {formData.nidPhoto.name} uploaded
                  </p>
                )}
              </div>
            </div>

            {/* Face Capture */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Facial Verification *
              </label>
              <div className="space-y-3">
                {!formData.facePhoto && !isCapturingFace && (
                  <button
                    type="button"
                    onClick={startFaceCapture}
                    className="w-full py-2 px-4 border border-amber-300 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    📷 Start Face Capture
                  </button>
                )}
                
                {isCapturingFace && (
                  <div className="space-y-3">
                    <div className="relative bg-black rounded-lg overflow-hidden">
                      <video
                        ref={videoRef}
                        className="w-full h-64 object-cover"
                        autoPlay
                        playsInline
                        muted
                      />
                      <div className="absolute inset-0 border-2 border-amber-400 rounded-lg pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-64 border-2 border-amber-400 rounded-full opacity-50"></div>
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={captureFacePhoto}
                        className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        📸 Capture Photo
                      </button>
                      <button
                        type="button"
                        onClick={stopFaceCapture}
                        className="flex-1 py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      >
                        ❌ Cancel
                      </button>
                    </div>
                  </div>
                )}
                
                {formData.facePhoto && (
                  <div className="space-y-2">
                    <p className="text-sm text-green-600">
                      ✓ Face photo captured successfully
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, facePhoto: null }));
                      }}
                      className="text-sm text-amber-600 hover:text-amber-500"
                    >
                      Retake Photo
                    </button>
                  </div>
                )}
              </div>
            </div>

            <canvas
              ref={canvasRef}
              style={{ display: 'none' }}
            />
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setCurrentStep('personal')}
                className="flex-1 py-4 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleVerificationSubmit}
                disabled={isLoading || !formData.nidPhoto || !formData.facePhoto}
                className="flex-1 py-4 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Verifying...' : 'Verify Identity'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Password Setup */}
        {currentStep === 'password' && (
          <form className="mt-8 space-y-6" onSubmit={handleFinalSubmit}>
            {verificationResult && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-green-800 font-medium">{verificationResult.message}</span>
                  {verificationResult.confidence && (
                    <span className="text-green-600 text-sm ml-2">
                      ({(verificationResult.confidence * 100).toFixed(1)}% confidence)
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4">
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="sr-only">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
              />
            </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setCurrentStep('verification')}
                className="flex-1 py-4 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-4 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </form>
        )}

        {/* Step 4: Registration Complete */}
        {currentStep === 'complete' && (
          <div className="mt-8 text-center space-y-6">
            <div className="mx-auto h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Registration Complete!</h3>
              <p className="mt-2 text-gray-600">Your SevisPass account has been successfully created.</p>
            </div>
          </div>
        )}

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-medium text-amber-600 hover:text-amber-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}