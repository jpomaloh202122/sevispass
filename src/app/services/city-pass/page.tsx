'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';

interface CategoryInfo {
  name: string;
  validityPeriod: number;
  description: string;
  requiredDocuments: string[];
}

interface Categories {
  [key: string]: CategoryInfo;
}

interface Application {
  id: string;
  category: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'expired';
  validityPeriod: number;
  applicationDate: string;
  reviewDate?: string;
  approvalDate?: string;
  expiryDate?: string;
  adminNotes?: string;
  ncdcReference?: string;
}

const CityPassPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [categories, setCategories] = useState<Categories>({});
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    dateOfBirth: '',
    gender: '',
    email: user?.email || '',
    phone: user?.phoneNumber || '',
    address: user?.address || '',
    nationality: '',
    identificationNumber: user?.nid || '',
    identificationType: 'national_id' as 'national_id' | 'passport' | 'drivers_license',
    categorySpecificData: {}
  });

  const [uploadedDocuments, setUploadedDocuments] = useState<{[key: string]: File | null}>({});

  // Check if all required documents are uploaded
  const areAllDocumentsUploaded = () => {
    if (!selectedCategory || !categories[selectedCategory]) return false;
    
    const requiredDocs = categories[selectedCategory].requiredDocuments;
    for (let i = 0; i < requiredDocs.length; i++) {
      const docKey = `document_${i}`;
      if (!uploadedDocuments[docKey]) {
        return false;
      }
    }
    return true;
  };

  // Comprehensive validation for form submission
  const canSubmit = () => {
    // Basic required fields validation
    const basicFieldsValid = selectedCategory && 
      formData.firstName && 
      formData.lastName && 
      formData.email && 
      formData.dateOfBirth && 
      formData.gender && 
      formData.phone && 
      formData.address && 
      formData.nationality && 
      formData.identificationNumber;
    
    // All required documents must be uploaded
    const documentsValid = areAllDocumentsUploaded();
    
    return basicFieldsValid && documentsValid;
  };

  // Prefill form data when user data is available
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName || prev.firstName,
        lastName: user.lastName || prev.lastName,
        email: user.email || prev.email,
        phone: user.phoneNumber || prev.phone,
        address: user.address || prev.address,
        identificationNumber: user.nid || prev.identificationNumber,
      }));
    }
  }, [user]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    
    if (user && isAuthenticated && token) {
      fetchCategoryInfo();
      fetchUserApplications();
    } else {
      // User not authenticated, set loading to false to show login prompt
      setLoading(false);
    }
  }, [user, isAuthenticated]);

  const fetchCategoryInfo = async () => {
    try {
      const token = localStorage.getItem('authToken');
      console.log('Frontend - Token check:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
      
      if (!token) {
        // User not authenticated, don't log as error - this is expected behavior
        setLoading(false);
        return;
      }

      const response = await fetch('/api/city-pass/apply', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      } else {
        console.error('Failed to fetch category info:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching category info:', error);
    }
  };

  const fetchUserApplications = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('No auth token found');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/city-pass/applications', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications);
      } else {
        console.error('Failed to fetch applications:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Authentication required. Please log in again.');
        setSubmitting(false);
        return;
      }

      // Create FormData for file upload
      const submitFormData = new FormData();
      
      // Add form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          submitFormData.append(key, JSON.stringify(value));
        } else {
          submitFormData.append(key, value as string);
        }
      });
      
      // Add category (this will override if already in formData)
      submitFormData.append('category', selectedCategory);
      
      // Debug: Log what we're sending
      console.log('Form data being sent:', {
        category: selectedCategory,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        nationality: formData.nationality,
        identificationNumber: formData.identificationNumber,
        identificationType: formData.identificationType
      });
      
      // Add uploaded documents
      Object.entries(uploadedDocuments).forEach(([key, file]) => {
        if (file) {
          submitFormData.append(key, file);
        }
      });
      
      // Add document metadata
      const documentMetadata = Object.keys(uploadedDocuments).map((key, index) => ({
        key,
        originalName: categories[selectedCategory]?.requiredDocuments[index],
        required: true
      }));
      submitFormData.append('documentMetadata', JSON.stringify(documentMetadata));

      const response = await fetch('/api/city-pass/apply', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Note: Don't set Content-Type for FormData, browser will set it automatically with boundary
        },
        body: submitFormData
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Application submitted successfully! Application ID: ${data.applicationId}`);
        
        // Reset form to initial state with user data prefilled
        setShowApplicationForm(false);
        setSelectedCategory('');
        setUploadedDocuments({});
        setFormData({
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          dateOfBirth: '',
          gender: '',
          email: user?.email || '',
          phone: user?.phoneNumber || '',
          address: user?.address || '',
          nationality: '',
          identificationNumber: user?.nid || '',
          identificationType: 'national_id',
          categorySpecificData: {}
        });
        fetchUserApplications();
      } else {
        let errorData = {};
        let errorMessage = 'Unknown error occurred';
        
        try {
          const responseText = await response.text();
          console.error('Raw API Response:', responseText);
          console.error('Response Status:', response.status);
          console.error('Response Headers:', Object.fromEntries(response.headers.entries()));
          
          if (responseText) {
            try {
              errorData = JSON.parse(responseText);
              errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (parseError) {
              console.error('Failed to parse error response as JSON:', parseError);
              errorMessage = responseText || errorMessage;
            }
          }
        } catch (readError) {
          console.error('Failed to read error response:', readError);
        }
        
        console.error('API Error Response:', errorData);
        
        if (response.status === 401) {
          alert('Authentication expired. Please log in again.');
          window.location.href = '/auth/login';
        } else {
          setSubmitError(`Error (${response.status}): ${errorMessage}`);
        }
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      let errorMessage = 'Failed to submit application';
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message) {
        errorMessage = `Failed to submit application: ${error.message}`;
      }
      
      setSubmitError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      under_review: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
        </div>
      </div>
    );
  }

  if (!user || !isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white border-2 border-yellow-400 rounded-lg shadow-lg p-8">
            <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-black mb-4">Authentication Required</h1>
            <p className="text-black/70 mb-6">Please log in to access the City Pass application.</p>
            <a 
              href="/auth/login" 
              className="bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-3 rounded-md transition-colors font-medium border-2 border-black/10 hover:border-black/20 shadow-lg"
            >
              🔑 Go to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black p-8 rounded-2xl shadow-lg">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 9a2 2 0 10-4 0v5a2 2 0 01-2 2h6m-6-4h4m8 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-black mb-2">City Pass Application</h1>
                <p className="text-black/80 text-lg">Apply for your city pass to access various services and benefits within the city limits.</p>
              </div>
            </div>
            <div className="bg-black/10 rounded-lg p-4 mt-4">
              <p className="text-black/90 text-sm">
                🏛️ Official Papua New Guinea City Pass • ⚡ Fast processing • 📱 Digital verification
              </p>
            </div>
          </div>
        </div>

        {!showApplicationForm ? (
          <>
            {/* Streamlined Application Button */}
            <div className="bg-white border-2 border-yellow-400 rounded-lg shadow-lg p-8 mb-8 text-center">
              <div className="max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-black mb-4">Apply for City Pass</h2>
                <p className="text-black/70 mb-6">
                  Choose your preferred pass type and complete the application in one simple form.
                </p>
                <button
                  onClick={() => setShowApplicationForm(true)}
                  className="bg-yellow-400 hover:bg-yellow-500 text-black px-8 py-3 rounded-lg text-lg font-medium transition-colors shadow-lg border-2 border-black/10 hover:border-black/20"
                >
                  Start Application
                </button>
              </div>
            </div>

            {applications.length > 0 && (
              <div className="bg-white border-2 border-yellow-400 rounded-lg shadow-lg">
                <div className="px-6 py-4 border-b border-yellow-400 bg-yellow-400">
                  <h2 className="text-xl font-semibold text-black">Your Applications</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-yellow-400">
                    <thead className="bg-yellow-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Application ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Application Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Validity
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {applications.map((application) => (
                        <tr key={application.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {application.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {application.category.replace('_', ' ').toUpperCase()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(application.status)}`}>
                              {application.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(application.applicationDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {application.validityPeriod} months
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white border-2 border-yellow-400 rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-black">
                  City Pass Application
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowApplicationForm(false);
                  setSelectedCategory('');
                  setUploadedDocuments({});
                  setSubmitError('');
                }}
                className="text-black/60 hover:text-black bg-yellow-100 hover:bg-yellow-200 rounded-full p-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitApplication} className="space-y-6">
              {/* Prefill Notice */}
              <div className="bg-green-50 border-2 border-green-400 p-4 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-green-800">
                    <span className="font-medium">✨ Smart Prefill:</span> Your personal information from SEVIS Pass has been automatically filled in. 
                    You can modify any field as needed, or complete the remaining required fields.
                  </p>
                </div>
              </div>

              {/* Pass Type Selection */}
              <div className="bg-yellow-50 border-2 border-yellow-400 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-black mb-4">🎯 Select Pass Type</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Pass Category *
                    </label>
                    <select
                      required
                      value={selectedCategory}
                      onChange={(e) => {
                        setSelectedCategory(e.target.value);
                        // Clear uploaded documents when category changes
                        setUploadedDocuments({});
                      }}
                      className="w-full px-3 py-2 border-2 border-yellow-400 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white text-black"
                    >
                      <option value="">Choose your pass type...</option>
                      {Object.entries(categories).map(([key, category]) => (
                        <option key={key} value={key}>
                          {category.name} ({category.validityPeriod} months)
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {selectedCategory && (
                    <div className="mt-4 p-4 bg-white rounded-md border-2 border-yellow-400 shadow-sm">
                      <h4 className="font-medium text-black mb-2">📝 {categories[selectedCategory]?.name}</h4>
                      <p className="text-sm text-black/80 mb-3">{categories[selectedCategory]?.description}</p>
                      <div className="text-sm">
                        <p className="text-black mb-2">
                          <span className="font-medium">⏰ Validity:</span> {categories[selectedCategory]?.validityPeriod} months
                        </p>
                        <p className="text-black mb-1">
                          <span className="font-medium">📋 Required Documents:</span>
                        </p>
                        <ul className="list-disc list-inside text-black/80 text-xs">
                          {categories[selectedCategory]?.requiredDocuments.map((doc, index) => (
                            <li key={index}>{doc}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    First Name *
                    {user?.firstName && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ From SEVIS Pass
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="w-full px-3 py-2 border-2 border-yellow-400 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Last Name *
                    {user?.lastName && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ From SEVIS Pass
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="w-full px-3 py-2 border-2 border-yellow-400 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                    className="w-full px-3 py-2 border-2 border-yellow-400 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Gender *
                  </label>
                  <select
                    required
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    className="w-full px-3 py-2 border-2 border-yellow-400 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Email *
                    {user?.email && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ From SEVIS Pass
                      </span>
                    )}
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border-2 border-yellow-400 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Phone *
                    {user?.phoneNumber && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ From SEVIS Pass
                      </span>
                    )}
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+675 XXX XXXXX"
                    pattern="[\+]?[0-9\s\-\(\)]+"
                    title="Please enter a valid phone number"
                    className="w-full px-3 py-2 border-2 border-yellow-400 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-black mb-1">
                    Address *
                    {user?.address && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ From SEVIS Pass
                      </span>
                    )}
                  </label>
                  <textarea
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border-2 border-yellow-400 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Nationality *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nationality}
                    onChange={(e) => setFormData({...formData, nationality: e.target.value})}
                    className="w-full px-3 py-2 border-2 border-yellow-400 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Identification Type *
                  </label>
                  <select
                    required
                    value={formData.identificationType}
                    onChange={(e) => setFormData({...formData, identificationType: e.target.value as any})}
                    className="w-full px-3 py-2 border-2 border-yellow-400 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  >
                    <option value="national_id">National ID</option>
                    <option value="passport">Passport</option>
                    <option value="drivers_license">Driver's License</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Identification Number *
                    {user?.nid && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ From SEVIS Pass
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.identificationNumber}
                    onChange={(e) => setFormData({...formData, identificationNumber: e.target.value})}
                    className="w-full px-3 py-2 border-2 border-yellow-400 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
              </div>

              {/* Document Upload Section */}
              {selectedCategory && (
                <div className="bg-yellow-50 border-2 border-yellow-400 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-black mb-4">📎 Required Documents</h3>
                  <p className="text-sm text-black/80 mb-4">
                    Please upload the following documents as required for your selected pass type:
                  </p>
                  
                  <div className="space-y-4">
                    {categories[selectedCategory]?.requiredDocuments.map((doc, index) => {
                      const docKey = `document_${index}`;
                      return (
                        <div key={index} className="bg-white p-4 rounded-md border-2 border-yellow-400 shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <label className="block text-sm font-medium text-black">
                              {doc} *
                            </label>
                            {uploadedDocuments[docKey] && (
                              <span className="text-black text-xs bg-yellow-300 px-2 py-1 rounded">
                                ✓ Uploaded
                              </span>
                            )}
                          </div>
                          
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              
                              // Validate file size (10MB limit)
                              if (file && file.size > 10 * 1024 * 1024) {
                                alert(`File "${file.name}" is too large. Maximum size is 10MB.`);
                                e.target.value = ''; // Clear the input
                                return;
                              }
                              
                              setUploadedDocuments(prev => ({
                                ...prev,
                                [docKey]: file
                              }));
                            }}
                            className="w-full px-3 py-2 border-2 border-yellow-400 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-yellow-50 file:text-black hover:file:bg-yellow-100"
                            required
                          />
                          
                          {uploadedDocuments[docKey] && (
                            <div className="mt-2 text-xs text-black/70">
                              <p>📄 {uploadedDocuments[docKey]?.name}</p>
                              <p>📊 {((uploadedDocuments[docKey]?.size || 0) / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          )}
                          
                          <p className="text-xs text-black/60 mt-1">
                            Accepted formats: PDF, JPG, PNG, DOC, DOCX (Max: 10MB)
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="mt-4 p-3 bg-white rounded-md border-2 border-yellow-400">
                    <p className="text-xs text-black">
                      <strong>📋 Document Guidelines:</strong>
                    </p>
                    <ul className="text-xs text-black/80 mt-1 space-y-1">
                      <li>• All documents must be clear and readable</li>
                      <li>• Photos should be taken in good lighting</li>
                      <li>• PDFs are preferred for official documents</li>
                      <li>• Ensure all text is visible and not cut off</li>
                      <li>• Documents must be recent (within last 6 months where applicable)</li>
                    </ul>
                  </div>
                </div>
              )}

              {selectedCategory && (
                <div className="bg-yellow-50 border-2 border-yellow-400 p-4 rounded-md shadow-sm">
                  <h3 className="font-medium text-black mb-2">📋 Application Summary</h3>
                  <p className="text-sm text-black">
                    <strong>Pass Type:</strong> {categories[selectedCategory]?.name}<br/>
                    <strong>Validity:</strong> {categories[selectedCategory]?.validityPeriod} months<br/>
                    <strong>Documents:</strong> {Object.values(uploadedDocuments).filter(file => file !== null).length} of {categories[selectedCategory]?.requiredDocuments.length || 0} uploaded<br/>
                    <strong>Required Fields:</strong> {[
                      formData.firstName, formData.lastName, formData.email, formData.dateOfBirth, 
                      formData.gender, formData.phone, formData.address, formData.nationality, 
                      formData.identificationNumber
                    ].filter(field => field && field.trim()).length} of 9 completed<br/>
                    <strong>Status:</strong> {canSubmit() ? '✅ Ready to submit' : '⚠️ Complete all requirements'}
                  </p>
                  <p className="text-xs text-black/70 mt-2">
                    Please ensure all information is accurate and all required documents are uploaded before submitting.
                  </p>
                </div>
              )}

              {/* Error Display */}
              {submitError && (
                <div className="bg-red-50 border-2 border-red-400 p-4 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="text-red-800 font-medium">Submission Error</h4>
                      <p className="text-red-700 text-sm mt-1">{submitError}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={submitting || !canSubmit()}
                  className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium border-2 border-black/10 hover:border-black/20 shadow-lg"
                >
                  {submitting 
                    ? '📤 Submitting Application...' 
                    : !selectedCategory
                      ? 'Select Pass Type First'
                      : !areAllDocumentsUploaded()
                        ? `Upload All Documents (${Object.values(uploadedDocuments).filter(f => f).length}/${categories[selectedCategory]?.requiredDocuments.length || 0})`
                        : !canSubmit()
                          ? 'Complete All Required Fields'
                          : '✅ Submit Application'
                  }
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowApplicationForm(false);
                    setSelectedCategory('');
                    setUploadedDocuments({});
                    setSubmitError('');
                  }}
                  className="px-6 py-2 border-2 border-yellow-400 text-black bg-white hover:bg-yellow-50 rounded-md transition-colors font-medium"
                >
                  ❌ Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default CityPassPage;