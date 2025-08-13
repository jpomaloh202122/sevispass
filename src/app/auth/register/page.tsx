'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserRegistrationResponse } from '@/types/user';
import LivenessDetection from '@/components/LivenessDetection';

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
  livenessVerified: boolean;
}

type RegistrationStep = 'personal' | 'verification' | 'password' | 'complete';

interface VerificationResult {
  success: boolean;
  message: string;
  confidence?: number;
}

interface LivenessResult {
  isLive: boolean;
  confidence: number;
  checks: {
    blinks: number;
    headMovement: boolean;
    faceQuality: boolean;
  };
}

export default function RegisterPage() {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    nid: '',
    phoneNumber: '',
    nidPhoto: null,
    facePhoto: null,
    livenessVerified: false
  });
  
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('personal');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [showLivenessDetection, setShowLivenessDetection] = useState(false);

  const handlePersonalInfoNext = async () => {
    // Validate personal information
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.nid || !formData.phoneNumber) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }
    
    setIsLoading(true);
    setMessage(null);

    try {
      // Call step 1 validation endpoint to check for duplicates
      const response = await fetch('/api/auth/validate-step1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          nid: formData.nid,
          phoneNumber: formData.phoneNumber,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setMessage({ type: 'error', text: result.message });
        setIsLoading(false);
        return;
      }

      // Validation passed, proceed to verification step
      setCurrentStep('verification');
    } catch (error) {
      console.error('Step 1 validation error:', error);
      setMessage({ 
        type: 'error', 
        text: 'Validation failed. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationSubmit = async () => {
    if (!formData.nidPhoto) {
      setMessage({ type: 'error', text: 'Please upload your NID/Passport photo' });
      return;
    }

    if (!formData.facePhoto) {
      setMessage({ type: 'error', text: 'Please complete liveness verification' });
      return;
    }

    if (!formData.livenessVerified) {
      setMessage({ type: 'error', text: 'Please complete liveness verification' });
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
      
      // Ensure liveness verification is properly set
      const livenessStatus = formData.livenessVerified === true ? 'true' : 'false';
      faceFormData.append('livenessVerified', livenessStatus);
      
      console.log('Registration debug - sending to face verification:', {
        livenessVerified: formData.livenessVerified,
        livenessVerifiedString: livenessStatus,
        formDataState: formData
      });

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
      
      // Add liveness verification status
      const livenessStatus = formData.livenessVerified === true ? 'true' : 'false';
      formDataToSend.append('livenessVerified', livenessStatus);
      
      console.log('Final registration submit - liveness status:', {
        livenessVerified: formData.livenessVerified,
        livenessStatus: livenessStatus
      });
      
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
          text: `Welcome ${formData.firstName}! Your account has been created successfully.` 
        });
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


  const handleLivenessDetected = (result: LivenessResult, capturedImage: File) => {
    console.log('Liveness detection completed:', result);
    setFormData(prev => {
      const newState = {
        ...prev,
        facePhoto: capturedImage,
        livenessVerified: true
      };
      console.log('Updated form state after liveness:', newState);
      return newState;
    });
    setShowLivenessDetection(false);
    setMessage({
      type: 'success',
      text: `Liveness verified! ${result.checks.blinks} blinks detected with ${(result.confidence * 100).toFixed(1)}% confidence`
    });
  };

  const handleLivenessError = (error: string) => {
    setMessage({
      type: 'error',
      text: `Liveness detection failed: ${error}`
    });
    setShowLivenessDetection(false);
  };

  const startLivenessDetection = () => {
    setMessage(null);
    setShowLivenessDetection(true);
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
                disabled={isLoading}
                className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Validating...' : 'Continue to Verification'}
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

            {/* Liveness Detection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Liveness Verification *
              </label>
              <div className="space-y-3">
                {!formData.facePhoto && !showLivenessDetection && (
                  <button
                    type="button"
                    onClick={startLivenessDetection}
                    className="w-full py-2 px-4 border border-amber-300 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    🔍 Start Liveness Detection
                  </button>
                )}
                
                {showLivenessDetection && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <LivenessDetection
                      onLivenessDetected={handleLivenessDetected}
                      onError={handleLivenessError}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLivenessDetection(false)}
                      className="mt-3 w-full py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      ❌ Cancel
                    </button>
                  </div>
                )}
                
                {formData.facePhoto && formData.livenessVerified && (
                  <div className="space-y-2">
                    <p className="text-sm text-green-600">
                      ✓ Liveness verification completed successfully
                    </p>
                    <p className="text-xs text-gray-500">
                      Status: {formData.livenessVerified ? 'Verified' : 'Not Verified'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ 
                          ...prev, 
                          facePhoto: null, 
                          livenessVerified: false 
                        }));
                      }}
                      className="text-sm text-amber-600 hover:text-amber-500"
                    >
                      Redo Liveness Check
                    </button>
                  </div>
                )}
                
                {formData.facePhoto && !formData.livenessVerified && (
                  <div className="space-y-2">
                    <p className="text-sm text-red-600">
                      ⚠ Liveness verification required
                    </p>
                  </div>
                )}
              </div>
            </div>

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
                onClick={() => {
                  console.log('Verify button clicked - form state:', {
                    nidPhoto: !!formData.nidPhoto,
                    facePhoto: !!formData.facePhoto,
                    livenessVerified: formData.livenessVerified
                  });
                  handleVerificationSubmit();
                }}
                disabled={isLoading || !formData.nidPhoto || !formData.facePhoto || !formData.livenessVerified}
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
              <h3 className="text-2xl font-bold text-gray-900">Account Created Successfully!</h3>
              <p className="mt-2 text-gray-600">
                Your SevisPass account has been created and your identity has been verified.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-left">
              <h4 className="text-lg font-semibold text-amber-900 mb-3">Next Steps:</h4>
              <div className="space-y-2 text-sm text-amber-800">
                <div className="flex items-start">
                  <span className="font-medium mr-2">1.</span>
                  <span>Log in to your new SevisPass account</span>
                </div>
                <div className="flex items-start">
                  <span className="font-medium mr-2">2.</span>
                  <span>Schedule your biometric fingerprint collection appointment from your dashboard</span>
                </div>
                <div className="flex items-start">
                  <span className="font-medium mr-2">3.</span>
                  <span>Complete your biometric collection to activate your Digital ID</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Link 
                href="/auth/login"
                className="inline-block w-full py-4 px-6 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl"
              >
                Continue to Login
              </Link>
              <p className="text-sm text-gray-500">
                You can schedule your biometric appointment after logging in
              </p>
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