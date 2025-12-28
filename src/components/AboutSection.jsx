import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Add categories array at the top of the component
const categories = ['all', 'Indian', 'Chinese', 'American', 'South Indian'];

const AboutSection = () => {
  const [activeSection, setActiveSection] = useState('all');
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [restaurants, setRestaurants] = useState([
    {
      id: 2,
      name: "HIMALAYAN_CAFE",
      category: ["Chinese", "Indian"],
      rating: 4.5,
      deliveryTime: "30-40",
      image: "/images/beta.jpeg",
      tags: ["North Indian", "Biryani", "Trending"],
      vendorEmail: "yogeshthakur03839@gmail.com",
      vendorPhone: "+918278803839",
      operatingHours: {
        open: "10:30",  // 24-hour format
        close: "22:00"
      }
    },

    {
      id: 5,
      name: "PIZZA-BITE",
      category: ["American"],
      rating: 4.5,
      deliveryTime: "35-45",
      image: "/images/pi.jpeg",
      tags: ["Pizza", "Burgers", "New"],
      vendorEmail: "anshul3927@gmail.com",
      vendorPhone: "+919625970000",
      operatingHours: {
        open: "11:00",
        close: "21:45"
      }
    },

    {
      id: 3,
      name: "SONU_FOOD-POINT",
      category: ["Chinese", "Indian"], // Fix the category format
      rating: 4.4,
      deliveryTime: "35-45",
      image: "/images/gamma.jpeg",
      tags: ["North-Indian", "", ""],
      vendorEmail: "sunil62948@gmail.com",
      vendorPhone: "+919882262948",
      operatingHours: {
        open: "10:30",
        close: "21:45"
      }
    },

    {
      id: 1,
      name: "BABAJI_FOOD-POINT",
      category: ["Chinese", "Indian"],
      rating: 4.5,
      deliveryTime: "30-40",
      image: "/images/alpha.jpeg",
      tags: ["North Indian", "Chinese", "Trending"],
      vendorEmail: "gulabsingh93732@gmail.com",
      vendorPhone: "+919373290270",
      operatingHours: {
        open: "10:30",  // 24-hour format
        close: "20:30"
      }
    },

    {
      id: 4,
      name: "JEEVA_FOOD-POINT",
      category: ["Chinese", "Indian"],
      rating: 4.4,
      deliveryTime: "35-45",
      image: "/images/delta.jpeg",
      tags: ["Chinese", "Indian", "Trending"],
      vendorEmail: "panchhithakur0@gmail.com",
      vendorPhone: "+917018596320",
      operatingHours: {
        open: "10:30",
        close: "21:45"
      }
    },

    {
      id: 6,
      name: "NORTHERN_CAFE",
      category: ["Indian", "Chinese"],
      rating: 4.3,
      deliveryTime: "25-35",
      image: "/images/alpha.jpeg", // Using existing image, you can replace with specific image
      tags: ["North Indian", "Coffee", "Fast Food"],
      vendorEmail: "northerncafe@gmail.com",
      vendorPhone: "+919876543210",
      operatingHours: {
        open: "09:00",
        close: "22:30"
      }
    },

    {
      id: 7,
      name: "FRUIT_BAKERY",
      category: ["American"],
      rating: 4.6,
      deliveryTime: "20-30",
      image: "/images/beta.jpeg", // Using existing image, you can replace with specific image
      tags: ["Bakery", "Desserts", "Fresh Fruits"],
      vendorEmail: "fruitbakery@gmail.com",
      vendorPhone: "+919876543211",
      operatingHours: {
        open: "07:00",
        close: "21:00"
      }
    },

    {
      id: 8,
      name: "AYODHYA_RESTAURANT",
      category: ["Indian", "South Indian"],
      rating: 4.7,
      deliveryTime: "30-40",
      image: "/images/gamma.jpeg", // Using existing image, you can replace with specific image
      tags: ["South Indian", "Traditional", "Vegetarian"],
      vendorEmail: "ayodhyarestaurant@gmail.com",
      vendorPhone: "+919876543212",
      operatingHours: {
        open: "10:00",
        close: "23:00"
      }
    }

  ]);
  const [lastStatusCheck, setLastStatusCheck] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const navigate = useNavigate();

  // Add reconnection attempt tracking
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;
  const wsRef = useRef(null);

  // Add API endpoint config
  const API_URL = process.env.NODE_ENV === 'production'
    ? 'https://foodles-backend-lpzp.onrender.com'
    : 'http://localhost:5000';

  useEffect(() => {
    setIsLoaded(true);
    // Update current time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Add initialization from prefetched data
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('prefetchedStatus');
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        // Use cached data if less than 10 seconds old
        if (age < 10000 && data.statuses) {
          console.log('Using prefetched restaurant status');
          setRestaurants(prevRestaurants => 
            prevRestaurants.map(restaurant => ({
              ...restaurant,
              isForceClose: !data.statuses[restaurant.id]?.isOpen,
              statusMessage: data.statuses[restaurant.id]?.message || 'Status Unknown',
              lastChecked: data.metadata?.lastChecked
            }))
          );
          setLastStatusCheck(data.metadata?.lastChecked);
        }
      }
    } catch (error) {
      console.error('Error using prefetched data:', error);
    }
  }, []); // Run once on mount

  // Add initialization effect
  useEffect(() => {
    const initializeStatuses = async () => {
      try {
        setIsRefreshing(true);
        const response = await fetch('/api/restaurants/status/init');
        const data = await response.json();
        console.log('Initial restaurant statuses:', data);
        
        if (data.statuses) {
          setRestaurants(prevRestaurants => 
            prevRestaurants.map(restaurant => ({
              ...restaurant,
              isForceClose: !data.statuses[restaurant.id]?.isOpen,
              statusMessage: data.statuses[restaurant.id]?.message || 'Status Unknown',
              lastChecked: data.metadata?.lastChecked
            }))
          );
          setLastStatusCheck(data.metadata?.lastChecked);
        }
      } catch (error) {
        console.error('Failed to initialize restaurant statuses:', error);
        setStatusError('Failed to load restaurant statuses');
      } finally {
        setIsRefreshing(false);
      }
    };

    initializeStatuses();
  }, []); // Run only on mount

  // Update the status fetching logic
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setIsRefreshing(true);
        const response = await fetch(`${API_URL}/api/restaurants/status`);
        const data = await response.json();
        
        console.log('Restaurant status update:', {
          data,
          timestamp: new Date().toISOString()
        });

        if (data.statuses) {
          setRestaurants(prevRestaurants => 
            prevRestaurants.map(restaurant => {
              const status = data.statuses[restaurant.id];
              console.log(`Status for ${restaurant.name}:`, status);
              
              return {
                ...restaurant,
                isForceClose: !status?.isOpen,
                statusMessage: status?.message || 'Status Unknown',
                lastChecked: data.metadata?.lastChecked,
                debug: status?.debug // Store debug info
              };
            })
          );
          setLastStatusCheck(data.metadata?.lastChecked);
          setStatusError(null);
        }
      } catch (error) {
        console.error('Failed to fetch restaurant statuses:', error);
        setStatusError('Connection error');
      } finally {
        setIsRefreshing(false);
      }
    };

    // Initial fetch
    fetchStatus();
    
    // Poll every 5 seconds
    const intervalId = setInterval(fetchStatus, 5000);
    return () => clearInterval(intervalId);
  }, [API_URL]);

  // Modify WebSocket connection handling
  const connectWebSocket = useCallback(() => {
    const wsUrl = process.env.NODE_ENV === 'production'
      ? 'wss://foodles-backend-lpzp.onrender.com'
      : 'ws://localhost:5000';
    
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.log('🟢 WebSocket Connected');
      setWsConnected(true);
      setReconnectAttempts(0);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📡 Received websocket data:', data);
        
        if (data.type === 'STATUS_UPDATE') {
          setRestaurants(prevRestaurants => 
            prevRestaurants.map(restaurant => {
              const change = data.changes.find(c => c.restaurantId === restaurant.id.toString());
              if (change) {
                console.log(`Updating restaurant ${restaurant.id} status:`, change);
                return {
                  ...restaurant,
                  isForceClose: change.newStatus !== '1',
                  statusMessage: change.newStatus === '1' ? 'Open' : 'Temporarily Closed',
                  lastChecked: data.timestamp
                };
              }
              return restaurant;
            })
          );
          setLastStatusCheck(data.timestamp);
        }
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      setWsConnected(false);
      
      // Implement reconnection logic
      if (reconnectAttempts < maxReconnectAttempts) {
        const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
        console.log(`Reconnecting in ${timeout}ms (attempt ${reconnectAttempts + 1})`);
        setTimeout(() => {
          setReconnectAttempts(prev => prev + 1);
          connectWebSocket();
        }, timeout);
      }
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [reconnectAttempts]);

  // Use the new WebSocket connection function
  useEffect(() => {
    const cleanup = connectWebSocket();
    return cleanup;
  }, [connectWebSocket]);

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    
    try {
      const response = await fetch('/api/restaurants/status');
      const data = await response.json();
      
      if (data.statuses) {
        setRestaurants(prevRestaurants => 
          prevRestaurants.map(restaurant => ({
            ...restaurant,
            isForceClose: !data.statuses[restaurant.id]?.isOpen,
            statusMessage: data.statuses[restaurant.id]?.message,
            lastChecked: data.metadata?.lastChecked
          }))
        );
        setLastStatusCheck(data.metadata?.lastChecked);
        setStatusError(null);
      }
    } catch (error) {
      console.error('Manual refresh failed:', error);
      setStatusError('Refresh failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  const isRestaurantOpen = (restaurant) => {
    if (restaurant.isForceClose) {
      return false;
    }
    const now = currentTime;
    const [openHour, openMinute] = restaurant.operatingHours.open.split(':').map(Number);
    const [closeHour, closeMinute] = restaurant.operatingHours.close.split(':').map(Number);
    
    const openTime = new Date(now).setHours(openHour, openMinute, 0);
    const closeTime = new Date(now).setHours(closeHour, closeMinute, 0);
    const currentTimeMs = now.getTime();

    return currentTimeMs >= openTime && currentTimeMs <= closeTime;
  };

  // Update the restaurant click handler to respect force close
  const handleRestaurantClick = (restaurant) => {
    if (restaurant.isForceClose) {
      console.log('Restaurant is force closed:', restaurant.name);
      return;
    }

    if (isRestaurantOpen(restaurant)) {
      // Log restaurant selection
      fetch(`${API_URL}/api/log-restaurant-selection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          timestamp: new Date().toISOString()
        })
      }).catch(error => console.error('Logging error:', error));

      // Navigate to menu
      navigate(`/menu/${restaurant.id}`, {
        state: {
          vendorEmail: restaurant.vendorEmail,
          vendorPhone: restaurant.vendorPhone?.replace(/\D/g, ''),
          restaurantId: restaurant.id.toString(),
          restaurantName: restaurant.name
        }
      });
    }
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return new Date(0, 0, 0, hours, minutes).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatLastChecked = (timestamp) => {
    if (!timestamp) return 'Checking...';
    try {
      return new Date(timestamp).toLocaleTimeString();
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid time';
    }
  };

  // Update the getStatusDisplay function to properly use isForceClose
  const getStatusDisplay = (restaurant) => {
    console.log('Checking status for:', {
      name: restaurant.name,
      isForceClose: restaurant.isForceClose,
      debug: restaurant.debug
    });

    if (restaurant.isForceClose) {
      return {
        text: 'DELIVERY UNAVAILABLE',
        classes: 'bg-red-900/60 text-red-100'
      };
    }

    const isOpen = isRestaurantOpen(restaurant);
    return {
      text: isOpen ? 'OPEN' : 'CLOSED',
      classes: isOpen ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
    };
  };

  // Update the category click handler
  const handleCategoryClick = (category) => {
    setActiveSection(category);
  };

  // Add status indicator in the UI
  const ConnectionStatus = () => (
    <div className={`fixed bottom-4 left-4 flex items-center space-x-2 
      ${wsConnected ? 'text-green-400' : 'text-yellow-400'}`}>
      <div className={`w-2 h-2 rounded-full ${wsConnected ? 
        'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
      <span className="text-xs font-mono">
        {wsConnected ? 'LIVE' : 'Connecting...'}
      </span>
    </div>
  );

  // Add status debug panel (can be removed in production)
  const StatusDebugPanel = () => (
    <div className="fixed bottom-4 left-4 bg-black/80 p-4 rounded-lg border border-gray-800 text-xs font-mono">
      <div className="text-green-400">Status Monitor</div>
      <div className="text-gray-400 mt-2">
        Last Check: {formatLastChecked(lastStatusCheck)}
      </div>
      <div className="text-gray-400">
        Websocket: {wsConnected ? '🟢' : '🔴'}
      </div>
    </div>
  );

  return (
    <div className="bg-black relative p-4 sm:p-8 pb-32 max-w-7xl mx-auto min-h-screen overflow-hidden">
      {/* Add StatusDebugPanel in development */}
      {process.env.NODE_ENV === 'development' && <StatusDebugPanel />}
      
      {/* Add ConnectionStatus component */}
      <ConnectionStatus />
      
      {/* Previous background patterns and header remain the same */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,#242_1px,transparent_1px),linear-gradient(-45deg,#111_1px,transparent_1px)] bg-[size:20px_20px]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,#222_1px,transparent_1px),linear-gradient(90deg,#111_1px,transparent_1px)] bg-[size:40px_40px] opacity-50" />
      </div>

      {/* Header */}
      <div className={`flex items-center space-x-4 mb-8 sm:mb-12 transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
        <h2 className="text-2xl sm:text-3xl font-mono font-bold text-white">
          <span className="opacity-100">EXPLORE</span>{' '}
          <span className="relative">
            RESTAURANTS (NORTH-CAMPUS)
          
            <span className="absolute -inset-1 bg-white/10 -skew-x-12 -z-10" />
          </span>
        </h2>
      </div>

      {/* Category Navigation */}
      <div className="relative">
        <div className="flex space-x-4 mb-6 sm:mb-8 overflow-x-auto pb-2 scrollbar-hide -mx-4 sm:mx-0 px-4 sm:px-0">
          <div className="flex space-x-2 md:space-x-4 min-w-full sm:min-w-0">
            {categories.map((category) => (
              <button 
                key={category}
                className={`px-4 sm:px-6 py-2 rounded-none transition-all duration-300 border whitespace-nowrap flex-shrink-0 text-sm sm:text-base ${
                  activeSection === category 
                    ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                    : 'bg-black border-white/30 text-white/70 hover:bg-white/10'
                }`}
                onClick={() => handleCategoryClick(category)}
              >
                <span className="font-mono">{category.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </div>
        {/* Fade indicators for scroll */}
        <div className="absolute left-0 top-0 bottom-0 w-0 bg-gradient-to-r from-black to-transparent pointer-events-none sm:hidden" />
        <div className="absolute right-0 top-0 bottom-0 w-0 bg-gradient-to-l from-black to-transparent pointer-events-none sm:hidden" />
      </div>

      {/* Restaurant Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
        {restaurants
          .filter(restaurant => 
            activeSection === 'all' || 
            (Array.isArray(restaurant.category) 
              ? restaurant.category.map(cat => cat.toLowerCase()).includes(activeSection.toLowerCase())
              : restaurant.category.toLowerCase() === activeSection.toLowerCase())
          )
          .map((restaurant) => {
            const isOpen = isRestaurantOpen(restaurant);
            const status = getStatusDisplay(restaurant);
            return (
              <div 
                key={restaurant.id}
                className={`relative group cursor-pointer border border-white/10 bg-black/90 
                  ${isOpen ? 'hover:border-white/30' : 'opacity-75 cursor-not-allowed'} 
                  transition-all duration-300`}
                onClick={() => isOpen && handleRestaurantClick(restaurant)}
              >
                {/* Restaurant Image */}
                <div className="relative h-48 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10" />
                  <img 
                    src={restaurant.image}
                    alt={restaurant.name}
                    onError={(e) => { e.target.onerror = null; e.target.src = '/path/to/default/image.jpg' }}
                    className={`w-full h-full object-cover transition-transform duration-300 
                      ${isOpen ? 'group-hover:scale-110' : 'grayscale'}`}
                  />
                  
                  {/* Updated Status Badge */}
                  <div className={`absolute top-4 right-4 px-3 py-1 font-mono text-sm z-20 ${status.classes}`}>
                    {status.text}
                  </div>
                </div>

                {/* Restaurant Info */}
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-mono text-white">{restaurant.name}</h3>
                    <div className="flex items-center space-x-1 bg-green-500/20 px-2 py-1">
                      <span className="text-green-400">{restaurant.rating}</span>
                      <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                  </div>

                  <div className="text-white/70 font-mono text-sm space-y-2">
                    <div>{restaurant.deliveryTime} mins delivery time</div>
                    <div className="text-xs">
                      Hours: {formatTime(restaurant.operatingHours.open)} - {formatTime(restaurant.operatingHours.close)}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {restaurant.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-white/5 text-white/50 text-xs font-mono">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Geometric corners */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/30" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/30" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/30" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/30" />
              </div>
            );
          })}
      </div>

      {/* Status error message */}
      {statusError && (
        <div className="fixed top-4 right-4 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded font-mono text-sm">
          {statusError}
        </div>
      )}

      {/* Fix the refresh button and last checked time */}
      <div className="fixed bottom-4 right-4 flex items-center space-x-4">
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className={`text-xs text-white/50 font-mono hover:text-white/70 transition-colors
            ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isRefreshing ? 'Refreshing...' : '⟳ Refresh'}
        </button>
        <div className="text-xs text-white/50 font-mono">
          Last checked: {formatLastChecked(lastStatusCheck)}
        </div>
      </div>
    </div>
  );
};

export default AboutSection;