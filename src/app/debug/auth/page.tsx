'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';

export default function AuthDebugPage() {
  const { user, isAuthenticated } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    setToken(authToken);
  }, []);

  const testTokenAPI = async () => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      alert('No token found');
      return;
    }

    try {
      const response = await fetch('/api/city-pass/apply', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('API Response:', { status: response.status, data });
      alert(`API Response: ${response.status} - ${JSON.stringify(data)}`);
    } catch (error) {
      console.error('API Error:', error);
      alert(`API Error: ${error.message}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Auth Context State</h2>
          <p><strong>User:</strong> {user ? `${user.firstName} ${user.lastName} (${user.email})` : 'Not logged in'}</p>
          <p><strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">localStorage Token</h2>
          <p><strong>Token:</strong> {token ? `${token.substring(0, 50)}...` : 'No token found'}</p>
          <p><strong>Token Length:</strong> {token ? token.length : 0}</p>
        </div>

        <div className="space-x-4">
          <button 
            onClick={testTokenAPI}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Test City Pass API
          </button>
          
          <button 
            onClick={() => window.location.href = '/auth/login'}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Go to Login
          </button>

          <button 
            onClick={() => {
              localStorage.removeItem('authToken');
              localStorage.removeItem('sevispass_user');
              window.location.reload();
            }}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Clear Auth Data
          </button>
        </div>
      </div>
    </div>
  );
}