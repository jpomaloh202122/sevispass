'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface InteractionData {
  prompt: {
    name: string;
    reasons: string[];
    details: Record<string, any>;
  };
  params: {
    client_id: string;
    redirect_uri: string;
    response_type: string;
    scope: string;
    state?: string;
  };
  client: {
    clientId: string;
    clientName?: string;
  };
  session?: {
    accountId?: string;
  };
}

export default function InteractionPage({ params }: { params: { uid: string } }) {
  const [interactionData, setInteractionData] = useState<InteractionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [userUid, setUserUid] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchInteractionData();
  }, []);

  const fetchInteractionData = async () => {
    try {
      const response = await fetch(`/api/auth/interaction/${params.uid}`);
      if (!response.ok) {
        throw new Error('Failed to fetch interaction data');
      }
      const data = await response.json();
      setInteractionData(data);
      
      // Check if user is already logged in
      if (data.session?.accountId) {
        // User is already authenticated, proceed with consent
        await handleConsent();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();

      if (data.success && data.requires2FA) {
        setRequires2FA(true);
        setUserUid(data.uid);
      } else if (data.success && data.user) {
        // Login successful, confirm interaction
        await confirmInteraction(data.user.uid);
      } else {
        setLoginError(data.message || 'Login failed');
      }
    } catch (err) {
      setLoginError('Network error occurred');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleTwoFA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const response = await fetch('/api/auth/complete-2fa-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userUid,
          code: twoFACode,
        }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        await confirmInteraction(data.user.uid);
      } else {
        setLoginError(data.message || '2FA verification failed');
      }
    } catch (err) {
      setLoginError('Network error occurred');
    } finally {
      setLoginLoading(false);
    }
  };

  const confirmInteraction = async (accountId: string) => {
    try {
      const response = await fetch(`/api/auth/interaction/${params.uid}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: { accountId },
        }),
      });

      if (response.ok) {
        // Redirect back to the OIDC flow
        window.location.href = `/api/oidc/auth?uid=${params.uid}`;
      } else {
        throw new Error('Failed to confirm interaction');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirmation failed');
    }
  };

  const handleConsent = async () => {
    if (!interactionData) return;

    try {
      const response = await fetch(`/api/auth/interaction/${params.uid}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consent: {
            grantId: interactionData.session?.accountId,
          },
        }),
      });

      if (response.ok) {
        window.location.href = `/api/oidc/auth?uid=${params.uid}`;
      } else {
        throw new Error('Failed to grant consent');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Consent failed');
    }
  };

  const handleCancel = () => {
    if (interactionData?.params.redirect_uri) {
      const url = new URL(interactionData.params.redirect_uri);
      url.searchParams.set('error', 'access_denied');
      url.searchParams.set('error_description', 'User cancelled the authorization request');
      if (interactionData.params.state) {
        url.searchParams.set('state', interactionData.params.state);
      }
      window.location.href = url.toString();
    } else {
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Return to SevisPass
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!interactionData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">No interaction data found</p>
        </div>
      </div>
    );
  }

  const isLoginPrompt = interactionData.prompt.name === 'login';
  const isConsentPrompt = interactionData.prompt.name === 'consent';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-auto flex justify-center">
            <svg className="h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            SevisPass Authentication
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isLoginPrompt && 'Sign in to continue to the SEVIS Portal'}
            {isConsentPrompt && 'Authorize access to your SevisPass account'}
          </p>
        </div>

        {isLoginPrompt && !requires2FA && (
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email" className="sr-only">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                />
              </div>
            </div>

            {loginError && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-800">{loginError}</div>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loginLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loginLoading ? 'Signing in...' : 'Sign in'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {isLoginPrompt && requires2FA && (
          <form className="mt-8 space-y-6" onSubmit={handleTwoFA}>
            <div>
              <label htmlFor="twofa-code" className="block text-sm font-medium text-gray-700">
                Enter the 6-digit verification code sent to your email
              </label>
              <div className="mt-1">
                <input
                  id="twofa-code"
                  name="twofa-code"
                  type="text"
                  required
                  maxLength={6}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="123456"
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </div>
            </div>

            {loginError && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-800">{loginError}</div>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loginLoading || twoFACode.length !== 6}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loginLoading ? 'Verifying...' : 'Verify'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {isConsentPrompt && (
          <div className="mt-8">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Authorize Application</h3>
              <p className="text-sm text-gray-600 mb-4">
                The application <strong>{interactionData.client.clientName || interactionData.client.clientId}</strong> is requesting access to your SevisPass account.
              </p>
              
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Requested permissions:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {interactionData.params.scope.split(' ').map((scope) => (
                    <li key={scope} className="flex items-center">
                      <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {scope === 'openid' && 'Basic identity information'}
                      {scope === 'profile' && 'Your profile information (name)'}
                      {scope === 'email' && 'Your email address'}
                      {scope === 'phone' && 'Your phone number'}
                      {scope === 'address' && 'Your address information'}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleConsent}
                  className="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Authorize
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Deny
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Powered by SevisPass - Secure Digital Identity for Papua New Guinea
          </p>
        </div>
      </div>
    </div>
  );
}