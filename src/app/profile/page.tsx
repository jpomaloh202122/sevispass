'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    nid: '',
    address: ''
  });

  // Profile image editing states
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [isCapturingImage, setIsCapturingImage] = useState(false);
  const [newProfileImage, setNewProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize form data when user data is available
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        nid: user.nid,
        address: user.address || ''
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user.uid,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          address: formData.address
        }),
      });

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('JSON parsing error:', jsonError);
        throw new Error('Invalid response format from server');
      }

      if (response.ok && result.success) {
        // Update user context with new data
        updateUser(result.user);
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setIsEditing(false);
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to update profile' });
      }
    } catch (error) {
      console.error('Profile update error:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Network error. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Profile image handling functions
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewProfileImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCameraCapture = async () => {
    try {
      setIsCapturingImage(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: false 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to access camera. Please ensure camera permissions are granted.' 
      });
      setIsCapturingImage(false);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'profile-image.jpg', { type: 'image/jpeg' });
            setNewProfileImage(file);
            setImagePreview(canvasRef.current!.toDataURL());
            setIsCapturingImage(false);
            
            // Stop camera stream
            const stream = videoRef.current!.srcObject as MediaStream;
            if (stream) {
              stream.getTracks().forEach(track => track.stop());
            }
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const stopCameraCapture = () => {
    setIsCapturingImage(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const cancelImageEdit = () => {
    setIsEditingImage(false);
    setNewProfileImage(null);
    setImagePreview(null);
    stopCameraCapture();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const saveProfileImage = async () => {
    if (!newProfileImage || !user) return;
    
    setIsLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('profileImage', newProfileImage);
      formData.append('uid', user.uid);

      const response = await fetch('/api/profile/update-image', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMessage({ type: 'success', text: 'Profile image updated successfully!' });
        setIsEditingImage(false);
        setNewProfileImage(null);
        setImagePreview(null);
        
        // Force image refresh by adding timestamp
        const imageElement = document.querySelector('.profile-image') as HTMLImageElement;
        if (imageElement) {
          imageElement.src = `/api/profile/image/${user.uid}?t=${Date.now()}`;
        }
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to update profile image' });
      }
    } catch (error) {
      console.error('Profile image update error:', error);
      setMessage({ 
        type: 'error', 
        text: 'Network error. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
            <p className="mt-2 text-gray-600">Manage your personal information and account settings</p>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
              <button
                onClick={() => {
                  if (isEditing) {
                    // Reset form data when cancelling
                    if (user) {
                      setFormData({
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email,
                        phoneNumber: user.phoneNumber,
                        nid: user.nid,
                        address: user.address || ''
                      });
                    }
                    setMessage(null);
                  }
                  setIsEditing(!isEditing);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isEditing 
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>

            <div className="px-6 py-6">
              {/* Profile Image Section */}
              <div className="flex flex-col items-center mb-8 pb-6 border-b border-gray-200">
                <div className="relative">
                  {!isEditingImage && user && (
                    <img
                      src={`/api/profile/image/${user.uid}`}
                      alt="Profile"
                      className="profile-image w-32 h-32 rounded-full object-cover border-4 border-amber-400 shadow-lg"
                      onError={(e) => {
                        // Fallback to initials if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  )}
                  {!isEditingImage && (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg hidden">
                      {user && `${user.firstName[0]}${user.lastName[0]}`}
                    </div>
                  )}

                  {/* Image Preview During Editing */}
                  {isEditingImage && imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-32 h-32 rounded-full object-cover border-4 border-amber-400 shadow-lg"
                    />
                  )}

                  {/* Camera View During Capture */}
                  {isCapturingImage && (
                    <div className="relative">
                      <video
                        ref={videoRef}
                        className="w-32 h-32 rounded-full object-cover border-4 border-amber-400 shadow-lg"
                        autoPlay
                        playsInline
                        muted
                      />
                      <div className="absolute inset-0 border-4 border-amber-400 rounded-full pointer-events-none"></div>
                    </div>
                  )}

                  {user?.isVerified && !isEditingImage && (
                    <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full p-2 shadow-lg">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}

                  {/* Edit Image Button */}
                  {!isEditingImage && !isCapturingImage && (
                    <button
                      onClick={() => setIsEditingImage(true)}
                      className="absolute bottom-0 right-0 bg-amber-500 hover:bg-amber-600 text-white rounded-full p-2 shadow-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Profile Image Edit Controls */}
                {isEditingImage && !isCapturingImage && (
                  <div className="mt-4 space-y-3">
                    <div className="flex space-x-3">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        📁 Upload Image
                      </button>
                      <button
                        onClick={startCameraCapture}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        📷 Take Photo
                      </button>
                    </div>
                    
                    {newProfileImage && (
                      <div className="flex space-x-3">
                        <button
                          onClick={saveProfileImage}
                          disabled={isLoading}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? 'Saving...' : '✅ Save Image'}
                        </button>
                        <button
                          onClick={cancelImageEdit}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          ❌ Cancel
                        </button>
                      </div>
                    )}
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                )}

                {/* Camera Capture Controls */}
                {isCapturingImage && (
                  <div className="mt-4 space-y-3">
                    <div className="flex space-x-3">
                      <button
                        onClick={captureImage}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        📸 Capture
                      </button>
                      <button
                        onClick={stopCameraCapture}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        ❌ Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="text-center mt-4">
                  <h3 className="text-xl font-bold text-gray-900">{user && `${user.firstName} ${user.lastName}`}</h3>
                  <p className="text-gray-600 mt-1">{user?.email}</p>
                  {user?.isVerified && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 mt-2">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Verified Account
                    </span>
                  )}
                </div>
              </div>

              {/* Hidden canvas for image capture */}
              <canvas
                ref={canvasRef}
                style={{ display: 'none' }}
              />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                  />
                ) : (
                  <p className="text-gray-900 py-2">{formData.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                  />
                ) : (
                  <p className="text-gray-900 py-2">{formData.lastName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">NID/Passport</label>
                <p className="text-gray-500 py-2">{formData.nid} <span className="text-xs">(Cannot be changed)</span></p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                  />
                ) : (
                  <p className="text-gray-900 py-2">{formData.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                  />
                ) : (
                  <p className="text-gray-900 py-2">{formData.phoneNumber}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                  />
                ) : (
                  <p className="text-gray-900 py-2">{formData.address}</p>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
          </div>
          <div className="px-6 py-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-green-600 mr-3">Enabled</span>
                <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Manage
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Password</h3>
                <p className="text-sm text-gray-500">Last changed 3 months ago</p>
              </div>
              <button className="bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Change Password
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Login Notifications</h3>
                <p className="text-sm text-gray-500">Get notified when someone signs in to your account</p>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-green-600 mr-3">Enabled</span>
                <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Configure
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Account Actions</h2>
          </div>
          <div className="px-6 py-6">
            <div className="space-y-4">
              <button className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-amber-300 hover:bg-amber-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Download Personal Data</h3>
                    <p className="text-sm text-gray-500">Get a copy of all your data stored in SevisPass</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </button>

              <button className="w-full text-left p-4 border border-amber-200 rounded-lg hover:border-amber-400 hover:bg-amber-50 transition-colors text-amber-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">Delete Account</h3>
                    <p className="text-sm text-amber-600">Permanently delete your SevisPass account</p>
                  </div>
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  );
}