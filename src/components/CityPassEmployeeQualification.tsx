'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface QualificationResult {
  isQualified: boolean;
  qualificationType: 'automatic' | 'manual' | 'not_qualified';
  qualificationReason: string;
  missingRequirements: string[];
  recommendedActions: string[];
  autoApprovalEligible: boolean;
}

interface UserDetails {
  hasSevisPass: boolean;
  publicServantStatus: {
    hasApproved: boolean;
    hasPending: boolean;
    applicationId?: string;
  };
  addressInfo: {
    address: string;
    isPortMoresby: boolean;
    detectedAreas: string[];
  };
}

interface QualificationResponse {
  success: boolean;
  qualification: QualificationResult;
  userDetails: UserDetails;
  recommendedAction: string;
  actionInstructions: string[];
}

export default function CityPassEmployeeQualification() {
  const { user } = useAuth();
  const [qualificationData, setQualificationData] = useState<QualificationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      checkQualification();
    }
  }, [user]);

  const checkQualification = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setMessage({ type: 'error', text: 'Authentication required. Please log in.' });
        return;
      }

      const response = await fetch('/api/city-pass/employee-qualification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'check_and_recommend' })
      });

      const data = await response.json();

      if (data.success) {
        setQualificationData(data);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to check qualification' });
      }
    } catch (error) {
      console.error('Error checking qualification:', error);
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoApproval = async () => {
    setIsProcessing(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch('/api/city-pass/employee-qualification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'auto_approve' })
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `🎉 ${data.message} Your City Pass ID: ${data.cityPassId}` 
        });
        // Refresh qualification status
        await checkQualification();
      } else {
        setMessage({ type: 'error', text: data.message || 'Auto-approval failed' });
      }
    } catch (error) {
      console.error('Error processing auto-approval:', error);
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-gray-600">Checking your qualification status...</span>
        </div>
      </div>
    );
  }

  if (!qualificationData) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Check Qualification</h3>
          <p className="text-gray-600 mb-4">We couldn't verify your eligibility for City Pass employee category.</p>
          <button
            onClick={checkQualification}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const renderQualificationStatus = () => {
    const { qualification, userDetails } = qualificationData;
    
    if (qualification.autoApprovalEligible) {
      return (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-green-800">✅ Fully Qualified for Automatic Approval!</h3>
              <p className="text-green-700">{qualification.qualificationReason}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">Your Qualifications:</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center text-green-700">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                SevisPass Digital ID: Active
              </li>
              <li className="flex items-center text-green-700">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Public Servant Pass: {userDetails.publicServantStatus.hasApproved ? 'Approved' : 'Verified'}
              </li>
              <li className="flex items-center text-green-700">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Address: Port Moresby City ({userDetails.addressInfo.detectedAreas.join(', ')})
              </li>
            </ul>
          </div>
          
          <button
            onClick={handleAutoApproval}
            disabled={isProcessing}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing Automatic Approval...
              </div>
            ) : (
              '🚀 Get Automatic City Pass Approval'
            )}
          </button>
        </div>
      );
    }
    
    else if (qualification.isQualified) {
      return (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-yellow-800">⚠️ Manual Application Required</h3>
              <p className="text-yellow-700">{qualification.qualificationReason}</p>
            </div>
          </div>
          
          {qualification.missingRequirements.length > 0 && (
            <div className="bg-white rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-gray-900 mb-2">Missing Requirements:</h4>
              <ul className="space-y-1 text-sm">
                {qualification.missingRequirements.map((req, index) => (
                  <li key={index} className="flex items-center text-yellow-700">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="flex space-x-4">
            <button
              onClick={() => window.location.href = '/services/city-pass'}
              className="flex-1 bg-yellow-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-yellow-700 transition-colors"
            >
              Apply Manually
            </button>
            <button
              onClick={checkQualification}
              className="flex-1 bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
            >
              Recheck Status
            </button>
          </div>
        </div>
      );
    }
    
    else {
      return (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-red-800">❌ Not Qualified for Employee Category</h3>
              <p className="text-red-700">{qualification.qualificationReason}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">Required Steps:</h4>
            <ol className="space-y-2 text-sm list-decimal list-inside">
              {qualification.recommendedActions.map((action, index) => (
                <li key={index} className="text-red-700">{action}</li>
              ))}
            </ol>
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={checkQualification}
              className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              Recheck After Completing Steps
            </button>
            <button
              onClick={() => window.location.href = '/services/city-pass'}
              className="flex-1 bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
            >
              Explore Other Categories
            </button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {message && (
        <div className={`p-4 rounded-lg mb-6 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : message.type === 'error'
            ? 'bg-red-50 text-red-800 border border-red-200'
            : 'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : message.type === 'error' ? (
              <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            )}
            <span className="text-sm font-medium whitespace-pre-line">{message.text}</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">City Pass Employee Category</h2>
          <p className="text-gray-600 mt-2">
            Automatic qualification for government employees living in Port Moresby
          </p>
        </div>

        {renderQualificationStatus()}
        
        <div className="border-t pt-6">
          <div className="text-center text-sm text-gray-500">
            <p className="mb-2">
              <strong>Qualification Criteria:</strong> SevisPass + Public Servant Pass + Port Moresby Address
            </p>
            <p>
              Questions? Contact support at{' '}
              <a href="mailto:support@sevispass.gov.pg" className="text-blue-600 hover:underline">
                support@sevispass.gov.pg
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}