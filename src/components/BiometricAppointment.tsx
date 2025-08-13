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

interface BiometricAppointmentProps {
  userUid: string;
  userName: string;
  onAppointmentBooked: (appointment: any) => void;
}

export default function BiometricAppointment({ userUid, userName, onAppointmentBooked }: BiometricAppointmentProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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
    if (selectedLocation && selectedDate) {
      fetchTimeSlots();
    }
  }, [selectedLocation, selectedDate]);

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/biometric/locations');
      const data = await response.json();
      
      if (data.success) {
        setLocations(data.locations);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchTimeSlots = async () => {
    if (!selectedLocation || !selectedDate) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/biometric/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: selectedLocation.id,
          date: selectedDate
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setTimeSlots(data.availableSlots);
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      console.error('Error fetching time slots:', error);
      setMessage({ type: 'error', text: 'Failed to load available time slots' });
    } finally {
      setIsLoading(false);
    }
  };

  const bookAppointment = async () => {
    if (!selectedLocation || !selectedDate || !selectedTimeSlot) return;

    setIsBooking(true);
    setMessage(null);

    try {
      const response = await fetch('/api/biometric/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userUid: userUid,
          locationId: selectedLocation.id,
          appointmentDate: selectedDate,
          appointmentTime: selectedTimeSlot.startTime
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Appointment booked successfully!' });
        onAppointmentBooked(data.appointment);
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      setMessage({ type: 'error', text: 'Failed to book appointment. Please try again.' });
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

  // Group locations by electorate
  const locationsByElectorate = locations.reduce((acc, location) => {
    if (!acc[location.electorate]) {
      acc[location.electorate] = [];
    }
    acc[location.electorate].push(location);
    return acc;
  }, {} as Record<string, Location[]>);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Schedule Biometric Fingerprint Collection
        </h2>
        <p className="text-gray-600">
          Complete your Digital ID application by scheduling a biometric collection appointment
        </p>
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Important:</span> You must attend your biometric appointment 
            to complete your Digital ID application. Bring a valid form of identification.
          </p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <p>{message.text}</p>
        </div>
      )}

      {/* Step 1: Select Location */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          1. Select Collection Location
        </h3>
        
        <div className="space-y-6">
          {Object.entries(locationsByElectorate).map(([electorate, electorateLocations]) => (
            <div key={electorate}>
              <h4 className="font-medium text-gray-700 mb-3 text-lg">
                {electorate} Electorate
              </h4>
              <div className="grid md:grid-cols-1 gap-3">
                {electorateLocations.map((location) => (
                  <div
                    key={location.id}
                    onClick={() => setSelectedLocation(location)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedLocation?.id === location.id
                        ? 'border-yellow-400 bg-yellow-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h5 className="font-semibold text-gray-900">{location.name}</h5>
                        <p className="text-sm text-gray-600 mt-1">{location.address}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span>📞 {location.phone}</span>
                          <span>🕒 {location.operatingHours}</span>
                        </div>
                      </div>
                      {selectedLocation?.id === location.id && (
                        <div className="text-yellow-500">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step 2: Select Date */}
      {selectedLocation && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            2. Select Appointment Date
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {availableDates.map((date) => {
              const dateString = format(date, 'yyyy-MM-dd');
              const isSelected = selectedDate === dateString;
              
              return (
                <div
                  key={dateString}
                  onClick={() => setSelectedDate(dateString)}
                  className={`p-3 border-2 rounded-lg cursor-pointer text-center transition-all ${
                    isSelected
                      ? 'border-yellow-400 bg-yellow-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900">
                    {format(date, 'EEE')}
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {format(date, 'd')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(date, 'MMM')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: Select Time */}
      {selectedLocation && selectedDate && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            3. Select Appointment Time
          </h3>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading available times...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {timeSlots.map((slot) => (
                <div
                  key={slot.id}
                  onClick={() => slot.isAvailable && setSelectedTimeSlot(slot)}
                  className={`p-4 border-2 rounded-lg text-center transition-all ${
                    !slot.isAvailable
                      ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                      : selectedTimeSlot?.id === slot.id
                      ? 'border-yellow-400 bg-yellow-50 cursor-pointer'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer'
                  }`}
                >
                  <div className="font-semibold">
                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                  </div>
                  <div className="text-xs mt-1">
                    {slot.isAvailable 
                      ? `${slot.spotsRemaining} spots left`
                      : 'Fully booked'
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Booking Summary & Confirmation */}
      {selectedLocation && selectedDate && selectedTimeSlot && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            4. Confirm Your Appointment
          </h3>
          
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Applicant:</span>
              <span className="text-gray-900">{userName}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Location:</span>
              <span className="text-gray-900">{selectedLocation.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Date:</span>
              <span className="text-gray-900">{format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Time:</span>
              <span className="text-gray-900">
                {formatTime(selectedTimeSlot.startTime)} - {formatTime(selectedTimeSlot.endTime)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Address:</span>
              <span className="text-gray-900 text-right">{selectedLocation.address}</span>
            </div>
          </div>
          
          <button
            onClick={bookAppointment}
            disabled={isBooking}
            className="w-full mt-6 py-4 px-6 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-bold text-lg rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isBooking ? 'Booking Appointment...' : 'Confirm Biometric Appointment'}
          </button>
        </div>
      )}
    </div>
  );
}