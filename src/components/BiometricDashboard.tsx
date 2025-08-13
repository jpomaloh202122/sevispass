'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import BiometricAppointment from './BiometricAppointment';

interface BiometricLocation {
  name: string;
  address: string;
  phone: string;
  operatingHours: string;
  electorate: string;
}

interface UserAppointment {
  id: number;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  location: BiometricLocation;
  createdAt: string;
}

interface BiometricDashboardProps {
  userUid: string;
  userName: string;
}

export default function BiometricDashboard({ userUid, userName }: BiometricDashboardProps) {
  const [appointment, setAppointment] = useState<UserAppointment | null>(null);
  const [hasAppointment, setHasAppointment] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showScheduling, setShowScheduling] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchUserAppointment();
  }, [userUid]);

  const fetchUserAppointment = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/biometric/user-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userUid })
      });

      const data = await response.json();
      
      if (data.success) {
        setHasAppointment(data.hasAppointment);
        setAppointment(data.appointment || null);
      } else {
        console.error('API Error:', data.message);
      }
    } catch (error) {
      console.error('Error fetching appointment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelAppointment = async () => {
    if (!confirm('Are you sure you want to cancel your biometric appointment?')) {
      return;
    }

    try {
      const response = await fetch('/api/biometric/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userUid })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Appointment cancelled successfully' });
        setHasAppointment(false);
        setAppointment(null);
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      setMessage({ type: 'error', text: 'Failed to cancel appointment' });
    }
  };

  const handleAppointmentBooked = (newAppointment: any) => {
    setAppointment(newAppointment);
    setHasAppointment(true);
    setShowScheduling(false);
    setMessage({ type: 'success', text: 'Biometric appointment scheduled successfully!' });
    // Refresh appointment data to ensure we have the latest information
    setTimeout(() => {
      fetchUserAppointment();
    }, 1000);
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getAppointmentStatus = (status: string) => {
    switch (status) {
      case 'scheduled':
        return { color: 'text-blue-600', bg: 'bg-blue-50', text: 'Scheduled' };
      case 'completed':
        return { color: 'text-green-600', bg: 'bg-green-50', text: 'Completed' };
      case 'cancelled':
        return { color: 'text-red-600', bg: 'bg-red-50', text: 'Cancelled' };
      default:
        return { color: 'text-gray-600', bg: 'bg-gray-50', text: 'Unknown' };
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (showScheduling) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">Schedule New Appointment</h3>
            <button
              onClick={() => setShowScheduling(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <BiometricAppointment
          userUid={userUid}
          userName={userName}
          onAppointmentBooked={handleAppointmentBooked}
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a2 2 0 012-2h4a2 2 0 012 2v2h4a2 2 0 012 2v2a2 2 0 01-2 2h-1l-.764 10.074A2 2 0 0118.263 21H5.737a2 2 0 01-1.973-1.926L3 9H2a1 1 0 01-1-1V6a1 1 0 012-2h4z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Biometric Appointment</h3>
            <p className="text-sm text-gray-600">Track your fingerprint collection appointment</p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-4 ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {hasAppointment && appointment ? (
        <div className="space-y-6">
          {/* Status Banner */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">Appointment Confirmed</p>
                <p className="text-xs text-blue-700">Your biometric collection is scheduled</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getAppointmentStatus(appointment.status).bg} ${getAppointmentStatus(appointment.status).color}`}>
              {getAppointmentStatus(appointment.status).text}
            </span>
          </div>

          {/* Appointment Details Card */}
          <div className="bg-gray-50 rounded-lg p-5 space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Appointment Details</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0v1h6V7a2 2 0 00-2-2H10a2 2 0 00-2 2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 9h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V11a2 2 0 012-2z" />
                  </svg>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Date</span>
                    <p className="text-sm text-gray-900">
                      {format(new Date(appointment.appointmentDate), 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Time</span>
                    <p className="text-sm text-gray-900">
                      {formatTime(appointment.appointmentTime)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-gray-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Location</span>
                    <p className="text-sm font-medium text-gray-900">{appointment.location.name}</p>
                    <p className="text-xs text-gray-600">{appointment.location.address}</p>
                    <p className="text-xs text-gray-600">{appointment.location.electorate} Electorate</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Contact</span>
                    <p className="text-sm text-gray-900">{appointment.location.phone}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Operating Hours</span>
                    <p className="text-sm text-gray-900">{appointment.location.operatingHours}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {appointment.status === 'scheduled' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-amber-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Important Reminder:</p>
                    <ul className="mt-2 space-y-1 list-disc list-inside">
                      <li>Please bring a valid form of identification to your appointment</li>
                      <li>Arrive 10 minutes early for check-in</li>
                      <li>The biometric collection process takes approximately 15 minutes</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowScheduling(true)}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl"
                >
                  Reschedule Appointment
                </button>
                <button
                  onClick={cancelAppointment}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel Appointment
                </button>
              </div>
            </div>
          )}

          {appointment.status === 'cancelled' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-red-800">
                  <p className="font-medium">This appointment has been cancelled.</p>
                  <p className="mt-1">You can schedule a new appointment anytime.</p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduling(true)}
                className="mt-4 w-full py-3 px-4 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl"
              >
                Schedule New Appointment
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h8m-8 0H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">Complete Your Digital ID Application</h4>
          <p className="text-sm text-gray-600 mb-4">
            Schedule your biometric fingerprint collection appointment to activate your Digital ID.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <h5 className="text-sm font-semibold text-blue-900 mb-2">Why is this required?</h5>
            <p className="text-xs text-blue-800">
              Biometric collection ensures the security and authenticity of your Digital ID. This is the final step to complete your SevisPass application.
            </p>
          </div>
          <button
            onClick={() => setShowScheduling(true)}
            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl"
          >
            Schedule Biometric Appointment
          </button>
        </div>
      )}
    </div>
  );
}