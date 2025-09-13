'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

interface Application {
  id: string;
  userId: string;
  type: 'city-pass' | 'public-servant-id';
  firstName: string;
  lastName: string;
  email: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'expired';
  applicationDate: string;
  reviewDate?: string;
  approvalDate?: string;
  adminNotes?: string;
  reviewedBy?: string;
  category?: string;
  validityPeriod?: number;
  // City Pass specific
  identificationNumber?: string;
  identificationType?: string;
  // Public Servant ID specific
  employmentDetails?: {
    department: string;
    position: string;
    employeeId: string;
    governmentEmail: string;
  };
}

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [adminInfo, setAdminInfo] = useState<{role: string; id: string; username: string} | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cityPass: 0,
    publicServantId: 0
  });
  const [filterType, setFilterType] = useState<'all' | 'city-pass' | 'public-servant-id'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    // Check admin authentication
    const token = localStorage.getItem('adminToken');
    const admin = localStorage.getItem('adminUser');
    
    if (!token || !admin) {
      router.push('/admin/login');
      return;
    }

    try {
      const adminData = JSON.parse(admin);
      if (!['superadmin', 'dpm_superadmin', 'ncdc_superadmin'].includes(adminData.role)) {
        // Redirect regular admins to their specific dashboards
        if (adminData.adminType === 'ncdc') {
          router.push('/admin/city-pass');
        } else {
          router.push('/admin/dashboard');
        }
        return;
      }
      setAdminInfo(adminData);
      loadAllApplications();
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/admin/login');
    }
  }, [router]);

  const loadAllApplications = async () => {
    try {
      const [cityPassResponse, publicServantIdResponse] = await Promise.all([
        fetch('/api/admin/city-pass/applications', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          }
        }),
        fetch('/api/admin/applications', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          }
        })
      ]);

      const allApplications: Application[] = [];

      // Load City Pass applications
      if (cityPassResponse.ok) {
        const cityPassData = await cityPassResponse.json();
        const cityPassApps = cityPassData.applications?.map((app: any) => ({
          ...app,
          type: 'city-pass' as const,
          email: app.email || app.workEmail,
          applicationDate: app.applicationDate || app.createdAt
        })) || [];
        allApplications.push(...cityPassApps);
      }

      // Load Public Servant ID applications
      if (publicServantIdResponse.ok) {
        const psidData = await publicServantIdResponse.json();
        const psidApps = psidData.applications?.map((app: any) => ({
          ...app,
          type: 'public-servant-id' as const,
          email: app.workEmail || app.email,
          applicationDate: app.applicationDate || app.createdAt
        })) || [];
        allApplications.push(...psidApps);
      }

      // Remove duplicates based on ID (in case an application appears in both APIs)
      const uniqueApplications = allApplications.filter((app, index, self) => 
        index === self.findIndex(a => a.id === app.id)
      );

      // Sort by application date (newest first)
      uniqueApplications.sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime());

      setApplications(uniqueApplications);
      
      // Calculate stats
      const total = uniqueApplications.length;
      const pending = uniqueApplications.filter(app => app.status === 'pending').length;
      const approved = uniqueApplications.filter(app => app.status === 'approved').length;
      const rejected = uniqueApplications.filter(app => app.status === 'rejected').length;
      const cityPass = uniqueApplications.filter(app => app.type === 'city-pass').length;
      const publicServantId = uniqueApplications.filter(app => app.type === 'public-servant-id').length;
      
      setStats({ total, pending, approved, rejected, cityPass, publicServantId });
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.push('/admin/login');
  };

  const handleReviewApplication = async (applicationId: string, decision: 'approved' | 'rejected') => {
    try {
      const application = applications.find(app => app.id === applicationId);
      if (!application) return;

      let response;
      if (application.type === 'city-pass') {
        response = await fetch(`/api/admin/city-pass/applications/${applicationId}/review`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          },
          body: JSON.stringify({
            decision,
            notes: reviewNotes,
            reviewedBy: adminInfo?.username || 'SuperAdmin'
          })
        });
      } else {
        response = await fetch(`/api/admin/applications/${applicationId}/review`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          },
          body: JSON.stringify({
            decision,
            notes: reviewNotes,
            reviewedBy: adminInfo?.username || 'SuperAdmin'
          })
        });
      }

      if (response.ok) {
        alert(`✅ Application ${decision} successfully!`);
        setSelectedApplication(null);
        setReviewNotes('');
        loadAllApplications();
      } else {
        const errorData = await response.json();
        alert(`❌ Failed to ${decision} application: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error reviewing application:', error);
      alert('Error processing review. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'pending': return '⏳';
      case 'under_review': return '🔍';
      case 'expired': return '⏰';
      default: return '○';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'city-pass': return '🏙️';
      case 'public-servant-id': return '🏛️';
      default: return '📄';
    }
  };

  const filteredApplications = applications.filter(app => {
    const typeMatch = filterType === 'all' || app.type === filterType;
    const statusMatch = filterStatus === 'all' || app.status === filterStatus;
    return typeMatch && statusMatch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-white">Loading superadmin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-black">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold text-black">SuperAdmin Dashboard</h1>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    SUPERADMIN
                  </span>
                </div>
                <p className="text-sm text-gray-600">Complete Application Management System</p>
                <p className="text-xs text-red-600 font-medium mt-1">
                  ⚡ Full system access • All application types • Override authority
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{adminInfo?.username}</p>
                  <p className="text-xs text-gray-500">SuperAdmin</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6 border-2 border-red-600">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Applications</dt>
                    <dd className="text-lg font-medium text-black">{stats.total}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-2 border-yellow-600">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending Review</dt>
                    <dd className="text-lg font-medium text-black">{stats.pending}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-2 border-green-600">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Approved</dt>
                    <dd className="text-lg font-medium text-black">{stats.approved}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-2 border-red-600">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Rejected</dt>
                    <dd className="text-lg font-medium text-black">{stats.rejected}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-2 border-blue-600">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-lg">🏙️</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">City Pass</dt>
                    <dd className="text-lg font-medium text-black">{stats.cityPass}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-2 border-purple-600">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 text-lg">🏛️</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Public Servant ID</dt>
                    <dd className="text-lg font-medium text-black">{stats.publicServantId}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-6 border-2 border-gray-300">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Application Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="all">All Types</option>
                  <option value="city-pass">City Pass</option>
                  <option value="public-servant-id">Public Servant ID</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          {/* Applications Table */}
          <div className="bg-white shadow rounded-lg border-2 border-gray-300">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-black mb-4">
                All Applications ({filteredApplications.length})
              </h3>
              
              {filteredApplications.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No applications found</h3>
                  <p className="mt-1 text-sm text-gray-500">No applications match your current filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Applicant
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Submitted
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredApplications.map((application, index) => (
                        <tr key={`${application.type}-${application.id}-${index}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-lg mr-2">{getTypeIcon(application.type)}</span>
                              <span className="text-sm font-medium text-gray-900 capitalize">
                                {application.type.replace('-', ' ')}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {application.firstName} {application.lastName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {application.email}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {application.type === 'city-pass' ? (
                                <>
                                  <div>ID: {application.id}</div>
                                  <div className="text-gray-500">{application.category}</div>
                                </>
                              ) : (
                                <>
                                  <div>Dept: {application.employmentDetails?.department}</div>
                                  <div className="text-gray-500">{application.employmentDetails?.position}</div>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(application.status)}`}>
                              {getStatusIcon(application.status)} {application.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(application.applicationDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => setSelectedApplication(application)}
                              className="text-red-600 hover:text-red-900 mr-4"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Review Modal */}
        {selectedApplication && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                {/* Modal Header */}
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-black">
                    Review {selectedApplication.type.replace('-', ' ').toUpperCase()} Application: {selectedApplication.firstName} {selectedApplication.lastName}
                  </h3>
                  <button
                    onClick={() => setSelectedApplication(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Application Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="text-md font-medium text-black mb-3">Personal Information</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Name:</span> {selectedApplication.firstName} {selectedApplication.lastName}</p>
                      <p><span className="font-medium">Email:</span> {selectedApplication.email}</p>
                      <p><span className="font-medium">Application ID:</span> {selectedApplication.id}</p>
                      <p><span className="font-medium">Submitted:</span> {new Date(selectedApplication.applicationDate).toLocaleString()}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-md font-medium text-black mb-3">
                      {selectedApplication.type === 'city-pass' ? 'City Pass Details' : 'Employment Information'}
                    </h4>
                    <div className="space-y-2 text-sm">
                      {selectedApplication.type === 'city-pass' ? (
                        <>
                          <p><span className="font-medium">Category:</span> {selectedApplication.category}</p>
                          <p><span className="font-medium">ID Number:</span> {selectedApplication.identificationNumber}</p>
                          <p><span className="font-medium">ID Type:</span> {selectedApplication.identificationType}</p>
                          <p><span className="font-medium">Validity:</span> {selectedApplication.validityPeriod} months</p>
                        </>
                      ) : (
                        <>
                          <p><span className="font-medium">Department:</span> {selectedApplication.employmentDetails?.department}</p>
                          <p><span className="font-medium">Position:</span> {selectedApplication.employmentDetails?.position}</p>
                          <p><span className="font-medium">Employee ID:</span> {selectedApplication.employmentDetails?.employeeId}</p>
                          <p><span className="font-medium">Gov Email:</span> {selectedApplication.employmentDetails?.governmentEmail}</p>
                        </>
                      )}
                      <p><span className="font-medium">Current Status:</span> 
                        <span className={`ml-2 px-2 py-1 text-xs rounded ${getStatusColor(selectedApplication.status)}`}>
                          {selectedApplication.status}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Review Notes */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review Notes
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    rows={4}
                    placeholder="Enter notes about your decision..."
                  />
                </div>

                {/* Action Buttons */}
                {selectedApplication.status === 'pending' && (
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => handleReviewApplication(selectedApplication.id, 'rejected')}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      ❌ Reject Application
                    </button>
                    <button
                      onClick={() => handleReviewApplication(selectedApplication.id, 'approved')}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      ✅ Approve Application
                    </button>
                  </div>
                )}

                {selectedApplication.status !== 'pending' && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">
                      This application has already been reviewed.
                    </p>
                    {selectedApplication.adminNotes && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700">Previous Review Notes:</p>
                        <p className="text-sm text-gray-600 mt-1">{selectedApplication.adminNotes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
