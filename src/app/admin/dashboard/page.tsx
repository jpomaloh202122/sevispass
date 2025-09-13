'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdvancedDuplicateDashboard from '@/components/AdvancedDuplicateDashboard';
import Header from '@/components/Header';

interface Application {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  workEmail: string;
  employeeNumber: string;
  department: string;
  address: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  documents?: {
    nidDocument: string;
    policeClearance: string;
    medicalCertificate: string;
  };
}

export default function AdminDashboardPage() {
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
    rejected: 0
  });
  const [duplicateStats, setDuplicateStats] = useState({
    total: 0,
    flagged: 0,
    blocking: 0
  });
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [duplicateApplications, setDuplicateApplications] = useState<Application[]>([]);
  const [showAdvancedAnalytics, setShowAdvancedAnalytics] = useState(false);

  const loadApplications = async () => {
    try {
      const response = await fetch('/api/admin/applications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications);
        
        // Calculate stats
        const total = data.applications.length;
        const pending = data.applications.filter((app: Application) => app.status === 'pending').length;
        const approved = data.applications.filter((app: Application) => app.status === 'approved').length;
        const rejected = data.applications.filter((app: Application) => app.status === 'rejected').length;
        
        setStats({ total, pending, approved, rejected });
      } else if (response.status === 401) {
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check admin authentication
    const token = localStorage.getItem('adminToken');
    const admin = localStorage.getItem('adminUser');
    
    if (!token || !admin) {
      router.push('/admin/login');
      return;
    }

    try {
      setAdminInfo(JSON.parse(admin));
      loadApplications();
      loadDuplicateStats();
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/admin/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.push('/admin/login');
  };

  const handleReviewApplication = async (applicationId: string, decision: 'approved' | 'rejected', isOverride = false) => {
    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          decision,
          notes: reviewNotes,
          reviewedBy: adminInfo?.name || 'Admin',
          isOverride: isOverride,
          superAdminAction: adminInfo?.role === 'superadmin'
        })
      });

      if (response.ok) {
        const overrideText = isOverride ? ' (OVERRIDE)' : '';
        alert(`✅ Application ${decision} successfully!${overrideText}`);
        setSelectedApplication(null);
        setReviewNotes('');
        loadApplications(); // Reload applications
      } else {
        const errorData = await response.json();
        alert(`❌ Failed to ${decision} application: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error reviewing application:', error);
      alert('Error processing review. Please try again.');
    }
  };

  const loadDuplicateStats = async () => {
    try {
      const response = await fetch('/api/admin/duplicates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDuplicateStats(data.summary);
      }
    } catch (error) {
      console.error('Error loading duplicate stats:', error);
    }
  };

  const loadDuplicateApplications = async (type: 'all' | 'flagged' | 'blocking' = 'flagged') => {
    try {
      const response = await fetch(`/api/admin/duplicates?type=${type}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDuplicateApplications(data.duplicateApplications);
        setShowDuplicates(true);
      }
    } catch (error) {
      console.error('Error loading duplicate applications:', error);
    }
  };

  const handleDuplicateResolution = async (action: string, applicationId: string, targetId?: string, reason?: string) => {
    try {
      const response = await fetch('/api/admin/duplicates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          action,
          applicationId,
          targetApplicationId: targetId,
          reason
        })
      });

      if (response.ok) {
        alert(`✅ Duplicate issue resolved successfully!`);
        loadDuplicateApplications();
        loadDuplicateStats();
        loadApplications(); // Refresh main applications list
      } else {
        const errorData = await response.json();
        alert(`❌ Failed to resolve duplicate: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error resolving duplicate:', error);
      alert('Error resolving duplicate. Please try again.');
    }
  };

  const scanDummyData = async () => {
    try {
      const response = await fetch('/api/admin/cleanup-dummy-data', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        alert(`🔍 Scan completed!\n\n${data.result.summary}\n\nFiles checked: ${data.result.filesChecked}\nDummy applications found: ${data.result.applicationsRemoved}`);
      } else {
        const errorData = await response.json();
        alert(`❌ Scan failed: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error scanning dummy data:', error);
      alert('Error scanning dummy data. Please try again.');
    }
  };

  const cleanupDummyData = async () => {
    const confirmCleanup = confirm(
      '⚠️ WARNING: This will permanently delete all dummy/test applications.\n\n' +
      'This action cannot be undone. Are you sure you want to continue?'
    );

    if (!confirmCleanup) return;

    try {
      const response = await fetch('/api/admin/cleanup-dummy-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ confirmCleanup: true })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`🧹 Cleanup completed!\n\n${data.result.summary}\n\nFiles checked: ${data.result.filesChecked}\nDummy applications removed: ${data.result.applicationsRemoved}`);
        
        // Refresh applications list
        loadApplications();
      } else {
        const errorData = await response.json();
        alert(`❌ Cleanup failed: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error cleaning dummy data:', error);
      alert('Error cleaning dummy data. Please try again.');
    }
  };

  const checkDatabaseHealth = async () => {
    try {
      // This would call a database health check API
      alert('🔍 Database health check feature coming soon!');
    } catch (error) {
      console.error('Error checking database health:', error);
      alert('Error checking database health. Please try again.');
    }
  };

  /*
  const handleBulkAction = async (action: 'approve' | 'reject', applicationIds: string[]) => {
    if (adminInfo?.role !== 'superadmin') {
      alert('❌ Only SuperAdmins can perform bulk operations.');
      return;
    }

    const confirmMsg = `Are you sure you want to ${action} ${applicationIds.length} applications? This action cannot be undone.`;
    if (!confirm(confirmMsg)) return;

    try {
      for (const appId of applicationIds) {
        await handleReviewApplication(appId, action === 'approve' ? 'approved' : 'rejected', false);
      }
      alert(`✅ Bulk ${action} completed for ${applicationIds.length} applications!`);
    } catch (error) {
      console.error('Bulk action error:', error);
      alert('❌ Error during bulk operation. Some applications may not have been processed.');
    }
  };
  */

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'pending': return '⏳';
      default: return '○';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-gray-900">DPM Admin Dashboard</h1>
                {adminInfo?.role === 'superadmin' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    SUPERADMIN
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">Public Servant ID Application Management</p>
              {adminInfo?.role === 'superadmin' && (
                <p className="text-xs text-yellow-600 font-medium mt-1">
                  ⚡ Unlimited approval authority • Override access • System administration
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{adminInfo?.name}</p>
                <p className="text-xs text-gray-500">{adminInfo?.title}</p>
                <p className="text-xs text-gray-400">{adminInfo?.department}</p>
              </div>
              {adminInfo?.role === 'superadmin' && (
                <a
                  href="/admin/superadmin-dashboard"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  SuperAdmin Dashboard
                </a>
              )}
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Applications</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.total}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
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
                  <dd className="text-lg font-medium text-gray-900">{stats.pending}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
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
                  <dd className="text-lg font-medium text-gray-900">{stats.approved}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
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
                  <dd className="text-lg font-medium text-gray-900">{stats.rejected}</dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Duplicate Management Card */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Duplicate Detection</p>
                    <p className="text-xs text-gray-500">
                      {duplicateStats.flagged > 0 ? 
                        `${duplicateStats.flagged} flagged, ${duplicateStats.blocking} high risk` : 
                        'No duplicates detected'
                      }
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={() => setShowAdvancedAnalytics(true)}
                    className="inline-flex items-center px-3 py-1 border border-blue-300 text-xs font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Analytics
                  </button>
                  {duplicateStats.flagged > 0 && (
                    <button
                      onClick={() => loadDuplicateApplications('flagged')}
                      className="inline-flex items-center px-3 py-1 border border-orange-300 text-xs font-medium rounded text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Review Flagged
                    </button>
                  )}
                  {duplicateStats.blocking > 0 && (
                    <button
                      onClick={() => loadDuplicateApplications('blocking')}
                      className="inline-flex items-center px-3 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      High Risk ({duplicateStats.blocking})
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Maintenance */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">System Maintenance</h3>
            <span className="text-sm text-gray-500">Keep your system clean</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Dummy Data Cleanup</h4>
                  <p className="text-xs text-gray-500 mt-1">Remove test applications and dummy data</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => scanDummyData()}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    Scan
                  </button>
                  <button
                    onClick={() => cleanupDummyData()}
                    className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    Clean
                  </button>
                </div>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Database Health</h4>
                  <p className="text-xs text-gray-500 mt-1">Check system integrity and performance</p>
                </div>
                <button
                  onClick={() => checkDatabaseHealth()}
                  className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                >
                  Check
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Public Servant ID Applications
            </h3>
            
            {applications.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No applications</h3>
                <p className="mt-1 text-sm text-gray-500">No Public Servant ID applications have been submitted yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Applicant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee Info
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
                    {applications.map((application) => (
                      <tr key={application.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {application.firstName} {application.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {application.workEmail}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">#{application.employeeNumber}</div>
                          <div className="text-sm text-gray-500">{application.department || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(application.status)}`}>
                            {getStatusIcon(application.status)} {application.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {application.createdAt ? new Date(application.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => setSelectedApplication(application)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
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
                <h3 className="text-lg font-medium text-gray-900">
                  Review Application: {selectedApplication.firstName} {selectedApplication.lastName}
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
                  <h4 className="text-md font-medium text-gray-900 mb-3">Personal Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Name:</span> {selectedApplication.firstName} {selectedApplication.lastName}</p>
                    <p><span className="font-medium">Date of Birth:</span> {new Date(selectedApplication.dateOfBirth).toLocaleDateString()}</p>
                    <p><span className="font-medium">Gender:</span> {selectedApplication.gender}</p>
                    <p><span className="font-medium">Work Email:</span> {selectedApplication.workEmail}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Employment Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Department:</span> {selectedApplication.department || selectedApplication.employmentDetails?.department || 'N/A'}</p>
                    <p><span className="font-medium">Position:</span> {selectedApplication.position || selectedApplication.employmentDetails?.position || 'N/A'}</p>
                    <p><span className="font-medium">Employee ID:</span> {selectedApplication.employeeNumber || selectedApplication.employmentDetails?.employeeId || 'N/A'}</p>
                    <p><span className="font-medium">Gov Email:</span> {selectedApplication.employmentDetails?.governmentEmail || selectedApplication.workEmail || 'N/A'}</p>
                    <p><span className="font-medium">Application ID:</span> {selectedApplication.id}</p>
                    <p><span className="font-medium">Submitted:</span> {selectedApplication.createdAt ? new Date(selectedApplication.createdAt).toLocaleString() : selectedApplication.applicationDate ? new Date(selectedApplication.applicationDate).toLocaleString() : 'Invalid Date'}</p>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  {selectedApplication.reviewedBy && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-700">Reviewed by:</p>
                      <p className="text-sm text-gray-600">{selectedApplication.reviewedBy} {selectedApplication.reviewedAt ? `on ${new Date(selectedApplication.reviewedAt).toLocaleString()}` : ''}</p>
                    </div>
                  )}
                  {selectedApplication.adminNotes && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-700">Review Notes:</p>
                      <p className="text-sm text-gray-600 mt-1">{selectedApplication.adminNotes}</p>
                    </div>
                  )}
                  {!selectedApplication.adminNotes && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-700">Review Notes:</p>
                      <p className="text-sm text-gray-500 italic">No review notes provided</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Applications Modal */}
      {showDuplicates && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Duplicate Applications Management</h3>
              <button
                onClick={() => setShowDuplicates(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <div className="flex space-x-4">
                <button
                  onClick={() => loadDuplicateApplications('all')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  All ({duplicateStats.total})
                </button>
                <button
                  onClick={() => loadDuplicateApplications('flagged')}
                  className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                >
                  Flagged ({duplicateStats.flagged})
                </button>
                <button
                  onClick={() => loadDuplicateApplications('blocking')}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  High Risk ({duplicateStats.blocking})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Applicant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duplicate Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {duplicateApplications.map((app) => (
                    <tr key={app.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{app.name}</div>
                          <div className="text-sm text-gray-500">{app.email}</div>
                          <div className="text-sm text-gray-500">#{app.employeeNumber}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {app.duplicateInfo.warningMessage}
                        </div>
                        {app.duplicateInfo.potentialMatches.map((match: {matchType: string; matchScore: number; duplicateFields: string[]}, idx: number) => (
                          <div key={idx} className="text-xs text-gray-500 mt-1">
                            Match: {match.matchType} ({match.matchScore}% similarity)
                            <br />Fields: {match.duplicateFields.join(', ')}
                          </div>
                        ))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {app.duplicateInfo.potentialMatches.map((match: {riskLevel: string; id: string}, idx: number) => (
                          <span key={idx} className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            match.riskLevel === 'HIGH' ? 'bg-red-100 text-red-800' :
                            match.riskLevel === 'MEDIUM' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {match.riskLevel}
                          </span>
                        ))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-y-2">
                        <button
                          onClick={() => handleDuplicateResolution('resolve_as_unique', app.id, undefined, 'Admin verified as unique application')}
                          className="block w-full text-left px-3 py-1 text-xs text-green-700 bg-green-50 hover:bg-green-100 rounded"
                        >
                          ✅ Mark as Unique
                        </button>
                        <button
                          onClick={() => {
                            const targetId = prompt('Enter target application ID to merge with:');
                            if (targetId) {
                              handleDuplicateResolution('merge_with_existing', app.id, targetId, 'Merged with existing application');
                            }
                          }}
                          className="block w-full text-left px-3 py-1 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 rounded"
                        >
                          🔗 Merge with Existing
                        </button>
                        <button
                          onClick={() => handleDuplicateResolution('flag_for_review', app.id, undefined, 'Flagged for additional review')}
                          className="block w-full text-left px-3 py-1 text-xs text-orange-700 bg-orange-50 hover:bg-orange-100 rounded"
                        >
                          🚩 Flag for Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Analytics Modal */}
      {showAdvancedAnalytics && (
        <AdvancedDuplicateDashboard
          adminToken={localStorage.getItem('adminToken') || ''}
          onClose={() => setShowAdvancedAnalytics(false)}
        />
      )}
    </div>
    </>
  );
}