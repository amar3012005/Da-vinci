import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, Gift, Star } from 'lucide-react';

const OffersPage = () => {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsLoaded(true), 100);
  }, []);

  const getCurrentDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  const isWednesday = getCurrentDay() === 'Wednesday';
  const isSaturday = getCurrentDay() === 'Saturday';
  const currentHour = new Date().getHours();
  const isSaturdayNight = isSaturday && currentHour >= 18;

  const offers = [
    {
      id: 'wednesday-pizza',
      title: 'FOODLES WEDNESDAY',
      subtitle: 'Pizza Bites Special',
      description: 'Buy One Get One FREE on all Pizza Bites',
      restaurant: 'PIZZA BITES',
      restaurantId: '5',
      icon: '🍕',
      gradient: 'from-red-900/30 to-orange-900/30',
      borderColor: 'border-red-400/50',
      accentColor: 'text-red-400',
      bgColor: 'bg-red-500/20',
      timing: 'Every Wednesday • All Day',
      isActive: isWednesday,
      terms: [
        'Valid only on Wednesdays',
        'Applicable on all Pizza Bites menu items',
        'Buy one pizza, get another of equal or lesser value free',
        'Cannot be combined with other offers',
        'Delivery charges apply as usual'
      ]
    },
    {
      id: 'saturday-himalayan',
      title: 'FOODLES SATURDAY NIGHT',
      subtitle: 'Himalayan Cafe Special',
      description: '10% OFF on all orders',
      restaurant: 'HIMALAYAN CAFE',
      restaurantId: '2',
      icon: '🏔️',
      gradient: 'from-purple-900/30 to-blue-900/30',
      borderColor: 'border-purple-400/50',
      accentColor: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      timing: 'Saturday Nights • 6PM - 12AM',
      isActive: isSaturdayNight,
      terms: [
        'Valid only on Saturday nights (6PM - 12AM)',
        'Applicable on all Himalayan Cafe menu items',
        'Automatic 10% discount at checkout',
        'Cannot be combined with other offers',
        'Minimum order value: ₹200'
      ]
    }
  ];

  const handleOrderNow = (restaurantId) => {
    navigate(`/campus?offer=true&restaurant=${restaurantId}`);
  };

  return (
    <div className="bg-black min-h-screen text-white relative">
      {/* Background patterns */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,#242_1px,transparent_1px),linear-gradient(-45deg,#111_1px,transparent_1px)] bg-[size:20px_20px]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,#222_1px,transparent_1px),linear-gradient(90deg,#111_1px,transparent_1px)] bg-[size:40px_40px] opacity-50" />
      </div>

      {/* Header */}
      <div className="relative z-10 p-4 border-b border-white/20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-mono text-sm">BACK</span>
          </button>
          
          <h1 className="text-2xl md:text-3xl font-mono font-bold text-white">
            <span className="text-yellow-400">OFFER</span> ZONE
          </h1>
          
          <div className="w-16"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto p-4 py-8">
        {/* Current Status */}
        <div className={`mb-8 text-center transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/20 px-4 py-2 rounded">
            <Clock size={16} />
            <span className="font-mono text-sm">
              Today is {getCurrentDay()} • {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
          </div>
        </div>

        {/* Offers Grid */}
        <div className="space-y-8">
          {offers.map((offer, index) => (
            <div 
              key={offer.id}
              className={`bg-gradient-to-r ${offer.gradient} border ${offer.borderColor} rounded-lg overflow-hidden transition-all duration-1000 ${
                isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="p-6 md:p-8">
                {/* Offer Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                  <div className="flex items-center space-x-4 mb-4 md:mb-0">
                    <div className="text-4xl">{offer.icon}</div>
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <h2 className="text-xl md:text-2xl font-mono font-bold text-white">
                          {offer.title}
                        </h2>
                        {offer.isActive && (
                          <div className="flex items-center space-x-1 bg-green-500/20 border border-green-400 px-2 py-1 rounded">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-green-400 font-mono text-xs font-bold">ACTIVE NOW</span>
                          </div>
                        )}
                      </div>
                      <h3 className="text-lg font-mono text-gray-300">{offer.subtitle}</h3>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`${offer.bgColor} px-3 py-1 rounded mb-2`}>
                      <span className={`${offer.accentColor} font-mono text-sm font-bold`}>
                        {offer.restaurant}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 text-gray-400 font-mono text-xs">
                      <Calendar size={12} />
                      <span>{offer.timing}</span>
                    </div>
                  </div>
                </div>

                {/* Offer Description */}
                <div className="bg-black/30 border border-white/10 p-4 rounded mb-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <Gift size={16} className={offer.accentColor} />
                    <h4 className="font-mono font-bold text-white">OFFER DETAILS</h4>
                  </div>
                  <p className="text-gray-300 font-mono text-lg font-bold mb-2">{offer.description}</p>
                  
                  <div className="space-y-1">
                    <h5 className="font-mono text-sm font-bold text-gray-400 mb-2">Terms & Conditions:</h5>
                    {offer.terms.map((term, termIndex) => (
                      <div key={termIndex} className="flex items-start space-x-2">
                        <Star size={12} className={`${offer.accentColor} mt-1 flex-shrink-0`} />
                        <span className="text-gray-400 font-mono text-xs">{term}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex justify-center">
                  <button
                    onClick={() => handleOrderNow(offer.restaurantId)}
                    className={`px-8 py-3 font-mono font-bold transition-all duration-300 ${
                      offer.isActive
                        ? `bg-green-400 text-black hover:bg-green-300`
                        : `border ${offer.borderColor} ${offer.accentColor} hover:bg-white/5`
                    }`}
                    disabled={!offer.isActive}
                  >
                    {offer.isActive ? 'ORDER NOW →' : 'OFFER NOT ACTIVE'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Info */}
        <div className={`text-center mt-12 transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="bg-white/5 border border-white/20 p-6 rounded">
            <h3 className="font-mono font-bold text-white mb-3">How to redeem offers?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-mono text-gray-400">
              <div className="text-center">
                <div className="text-2xl mb-2">1️⃣</div>
                <p>Check if offer is active for today</p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">2️⃣</div>
                <p>Click "ORDER NOW" for eligible restaurants</p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">3️⃣</div>
                <p>Offer applies automatically at checkout</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OffersPage;
