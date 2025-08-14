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
  isRescheduling?: boolean;
  existingAppointment?: any;
}

interface WizardStep {
  id: number;
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
}

export default function BiometricAppointment({ 
  userUid, 
  userName, 
  onAppointmentBooked, 
  isRescheduling = false, 
  existingAppointment 
}: BiometricAppointmentProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Determine if this is truly a reschedule (has existing scheduled appointment) or initial booking
  const shouldReschedule = isRescheduling && existingAppointment && existingAppointment.status === 'scheduled';

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

  // Define wizard steps
  const steps: WizardStep[] = [
    {
      id: 1,
      title: 'Location',
      description: 'Choose collection center',
      isCompleted: !!selectedLocation,
      isActive: currentStep === 1
    },
    {
      id: 2,
      title: 'Date',
      description: 'Select appointment date',
      isCompleted: !!selectedDate,
      isActive: currentStep === 2
    },
    {
      id: 3,
      title: 'Time',
      description: 'Pick available time slot',
      isCompleted: !!selectedTimeSlot,
      isActive: currentStep === 3
    },
    {
      id: 4,
      title: 'Confirm',
      description: 'Review and book',
      isCompleted: false,
      isActive: currentStep === 4
    }
  ];

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

  // Auto-advance to next step when current step is completed
  useEffect(() => {
    if (currentStep === 1 && selectedLocation) {
      setCurrentStep(2);
    } else if (currentStep === 2 && selectedDate) {
      setCurrentStep(3);
    } else if (currentStep === 3 && selectedTimeSlot) {
      setCurrentStep(4);
    }
  }, [selectedLocation, selectedDate, selectedTimeSlot, currentStep]);

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

    console.log('=== BIOMETRIC APPOINTMENT DEBUG ===');
    console.log('isRescheduling prop:', isRescheduling);
    console.log('existingAppointment:', existingAppointment);
    console.log('shouldReschedule (calculated):', shouldReschedule);

    setIsBooking(true);
    setMessage(null);

    try {
      const endpoint = shouldReschedule ? '/api/biometric/reschedule' : '/api/biometric/book';
      const requestBody = shouldReschedule ? {
        userUid: userUid,
        newLocationId: selectedLocation.id,
        newAppointmentDate: selectedDate,
        newAppointmentTime: selectedTimeSlot.startTime
      } : {
        userUid: userUid,
        locationId: selectedLocation.id,
        appointmentDate: selectedDate,
        appointmentTime: selectedTimeSlot.startTime
      };

      console.log('Selected endpoint:', endpoint);
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      console.log('=== END BIOMETRIC APPOINTMENT DEBUG ===');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (data.success) {
        const successMessage = shouldReschedule ? 'Appointment rescheduled successfully!' : 'Appointment booked successfully!';
        setMessage({ type: 'success', text: successMessage });
        onAppointmentBooked(data.appointment);
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      console.error(`Error ${shouldReschedule ? 'rescheduling' : 'booking'} appointment:`, error);
      const errorMessage = shouldReschedule ? 'Failed to reschedule appointment. Please try again.' : 'Failed to book appointment. Please try again.';
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

  // Navigation helpers
  const canGoNext = () => {
    if (currentStep === 1) return !!selectedLocation;
    if (currentStep === 2) return !!selectedDate;
    if (currentStep === 3) return !!selectedTimeSlot;
    return false;
  };

  const goToStep = (stepNumber: number) => {
    if (stepNumber === 1) {
      setCurrentStep(1);
    } else if (stepNumber === 2 && selectedLocation) {
      setCurrentStep(2);
    } else if (stepNumber === 3 && selectedLocation && selectedDate) {
      setCurrentStep(3);
    } else if (stepNumber === 4 && selectedLocation && selectedDate && selectedTimeSlot) {
      setCurrentStep(4);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goNext = () => {
    if (canGoNext() && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
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
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {shouldReschedule ? 'Reschedule Your Appointment' : 'Schedule Biometric Appointment'}
        </h2>
        <p className="text-gray-600 mb-6">
          {shouldReschedule 
            ? 'Update your appointment details with our simple 4-step process' 
            : 'Complete your Digital ID application with our simple 4-step process'}
        </p>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4 mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                onClick={() => goToStep(step.id)}
                className={`
                  flex items-center justify-center w-12 h-12 rounded-full border-2 cursor-pointer transition-all duration-300
                  ${step.isCompleted 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : step.isActive 
                    ? 'bg-yellow-500 border-yellow-500 text-white' 
                    : 'bg-white border-gray-300 text-gray-400 hover:border-gray-400'
                  }
                `}
              >
                {step.isCompleted ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-sm font-semibold">{step.id}</span>
                )}
              </div>
              <div className="ml-3 text-left">
                <div className={`text-sm font-medium ${step.isActive ? 'text-yellow-600' : step.isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                  {step.title}
                </div>
                <div className="text-xs text-gray-400">{step.description}</div>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 ml-6 ${steps[index + 1].isCompleted || steps[index + 1].isActive ? 'bg-yellow-300' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Current Appointment (for rescheduling) */}
        {shouldReschedule && existingAppointment && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Current Appointment:</h4>
            <div className="text-sm text-blue-800">
              <p><strong>Date:</strong> {format(new Date(existingAppointment.appointmentDate), 'EEEE, MMMM d, yyyy')}</p>
              <p><strong>Time:</strong> {existingAppointment.appointmentTime}</p>
              <p><strong>Location:</strong> {existingAppointment.location?.name}</p>
            </div>
          </div>
        )}

        {/* Important Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Important:</span> You must attend your biometric appointment 
            to complete your Digital ID application. Bring a valid form of identification.
          </p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <p>{message.text}</p>
        </div>
      )}

      {/* Main Wizard Content */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 min-h-[500px]">
        {/* Step 1: Select Location */}
        {currentStep === 1 && (
          <div className="p-8">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Location</h3>
              <p className="text-gray-600">Select the biometric collection center nearest to you</p>
            </div>
            
            <div className="space-y-6">
              {Object.entries(locationsByElectorate).map(([electorate, electorateLocations]) => (
                <div key={electorate}>
                  <h4 className="font-semibold text-gray-800 mb-4 text-lg border-b border-gray-200 pb-2">
                    {electorate} Electorate
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                    {electorateLocations.map((location) => (
                      <div
                        key={location.id}
                        onClick={() => setSelectedLocation(location)}
                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md relative ${
                          selectedLocation?.id === location.id
                            ? 'border-yellow-400 bg-yellow-50 shadow-lg'
                            : 'border-gray-200 hover:border-yellow-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <h5 className="font-bold text-gray-900 text-base leading-tight">{location.name}</h5>
                            {selectedLocation?.id === location.id && (
                              <div className="text-yellow-500 bg-yellow-100 rounded-full p-1.5 ml-2 flex-shrink-0">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          
                          <div className="text-gray-600 text-sm flex items-start">
                            <svg className="w-3.5 h-3.5 mr-1.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="leading-tight">{location.address}</span>
                          </div>
                          
                          <div className="space-y-1.5">
                            <div className="text-xs text-gray-500 flex items-center">
                              <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <span>{location.phone}</span>
                            </div>
                            <div className="text-xs text-gray-500 flex items-center">
                              <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{location.operatingHours}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Date */}
        {currentStep === 2 && (
          <div className="p-8">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Pick Your Date</h3>
              <p className="text-gray-600">Choose from available business days in the next two weeks</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 max-w-4xl mx-auto">
              {availableDates.map((date) => {
                const dateString = format(date, 'yyyy-MM-dd');
                const isSelected = selectedDate === dateString;
                
                return (
                  <div
                    key={dateString}
                    onClick={() => setSelectedDate(dateString)}
                    className={`p-4 border-2 rounded-xl cursor-pointer text-center transition-all hover:shadow-md ${
                      isSelected
                        ? 'border-yellow-400 bg-yellow-50 shadow-lg'
                        : 'border-gray-200 hover:border-yellow-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-500 uppercase">
                      {format(date, 'EEE')}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 my-1">
                      {format(date, 'd')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(date, 'MMM yyyy')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Select Time */}
        {currentStep === 3 && (
          <div className="p-8">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Select Time Slot</h3>
              <p className="text-gray-600">
                Available times for {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')} at {selectedLocation?.name}
              </p>
            </div>
            
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading available time slots...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {timeSlots.map((slot) => (
                  <div
                    key={slot.id}
                    onClick={() => slot.isAvailable && setSelectedTimeSlot(slot)}
                    className={`p-5 border-2 rounded-xl text-center transition-all ${
                      !slot.isAvailable
                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                        : selectedTimeSlot?.id === slot.id
                        ? 'border-yellow-400 bg-yellow-50 cursor-pointer shadow-lg'
                        : 'border-gray-200 hover:border-yellow-300 hover:bg-gray-50 cursor-pointer hover:shadow-md'
                    }`}
                  >
                    <div className="font-bold text-lg">
                      {formatTime(slot.startTime)}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      to {formatTime(slot.endTime)}
                    </div>
                    <div className={`text-xs mt-2 px-2 py-1 rounded-full ${
                      slot.isAvailable 
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {slot.isAvailable 
                        ? `${slot.spotsRemaining} spots available`
                        : 'Fully booked'
                      }
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 4 && (
          <div className="p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {shouldReschedule ? 'Confirm Your New Appointment' : 'Confirm Your Appointment'}
              </h3>
              <p className="text-gray-600">
                {shouldReschedule 
                  ? 'Please review your new appointment details before confirming the reschedule' 
                  : 'Please review your appointment details before confirming'}
              </p>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-2xl p-6 mb-6">
                <h4 className="text-lg font-bold text-gray-900 mb-4">Appointment Summary</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 mr-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="font-medium">Applicant</span>
                    </div>
                    <span className="text-gray-900 font-semibold">{userName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 mr-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      <span className="font-medium">Location</span>
                    </div>
                    <span className="text-gray-900 font-semibold">{selectedLocation?.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 mr-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0v1h6V7a2 2 0 00-2-2H10a2 2 0 00-2 2z" />
                      </svg>
                      <span className="font-medium">Date</span>
                    </div>
                    <span className="text-gray-900 font-semibold">{format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-gray-700">
                      <svg className="w-5 h-5 mr-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">Time</span>
                    </div>
                    <span className="text-gray-900 font-semibold">
                      {formatTime(selectedTimeSlot?.startTime || '')} - {formatTime(selectedTimeSlot?.endTime || '')}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-yellow-200">
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Address: </span>
                      <span>{selectedLocation?.address}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h5 className="font-semibold text-blue-900 mb-2">Before your appointment:</h5>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Bring a valid form of identification</li>
                  <li>• Arrive 10 minutes early for check-in</li>
                  <li>• The process takes approximately 15 minutes</li>
                </ul>
              </div>
              
              <button
                onClick={bookAppointment}
                disabled={isBooking}
                className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold text-lg rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isBooking ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                    {shouldReschedule ? 'Rescheduling Your Appointment...' : 'Booking Your Appointment...'}
                  </span>
                ) : (
                  shouldReschedule ? 'Confirm Appointment Reschedule' : 'Confirm Biometric Appointment'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Navigation Footer */}
        <div className="border-t border-gray-200 px-8 py-6">
          <div className="flex justify-between items-center">
            <button
              onClick={goBack}
              disabled={currentStep === 1}
              className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
                currentStep === 1 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            
            <div className="text-sm text-gray-500">
              Step {currentStep} of {steps.length}
            </div>
            
            <button
              onClick={goNext}
              disabled={!canGoNext() || currentStep === 4}
              className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
                !canGoNext() || currentStep === 4
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-white bg-yellow-500 hover:bg-yellow-600 shadow-md hover:shadow-lg'
              }`}
            >
              Next
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}