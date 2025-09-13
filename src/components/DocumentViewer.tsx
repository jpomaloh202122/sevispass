'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DocumentViewerProps {
  applicationId: string;
  applicationType: 'public-servant-id' | 'city-pass';
  documents: Record<string, string>;
  isOpen: boolean;
  onClose: () => void;
  onDocumentsReviewed?: (reviewed: boolean) => void;
}

interface DocumentStatus {
  [key: string]: 'not-viewed' | 'viewing' | 'reviewed';
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  applicationId,
  applicationType,
  documents,
  isOpen,
  onClose,
  onDocumentsReviewed
}) => {
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus>({});
  const [currentDocument, setCurrentDocument] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState<Record<string, boolean>>({});

  // Document type labels
  const documentLabels = {
    // Public Servant ID documents
    nidDocument: 'National ID Document',
    policeClearance: 'Police Clearance Certificate',
    medicalCertificate: 'Medical Certificate',
    
    // City Pass documents
    identificationDocument: 'Identification Document',
    proofOfAddress: 'Proof of Address',
    categorySpecificDocument: 'Category Specific Document'
  };

  const getDocumentUrl = (documentType: string) => {
    const token = localStorage.getItem('adminToken');
    return `/api/admin/documents/${applicationType}/${applicationId}/${documentType}?t=${Date.now()}`;
  };

  const markDocumentAsViewed = (documentType: string) => {
    setDocumentStatus(prev => ({
      ...prev,
      [documentType]: 'reviewed'
    }));
  };

  const openDocument = (documentType: string) => {
    setCurrentDocument(documentType);
    setDocumentStatus(prev => ({
      ...prev,
      [documentType]: 'viewing'
    }));
  };

  const closeDocument = () => {
    if (currentDocument) {
      markDocumentAsViewed(currentDocument);
    }
    setCurrentDocument(null);
  };

  const allDocumentsReviewed = () => {
    const documentKeys = Object.keys(documents).filter(key => documents[key]);
    return documentKeys.length > 0 && documentKeys.every(key => documentStatus[key] === 'reviewed');
  };

  const downloadDocument = async (documentType: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(getDocumentUrl(documentType), {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${documentType}-${applicationId}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        markDocumentAsViewed(documentType);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  const handleImageError = (documentType: string) => {
    setImageLoadError(prev => ({
      ...prev,
      [documentType]: true
    }));
  };

  const getStatusBadge = (documentType: string) => {
    const status = documentStatus[documentType] || 'not-viewed';
    const colors = {
      'not-viewed': 'bg-gray-500',
      'viewing': 'bg-blue-500',
      'reviewed': 'bg-green-500'
    };
    const labels = {
      'not-viewed': 'Not Viewed',
      'viewing': 'Viewing',
      'reviewed': 'Reviewed'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium text-white rounded-full ${colors[status]}`}>
        {labels[status]}
      </span>
    );
  };

  React.useEffect(() => {
    if (onDocumentsReviewed) {
      onDocumentsReviewed(allDocumentsReviewed());
    }
  }, [documentStatus, onDocumentsReviewed]);

  const availableDocuments = Object.entries(documents).filter(([_, path]) => path && path.trim() !== '');

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Documents - {applicationId}</DialogTitle>
            <p className="text-sm text-gray-600">
              Review all documents before approving the application. 
              Documents: {availableDocuments.length}, 
              Reviewed: {Object.values(documentStatus).filter(s => s === 'reviewed').length}
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {availableDocuments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No documents uploaded for this application</p>
              </div>
            ) : (
              availableDocuments.map(([documentType, documentPath]) => (
                <div key={documentType} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">
                        {documentLabels[documentType] || documentType}
                      </h3>
                      <p className="text-sm text-gray-500 break-all">{documentPath}</p>
                    </div>
                    {getStatusBadge(documentType)}
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={() => openDocument(documentType)}
                      variant="outline"
                      size="sm"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Document
                    </Button>
                    
                    <Button
                      onClick={() => downloadDocument(documentType)}
                      variant="outline"
                      size="sm"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download
                    </Button>

                    {documentStatus[documentType] !== 'reviewed' && (
                      <Button
                        onClick={() => markDocumentAsViewed(documentType)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Mark as Reviewed
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}

            {availableDocuments.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  {allDocumentsReviewed() ? (
                    <div className="flex items-center text-green-600">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      All documents have been reviewed
                    </div>
                  ) : (
                    <div className="flex items-center text-orange-600">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      Please review all documents before approving
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={onClose} variant="outline">
              Close Document Viewer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Preview Modal */}
      {currentDocument && (
        <Dialog open={true} onOpenChange={(open) => !open && closeDocument()}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>
                {documentLabels[currentDocument] || currentDocument}
              </DialogTitle>
            </DialogHeader>

            <div className="flex justify-center">
              {!imageLoadError[currentDocument] ? (
                <img
                  src={getDocumentUrl(currentDocument)}
                  alt={documentLabels[currentDocument] || currentDocument}
                  className="max-w-full max-h-[80vh] object-contain"
                  onError={() => handleImageError(currentDocument)}
                  onLoad={() => {
                    // Image loaded successfully, mark as viewing
                    setDocumentStatus(prev => ({
                      ...prev,
                      [currentDocument]: 'viewing'
                    }));
                  }}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-red-600 mb-4">
                    Unable to display document preview. The document may be in an unsupported format.
                  </p>
                  <Button
                    onClick={() => downloadDocument(currentDocument)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Download Document to View
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <Button
                onClick={() => downloadDocument(currentDocument)}
                variant="outline"
              >
                Download
              </Button>
              <div className="flex space-x-2">
                <Button
                  onClick={() => markDocumentAsViewed(currentDocument)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Mark as Reviewed
                </Button>
                <Button onClick={closeDocument}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default DocumentViewer;