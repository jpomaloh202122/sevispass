'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UserRegistrationResponse } from '@/types/user';
import LivenessDetection from '@/components/LivenessDetection';
import Header from '@/components/Header';

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

type RegistrationStep = 'personal' | 'verification' | 'preview' | 'password' | 'complete';

interface VerificationResult {
  success: boolean;
  message: string;
  confidence?: number;
}

interface DocumentDetails {
  documentType: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  expiryDate?: string;
  nationality?: string;
  confidence: number;
}

interface PreviewData {
  documentDetails: DocumentDetails | null;
  faceMatchResult: VerificationResult | null;
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData>({
    documentDetails: null,
    faceMatchResult: null
  });

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

      // Store verification results for preview
      const documentDetails: DocumentDetails = {
        documentType: docResult.documentType || (isPassport ? 'Passport' : 'National ID'),
        documentNumber: docResult.documentNumber || formData.nid,
        firstName: docResult.firstName || formData.firstName,
        lastName: docResult.lastName || formData.lastName,
        dateOfBirth: docResult.dateOfBirth,
        expiryDate: docResult.expiryDate,
        nationality: docResult.nationality,
        confidence: docResult.confidence || 0.85
      };

      const faceMatchResult: VerificationResult = {
        success: true,
        message: 'Face Match Successful',
        confidence: faceResult.confidence
      };

      setPreviewData({
        documentDetails,
        faceMatchResult
      });

      setVerificationResult(faceMatchResult);
      
      setMessage({ 
        type: 'success', 
        text: `Verification completed! Proceeding to document preview...` 
      });

