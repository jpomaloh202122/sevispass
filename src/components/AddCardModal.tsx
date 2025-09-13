'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { DigitalCard } from '@/types/wallet';

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'manual' | 'import';
}

const cardTypes: { value: DigitalCard['type']; label: string; colors: { primary: string; secondary: string } }[] = [
  { 
    value: 'sevispass', 
    label: 'SEVIS Pass', 
    colors: { primary: '#F59E0B', secondary: '#FCD34D' }
  },
  { 
    value: 'government', 
    label: 'Government ID', 
    colors: { primary: '#3B82F6', secondary: '#60A5FA' }
  },
  { 
    value: 'medical', 
    label: 'Medical Card', 
    colors: { primary: '#EF4444', secondary: '#F87171' }
  },
  { 
    value: 'education', 
    label: 'Student ID', 
    colors: { primary: '#10B981', secondary: '#34D399' }
  },
  { 
    value: 'custom', 
    label: 'Custom Card', 
    colors: { primary: '#8B5CF6', secondary: '#A78BFA' }
  }
];

export default function AddCardModal({ isOpen, onClose, initialMode = 'manual' }: AddCardModalProps) {
  const { addCard } = useWallet();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'manual' | 'import'>(initialMode);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    holderName: '',
    cardNumber: '',
    issuer: '',
    type: 'sevispass' as DigitalCard['type'],
    expiryDate: '',
    customColors: {
      primary: '#F59E0B',
      secondary: '#FCD34D'
    }
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync mode with initialMode when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleTypeChange = (type: DigitalCard['type']) => {
    const typeConfig = cardTypes.find(t => t.value === type);
    setFormData(prev => ({
      ...prev,
      type,
      customColors: typeConfig ? typeConfig.colors : prev.customColors
    }));
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('json') && !file.name.endsWith('.json')) {
      setErrors({ import: 'Please select a valid JSON file' });
      return;
    }

    setImportFile(file);
    setErrors({});

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Validate if it's a SevisPass credential
      if (data['@context'] && data.type && data.credentialSubject) {
        // W3C Verifiable Credential format
        setImportPreview({
          format: 'W3C Verifiable Credential',
          name: `${data.credentialSubject.name} - SevisPass ID`,
          holderName: data.credentialSubject.name,
          cardNumber: data.credentialSubject.nationalId || data.credentialSubject.uid,
          issuer: data.issuer?.name || 'SevisPass Authority',
          type: 'sevispass' as const,
          isVerified: data.credentialSubject.verificationStatus === 'VERIFIED',
          metadata: {
            importedFrom: 'sevispass-credential',
            originalId: data.id,
            issuanceDate: data.issuanceDate
          }
        });
      } else if (data.name && data.holderName) {
        // Direct card format
        setImportPreview({
          format: 'SevisWallet Card',
          ...data,
          metadata: {
            importedFrom: 'json-file',
            originalData: data
          }
        });
      } else {
        throw new Error('Unrecognized card format');
      }
    } catch (error) {
      console.error('Error parsing JSON:', error);
      setErrors({ import: 'Invalid JSON file or unsupported format' });
      setImportFile(null);
      setImportPreview(null);
    }
  };

  const handleImportSubmit = async () => {
    if (!importPreview) return;

    setLoading(true);
    try {
      const cardData: Omit<DigitalCard, 'id' | 'createdAt' | 'updatedAt'> = {
        name: importPreview.name,
        holderName: importPreview.holderName,
        cardNumber: importPreview.cardNumber,
        issuer: importPreview.issuer,
        type: importPreview.type || 'sevispass',
        issueDate: new Date().toISOString().split('T')[0],
        expiryDate: importPreview.expiryDate,
        colors: importPreview.colors || {
          primary: '#F59E0B',
          secondary: '#FCD34D',
          background: '#1E293B',
          text: '#FFFFFF'
        },
        isVerified: importPreview.isVerified ?? true,
        metadata: {
          addedVia: 'import',
          addedAt: new Date().toISOString(),
          ...importPreview.metadata
        }
      };

      const success = await addCard(cardData);
      if (success) {
        onClose();
        resetModal();
      } else {
        setErrors({ import: 'Failed to import card. Please try again.' });
      }
    } catch (error) {
      setErrors({ import: 'An error occurred while importing the card.' });
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setMode(initialMode);
    setImportFile(null);
    setImportPreview(null);
    setFormData({
      name: '',
      holderName: '',
      cardNumber: '',
      issuer: '',
      type: 'sevispass',
      expiryDate: '',
      customColors: {
        primary: '#F59E0B',
        secondary: '#FCD34D'
      }
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Card name is required';
    if (!formData.holderName.trim()) newErrors.holderName = 'Holder name is required';
    if (!formData.cardNumber.trim()) newErrors.cardNumber = 'Card number is required';
    if (!formData.issuer.trim()) newErrors.issuer = 'Issuer is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const cardData: Omit<DigitalCard, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.name,
        holderName: formData.holderName,
        cardNumber: formData.cardNumber,
        issuer: formData.issuer,
        type: formData.type,
        issueDate: new Date().toISOString().split('T')[0],
        expiryDate: formData.expiryDate || undefined,
        colors: {
          primary: formData.customColors.primary,
          secondary: formData.customColors.secondary,
          background: '#1E293B',
          text: '#FFFFFF'
        },
        isVerified: formData.type === 'sevispass', // Auto-verify SEVIS Pass cards
        metadata: {
          addedVia: 'manual',
          addedAt: new Date().toISOString()
        }
      };

      const success = await addCard(cardData);
      if (success) {
        onClose();
        resetModal();
      } else {
        setErrors({ general: 'Failed to add card. Please try again.' });
      }
    } catch (error) {
      setErrors({ general: 'An error occurred while adding the card.' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
        <div className="fixed inset-0 transition-opacity bg-sevis-dark/75 backdrop-blur-sm" onClick={onClose}></div>
        
        <div className="relative inline-block w-full max-w-2xl p-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-2xl rounded-2xl">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-sevis-dark">Add New Card</h3>
            <button
              onClick={() => {
                onClose();
                resetModal();
              }}
              className="p-2 text-sevis-slate hover:text-sevis-primary transition-colors rounded-lg hover:bg-sevis-primary/10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Mode Selection */}
          <div className="mb-6">
            <div className="flex bg-sevis-primary/10 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={`
                  flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all
                  ${mode === 'manual' 
                    ? 'bg-sevis-primary text-black shadow-sm' 
                    : 'text-sevis-dark hover:text-sevis-primary'
                  }
                `}
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Manual Entry
              </button>
              <button
                type="button"
                onClick={() => setMode('import')}
                className={`
                  flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all
                  ${mode === 'import' 
                    ? 'bg-sevis-primary text-black shadow-sm' 
                    : 'text-sevis-dark hover:text-sevis-primary'
                  }
                `}
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                Import from File
              </button>
            </div>
          </div>

          {/* Content based on mode */}
          {mode === 'manual' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Card Type Selection */}
            <div>
              <label className="block text-sm font-medium text-sevis-dark mb-3">Card Type</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {cardTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleTypeChange(type.value)}
                    className={`
                      p-3 rounded-lg border-2 transition-all text-left
                      ${formData.type === type.value
                        ? 'border-sevis-primary bg-sevis-primary/10'
                        : 'border-gray-200 hover:border-sevis-primary/50'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ background: `linear-gradient(135deg, ${type.colors.primary}, ${type.colors.secondary})` }}
                      ></div>
                      <span className="text-sm font-medium">{type.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Card Preview */}
            <div className="bg-gradient-to-br from-sevis-light to-sevis-primary/5 rounded-xl p-4">
              <p className="text-sm font-medium text-sevis-dark mb-3">Card Preview</p>
              <div
                className="w-64 h-40 rounded-xl p-4 text-white relative overflow-hidden mx-auto"
                style={{
                  background: `linear-gradient(135deg, ${formData.customColors.primary} 0%, ${formData.customColors.secondary} 100%)`
                }}
              >
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-2 right-2 w-12 h-12 border border-white/30 rounded-full"></div>
                  <div className="absolute bottom-2 left-2 w-8 h-8 border border-white/20 rounded-lg rotate-45"></div>
                </div>
                <div className="relative z-10">
                  <p className="font-bold text-lg">{formData.name || 'Card Name'}</p>
                  <p className="text-xs opacity-80 uppercase tracking-wider mb-3">{formData.type}</p>
                  <p className="font-mono text-sm mb-2">{formData.cardNumber || '•••• •••• •••• ••••'}</p>
                  <div className="flex justify-between items-end text-xs">
                    <span>{formData.holderName || 'Holder Name'}</span>
                    <span>{formData.issuer || 'Issuer'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card Name */}
              <div>
                <label className="block text-sm font-medium text-sevis-dark mb-2">Card Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., SEVIS Pass Digital ID"
                  className={`
                    w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-sevis-primary/50 focus:border-sevis-primary transition-colors
                    ${errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                  `}
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              {/* Holder Name */}
              <div>
                <label className="block text-sm font-medium text-sevis-dark mb-2">Holder Name</label>
                <input
                  type="text"
                  value={formData.holderName}
                  onChange={(e) => handleInputChange('holderName', e.target.value)}
                  placeholder="e.g., John Doe"
                  className={`
                    w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-sevis-primary/50 focus:border-sevis-primary transition-colors
                    ${errors.holderName ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                  `}
                />
                {errors.holderName && <p className="text-red-500 text-sm mt-1">{errors.holderName}</p>}
              </div>

              {/* Card Number */}
              <div>
                <label className="block text-sm font-medium text-sevis-dark mb-2">Card Number</label>
                <input
                  type="text"
                  value={formData.cardNumber}
                  onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                  placeholder="e.g., SP123456789"
                  className={`
                    w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-sevis-primary/50 focus:border-sevis-primary transition-colors
                    ${errors.cardNumber ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                  `}
                />
                {errors.cardNumber && <p className="text-red-500 text-sm mt-1">{errors.cardNumber}</p>}
              </div>

              {/* Issuer */}
              <div>
                <label className="block text-sm font-medium text-sevis-dark mb-2">Issuer</label>
                <input
                  type="text"
                  value={formData.issuer}
                  onChange={(e) => handleInputChange('issuer', e.target.value)}
                  placeholder="e.g., SEVIS Authority"
                  className={`
                    w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-sevis-primary/50 focus:border-sevis-primary transition-colors
                    ${errors.issuer ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                  `}
                />
                {errors.issuer && <p className="text-red-500 text-sm mt-1">{errors.issuer}</p>}
              </div>

              {/* Expiry Date */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-sevis-dark mb-2">Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sevis-primary/50 focus:border-sevis-primary transition-colors"
                />
              </div>
            </div>

            {/* Custom Colors */}
            {formData.type === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-sevis-dark mb-3">Custom Colors</label>
                <div className="flex space-x-4">
                  <div>
                    <label className="block text-xs text-sevis-slate mb-1">Primary</label>
                    <input
                      type="color"
                      value={formData.customColors.primary}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        customColors: { ...prev.customColors, primary: e.target.value }
                      }))}
                      className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-sevis-slate mb-1">Secondary</label>
                    <input
                      type="color"
                      value={formData.customColors.secondary}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        customColors: { ...prev.customColors, secondary: e.target.value }
                      }))}
                      className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {errors.general && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{errors.general}</p>
              </div>
            )}

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    resetModal();
                  }}
                  className="px-6 py-3 text-sevis-slate hover:text-sevis-dark border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`
                    px-6 py-3 bg-gradient-to-r from-sevis-primary to-sevis-secondary text-black font-medium rounded-lg
                    transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                    ${loading ? 'animate-pulse' : ''}
                  `}
                >
                  {loading ? 'Adding Card...' : 'Add to Wallet'}
                </button>
              </div>
            </form>
          ) : (
            /* Import Mode */
            <div className="space-y-6">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-sevis-dark mb-3">
                  Import SevisPass Credential
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-sevis-primary/50 transition-colors">
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-sevis-primary/60"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-sevis-slate">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-sevis-primary hover:text-sevis-secondary focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-sevis-primary"
                      >
                        <span>Upload a JSON file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept=".json,application/json"
                          onChange={handleFileImport}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-sevis-slate">
                      JSON files from SevisPass downloads
                    </p>
                  </div>
                </div>
                {errors.import && (
                  <p className="text-red-500 text-sm mt-2">{errors.import}</p>
                )}
              </div>

              {/* Import Preview */}
              {importPreview && (
                <div className="bg-sevis-primary/5 rounded-xl p-6 border border-sevis-primary/20">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-sevis-dark">Import Preview</h4>
                    <span className="px-3 py-1 bg-sevis-primary/20 text-sevis-primary text-sm font-medium rounded-full">
                      {importPreview.format}
                    </span>
                  </div>
                  
                  {/* Preview Card */}
                  <div
                    className="w-full max-w-sm h-32 rounded-xl p-4 text-white relative overflow-hidden mx-auto mb-4"
                    style={{
                      background: importPreview.colors
                        ? `linear-gradient(135deg, ${importPreview.colors.primary} 0%, ${importPreview.colors.secondary} 100%)`
                        : 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)'
                    }}
                  >
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-2 right-2 w-8 h-8 border border-white/30 rounded-full"></div>
                      <div className="absolute bottom-2 left-2 w-6 h-6 border border-white/20 rounded-lg rotate-45"></div>
                    </div>
                    <div className="relative z-10">
                      <p className="font-bold text-sm">{importPreview.name}</p>
                      <p className="text-xs opacity-80 uppercase tracking-wider mb-2">
                        {importPreview.type}
                      </p>
                      <p className="font-mono text-xs mb-1">{importPreview.cardNumber}</p>
                      <div className="flex justify-between items-end text-xs">
                        <span className="truncate pr-2">{importPreview.holderName}</span>
                        <span className="flex-shrink-0">{importPreview.issuer}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-sevis-dark">Holder:</span>
                      <p className="text-sevis-slate">{importPreview.holderName}</p>
                    </div>
                    <div>
                      <span className="font-medium text-sevis-dark">Card Number:</span>
                      <p className="text-sevis-slate font-mono">{importPreview.cardNumber}</p>
                    </div>
                    <div>
                      <span className="font-medium text-sevis-dark">Issuer:</span>
                      <p className="text-sevis-slate">{importPreview.issuer}</p>
                    </div>
                    <div>
                      <span className="font-medium text-sevis-dark">Verified:</span>
                      <p className={`font-medium ${importPreview.isVerified ? 'text-green-600' : 'text-orange-600'}`}>
                        {importPreview.isVerified ? '✓ Yes' : '○ No'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Import Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    resetModal();
                  }}
                  className="px-6 py-3 text-sevis-slate hover:text-sevis-dark border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportSubmit}
                  disabled={loading || !importPreview}
                  className={`
                    px-6 py-3 bg-gradient-to-r from-sevis-primary to-sevis-secondary text-black font-medium rounded-lg
                    transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                    ${loading ? 'animate-pulse' : ''}
                  `}
                >
                  {loading ? 'Importing...' : 'Import to Wallet'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}