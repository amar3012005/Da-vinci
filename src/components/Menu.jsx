import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Papa from 'papaparse'; // For parsing CSV files

// Add this new component at the top
const MenuImageModal = ({ isOpen, onClose, restaurantId }) => {
  const menuImages = {
    1: ['/images/baba1.jpeg', '/images/baba2.jpeg'], // BABA_JI
    2: ['/images/himalayan1.jpg', '/images/himalayan2.jpg'], // HIMALAYAN
    3: ['/images/sonu1.jpg', '/images/sonu2.jpg'], // SONU
    4: ['/images/jeeva1.jpg', '/images/jeeva2.jpg'], // JEEVA
    5: ['/images/pizza1.png', '/images/pizza2.png'], // PIZZA
    6: ['/images/alpha.jpeg', '/images/beta.jpeg'], // NORTHERN_CAFE (using existing images)
    7: ['/images/beta.jpeg', '/images/gamma.jpeg'], // FRUIT_BAKERY (using existing images)
    8: ['/images/gamma.jpeg', '/images/delta.jpeg'], // AYODHYA_RESTAURANT (using existing images)
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-6xl bg-black border border-white/20"> {/* Increased max-width */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-white/70 hover:text-white z-10"
        >
          ✕
        </button>
        <div className="p-6 space-y-4">
          <h3 className="text-white font-mono text-xl mb-4">Original Menu Images</h3>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {menuImages[restaurantId]?.map((img, index) => (
              <img 
                key={index}
                src={img}
                alt={`Menu page ${index + 1}`}
                className="w-full h-auto border border-white/10 hover:border-white/30 transition-colors"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Menu = () => {
  const { restaurantId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuItems, setMenuItems] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Trending');
  const [restaurantInfo, setRestaurantInfo] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [error, setError] = useState(null);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false); // Add new state for modal
  const [hasPreReservation, setHasPreReservation] = useState(false);
  const [preReservationData, setPreReservationData] = useState(null);

  const { vendorEmail, vendorPhone, restaurantName } = location.state || {};

  console.log("Menu component rendered");

  // Check for pre-reservation
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const isPreReserved = urlParams.get('preReserved') === 'true';
    const storedReservation = localStorage.getItem('preReservation');
    
    if (isPreReserved && storedReservation) {
      const reservationData = JSON.parse(storedReservation);
      if (reservationData.restaurantId === restaurantId) {
        setHasPreReservation(true);
        setPreReservationData(reservationData);
      }
    }
  }, [location, restaurantId]);

  // Load restaurant info and menu data from CSV
  useEffect(() => {
    if (!restaurantId) {
      navigate('/');
      return;
    }

    const loadRestaurantData = async () => {
      try {
        console.log('Loading restaurant data for ID:', restaurantId);
        
        // Update restaurant info to match AboutSection names
        const restaurantData = {
          1: { name: "BABAJI_FOOD-POINT", image: "/images/alpha.jpeg" },
          2: { name: "HIMALAYAN_CAFE", image: "/images/beta.jpeg" },
          3: { name: "SONU_FOOD-POINT", image: "/images/gamma.jpeg" },
          4: { name: "JEEVA_FOOD-POINT", image: "/images/delta.jpeg" },
          5: { name: "PIZZA-BITE", image: "/images/pi.jpeg" },
          6: { name: "NORTHERN_CAFE", image: "/images/alpha.jpeg" },
          7: { name: "FRUIT_BAKERY", image: "/images/beta.jpeg" },
          8: { name: "AYODHYA_RESTAURANT", image: "/images/gamma.jpeg" },
        };

        if (!restaurantData[restaurantId]) {
          throw new Error('Restaurant not found');
        }

        setRestaurantInfo(restaurantData[restaurantId]);
        setIsLoaded(false); // Reset loading state

        // Load menu items from CSV with error handling
        const response = await fetch(`/data/menu_${restaurantId}.csv`);
        if (!response.ok) {
          throw new Error(`Failed to load menu (Status: ${response.status})`);
        }

        const csvText = await response.text();
        if (!csvText.trim()) {
          throw new Error('Menu data is empty');
        }
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          error: (error) => {
            console.error('CSV parsing error:', error);
            setError('Failed to parse menu data');
          },
          complete: (results) => {
            if (results.data && results.data.length > 0) {
              console.log('Parsed menu data:', results.data);
              setMenuItems(results.data.map(item => ({
                ...item,
                price: parseFloat(item.price) || 0,
                quantity: 0
              })));
              setIsLoaded(true);
            } else {
              setError('No menu items found');
            }
          }
        });
      } catch (error) {
        console.error('Error loading menu data:', error);
        setError(error.message);
        setIsLoaded(true); // Set loaded even if there's an error
      }
    };

    loadRestaurantData();
  }, [restaurantId, navigate]);

  const handleAddToCart = (itemId) => {
    setMenuItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId
          ? { ...item, quantity: (item.quantity || 0) + 1 }
          : item
      )
    );
    setCartItems(prevCart => {
      const existingItem = prevCart.find(item => item.id === itemId);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === itemId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      const newItem = menuItems.find(item => item.id === itemId);
      return [...prevCart, { ...newItem, quantity: 1 }];
    });
  };

  const handleRemoveFromCart = (itemId) => {
    setMenuItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId && item.quantity > 0
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
    );
    setCartItems(prevCart => {
      const updatedCart = prevCart.map(item =>
        item.id === itemId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      );
      return updatedCart.filter(item => item.quantity > 0);
    });
  };

  // Update trending items mapping with correct item IDs
  const trendingItemsByRestaurant = {
    '1': [ '71','30','32','44','51','63','69','70','17'], // BABA_JI trending items
    '2': ['50', '51', '58', '57', '55', '65','46'], // HIMALAYAN_CAFE trending items
    '3': ['1', '2', '3', '14', '5', '6'], // SONU trending items
    '4': ['1', '2', '3', '5', '7', '9'], // JEEVA trending items - updated
    '5': ['1', '3', '5', '8', '12'], // PIZZA_BITES trending - Most popular pizzas, burgers and sides
    '6': ['12', '15', '16', '17', '18', '21', '30'], // NORTHERN_CAFE trending items
    '7': ['1', '2', '4', '5', '20', '29', '30'], // FRUIT_BAKERY trending items
    '8': ['1', '2', '17', '20', '21', '30', '45'], // AYODHYA_RESTAURANT trending items
  };

  // Modify trending items with category
  const trendingItems = menuItems
    .filter(item => trendingItemsByRestaurant[restaurantId]?.includes(item.id))
    .map(item => ({ ...item, category: 'Trending' }));

  // Add debug logging for trending items
  useEffect(() => {
    if (isLoaded) {
      console.log('Trending items for restaurant:', restaurantId, trendingItems);
    }
  }, [isLoaded, restaurantId, trendingItems]);

  const allItems = [...menuItems, ...trendingItems];

  const categories = ['Trending', ...new Set(allItems.map(item => item.category).filter(Boolean))];

  // Show a more user-friendly loading state
  if (!isLoaded) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-ping mx-auto"/>
          <p className="text-white font-mono">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-500 font-mono">Error: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-green-400 underline hover:text-green-300"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen p-1 sm:p-4 pb-32 relative"> {/* Further reduced padding */}
      {/* Background patterns */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,#242_1px,transparent_1px),linear-gradient(-45deg,#111_1px,transparent_1px)] bg-[size:20px_20px]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,#222_1px,transparent_1px),linear-gradient(90deg,#111_1px,transparent_1px)] bg-[size:40px_40px] opacity-50" />
      </div>

      <div className="max-w-7xl mx-auto relative mt-0"> {/* Removed top margin */}
        {/* Restaurant Header */}

        {restaurantInfo && (
          <div className={`mb-2 transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}> {/* Reduced margin */}
            <div className="relative h-24 rounded-lg overflow-hidden mb-2"> {/* Reduced height and margin */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              <div className="absolute bottom-4 left-6 flex items-center space-x-4">
                <h1 className="text-3xl font-mono font-bold text-white">
                  |{restaurantInfo.name}
                </h1>
                <button 
                  onClick={() => setIsMenuModalOpen(true)}
                  className="px-3 py-1 text-xs font-mono text-green-400 border border-green-400/30 hover:bg-green-400/10 transition-colors"
                >
                  VERIFY OUR PRICES →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pre-Reservation Banner */}
        {hasPreReservation && preReservationData && (
          <div className="mb-6 bg-green-500/20 border border-green-400 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-green-400 font-mono text-sl font-bold flex items-center">
                  ✓ TABLE PRE-RESERVED
                  <span className="ml-2 text-xs bg-green-400/20 px-2 py-1 rounded">10% OFF ACTIVE</span>
                </div>
                
              </div>
              
            </div>
          </div>
        )}

        {/* Menu Image Modal */}
        <MenuImageModal 
          isOpen={isMenuModalOpen}
          onClose={() => setIsMenuModalOpen(false)}
          restaurantId={restaurantId}
        />

        {/* Category Navigation */}
        <div className="relative">
          <div className="flex space-x-3 mb-4 overflow-x-auto pb-2 
            [&::-webkit-scrollbar]:h-1.5
            [&::-webkit-scrollbar-track]:rounded-full
            [&::-webkit-scrollbar-track]:bg-white/10
            [&::-webkit-scrollbar-thumb]:rounded-full
            [&::-webkit-scrollbar-thumb]:bg-white/30
            [&::-webkit-scrollbar-thumb]:hover:bg-white/50
            hover:[&::-webkit-scrollbar-thumb]:bg-white/40
            transition-all">
            {categories.map((category) => (
              <button 
                key={category}
                className={`px-6 py-2 rounded-none transition-all duration-300 border whitespace-nowrap ${
                  activeCategory === category 
                    ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                    : 'bg-black border-white/30 text-white/70 hover:bg-white/10'
                }`}
                onClick={() => setActiveCategory(category)}
              >
                <span className="font-mono">{category.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Menu Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"> {/* Reduced gap */}
          {allItems
            .filter(item => item.category === activeCategory)
            .map((item) => (
              <div key={item.id} className="relative border border-white/10 bg-black/90 hover:border-white/30 transition-all duration-300">
                {/* Item Info */}
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-mono text-white">{item.name}</h3>
                    <div className="text-green-400 font-mono">₹{item.price}</div>
                  </div>

                  <p className="text-white/70 text-sm">{item.description}</p>

                  {/* Add to Cart Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => handleRemoveFromCart(item.id)}
                        className="w-8 h-8 border border-white/30 text-white flex items-center justify-center hover:bg-white/10"
                        disabled={!item.quantity}
                      >
                        -
                      </button>
                      <span className="text-white font-mono">{item.quantity || 0}</span>
                      <button
                        onClick={() => handleAddToCart(item.id)}
                        className="w-8 h-8 border border-white/30 text-white flex items-center justify-center hover:bg-white/10"
                      >
                        +
                      </button>
                    </div>
                    {item.quantity > 0 && (
                      <div className="text-green-400 font-mono">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Decorative corners */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/30" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/30" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/30" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/30" />
                
              </div>
            ))}
        </div>

        {/* Cart Summary */}
        {cartItems.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-black/95 border-t border-white/20 p-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <div className="space-y-1">
                {(() => {
                  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                  const discount = hasPreReservation ? subtotal * 0.1 : 0;
                  const total = subtotal - discount;
                  const minOrder = hasPreReservation ? 400 : 200; // ₹400 for pre-reservations, ₹200 for normal orders
                  
                  return (
                    <>
                      {/* Desktop version */}
                      <div className="hidden sm:block">
                        <div className="text-white font-mono">
                          Subtotal: ₹{subtotal.toFixed(2)}
                        </div>
                        {hasPreReservation && (
                          <div className="text-green-400 font-mono text-sm">
                            Pre-reservation discount (10%): -₹{discount.toFixed(2)}
                          </div>
                        )}
                        <div className="text-white font-mono font-bold">
                          Total: ₹{total.toFixed(2)}
                        </div>
                        {total < minOrder && (
                          <div className="text-red-400 text-xs font-mono">
                            Add ₹{(minOrder - total).toFixed(2)} more to proceed
                            {hasPreReservation && (
                              <div className="text-yellow-400 text-xs mt-1">
                                Minimum order ₹400 for pre-reservations
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Mobile version - simplified */}
                      <div className="block sm:hidden">
                        <div className="text-white font-mono font-bold">
                          Total: ₹{total.toFixed(2)}
                          {hasPreReservation && <span className="text-green-400 text-sm ml-2">(10% off)</span>}
                        </div>
                        {total < minOrder && (
                          <div className="text-red-400 text-xs font-mono">
                            Add ₹{(minOrder - total).toFixed(2)} more 
                            {hasPreReservation && <span className="text-yellow-400"> (₹400 min)</span>}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
              <button 
                className={`px-8 py-3 font-mono transition-colors ${
                  (() => {
                    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    const discount = hasPreReservation ? subtotal * 0.1 : 0;
                    const total = subtotal - discount;
                    const minOrder = hasPreReservation ? 400 : 200;
                    return total >= minOrder
                      ? 'bg-green-400 text-black hover:bg-green-300'
                      : 'bg-gray-600 text-gray-300 cursor-not-allowed';
                  })()
                }`}
                onClick={() => {
                  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                  const discount = hasPreReservation ? subtotal * 0.1 : 0;
                  const total = subtotal - discount;
                  const minOrder = hasPreReservation ? 400 : 200;
                  
                  if (total >= minOrder) {
                    navigate('/checkout', { 
                      state: { 
                        cartItems, 
                        vendorEmail, 
                        vendorPhone, 
                        restaurantId, 
                        restaurantName,
                        preReservationData: hasPreReservation ? preReservationData : null,
                        discount: discount
                      } 
                    });
                  }
                }}
              >
                PROCEED TO CART
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Menu;