      // Wait 1 second then proceed to preview step
      setTimeout(() => {
        setCurrentStep('preview');
        setMessage(null);
      }, 1500);

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
    
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const { [name]: _, ...rest } = prev;
        return rest;
      });
    }
    
    // Real-time validation
    validateField(name, value);
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

  const validateField = (name: string, value: string) => {
    let error = '';
    
    switch (name) {
      case 'firstName':
      case 'lastName':
        if (!value.trim()) {
          error = 'This field is required';
        } else if (value.trim().length < 2) {
          error = 'Must be at least 2 characters';
        }
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value.trim()) {
          error = 'Email is required';
        } else if (!emailRegex.test(value)) {
          error = 'Please enter a valid email address';
        }
        break;
      case 'nid':
        if (!value.trim()) {
          error = 'NID/Passport number is required';
        } else if (value.trim().length < 6) {
          error = 'Must be at least 6 characters';
        }
        break;
      case 'phoneNumber':
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        if (!value.trim()) {
          error = 'Phone number is required';
        } else if (!phoneRegex.test(value.replace(/\s/g, ''))) {
          error = 'Please enter a valid phone number';
        }
        break;
      case 'password':
        if (!value) {
          error = 'Password is required';
        } else if (value.length < 8) {
          error = 'Password must be at least 8 characters';
        }
        // Calculate password strength
        calculatePasswordStrength(value);
        break;
      case 'confirmPassword':
        if (!value) {
          error = 'Please confirm your password';
        } else if (value !== formData.password) {
          error = 'Passwords do not match';
        }
        break;
    }
    
    if (error) {
      setFieldErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/\d/.test(password)) strength += 1;
    if (/[^\w]/.test(password)) strength += 1;
    setPasswordStrength(strength);
  };

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 0:
      case 1:
        return 'Very Weak';
      case 2:
        return 'Weak';
      case 3:
        return 'Good';
      case 4:
        return 'Strong';
      case 5:
        return 'Very Strong';
      default:
        return '';
    }
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 0:
      case 1:
        return 'bg-red-500';
      case 2:
        return 'bg-orange-500';
      case 3:
        return 'bg-yellow-500';
      case 4:
        return 'bg-blue-500';
      case 5:
        return 'bg-green-500';
      default:
        return 'bg-gray-300';
    }
  };


  const renderProgressBar = () => {
    const steps = [
      { key: 'personal', label: 'Personal Info', step: 1 },
      { key: 'verification', label: 'Verification', step: 2 },
      { key: 'preview', label: 'Preview', step: 3 },
      { key: 'password', label: 'Password', step: 4 },
      { key: 'complete', label: 'Complete', step: 5 }
    ];
    
    const getCurrentStepNumber = () => {
      const stepMap = { personal: 1, verification: 2, preview: 3, password: 4, complete: 5 };
      return stepMap[currentStep] || 1;
    };
    
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-white">Registration Progress</span>
          <span className="text-sm text-white/80">
            Step {getCurrentStepNumber()} of 5
          </span>
        </div>
        
        {/* Step indicators */}
        <div className="flex items-center justify-between mb-3">
          {steps.map((step, index) => {
            const isActive = step.key === currentStep;
            const isCompleted = getCurrentStepNumber() > step.step;
            const isUpcoming = getCurrentStepNumber() < step.step;
            
            return (
              <div key={step.key} className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : isActive 
                    ? 'bg-amber-500 border-amber-500 text-white animate-pulse' 
                    : 'bg-gray-100 border-gray-300 text-gray-400'
                }`}>
                  {isCompleted ? '✓' : step.step}
                </div>
                <span className={`text-xs mt-1 transition-colors duration-300 ${
                  isActive ? 'text-yellow-300 font-medium' : 
                  isCompleted ? 'text-green-400' : 'text-white/60'
                }`}>
                  {step.label}
                </span>
                {index < steps.length - 1 && (
                  <div className={`absolute h-0.5 w-full top-4 left-1/2 transform -translate-y-1/2 transition-colors duration-500 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-300'
                  }`} style={{ zIndex: -1, marginLeft: '16px', width: 'calc(100% - 32px)' }} />
                )}
              </div>
            );
          })}
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-yellow-400 to-amber-500 h-2 rounded-full transition-all duration-500 ease-in-out"
            style={{
              width: currentStep === 'personal' ? '20%' : 
                     currentStep === 'verification' ? '40%' : 
                     currentStep === 'preview' ? '60%' : 
                     currentStep === 'password' ? '80%' : '100%'
            }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .shake {
          animation: shake 0.5s ease-in-out;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .fadeInUp {
          animation: fadeInUp 0.6s ease-out;
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .slideIn {
          animation: slideIn 0.4s ease-out;
        }
      `}</style>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-black to-yellow-500 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-6">
            <Image
              src="/newlogo.png"
              alt="SevisPass Logo"
              width={136}
              height={136}
              className="h-34 w-34 mx-auto"
            />
          </div>
          <h2 className="text-3xl font-bold text-white">Create SevisPass Account</h2>
          <p className="mt-2 text-sm text-white/80">
            {currentStep === 'personal' ? 'Enter your personal information' :
             currentStep === 'verification' ? 'Verify your identity' :
             currentStep === 'preview' ? 'Review document details and verification results' :
             currentStep === 'password' ? 'Set your password' :
             'Registration complete'}
          </p>
        </div>

        {renderProgressBar()}

        {message && (
          <div className={`p-4 rounded-lg border transition-all duration-300 transform ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border-green-200 animate-pulse' 
              : 'bg-red-50 text-red-800 border-red-200 shake'
          }`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {message.type === 'success' ? (
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3 text-sm font-medium">
                {message.text}
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Personal Information */}
        {currentStep === 'personal' && (
          <form className="mt-8 space-y-6 fadeInUp">
            <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className={`peer block w-full px-3 pt-6 pb-3 border-2 rounded-lg bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-800/20 text-gray-900 ${
                    fieldErrors.firstName 
                      ? 'border-red-300 focus:border-red-500' 
                      : focusedField === 'firstName' || formData.firstName
                      ? 'border-amber-500 focus:border-amber-600'
                      : 'border-gray-300 hover:border-gray-400 focus:border-amber-500'
                  }`}
                  placeholder=" "
                  value={formData.firstName}
                  onChange={handleInputChange}
                  onFocus={() => setFocusedField('firstName')}
                  onBlur={() => setFocusedField(null)}
                />
                <label 
                  htmlFor="firstName" 
                  className={`absolute left-3 transition-all duration-200 pointer-events-none ${
                    focusedField === 'firstName' || formData.firstName
                      ? 'top-2 text-xs text-amber-600 font-medium'
                      : 'top-4 text-sm text-gray-500'
                  }`}
                >
                  First Name *
                </label>
                {fieldErrors.firstName && (
                  <p className="mt-1 text-xs text-red-600 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {fieldErrors.firstName}
                  </p>
                )}
              </div>
              <div className="relative">
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className={`peer block w-full px-3 pt-6 pb-3 border-2 rounded-lg bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-800/20 text-gray-900 ${
                    fieldErrors.lastName 
                      ? 'border-red-300 focus:border-red-500' 
                      : focusedField === 'lastName' || formData.lastName
                      ? 'border-amber-500 focus:border-amber-600'
                      : 'border-gray-300 hover:border-gray-400 focus:border-amber-500'
                  }`}
                  placeholder=" "
                  value={formData.lastName}
                  onChange={handleInputChange}
                  onFocus={() => setFocusedField('lastName')}
                  onBlur={() => setFocusedField(null)}
                />
                <label 
                  htmlFor="lastName" 
                  className={`absolute left-3 transition-all duration-200 pointer-events-none ${
                    focusedField === 'lastName' || formData.lastName
                      ? 'top-2 text-xs text-amber-600 font-medium'
                      : 'top-4 text-sm text-gray-500'
                  }`}
                >
                  Last Name *
                </label>
                {fieldErrors.lastName && (
                  <p className="mt-1 text-xs text-red-600 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {fieldErrors.lastName}
                  </p>
                )}
              </div>
            </div>

            <div className="relative">
              <input
                id="nid"
                name="nid"
                type="text"
                required
                className={`peer block w-full px-3 pt-6 pb-3 border-2 rounded-lg bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-800/20 text-gray-900 ${
                  fieldErrors.nid 
                    ? 'border-red-300 focus:border-red-500' 
                    : focusedField === 'nid' || formData.nid
                    ? 'border-amber-500 focus:border-amber-600'
                    : 'border-gray-300 hover:border-gray-400 focus:border-amber-500'
                }`}
                placeholder=" "
                value={formData.nid}
                onChange={handleInputChange}
                onFocus={() => setFocusedField('nid')}
                onBlur={() => setFocusedField(null)}
              />
              <label 
                htmlFor="nid" 
                className={`absolute left-3 transition-all duration-200 pointer-events-none ${
                  focusedField === 'nid' || formData.nid
                    ? 'top-2 text-xs text-amber-600 font-medium'
                    : 'top-4 text-sm text-gray-500'
                }`}
              >
                NID or Passport Number *
              </label>
              {fieldErrors.nid && (
                <p className="mt-1 text-xs text-red-600 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {fieldErrors.nid}
                </p>
              )}
            </div>

            <div className="relative">
              <input
                id="email"
                name="email"
                type="email"
                required
                className={`peer block w-full px-3 pt-6 pb-3 border-2 rounded-lg bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-800/20 text-gray-900 ${
                  fieldErrors.email 
                    ? 'border-red-300 focus:border-red-500' 
                    : focusedField === 'email' || formData.email
                    ? 'border-amber-500 focus:border-amber-600'
                    : 'border-gray-300 hover:border-gray-400 focus:border-amber-500'
                }`}
                placeholder=" "
                value={formData.email}
                onChange={handleInputChange}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
              <label 
                htmlFor="email" 
                className={`absolute left-3 transition-all duration-200 pointer-events-none ${
                  focusedField === 'email' || formData.email
                    ? 'top-2 text-xs text-amber-600 font-medium'
                    : 'top-4 text-sm text-gray-500'
                }`}
              >
                Email Address *
              </label>
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-600 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="relative">
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                required
                className={`peer block w-full px-3 pt-6 pb-3 border-2 rounded-lg bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-800/20 text-gray-900 ${
                  fieldErrors.phoneNumber 
                    ? 'border-red-300 focus:border-red-500' 
                    : focusedField === 'phoneNumber' || formData.phoneNumber
                    ? 'border-amber-500 focus:border-amber-600'
                    : 'border-gray-300 hover:border-gray-400 focus:border-amber-500'
                }`}
                placeholder=" "
                value={formData.phoneNumber}
                onChange={handleInputChange}
                onFocus={() => setFocusedField('phoneNumber')}
                onBlur={() => setFocusedField(null)}
              />
              <label 
                htmlFor="phoneNumber" 
                className={`absolute left-3 transition-all duration-200 pointer-events-none ${
                  focusedField === 'phoneNumber' || formData.phoneNumber
                    ? 'top-2 text-xs text-amber-600 font-medium'
                    : 'top-4 text-sm text-gray-500'
                }`}
              >
                Phone Number *
              </label>
              <p className="mt-1 text-xs text-white/70">Example: +675 1234 5678</p>
              {fieldErrors.phoneNumber && (
                <p className="mt-1 text-xs text-red-600 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {fieldErrors.phoneNumber}
                </p>
              )}
            </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handlePersonalInfoNext}
                disabled={isLoading}
                className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-red-800 to-red-900 hover:from-red-900 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-800 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Validating...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>Continue to Verification</span>
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Identity Verification */}
        {currentStep === 'verification' && (
          <div className="mt-8 space-y-6 fadeInUp">
            <div className="space-y-4">
              {/* NID/Passport Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Upload NID/Passport Bio Page *
              </label>
              <div className={`relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 ${
                formData.nidPhoto 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-gray-300 hover:border-amber-400 hover:bg-amber-50'
              }`}>
                <input
                  id="nidPhoto"
                  name="nidPhoto"
                  type="file"
                  accept="image/*"
                  required
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => handleFileChange(e, 'nidPhoto')}
                />
                <div className="text-center">
                  <div className={`mx-auto h-12 w-12 flex items-center justify-center rounded-full mb-4 ${
                    formData.nidPhoto ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {formData.nidPhoto ? (
                      <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    )}
                  </div>
                  {formData.nidPhoto ? (
                    <div>
                      <p className="text-sm font-medium text-green-600 mb-1">
                        ✓ {formData.nidPhoto.name}
                      </p>
                      <p className="text-xs text-green-500">File uploaded successfully</p>
                      <button 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, nidPhoto: null }))}
                        className="mt-2 text-xs text-amber-600 hover:text-amber-500 underline"
                      >
                        Change file
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium text-amber-600">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, JPEG up to 10MB
                      </p>
                    </div>
                  )}
                </div>
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
                    className="group w-full py-3 px-4 border-2 border-dashed border-amber-300 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-red-800 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span className="font-medium">Start Liveness Detection</span>
                  </button>
                )}
                
                {showLivenessDetection && (
                  <div className="border-2 border-amber-200 bg-amber-50/50 rounded-lg p-4 animate-pulse">
                    <div className="flex items-center justify-center mb-4">
                      <div className="flex items-center space-x-2 text-amber-700">
                        <div className="w-3 h-3 bg-amber-500 rounded-full animate-bounce"></div>
                        <div className="w-3 h-3 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-3 h-3 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <span className="ml-2 text-sm font-medium">Preparing camera...</span>
                      </div>
                    </div>
                    <LivenessDetection
                      onLivenessDetected={handleLivenessDetected}
                      onError={handleLivenessError}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLivenessDetection(false)}
                      className="mt-3 w-full py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Cancel</span>
                    </button>
                  </div>
                )}
                
                {formData.facePhoto && formData.livenessVerified && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-800">
                          Liveness verification completed successfully
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          Your identity has been verified
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ 
                          ...prev, 
                          facePhoto: null, 
                          livenessVerified: false 
                        }));
                      }}
                      className="w-full py-2 px-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-red-800 transition-colors duration-200"
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
                className="flex-1 py-4 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-800 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back</span>
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
                className="flex-1 py-4 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-red-800 to-red-900 hover:from-red-900 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-800 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Verifying...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <span>Verify Identity</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Document Preview */}
        {currentStep === 'preview' && (
          <div className="mt-8 space-y-6 fadeInUp">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <svg className="w-6 h-6 mr-3 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Document Information
              </h3>
              
              {previewData.documentDetails && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <label className="block text-sm font-medium text-white/70 mb-1">Document Type</label>
                      <p className="text-white font-medium">{previewData.documentDetails.documentType}</p>
                    </div>
                    
                    <div className="bg-white/5 rounded-lg p-4">
                      <label className="block text-sm font-medium text-white/70 mb-1">Document Number</label>
                      <p className="text-white font-medium">{previewData.documentDetails.documentNumber}</p>
                    </div>
                    
                    <div className="bg-white/5 rounded-lg p-4">
                      <label className="block text-sm font-medium text-white/70 mb-1">Extraction Confidence</label>
                      <div className="flex items-center space-x-2">
                        <div className="w-full bg-white/20 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(previewData.documentDetails.confidence * 100)}%` }}
                          />
                        </div>
                        <span className="text-white font-medium text-sm">
                          {(previewData.documentDetails.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <label className="block text-sm font-medium text-white/70 mb-1">Full Name</label>
                      <p className="text-white font-medium">
                        {previewData.documentDetails.firstName} {previewData.documentDetails.lastName}
                      </p>
                    </div>
                    
                    {previewData.documentDetails.dateOfBirth && (
                      <div className="bg-white/5 rounded-lg p-4">
                        <label className="block text-sm font-medium text-white/70 mb-1">Date of Birth</label>
                        <p className="text-white font-medium">{previewData.documentDetails.dateOfBirth}</p>
                      </div>
                    )}
                    
                    {previewData.documentDetails.nationality && (
                      <div className="bg-white/5 rounded-lg p-4">
                        <label className="block text-sm font-medium text-white/70 mb-1">Nationality</label>
                        <p className="text-white font-medium">{previewData.documentDetails.nationality}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {previewData.faceMatchResult && (
                <div className="bg-white/5 rounded-xl p-4 border border-green-400/30">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold text-white flex items-center">
                      <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Face Verification Result
                    </h4>
                    <span className="bg-green-400/20 text-green-300 px-3 py-1 rounded-full text-sm font-medium">
                      ✓ Verified
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Match Status</label>
                      <p className="text-green-300 font-medium">{previewData.faceMatchResult.message}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Confidence Score</label>
                      <div className="flex items-center space-x-2">
                        <div className="w-full bg-white/20 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(previewData.faceMatchResult.confidence! * 100)}%` }}
                          />
                        </div>
                        <span className="text-green-300 font-medium text-sm">
                          {(previewData.faceMatchResult.confidence! * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-yellow-300 font-medium mb-1">Review Information</h4>
                  <p className="text-white/80 text-sm">
                    Please review the extracted document information and verification results above. 
                    If everything looks correct, click "Continue" to proceed with account creation.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setCurrentStep('verification')}
                className="flex-1 py-4 px-4 border border-gray-300 text-white hover:bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep('password')}
                className="flex-1 py-4 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-red-800 to-red-900 hover:from-red-900 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-800 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>Continue to Password</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Password Setup */}
        {currentStep === 'password' && (
          <form className="mt-8 space-y-6 fadeInUp" onSubmit={handleFinalSubmit}>
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
            <div className="relative">
              <input
                id="password"
                name="password"
                type="password"
                required
                className={`peer block w-full px-3 pt-6 pb-3 border-2 rounded-lg bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-800/20 text-gray-900 ${
                  fieldErrors.password 
                    ? 'border-red-300 focus:border-red-500' 
                    : focusedField === 'password' || formData.password
                    ? 'border-amber-500 focus:border-amber-600'
                    : 'border-gray-300 hover:border-gray-400 focus:border-amber-500'
                }`}
                placeholder=" "
                value={formData.password}
                onChange={handleInputChange}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <label 
                htmlFor="password" 
                className={`absolute left-3 transition-all duration-200 pointer-events-none ${
                  focusedField === 'password' || formData.password
                    ? 'top-2 text-xs text-amber-600 font-medium'
                    : 'top-4 text-sm text-gray-500'
                }`}
              >
                Password *
              </label>
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Password Strength:</span>
                    <span className={`text-xs font-medium ${
                      passwordStrength <= 2 ? 'text-red-600' : 
                      passwordStrength <= 3 ? 'text-yellow-600' : 
                      'text-green-600'
                    }`}>
                      {getPasswordStrengthText()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                      style={{ width: `${(passwordStrength / 5) * 100}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    <p>Requirements: 8+ characters, uppercase, lowercase, number, special character</p>
                  </div>
                </div>
              )}
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-600 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className={`peer block w-full px-3 pt-6 pb-3 border-2 rounded-lg bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-800/20 text-gray-900 ${
                  fieldErrors.confirmPassword 
                    ? 'border-red-300 focus:border-red-500' 
                    : focusedField === 'confirmPassword' || formData.confirmPassword
                    ? formData.confirmPassword && formData.password === formData.confirmPassword
                      ? 'border-green-500 focus:border-green-600'
                      : 'border-amber-500 focus:border-amber-600'
                    : 'border-gray-300 hover:border-gray-400 focus:border-amber-500'
                }`}
                placeholder=" "
                value={formData.confirmPassword}
                onChange={handleInputChange}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
              />
              <label 
                htmlFor="confirmPassword" 
                className={`absolute left-3 transition-all duration-200 pointer-events-none ${
                  focusedField === 'confirmPassword' || formData.confirmPassword
                    ? 'top-2 text-xs text-amber-600 font-medium'
                    : 'top-4 text-sm text-gray-500'
                }`}
              >
                Confirm Password *
              </label>
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <p className="mt-1 text-xs text-green-600 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Passwords match
                </p>
              )}
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setCurrentStep('preview')}
                className="flex-1 py-4 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-800 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back</span>
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-4 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-red-800 to-red-900 hover:from-red-900 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-800 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating Account...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <span>Create Account</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 5: Registration Complete */}
        {currentStep === 'complete' && (
          <div className="mt-8 text-center space-y-6 fadeInUp">
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
                className="inline-block w-full py-4 px-6 bg-gradient-to-r from-red-800 to-red-900 hover:from-red-900 hover:to-red-800 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl"
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
          <p className="text-sm text-white/80">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-medium text-yellow-300 hover:text-yellow-200">
              Sign in
            </Link>
          </p>
        </div>
        </div>
      </div>
    </>
  );
}