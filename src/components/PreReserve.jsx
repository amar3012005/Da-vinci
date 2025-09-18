import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Users, Calendar, ArrowRight, X } from 'lucide-react';

const PreReserve = () => {
  const navigate = useNavigate();
  const [selectedTime, setSelectedTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [isReserving, setIsReserving] = useState(false);

  // Available time slots for Himalayan Cafe
  const timeSlots = [
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
  ];

  // Function to check if a time slot has passed
  const isTimeSlotPassed = (timeSlot) => {
    const now = new Date();
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);
    
    return now > slotTime;
  };

  const handleReserve = async () => {
    if (!selectedTime) {
      alert('Please select a time slot');
      return;
    }

    setIsReserving(true);
    
    // Store reservation details in localStorage for checkout
    const reservationData = {
      restaurant: 'HIMALAYAN_CAFE',
      restaurantId: '2',
      timeSlot: selectedTime,
      partySize: partySize,
      date: new Date().toISOString().split('T')[0], // Today's date
      discount: 10, // 10% discount for pre-reservation
      reservationId: `RES_${Date.now()}`,
      timestamp: new Date().toISOString(),
      isPreReservation: true, // Mark as pre-reservation
      orderType: 'pre-reserve' // Add order type
    };

    localStorage.setItem('preReservation', JSON.stringify(reservationData));

    // Simulate reservation process
    setTimeout(() => {
      setIsReserving(false);
      // Navigate directly to Himalayan Cafe menu with pre-reservation data
      navigate('/menu/2?preReserved=true');
    }, 2000);
  };

  const handleCancel = () => {
    navigate('/');
  };

  return (
    <div className="bg-black min-h-screen text-white relative">
      {/* Background patterns - same as Menu */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,#242_1px,transparent_1px),linear-gradient(-45deg,#111_1px,transparent_1px)] bg-[size:20px_20px]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,#222_1px,transparent_1px),linear-gradient(90deg,#111_1px,transparent_1px)] bg-[size:40px_40px] opacity-50" />
      </div>

      {/* Navbar */}
      <div className="relative z-10 p-4 border-b border-white/20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            onClick={handleCancel}
            className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors"
          >
            <X size={20} />
            <span className="font-mono text-sm">BACK</span>
          </button>
          
          <h1 className="text-2xl font-mono font-bold text-white">
            FOODLES
          </h1>
          
          <div className="w-16"></div> {/* Spacer for center alignment */}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-md">
        {/* Header with synchronized pulse */}
        <div className="flex items-center space-x-4 mb-12">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-[pulse_1.5s_ease-in-out_infinite]" />
          <h2 className="text-3xl font-mono font-bold text-white">
            <span className="opacity-100">PRE-RESERVE</span>{' '}
            <span className="relative">
              TABLE
              <span className="absolute -inset-1 bg-white/10 -skew-x-12 -z-10" />
            </span>
          </h2>
        </div>

        {/* Reservation Form */}
        <div className="bg-black/50 p-6 space-y-6">
          <div className="text-center">
            <div className="text-green-400 font-mono text-lg mb-2">Reserve Your Table at HIMALAYAN_CAFE</div>
            <div className="text-sm text-gray-300 font-mono mb-1">
              Pre-reserve here and enjoy your meal at the restaurant
            </div>
            <div className="text-xs text-gray-500 font-mono">
              Slots: 12:00-18:00 (30 min intervals)
            </div>
          </div>

          {/* Time Slots Grid */}
          <div className="grid grid-cols-2 gap-3">
            {timeSlots.map((time) => {
              const isPassed = isTimeSlotPassed(time);
              return (
                <button
                  key={time}
                  onClick={() => !isPassed && setSelectedTime(time)}
                  disabled={isPassed}
                  className={`
                    p-3 border font-mono text-sm transition-all duration-200 relative
                    ${isPassed 
                      ? 'border-gray-600 bg-gray-800/30 text-gray-500 cursor-not-allowed opacity-50' 
                      : selectedTime === time 
                        ? 'border-green-400 bg-green-400/20 text-green-400' 
                        : 'border-white/30 hover:border-white/50 text-white'
                    }
                  `}
                >
                  {time}
                  {isPassed && (
                    <span className="absolute top-1 right-1 text-xs text-red-400">✕</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Party Size */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm">Party Size</span>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setPartySize(Math.max(1, partySize - 1))}
                  className="w-8 h-8 border border-white/30 hover:border-white/50 flex items-center justify-center"
                >
                  -
                </button>
                <span className="w-8 text-center font-mono">{partySize}</span>
                <button
                  onClick={() => setPartySize(Math.min(8, partySize + 1))}
                  className="w-8 h-8 border border-white/30 hover:border-white/50 flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* 10% Discount Notice */}
          <div className="bg-green-400/10 border border-green-400/30 p-3 text-center">
            <div className="text-green-400 font-mono text-sm">
              🎉 10% off on pre-orders at checkout
            </div>
          </div>

        
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={handleCancel}
                      className="py-3 px-4 border border-white/30 hover:border-white/50 font-mono text-sm transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReserve}
                      disabled={isReserving || !selectedTime}
                      className={`
                        py-3 px-4 font-mono text-sm transition-all duration-200 flex items-center justify-center border
                        ${isReserving || !selectedTime 
                          ? 'border-gray-600 bg-gray-600/20 text-gray-400 cursor-not-allowed' 
                          : 'border-green-400 bg-green-400/20 text-green-400 hover:border-green-300 hover:bg-green-400/30'
                        }
                      `}
                    >
                      {isReserving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          Reserving...
                        </>
                      ) : (
                        <>
                          Reserve
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

        {/* Footer Info */}
        <div className="text-center mt-6 space-y-2">
          <div className="text-xs font-mono text-green-400">
            ✓ Pre-reservation guarantees your table and unlocks 10% discount
          </div>
          <div className="text-xs font-mono text-gray-500">
            Dine-in experience • Pay advance online • Complete order at restaurant
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default PreReserve;
