'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface Application {
  id: string;
  userId: string;
  category: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  nationality: string;
  identificationNumber: string;
  identificationType: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'expired';
  validityPeriod: number;
  applicationDate: string;
  reviewDate?: string;
  approvalDate?: string;
  expiryDate?: string;
  reviewedBy?: string;
  adminNotes?: string;
  ncdcReference?: string;
}

interface Statistics {
  total: number;
  pending: number;
  under_review: number;
  approved: number;
  rejected: number;
  expired: number;
}

const CityPassAdminPage = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    total: 0,
    pending: 0,
    under_review: 0,
    approved: 0,
    rejected: 0,
    expired: 0
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'request_more_info'>('approve');
  const [adminNotes, setAdminNotes] = useState('');
  const [ncdcReference, setNcdcReference] = useState('');
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [statusFilter, categoryFilter, fetchApplications]);

  const fetchApplications = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category', categoryFilter);

      const response = await fetch(`/api/admin/city-pass/applications?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications);
        setStatistics(data.statistics);
      } else {
        console.error('Failed to fetch applications');
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  const handleReviewApplication = async (applicationId: string) => {
    setReviewing(true);

    try {
      const response = await fetch(`/api/admin/city-pass/applications/${applicationId}/review`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: reviewAction,
          adminNotes,
          ...(reviewAction === 'approve' && ncdcReference && { ncdcReference })
        })
      });

      if (response.ok) {
        await response.json();
        alert(`Application ${reviewAction}d successfully!`);
        setSelectedApplication(null);
        setAdminNotes('');
        setNcdcReference('');
        fetchApplications();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error reviewing application:', error);
      alert('Failed to review application. Please try again.');
    } finally {
      setReviewing(false);
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">City Pass Applications Management</h1>
          <p className="text-gray-600">Review and manage city pass applications submitted by users.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="text-2xl font-bold text-gray-900">{statistics.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg shadow-md">
            <div className="text-2xl font-bold text-yellow-800">{statistics.pending}</div>
            <div className="text-sm text-yellow-700">Pending</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg shadow-md">
            <div className="text-2xl font-bold text-blue-800">{statistics.under_review}</div>
            <div className="text-sm text-blue-700">Under Review</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg shadow-md">
            <div className="text-2xl font-bold text-green-800">{statistics.approved}</div>
            <div className="text-sm text-green-700">Approved</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg shadow-md">
            <div className="text-2xl font-bold text-red-800">{statistics.rejected}</div>
            <div className="text-sm text-red-700">Rejected</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg shadow-md">
            <div className="text-2xl font-bold text-gray-800">{statistics.expired}</div>
            <div className="text-sm text-gray-700">Expired</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <h2 className="text-xl font-semibold text-gray-900">Applications</h2>
              <div className="flex space-x-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="expired">Expired</option>
                </select>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  <option value="student">Student</option>
                  <option value="employee">Employee</option>
                  <option value="business_owner">Business Owner</option>
                  <option value="property_owner">Property Owner</option>
                  <option value="visitor">Visitor</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Application ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applicant
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
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applications.map((application) => (
                  <tr key={application.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {application.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {application.firstName} {application.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{application.email}</div>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedApplication(application)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selectedApplication && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Review Application</h3>
                  <button
                    onClick={() => setSelectedApplication(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Application ID</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedApplication.id}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Category</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedApplication.category.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedApplication.firstName} {selectedApplication.lastName}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedApplication.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedApplication.phone}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nationality</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedApplication.nationality}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Address</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedApplication.address}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">ID Type</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedApplication.identificationType.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">ID Number</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedApplication.identificationNumber}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Review Action</label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="reviewAction"
                          value="approve"
                          checked={reviewAction === 'approve'}
                          onChange={(e) => setReviewAction(e.target.value as 'approve' | 'reject' | 'request_more_info')}
                          className="mr-2"
                        />
                        Approve Application
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="reviewAction"
                          value="reject"
                          checked={reviewAction === 'reject'}
                          onChange={(e) => setReviewAction(e.target.value as 'approve' | 'reject' | 'request_more_info')}
                          className="mr-2"
                        />
                        Reject Application
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="reviewAction"
                          value="request_more_info"
                          checked={reviewAction === 'request_more_info'}
                          onChange={(e) => setReviewAction(e.target.value as 'approve' | 'reject' | 'request_more_info')}
                          className="mr-2"
                        />
                        Request More Information
                      </label>
                    </div>
                  </div>

                  {reviewAction === 'approve' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        NCDC Reference (Optional)
                      </label>
                      <input
                        type="text"
                        value={ncdcReference}
                        onChange={(e) => setNcdcReference(e.target.value)}
                        placeholder="Leave blank to auto-generate"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Notes
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional notes about the review decision..."
                    />
                  </div>
                </div>

                <div className="flex space-x-4 mt-6">
                  <button
                    onClick={() => handleReviewApplication(selectedApplication.id)}
                    disabled={reviewing}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {reviewing ? 'Processing...' : `${reviewAction.replace('_', ' ').toUpperCase()} Application`}
                  </button>
                  <button
                    onClick={() => setSelectedApplication(null)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CityPassAdminPage;