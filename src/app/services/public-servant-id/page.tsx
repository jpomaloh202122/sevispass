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
  dpmReference?: string;
}

const PublicServantIdPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [categories, setCategories] = useState<Categories>({});
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    employmentDetails: {
      department: '',
      position: '',
      employeeId: '',
      governmentEmail: '',
      startDate: '',
      contractType: 'permanent' as 'permanent' | 'contract' | 'temporary' | 'consultant'
    }
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

      const response = await fetch('/api/public-servant-id/apply', {
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
        // User not authenticated, don't log as error - this is expected behavior
        setLoading(false);
        return;
      }

      const response = await fetch('/api/public-servant-id/applications', {
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
      
      // Add category
      submitFormData.append('category', selectedCategory);
      
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

      const response = await fetch('/api/public-servant-id/apply', {
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
        setShowApplicationForm(false);
        setSelectedCategory('');
        setUploadedDocuments({});
        setFormData({
          firstName: '',
          lastName: '',
          dateOfBirth: '',
          gender: '',
          email: '',
          phone: '',
          address: '',
          nationality: '',
          identificationNumber: '',
          identificationType: 'national_id',
          employmentDetails: {
            department: '',
            position: '',
            employeeId: '',
            governmentEmail: '',
            startDate: '',
            contractType: 'permanent'
          }
        });
        fetchUserApplications();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('Failed to submit application. Please try again.');
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  if (!user || !isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white border-2 border-red-600 rounded-lg shadow-lg p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-black mb-4">Authentication Required</h1>
            <p className="text-gray-700 mb-6">Please log in to access the Public Servant ID application.</p>
            <a 
              href="/auth/login" 
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md transition-colors font-medium border-2 border-red-700 hover:border-red-800 shadow-lg"
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
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-8 rounded-2xl shadow-lg">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Public Servant ID Application</h1>
                    <p className="text-white/90 text-lg">Apply for your official Public Servant ID to access government services and benefits.</p>
                  </div>
                </div>
                <div className="bg-white/10 rounded-lg p-4 mt-4">
                  <p className="text-white/90 text-sm">
                    🏛️ Official Papua New Guinea Public Servant ID • ⚡ Fast processing • 📱 Digital verification
                  </p>
                </div>
              </div>
            </div>

            {!showApplicationForm ? (
              <>
                {/* Streamlined Application Button */}
                <div className="bg-white border-2 border-red-600 rounded-lg shadow-lg p-8 mb-8 text-center">
                  <div className="max-w-2xl mx-auto">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-black mb-4">Apply for Public Servant ID</h2>
                    <p className="text-gray-700 mb-6">
                      Choose your employment category and complete the application with required documents.
                    </p>
                    <button
                      onClick={() => setShowApplicationForm(true)}
                      className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors shadow-lg border-2 border-red-700 hover:border-red-800"
                    >
                      Start Application
                    </button>
                  </div>
                </div>

                {applications.length > 0 && (
                  <div className="bg-white border-2 border-red-600 rounded-lg shadow-lg">
                    <div className="px-6 py-4 border-b border-red-600 bg-red-600">
                      <h2 className="text-xl font-semibold text-white">Your Applications</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-red-600">
                        <thead className="bg-red-50">
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
              <div className="bg-white border-2 border-red-600 rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-black">
                      Public Servant ID Application
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      setShowApplicationForm(false);
                      setSelectedCategory('');
                      setUploadedDocuments({});
                    }}
                    className="text-gray-600 hover:text-black bg-red-100 hover:bg-red-200 rounded-full p-2 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmitApplication} className="space-y-6">
                  {/* Employment Category Selection */}
                  <div className="bg-red-50 border-2 border-red-600 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-black mb-4">🎯 Select Employment Category</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-black mb-2">
                          Employment Category *
                        </label>
                        <select
                          required
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-red-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-black"
                        >
                          <option value="">Choose your employment category...</option>
                          {Object.entries(categories).map(([key, category]) => (
                            <option key={key} value={key}>
                              {category.name} ({category.validityPeriod} months)
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {selectedCategory && (
                        <div className="mt-4 p-4 bg-white rounded-md border-2 border-red-600 shadow-sm">
                          <h4 className="font-medium text-black mb-2">📝 {categories[selectedCategory]?.name}</h4>
                          <p className="text-sm text-gray-700 mb-3">{categories[selectedCategory]?.description}</p>
                          <div className="text-sm">
                            <p className="text-black mb-2">
                              <span className="font-medium">⏰ Validity:</span> {categories[selectedCategory]?.validityPeriod} months
                            </p>
                            <p className="text-black mb-1">
                              <span className="font-medium">📋 Required Documents:</span>
                            </p>
                            <ul className="list-disc list-inside text-gray-700 text-xs">
                              {categories[selectedCategory]?.requiredDocuments.map((doc, index) => (
                                <li key={index}>{doc}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Prefill Notice */}
                  <div className="bg-green-50 border-2 border-green-400 p-4 rounded-lg mb-6">
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

                  {/* Personal Information */}
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
                        className="w-full px-3 py-2 border-2 border-red-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                        className="w-full px-3 py-2 border-2 border-red-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                        className="w-full px-3 py-2 border-2 border-red-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                        className="w-full px-3 py-2 border-2 border-red-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                        className="w-full px-3 py-2 border-2 border-red-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                        className="w-full px-3 py-2 border-2 border-red-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                        className="w-full px-3 py-2 border-2 border-red-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                        className="w-full px-3 py-2 border-2 border-red-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                        className="w-full px-3 py-2 border-2 border-red-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                        className="w-full px-3 py-2 border-2 border-red-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                  </div>

                  {/* Employment Details */}
                  <div className="bg-red-50 border-2 border-red-600 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-black mb-4">💼 Employment Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
                          Department *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.employmentDetails.department}
                          onChange={(e) => setFormData({
                            ...formData, 
                            employmentDetails: {...formData.employmentDetails, department: e.target.value}
                          })}
                          className="w-full px-3 py-2 border-2 border-red-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
                          Position *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.employmentDetails.position}
                          onChange={(e) => setFormData({
                            ...formData, 
                            employmentDetails: {...formData.employmentDetails, position: e.target.value}
                          })}
                          className="w-full px-3 py-2 border-2 border-red-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
                          Employee ID *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.employmentDetails.employeeId}
                          onChange={(e) => setFormData({
                            ...formData, 
                            employmentDetails: {...formData.employmentDetails, employeeId: e.target.value}
                          })}
                          className="w-full px-3 py-2 border-2 border-red-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
                          Government Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.employmentDetails.governmentEmail}
                          onChange={(e) => setFormData({
                            ...formData, 
                            employmentDetails: {...formData.employmentDetails, governmentEmail: e.target.value}
                          })}
                          className="w-full px-3 py-2 border-2 border-red-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
                          Start Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.employmentDetails.startDate}
                          onChange={(e) => setFormData({
                            ...formData, 
                            employmentDetails: {...formData.employmentDetails, startDate: e.target.value}
                          })}
                          className="w-full px-3 py-2 border-2 border-red-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
                          Contract Type *
                        </label>
                        <select
                          required
                          value={formData.employmentDetails.contractType}
                          onChange={(e) => setFormData({
                            ...formData, 
                            employmentDetails: {...formData.employmentDetails, contractType: e.target.value as any}
                          })}
                          className="w-full px-3 py-2 border-2 border-red-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        >
                          <option value="permanent">Permanent</option>
                          <option value="contract">Contract</option>
                          <option value="temporary">Temporary</option>
                          <option value="consultant">Consultant</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Document Upload Section */}
                  {selectedCategory && (
                    <div className="bg-red-50 border-2 border-red-600 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold text-black mb-4">📎 Required Documents</h3>
                      <p className="text-sm text-gray-700 mb-4">
                        Please upload the following documents as required for your selected employment category:
                      </p>
                      
                      <div className="space-y-4">
                        {categories[selectedCategory]?.requiredDocuments.map((doc, index) => {
                          const docKey = `document_${index}`;
                          return (
                            <div key={index} className="bg-white p-4 rounded-md border-2 border-red-600 shadow-sm">
                              <div className="flex justify-between items-start mb-2">
                                <label className="block text-sm font-medium text-black">
                                  {doc} *
                                </label>
                                {uploadedDocuments[docKey] && (
                                  <span className="text-black text-xs bg-red-300 px-2 py-1 rounded">
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
                                className="w-full px-3 py-2 border-2 border-red-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-black hover:file:bg-red-100"
                                required
                              />
                              
                              {uploadedDocuments[docKey] && (
                                <div className="mt-2 text-xs text-gray-700">
                                  <p>📄 {uploadedDocuments[docKey]?.name}</p>
                                  <p>📊 {((uploadedDocuments[docKey]?.size || 0) / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                              )}
                              
                              <p className="text-xs text-gray-600 mt-1">
                                Accepted formats: PDF, JPG, PNG, DOC, DOCX (Max: 10MB)
                              </p>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="mt-4 p-3 bg-white rounded-md border-2 border-red-600">
                        <p className="text-xs text-black">
                          <strong>📋 Document Guidelines:</strong>
                        </p>
                        <ul className="text-xs text-gray-700 mt-1 space-y-1">
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
                    <div className="bg-red-50 border-2 border-red-600 p-4 rounded-md shadow-sm">
                      <h3 className="font-medium text-black mb-2">📋 Application Summary</h3>
                      <p className="text-sm text-black">
                        <strong>Employment Category:</strong> {categories[selectedCategory]?.name}<br/>
                        <strong>Validity:</strong> {categories[selectedCategory]?.validityPeriod} months<br/>
                        <strong>Documents:</strong> {Object.values(uploadedDocuments).filter(file => file !== null).length} of {categories[selectedCategory]?.requiredDocuments.length || 0} uploaded<br/>
                        <strong>Status:</strong> {areAllDocumentsUploaded() ? 'Ready to submit ✓' : 'Upload required documents'}
                      </p>
                      <p className="text-xs text-gray-700 mt-2">
                        Please ensure all information is accurate and all required documents are uploaded before submitting.
                      </p>
                    </div>
                  )}

                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      disabled={submitting || !selectedCategory || !areAllDocumentsUploaded()}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium border-2 border-red-700 hover:border-red-800 shadow-lg"
                    >
                      {submitting 
                        ? '📤 Submitting...' 
                        : !selectedCategory 
                          ? '🎯 Select Employment Category First'
                          : !areAllDocumentsUploaded()
                            ? '📎 Upload Required Documents'
                            : '✅ Submit Application'
                      }
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowApplicationForm(false);
                        setSelectedCategory('');
                        setUploadedDocuments({});
                      }}
                      className="px-6 py-2 border-2 border-red-600 text-black bg-white hover:bg-red-50 rounded-md transition-colors font-medium"
                    >
                      ❌ Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PublicServantIdPage;
