import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, AlertCircle, Info, X } from 'lucide-react'; // Add Info import

const PersonalInfo = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [paymentMethod, setPaymentMethod] = useState('cod'); // Change default payment method to 'cod'
  const [userDetails, setUserDetails] = useState(
    location.state?.preservedUserDetails || {
      fullName: '',
      email: '',
      phoneNumber: '',
      address: '',
    }
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showWarning, setShowWarning] = useState(false);
  const [hasAcceptedWarning, setHasAcceptedWarning] = useState(false);

  const { amount, items, donation, orderDetails, vendorEmail, vendorPhone, restaurantId, restaurantName, error, preReservationData, preReservationDiscount } = location.state || {};

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    // Remove +91 prefix for validation
    const cleanPhone = phone.replace(/^\+91/, '');
    const phoneRegex = /^[6789]\d{9}$/;
    return phoneRegex.test(cleanPhone);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    
    // Add +91 prefix for phone numbers if not present
    if (name === 'phoneNumber') {
      if (!value.startsWith('+91')) {
        finalValue = value.startsWith('91') ? `+${value}` : `+91${value.replace(/^\+/, '')}`;
      }
    }
    
    setUserDetails((prevDetails) => ({
      ...prevDetails,
      [name]: finalValue,
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const { fullName, email, phoneNumber, address } = userDetails;

    if (!fullName.trim()) {
      newErrors.fullName = 'Name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!validatePhone(phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid Indian phone number';
    }

    if (!address.trim()) {
      newErrors.address = 'Address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!hasAcceptedWarning) {
      setShowWarning(true);
      setHasAcceptedWarning(true);
      return;
    }

    const { fullName, email, phoneNumber, address } = userDetails;

    if (!fullName || !email || !phoneNumber || !address) {
      alert('Please fill in all the details.');
      return;
    }

    setIsLoading(true);

    // Navigate to the next page
    navigate('/waiting-room', {
      state: {
        amount,
        items,
        donation,
        paymentMethod,
        customerPhone: userDetails.phoneNumber,
        userDetails, // Pass userDetails to the next page
        orderDetails: {
          ...orderDetails,
          deliveryAddress: address,
        },
        vendorEmail, // Pass vendorEmail to the next page
        vendorPhone,
        restaurantId,
        restaurantName,
        preReservationData,
        preReservationDiscount
      },
    });

    setIsLoading(false);
  };

  return (
    <div className="bg-black min-h-screen p-8 pb-32 relative"> {/* Added pb-32 for footer space */}
  
      <div className="max-w-4xl mx-auto text-white">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <h1 className="text-3xl font-mono font-bold">Contact Details</h1>
        </div>
        
        {/* Conditional rendering of warning message */}
        {showWarning && (
          <div className="fixed inset-0 z-40 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/95" />
            <div className="relative p-10 border border-green-400/20 bg-green-400/5 rounded-lg animate-fade-in max-w-md mx-auto">
              <button
                onClick={() => setShowWarning(false)}
                className="absolute top-2 right-2 text-white/90 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-green-300 mt-1" />
                <div>
                  <h3 className="font-mono text-green-400 mb-1">                    Please confirm your details because order updates will be sent to your email and phone. </h3>
                 
                  <p className="flex items-center space-x-2 text-white/50 text-xs mt-2">
                    <span>* Once after Order Confirmation, If you don't see the email in your inbox, please check your spam folder.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Show error message if payment failed */}
        {error && (
          <div className="mb-8 p-4 border border-red-500/20 bg-red-500/5 rounded-lg animate-fade-in">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-1" />
              <div>
                <h3 className="font-mono text-red-500 mb-1">Payment Failed</h3>
                <p className="text-white/70 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form className="space-y-6">
          {Object.entries(userDetails).map(([key, value]) => (
            <div key={key}>
              <label className="block text-white/70 mb-2">{key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}</label>
              <input
                type={key === 'phoneNumber' ? 'tel' : key === 'email' ? 'email' : 'text'}
                name={key}
                value={value}
                onChange={handleInputChange}
                className={`w-full p-4 bg-black border ${
                  errors[key] ? 'border-red-500' : 'border-white/20'
                } text-white rounded`}
                placeholder={key === 'phoneNumber' ? '+91 Phone Number' : `Enter your ${key}`}
                required
              />
              {errors[key] && (
                <div className="flex items-center gap-2 mt-2 text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{errors[key]}</span>
                </div>
              )}
            </div>
          ))}

          
        </form>

        <div className="border border-white/10 bg-black/90 p-6 mt-8">
          <h2 className="text-xl font-mono text-white mb-4">PAYMENT METHOD</h2>
          <div className="space-y-4">
            {['cod & UPI'].map((method) => (
              <button
                key={method}
                className={`w-full p-4 border ${
                  paymentMethod === method
                    ? 'border-green-400 text-green-400'
                    : 'border-white/30 text-white/70 hover:border-white/50'
                } transition-colors uppercase font-mono flex items-center justify-between`}
                onClick={(e) => {
                  e.preventDefault();
                  setPaymentMethod(method);
                }}
              >
                <span>{method.toUpperCase()}</span>
                {paymentMethod === method && (
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                )}
              </button>
            ))}
            
            {/* Disabled card payment option */}
            <div 
              className="w-full p-4 border border-white/10 text-white/40 uppercase font-mono flex items-center justify-between cursor-not-allowed"
            >
              <span>CARD</span>
              <span className="text-xs">(Currently Unavailable)</span>
            </div>
          </div>
        </div>

        {items && items.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-black/95 border-t border-white/20 p-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <div className="text-white font-mono">Total: ₹{amount.toFixed(2)}</div>
              <button
                className="px-8 py-3 bg-green-500 text-black font-mono hover:bg-green-400 transition-colors flex items-center gap-2"
                onClick={handleNext}
                disabled={isLoading}
              >
                <MessageSquare className="w-4 h-4" />
                {isLoading ? 'Processing...' : 'NEXT'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalInfo;
