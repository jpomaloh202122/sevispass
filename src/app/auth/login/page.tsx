'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import TwoFactorVerification from '@/components/TwoFactorVerification';

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
        login(result.user);
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center mb-6">
            <svg className="h-12 w-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">SevisPass</h2>
          <p className="mt-2 text-sm text-gray-600">Sign in to your digital identity</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {message && (
            <div className={`p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}
          
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
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link href="/auth/forgot-password" className="font-medium text-amber-600 hover:text-amber-500">
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="font-medium text-amber-600 hover:text-amber-500">
                Sign up
              </Link>
            </p>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <span className="text-amber-600 font-semibold">SevisPass</span>
              </button>
              <button
                type="button"
                className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <span className="text-blue-600 font-semibold">ServantPass</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}