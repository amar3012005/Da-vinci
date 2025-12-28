import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [vendorEmail, setVendorEmail] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [restaurantId, setRestaurantId] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [preReservationData, setPreReservationData] = useState(null);
  const [preReservationDiscount, setPreReservationDiscount] = useState(0);

  // Constants for additional charges
  const NORTH_CAMPUS_DELIVERY_FEE = 15;
  const SOUTH_CAMPUS_DELIVERY_FEE = 25;
  const CONVENIENCE_FEE = 5;

  // Get campus selection from localStorage
  const selectedCampus = localStorage.getItem('selectedCampus') || 'north';
  const DELIVERY_FEE = selectedCampus === 'south' ? SOUTH_CAMPUS_DELIVERY_FEE : NORTH_CAMPUS_DELIVERY_FEE;

  useEffect(() => {
    // Get cart items from location state
    if (location.state?.cartItems) {
      setCartItems(location.state.cartItems);
    }
    if (location.state?.vendorEmail) {
      setVendorEmail(location.state.vendorEmail);
    }
    if (location.state?.vendorPhone) {
      setVendorPhone(location.state.vendorPhone);
    }
    if (location.state?.restaurantId) {
      setRestaurantId(location.state.restaurantId);
    }
    if (location.state?.restaurantName) {
      setRestaurantName(location.state.restaurantName);
    }
    if (location.state?.preReservationData) {
      setPreReservationData(location.state.preReservationData);
    }
    if (location.state?.discount) {
      setPreReservationDiscount(location.state.discount);
    }
    setIsLoaded(true);
  }, [location]);

  // Calculate subtotal from cart items
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Check if this is a pre-reservation order
  const isPreReservation = preReservationData?.isPreReservation || false;
  
  // Calculate grand total - exclude delivery fee for pre-reservations
  const deliveryFee = isPreReservation ? 0 : DELIVERY_FEE;
  const grandTotal = subtotal - preReservationDiscount + deliveryFee + CONVENIENCE_FEE;

  const handleCheckout = () => {
    const orderDetails = {
      items: cartItems,
      subtotal,
      deliveryFee: deliveryFee,
      convenienceFee: CONVENIENCE_FEE,
      dogDonation: 0,
      grandTotal,
      vendorEmail,
      vendorPhone,
      selectedCampus: selectedCampus, // Add campus information
      isPreReservation: isPreReservation,
      orderType: isPreReservation ? 'pre-reserve' : 'normal'
    };

    navigate('/personal-info', { 
      state: { 
        amount: grandTotal,
        items: cartItems,
        donation: 0,
        orderDetails,
        vendorEmail,
        vendorPhone,
        restaurantId,
        restaurantName,
        preReservationData: preReservationData,
        preReservationDiscount: preReservationDiscount
      }
    });
  };

  return (
    <div className="bg-black min-h-screen relative p-8 pb-32"> {/* Added pb-32 for footer space */}
     

      {/* Background patterns */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,#242_1px,transparent_1px),linear-gradient(-45deg,#111_1px,transparent_1px)] bg-[size:20px_20px]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,#222_1px,transparent_1px),linear-gradient(90deg,#111_1px,transparent_1px)] bg-[size:40px_40px] opacity-50" />
      </div>
      
      <div className="max-w-4xl mx-auto relative">
        {/* Header */}
        <div className={`mb-12 transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="flex items-center space-x-4">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <h1 className="text-3xl font-mono font-bold text-white">CHECKOUT</h1>
            {preReservationData && (
              <span className="bg-green-400/20 border border-green-400 px-2 py-1 text-green-400 font-mono text-xs font-bold">
                PRE-RESERVE
              </span>
            )}
          </div>
          
          {/* Campus indicator */}
          <div className="mt-4 flex items-center space-x-2">
            <div className="text-white/70 font-mono text-sm">Campus:</div>
            <div className="bg-green-400/20 border border-green-400/50 px-3 py-1 text-green-400 font-mono text-xs font-bold">
              {selectedCampus.charAt(0).toUpperCase() + selectedCampus.slice(1)} Campus
            </div>
            <div className="text-white/50 font-mono text-xs">
              Delivery Fee: ₹{selectedCampus === 'south' ? SOUTH_CAMPUS_DELIVERY_FEE : NORTH_CAMPUS_DELIVERY_FEE}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="space-y-6">
            <div className="border border-white/10 bg-black/90 p-6">
              <h2 className="text-xl font-mono text-white mb-4">ORDER SUMMARY</h2>
              
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between text-white/70 mb-2">
                  <span>{item.quantity}x {item.name}</span>
                  <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}

              <div className="border-t border-white/10 mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-white/70">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {preReservationDiscount > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>Pre-reservation discount (10%)</span>
                    <span>-₹{preReservationDiscount.toFixed(2)}</span>
                  </div>
                )}
                {!isPreReservation && (
                  <div className="flex justify-between text-white/70">
                    <span>Delivery Fee ({selectedCampus.charAt(0).toUpperCase() + selectedCampus.slice(1)} Campus)</span>
                    <span>₹{deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                {isPreReservation && (
                  <div className="flex justify-between text-green-400">
                    <span>Delivery Fee (Pre-reservation)</span>
                    <span>FREE</span>
                  </div>
                )}
                <div className="flex justify-between text-white/70">
                  <span>Convenience Fee</span>
                  <span>₹{CONVENIENCE_FEE.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-white/10 mt-4 pt-4">
                <div className="flex justify-between text-white font-bold">
                  <span>GRAND TOTAL</span>
                  <span>₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          
        </div>
      </div>

      {/* Cart Summary */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/95 border-t border-white/20 p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="text-white font-mono">
              Total: ₹{grandTotal.toFixed(2)}
            </div>
            <button 
              className="px-8 py-3 bg-green-500 text-black font-mono hover:bg-green-400 transition-colors"
              onClick={handleCheckout}
            >
              NEXT
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
