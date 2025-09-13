'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import TwoFactorVerification from '@/components/TwoFactorVerification';
import LivenessDetection from '@/components/LivenessDetection';
import Header from '@/components/Header';

interface LoginResponse {
  success: boolean;
  requires2FA?: boolean;
  uid?: string;
  user?: {
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
    nid: string;
    phoneNumber: string;
    createdAt: string;
  };
  token?: string;
  message: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showTwoFA, setShowTwoFA] = useState(false);
  const [userUid, setUserUid] = useState('');
  const [loginMethod, setLoginMethod] = useState<'password' | 'face'>('password');
  const [showFaceCapture, setShowFaceCapture] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      let result: LoginResponse;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('JSON parsing error:', jsonError);
        const responseText = await response.text();
        console.error('Response text:', responseText);
        throw new Error('Invalid response format from server');
      }

      // Handle authentication responses
      if (!response.ok) {
        setMessage({ type: 'error', text: result.message || 'Login failed' });
        setIsLoading(false);
        return;
      }

      if (result.success && result.requires2FA) {
        // Show 2FA verification screen
        setUserUid(result.uid!);
        setShowTwoFA(true);
        setMessage({ type: 'success', text: result.message });
      } else if (result.success && result.user) {
        // Direct login (should not happen with 2FA enabled)
        if (result.token) {
          localStorage.setItem('authToken', result.token);
          login(result.user, result.token);
        } else {
          login(result.user);
        }
        setFormData({
          email: '',
          password: ''
        });
        router.push('/dashboard');
      } else {
        setMessage({ type: 'error', text: result.message || 'Login failed' });
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Network error. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleBackFromTwoFA = () => {
    setShowTwoFA(false);
    setUserUid('');
    setMessage(null);
    setIsLoading(false);
  };

  const handleFaceLogin = async (capturedImage: File) => {
    setIsLoading(true);
    setMessage(null);

    try {
      const formDataPayload = new FormData();
      formDataPayload.append('facePhoto', capturedImage);
      formDataPayload.append('email', formData.email); // Include email for user identification

      const response = await fetch('/api/auth/face-login', {
        method: 'POST',
        body: formDataPayload,
      });

      const result: LoginResponse = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: result.message || 'Face recognition failed' });
        return;
      }

      if (result.success && result.requires2FA) {
        setUserUid(result.uid!);
        setShowTwoFA(true);
        setMessage({ type: 'success', text: result.message });
      } else if (result.success && result.user) {
        if (result.token) {
          localStorage.setItem('authToken', result.token);
          login(result.user, result.token);
        } else {
          login(result.user);
        }
        router.push('/dashboard');
      } else {
        setMessage({ type: 'error', text: result.message || 'Face recognition failed' });
      }
    } catch (error) {
      console.error('Face login error:', error);
      setMessage({ 
        type: 'error', 
        text: 'Face recognition failed. Please try again or use password login.' 
      });
    } finally {
      setIsLoading(false);
      setShowFaceCapture(false);
    }
  };

  const startFaceLogin = () => {
    setMessage(null);
    setShowFaceCapture(true);
  };


  // Show 2FA verification if required
  if (showTwoFA) {
    return (
      <TwoFactorVerification 
        userUid={userUid}
        userEmail={formData.email}
        onBack={handleBackFromTwoFA}
      />
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-black to-yellow-500 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-6">
            <Image
              src="/newlogo.png"
              alt="SevisPass Logo"
              width={80}
              height={80}
              className="h-20 w-20 mx-auto"
            />
          </div>
          <h2 className="text-3xl font-bold text-white">SevisPass</h2>
          <p className="mt-2 text-sm text-white/80">Sign in to your digital identity</p>
        </div>

        {/* Login Method Selector */}
        <div className="flex bg-white/10 rounded-xl p-1 backdrop-blur-sm border border-white/20">
          <button
            type="button"
            onClick={() => setLoginMethod('password')}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
              loginMethod === 'password'
                ? 'bg-red-800 text-white shadow-lg'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Password Login
          </button>
          <button
            type="button"
            onClick={() => setLoginMethod('face')}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
              loginMethod === 'face'
                ? 'bg-red-800 text-white shadow-lg'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Face Recognition
          </button>
        </div>

        {message && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {loginMethod === 'password' && (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="sr-only">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="relative block w-full px-3 py-4 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-amber-500 focus:border-amber-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="relative block w-full px-3 py-4 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-amber-500 focus:border-amber-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-white">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link href="/auth/forgot-password" className="font-medium text-yellow-300 hover:text-yellow-200">
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-red-800 to-red-900 hover:from-red-900 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </div>
          </form>
        )}

        {loginMethod === 'face' && (
          <div className="mt-8 space-y-6">
            {!showFaceCapture && (
              <div className="text-center space-y-6">
                {/* Email input for face login */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <label htmlFor="face-email" className="block text-sm font-medium text-white mb-3">
                    Enter your email address
                  </label>
                  <input
                    id="face-email"
                    name="email"
                    type="email"
                    required
                    className="w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">Face Recognition Login</h3>
                  <p className="text-white/70 mb-6">
                    Use your registered face to securely access your SevisPass account. 
                    Make sure you're in a well-lit area and look directly at the camera.
                  </p>
                  <button
                    onClick={startFaceLogin}
                    disabled={isLoading || !formData.email}
                    className="w-full bg-gradient-to-r from-red-800 to-red-900 hover:from-red-900 hover:to-red-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>{isLoading ? 'Processing...' : 'Start Face Recognition'}</span>
                  </button>
                </div>

                <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="text-yellow-300 font-medium mb-1">Security Notice</h4>
                      <p className="text-white/80 text-sm">
                        Face recognition provides secure and convenient access. If recognition fails, 
                        you can always switch to password login.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showFaceCapture && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <LivenessDetection 
                  onLivenessDetected={(result, capturedImage) => {
                    console.log('Liveness detection result:', result);
                    if (result.isLive) {
                      handleFaceLogin(capturedImage);
                    } else {
                      setMessage({ 
                        type: 'error', 
                        text: 'Liveness verification failed. Please try again.' 
                      });
                      setShowFaceCapture(false);
                    }
                  }}
                  onError={(error) => {
                    console.error('Liveness detection error:', error);
                    setMessage({ 
                      type: 'error', 
                      text: error || 'Camera access failed. Please check permissions and try again.' 
                    });
                    setShowFaceCapture(false);
                  }}
                />
                
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowFaceCapture(false)}
                    className="flex-1 py-3 px-4 border border-white/30 text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-center">
          <p className="text-sm text-white/80">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="font-medium text-yellow-300 hover:text-yellow-200">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
    </>
  );
}