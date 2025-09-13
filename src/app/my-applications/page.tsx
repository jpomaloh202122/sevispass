'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';

interface Application {
  id: string;
  type: 'public_servant_id' | 'city_pass';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected';
  applicationDate: string;
  category?: string;
  department?: string;
  canEdit: boolean;
  canDelete: boolean;
  supportingDocuments?: Record<string, string>;
  employmentDetails?: any;
  categorySpecificData?: any;
  reviewedBy?: string;
  reviewedAt?: string;
  adminNotes?: string;
}

export default function MyApplicationsPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !token) {
      router.push('/auth/login');
      return;
    }
    fetchApplications();
  }, [user, token, router]);

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/applications/my-applications', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
      } else {
        console.error('Failed to fetch applications');
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (applicationId: string, applicationType: string) => {
    try {
      const response = await fetch('/api/applications/my-applications', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ applicationId, applicationType }),
      });

      if (response.ok) {
        setApplications(prev => prev.filter(app => app.id !== applicationId));
        setShowDeleteConfirm(null);
        alert('Application deleted successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete application');
      }
    } catch (error) {
      console.error('Error deleting application:', error);
      alert('Failed to delete application');
    }
  };

  const handleEdit = (applicationId: string) => {
    // Navigate to edit page based on application type
    const app = applications.find(a => a.id === applicationId);
    if (app) {
      if (app.type === 'public_servant_id') {
        router.push(`/services/public-servant-id/edit/${applicationId}`);
      } else {
        router.push(`/services/city-pass/edit/${applicationId}`);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status] || colors.pending;
  };

  const getApplicationTypeLabel = (type: string) => {
    return type === 'public_servant_id' ? 'Public Servant ID' : 'City Pass';
  };

  if (!user) {
    return <div>Please log in to view your applications.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-6xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
            <p className="mt-1 text-gray-600">
              Manage your application submissions and track their status
            </p>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading your applications...</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No applications</h3>
                <p className="mt-1 text-sm text-gray-500">You haven't submitted any applications yet.</p>
                <div className="mt-6 flex justify-center space-x-3">
                  <button
                    onClick={() => router.push('/services/public-servant-id')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Apply for Public Servant ID
                  </button>
                  <button
                    onClick={() => router.push('/services/city-pass')}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                  >
                    Apply for City Pass
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-6">
                {applications.map((app) => (
                  <div key={app.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {getApplicationTypeLabel(app.type)}
                          </h3>
                          <span className={`px-3 py-1 text-sm font-medium border rounded-full ${getStatusBadge(app.status)}`}>
                            {app.status.toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Application ID:</span>
                            <p className="font-medium break-all">{app.id}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Submitted:</span>
                            <p className="font-medium">{formatDate(app.applicationDate)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Applicant:</span>
                            <p className="font-medium">{app.firstName} {app.lastName}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Category:</span>
                            <p className="font-medium">{app.category || 'N/A'}</p>
                          </div>
                        </div>

                        {app.reviewedBy && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <div className="text-sm">
                              <p><span className="text-gray-500">Reviewed by:</span> <span className="font-medium">{app.reviewedBy}</span></p>
                              {app.reviewedAt && (
                                <p><span className="text-gray-500">Reviewed on:</span> <span className="font-medium">{formatDate(app.reviewedAt)}</span></p>
                              )}
                              {app.adminNotes && (
                                <div className="mt-2">
                                  <span className="text-gray-500">Admin Notes:</span>
                                  <p className="mt-1 text-gray-700">{app.adminNotes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="ml-6 flex flex-col space-y-2">
                        <button
                          onClick={() => setSelectedApp(app)}
                          className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          View Details
                        </button>
                        
                        {app.canEdit && (
                          <button
                            onClick={() => handleEdit(app.id)}
                            className="px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                          >
                            Edit
                          </button>
                        )}
                        
                        {app.canDelete && (
                          <button
                            onClick={() => setShowDeleteConfirm(app.id)}
                            className="px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Application Details Modal */}
        {selectedApp && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Application Details</h2>
                  <button
                    onClick={() => setSelectedApp(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Personal Information</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-500">Name:</span> {selectedApp.firstName} {selectedApp.lastName}</p>
                      <p><span className="text-gray-500">Email:</span> {selectedApp.email}</p>
                      <p><span className="text-gray-500">Phone:</span> {selectedApp.phone}</p>
                      <p><span className="text-gray-500">Application Type:</span> {getApplicationTypeLabel(selectedApp.type)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Application Status</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">Status:</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(selectedApp.status)}`}>
                          {selectedApp.status.toUpperCase()}
                        </span>
                      </div>
                      <p><span className="text-gray-500">Submitted:</span> {formatDate(selectedApp.applicationDate)}</p>
                      <p><span className="text-gray-500">ID:</span> {selectedApp.id}</p>
                    </div>
                  </div>
                </div>

                {/* Supporting Documents */}
                {selectedApp.supportingDocuments && Object.keys(selectedApp.supportingDocuments).length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Supporting Documents</h3>
                    <div className="space-y-2">
                      {Object.entries(selectedApp.supportingDocuments).map(([key, path]) => {
                        if (!path || path.trim() === '') return null;
                        return (
                          <div key={key} className="flex items-center space-x-2 text-sm">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="font-medium">{key}:</span>
                            <span className="text-gray-600 break-all">{path}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t bg-gray-50 flex justify-end">
                <button
                  onClick={() => setSelectedApp(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Confirm Deletion
                </h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete this application? This action cannot be undone.
                  All associated documents will also be permanently removed.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const app = applications.find(a => a.id === showDeleteConfirm);
                      if (app) {
                        handleDelete(app.id, app.type);
                      }
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}