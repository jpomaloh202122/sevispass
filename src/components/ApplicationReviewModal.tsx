'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import DocumentViewer from './DocumentViewer';

interface Application {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phone: string;
  address: string;
  status: 'pending' | 'approved' | 'rejected';
  applicationDate: string;
  supportingDocuments?: Record<string, string>;
  applicationType?: string;
  category?: string;
  employmentDetails?: any;
  categorySpecificData?: any;
}

interface ApplicationReviewModalProps {
  application: Application | null;
  isOpen: boolean;
  onClose: () => void;
  onReview: (id: string, decision: 'approved' | 'rejected', notes: string) => Promise<void>;
  isReviewing: boolean;
}

const ApplicationReviewModal: React.FC<ApplicationReviewModalProps> = ({
  application,
  isOpen,
  onClose,
  onReview,
  isReviewing
}) => {
  const [reviewNotes, setReviewNotes] = useState('');
  const [documentsReviewed, setDocumentsReviewed] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected' | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setReviewNotes('');
      setDocumentsReviewed(false);
      setShowDocuments(false);
      setReviewDecision(null);
    }
  }, [isOpen]);

  const hasDocuments = application?.supportingDocuments && 
    Object.values(application.supportingDocuments).some(doc => doc && doc.trim() !== '');

  const handleReview = async (decision: 'approved' | 'rejected') => {
    if (!application) return;

    // Require document review for approval
    if (decision === 'approved' && hasDocuments && !documentsReviewed) {
      alert('Please review all documents before approving the application.');
      return;
    }

    // Require notes for rejection
    if (decision === 'rejected' && !reviewNotes.trim()) {
      alert('Please provide notes explaining the reason for rejection.');
      return;
    }

    try {
      await onReview(application.id, decision, reviewNotes);
      onClose();
    } catch (error) {
      console.error('Error reviewing application:', error);
    }
  };

  const getApplicationType = () => {
    if (application?.applicationType) {
      return application.applicationType === 'public_servant_id' ? 'public-servant-id' : 'city-pass';
    }
    // Fallback detection
    return application?.supportingDocuments?.nidDocument ? 'public-servant-id' : 'city-pass';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!application) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Application - {application.id}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Application Status */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Application Status</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  application.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  application.status === 'approved' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {application.status.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Submitted: {formatDate(application.applicationDate)}
              </p>
            </div>

            {/* Personal Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-3">Personal Information</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Name:</strong> {application.firstName} {application.lastName}</div>
                  <div><strong>Email:</strong> {application.email}</div>
                  <div><strong>Phone:</strong> {application.phone}</div>
                  <div><strong>Date of Birth:</strong> {application.dateOfBirth}</div>
                  <div><strong>Gender:</strong> {application.gender}</div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Address</h3>
                <div className="text-sm">
                  <p className="whitespace-pre-wrap">{application.address}</p>
                </div>
              </div>
            </div>

            {/* Employment Details (for Public Servant ID) */}
            {application.employmentDetails && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Employment Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Department:</strong> {application.employmentDetails.department}</div>
                  <div><strong>Position:</strong> {application.employmentDetails.position}</div>
                  <div><strong>Employee ID:</strong> {application.employmentDetails.employeeId}</div>
                  <div><strong>Government Email:</strong> {application.employmentDetails.governmentEmail}</div>
                  <div><strong>Start Date:</strong> {application.employmentDetails.startDate}</div>
                  <div><strong>Contract Type:</strong> {application.employmentDetails.contractType}</div>
                </div>
              </div>
            )}

            {/* Category Specific Data (for City Pass) */}
            {application.categorySpecificData && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Category Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Category:</strong> {application.category}</div>
                  {application.categorySpecificData.employerName && (
                    <div><strong>Employer:</strong> {application.categorySpecificData.employerName}</div>
                  )}
                  {application.categorySpecificData.workLocation && (
                    <div><strong>Work Location:</strong> {application.categorySpecificData.workLocation}</div>
                  )}
                  {application.categorySpecificData.employmentType && (
                    <div><strong>Employment Type:</strong> {application.categorySpecificData.employmentType}</div>
                  )}
                </div>
              </div>
            )}

            {/* Documents Section */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Supporting Documents</h3>
                {hasDocuments && (
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      documentsReviewed ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {documentsReviewed ? 'Documents Reviewed' : 'Documents Pending Review'}
                    </span>
                    <Button
                      onClick={() => setShowDocuments(true)}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Review Documents
                    </Button>
                  </div>
                )}
              </div>

              {hasDocuments ? (
                <div className="space-y-2 text-sm">
                  {Object.entries(application.supportingDocuments!).map(([key, path]) => {
                    if (!path || path.trim() === '') return null;
                    return (
                      <div key={key} className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="font-medium">{key}:</span>
                        <span className="text-gray-600 break-all">{path}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-600 text-sm">No documents uploaded</p>
              )}

              {hasDocuments && !documentsReviewed && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-sm text-orange-800 font-medium">
                      Document review required before approval
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Review Notes */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Review Notes</h3>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add your review notes here... (Required for rejection)"
                className="min-h-[100px]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-4 border-t">
              <Button
                onClick={onClose}
                variant="outline"
                disabled={isReviewing}
              >
                Cancel
              </Button>
              
              <Button
                onClick={() => handleReview('rejected')}
                className="bg-red-600 hover:bg-red-700"
                disabled={isReviewing}
              >
                {isReviewing ? 'Processing...' : 'Reject Application'}
              </Button>
              
              <Button
                onClick={() => handleReview('approved')}
                className="bg-green-600 hover:bg-green-700"
                disabled={isReviewing || (hasDocuments && !documentsReviewed)}
              >
                {isReviewing ? 'Processing...' : 'Approve Application'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Viewer */}
      {showDocuments && hasDocuments && (
        <DocumentViewer
          applicationId={application.id}
          applicationType={getApplicationType() as 'public-servant-id' | 'city-pass'}
          documents={application.supportingDocuments!}
          isOpen={showDocuments}
          onClose={() => setShowDocuments(false)}
          onDocumentsReviewed={setDocumentsReviewed}
        />
      )}
    </>
  );
};

export default ApplicationReviewModal;