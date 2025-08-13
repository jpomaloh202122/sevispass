'use client';

import { useState, useEffect } from 'react';
import { format, addDays, isWeekend } from 'date-fns';

interface Location {
  id: number;
  name: string;
  address: string;
  electorate: string;
  phone: string;
  operatingHours: string;
}

interface TimeSlot {
  id: number;
  startTime: string;
  endTime: string;
  maxAppointments: number;
  bookedCount: number;
  spotsRemaining: number;
  isAvailable: boolean;
}

interface EnhancedBiometricSchedulingProps {
  userUid: string;
  userName: string;
  onAppointmentBooked: (appointment: any) => void;
  onCancel?: () => void;
}

export default function EnhancedBiometricScheduling({ 
  userUid, 
  userName, 
  onAppointmentBooked, 
  onCancel 
}: EnhancedBiometricSchedulingProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Generate next 14 business days for appointment options
  const getAvailableDates = () => {
    const dates = [];
    let currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 1); // Start from tomorrow
    
    while (dates.length < 14) {
      if (!isWeekend(currentDate)) {
        dates.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  };

  const availableDates = getAvailableDates();

  // Load locations on component mount
  useEffect(() => {
    fetchLocations();
  }, []);

  // Load time slots when location and date are selected
  useEffect(() => {
    if (selectedLocationId && selectedDate) {
      fetchTimeSlots();
    } else {
      setTimeSlots([]);
      setSelectedTimeSlot(null);
    }
  }, [selectedLocationId, selectedDate]);

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/biometric/locations');
      const data = await response.json();
      
      if (data.success) {
        setLocations(data.locations);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      setMessage({ type: 'error', text: 'Failed to load locations' });
    }
  };

  const fetchTimeSlots = async () => {
    if (!selectedLocationId || !selectedDate) return;

    setIsLoadingSlots(true);
    setSelectedTimeSlot(null);
    
    try {
      const response = await fetch('/api/biometric/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: selectedLocationId,
          date: selectedDate
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setTimeSlots(data.availableSlots);
      } else {
        setMessage({ type: 'error', text: data.message });
        setTimeSlots([]);
      }
    } catch (error) {
      console.error('Error fetching time slots:', error);
      setMessage({ type: 'error', text: 'Failed to load available time slots' });
      setTimeSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const bookAppointment = async () => {
    const selectedLocation = locations.find(loc => loc.id === selectedLocationId);
    
    if (!selectedLocation || !selectedDate || !selectedTimeSlot) {
      setMessage({ type: 'error', text: 'Please select location, date, and time' });
      return;
    }

    setIsBooking(true);
    setMessage(null);

    console.log('Frontend booking request:', {
      userUid: userUid,
      locationId: selectedLocationId,
      appointmentDate: selectedDate,
      appointmentTime: selectedTimeSlot.startTime
    });

    try {
      // Try both APIs for debugging
      const response = await fetch('/api/biometric/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userUid: userUid,
          locationId: selectedLocationId,
          appointmentDate: selectedDate,
          appointmentTime: selectedTimeSlot.startTime
        })
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP Error Response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Appointment booked successfully!' });
        onAppointmentBooked(data.appointment);
      } else {
        console.error('Booking failed:', data);
        setMessage({ type: 'error', text: data.message || 'Booking failed for unknown reason' });
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to book appointment. Please try again.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsBooking(false);
    }
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const selectedLocation = locations.find(loc => loc.id === selectedLocationId);
  const canSubmit = selectedLocationId && selectedDate && selectedTimeSlot && !isBooking;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Schedule Biometric Appointment</h3>
          <p className="text-gray-600 mt-1">Complete your Digital ID application</p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Important Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-amber-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-amber-800">
            <p className="font-semibold">Important:</p>
            <p>You must attend your biometric appointment to complete your Digital ID application. Please bring a valid form of identification.</p>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {/* Step 1: Police Station Selection */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
            1
          </div>
          <h3 className="text-xl font-semibold text-gray-900">Choose Police Station</h3>
        </div>
        
        <p className="text-gray-600 mb-6">Select your preferred police station for biometric collection</p>
        
        {/* Police Station Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((location) => (
            <button
              key={location.id}
              onClick={() => {
                setSelectedLocationId(location.id);
                setSelectedDate(''); // Reset date when location changes
                setMessage(null);
              }}
              className={`p-4 border-2 rounded-xl text-left transition-all transform hover:scale-105 ${
                selectedLocationId === location.id
                  ? 'border-blue-500 bg-blue-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-lg">{location.name.replace(' Police Station', '')}</h4>
                  <p className="text-sm text-gray-600 mt-1">{location.address}</p>
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center text-xs text-gray-500">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {location.electorate}
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {location.phone}
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {location.operatingHours}
                    </div>
                  </div>
                </div>
                {selectedLocationId === location.id && (
                  <div className="text-blue-500 ml-2">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Date and Time Selection */}
      {selectedLocationId && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
              2
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Choose Date & Time</h3>
          </div>
          
          <p className="text-gray-600 mb-6">Select your preferred appointment date and time slot</p>
          
          {/* Date Selection */}
          <div className="mb-6">
            <label className="block text-base font-semibold text-gray-700 mb-3">
              Select Date
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {availableDates.map((date) => {
                const dateString = format(date, 'yyyy-MM-dd');
                const isSelected = selectedDate === dateString;
                
                return (
                  <button
                    key={dateString}
                    onClick={() => setSelectedDate(dateString)}
                    className={`p-3 border-2 rounded-lg text-center transition-all transform hover:scale-105 ${
                      isSelected
                        ? 'border-green-500 bg-green-100 shadow-md'
                        : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {format(date, 'EEE')}
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {format(date, 'd')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(date, 'MMM')}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Selection */}
          {selectedDate && (
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-3">
                Select Time Slot
              </label>
              
              {isLoadingSlots ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading available times...</p>
                </div>
              ) : timeSlots.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => slot.isAvailable && setSelectedTimeSlot(slot)}
                      disabled={!slot.isAvailable}
                      className={`p-4 border-2 rounded-lg text-center transition-all transform hover:scale-105 ${
                        !slot.isAvailable
                          ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                          : selectedTimeSlot?.id === slot.id
                          ? 'border-green-500 bg-green-100 shadow-md'
                          : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-sm cursor-pointer'
                      }`}
                    >
                      <div className="font-bold text-lg">
                        {formatTime(slot.startTime)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatTime(slot.endTime)}
                      </div>
                      <div className="text-xs mt-2 px-2 py-1 rounded-full inline-block">
                        {slot.isAvailable ? (
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            {slot.spotsRemaining} available
                          </span>
                        ) : (
                          <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full">
                            Fully booked
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-gray-200">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-medium">No available time slots</p>
                  <p className="text-sm mt-1">Please choose a different date.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Confirmation & Submit */}
      {canSubmit && (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg p-6 border border-yellow-200">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-yellow-600 text-white rounded-full flex items-center justify-center font-bold mr-3">
              3
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Confirm Appointment</h3>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Appointment Details
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Applicant</span>
                  <p className="text-lg font-semibold text-gray-900">{userName}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Police Station</span>
                  <p className="text-lg font-semibold text-gray-900">{selectedLocation?.name}</p>
                  <p className="text-sm text-gray-600">{selectedLocation?.address}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Date</span>
                  <p className="text-lg font-semibold text-gray-900">{format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Time Slot</span>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedTimeSlot && `${formatTime(selectedTimeSlot.startTime)} - ${formatTime(selectedTimeSlot.endTime)}`}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Contact Phone:</span>
                <span>{selectedLocation?.phone}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600 mt-1">
                <span>Operating Hours:</span>
                <span>{selectedLocation?.operatingHours}</span>
              </div>
            </div>
          </div>
          
          <button
            onClick={bookAppointment}
            disabled={isBooking}
            className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-lg rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isBooking ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Booking Appointment...
              </div>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Confirm Biometric Appointment
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}