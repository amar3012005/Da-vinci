import React, { useState, useEffect } from 'react';
import { AlertCircle, CreditCard, Loader, X, Circle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../config/api';

const WaitingRoom = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [dots, setDots] = useState('');
  const [timeLeft, setTimeLeft] = useState(150);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const pulseInterval = 1500; // Define consistent pulse interval (1.5 seconds)
  const [backendStatus, setBackendStatus] = useState('checking');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [backendError, setBackendError] = useState(false);
  const [remainingPayment, setRemainingPayment] = useState(0);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [reconnectionAttempts, setReconnectionAttempts] = useState(0);
  const [hasWinner, setHasWinner] = useState(false);

  // Destructure order data from location state
  const { 
    userDetails, 
    orderDetails,
    amount,
    items,
    donation, 
    vendorEmail,
    vendorPhone,
    restaurantId,
    restaurantName
  } = location.state || {};

  // Calculate remaining payment with delivery fee
  const calculateRemainingPayment = (details) => {
    const { subtotal = 0, dogDonation = 0, convenienceFee = 0, items = [] } = details;
    
    // Calculate vendor charge based on subtotal
    let vendorCharge = 0;
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    
    if (subtotal >= 500) {
      vendorCharge = 50; // Flat fee for orders above 500
    } else if (subtotal >= 200) {
      vendorCharge = 20 * totalItems; // 20 rupees per item
    }

    const totalCharges = vendorCharge + dogDonation + convenienceFee;

    console.log('Payment calculation:', {
      subtotal,
      vendorCharge,
      dogDonation,
      convenienceFee,
      itemCount: totalItems,
      totalCharges
    });

    return totalCharges;
  };

  // Update the remaining payment when component mounts
  useEffect(() => {
    if (orderDetails) {
      const additionalCharges = calculateRemainingPayment(orderDetails);
      setRemainingPayment(additionalCharges);
    }
  }, [orderDetails]);

  // Generate a 3-digit order ID
  const orderId = `AS_${Math.floor(100 + Math.random() * 900)}`; // Generate a formatted order ID

  // Display the order ID as `#AS_` followed by a 3-digit number
  const displayOrderId = `#${orderId}`;

  useEffect(() => {
    const loadRazorpayScript = () => {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
          setRazorpayLoaded(true);
          resolve(true);
        };
        script.onerror = () => {
          setRazorpayLoaded(false);
          resolve(false);
        };
        document.body.appendChild(script);
      });
    };

    loadRazorpayScript();
  }, []);

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, pulseInterval / 3); // Sync with pulse animation by dividing the interval

    const timerInterval = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      clearInterval(dotInterval);
      clearInterval(timerInterval);
    };
  }, []);

  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await api.get('/health');
        console.log('Backend connection:', response.data);
        setBackendStatus('connected');
        setBackendError(false);
      } catch (error) {
        console.error('Backend connection failed:', error);
        setBackendStatus('error');
        setBackendError(true);
      }
    };
    
    testConnection();
    // Poll backend health every 5 seconds
    const healthCheck = setInterval(testConnection, 5000);
    return () => clearInterval(healthCheck);
  }, []);

  // Preload the confirmation page in the background
  useEffect(() => {
    // Dynamic import without lazy loading
    import('./FuturisticOrderConfirmation').catch(err => 
      console.error('Error preloading:', err)
    );
  }, []);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const fetchRazorpayKey = async () => {
    try {
      const response = await api.get('/razorpay-key');
      return response.data.key;
    } catch (error) {
      console.error('Error fetching Razorpay key:', error);
      throw error;
    }
  };

  const handlePaymentVerification = async (response) => {
    setIsProcessingPayment(true);
    try {
      // Optimize by making both requests parallel
      const [verifyResponse] = await Promise.all([
        api.post('/payment/verify-payment', {
          ...response,
          name: userDetails.fullName,
          email: userDetails.email,
          orderDetails: JSON.stringify({
            ...orderDetails,
            customerPhone: userDetails.phoneNumber,
            remainingPayment: remainingPayment // Add remainingPayment here
          }),
          orderId,
          vendorEmail,
          vendorPhone,
          restaurantId,
          restaurantName
        }),
        // Preload confirmation page during verification
        import('./FuturisticOrderConfirmation')
      ]);
      
      if (verifyResponse.data.verified) {
        navigate('/order-confirmation', {
          state: {
            orderId,
            total: orderDetails.grandTotal || 0,
            name: userDetails.fullName,
            remainingPayment: remainingPayment || 0,
            emailsSent: 0
          },
          replace: true // Add replace to prevent back navigation
        });
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error) {
      console.error('Payment verification failed:', error);
      navigate('/payment-failure', {
        state: {
          errorMessage: error.message,
          paymentId: response.razorpay_payment_id,
        }
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePayNow = async () => {
    if (backendStatus !== 'connected') {
      setBackendError(true);
      return; // Don't proceed if backend is down
    }

    try {
      if (backendStatus !== 'connected') {
        throw new Error('Backend service not available');
      }

      if (!razorpayLoaded) {
        throw new Error('Razorpay payment gateway is not loaded');
      }

      // Create Razorpay order with error handling
      const orderResponse = await api.post('/payment/create-order', { 
        amount: remainingPayment 
      });
      
      console.log('Order created:', orderResponse.data);
      const razorpayKey = await fetchRazorpayKey();

      const options = {
        key: razorpayKey,
        amount: orderResponse.data.amount,
        currency: orderResponse.data.currency,
        name: "Foodles",
        description: "Order Payment",
        order_id: orderResponse.data.id,
        handler: handlePaymentVerification,
        modal: {
          ondismiss: () => {
            // Update ondismiss to also go back to PersonalInfo
            navigate('/personal-info', {
              state: {
                amount: amount || 0,
                items: items || [],
                donation: donation || 0,
                orderDetails,
                vendorEmail,
                vendorPhone,
                restaurantId,
                restaurantName,
                error: 'Payment cancelled by user',
                preservedUserDetails: userDetails
              },
            });
          }
        },
        prefill: {
          name: userDetails.fullName,
          email: userDetails.email,
        },
        theme: {
          color: "#3399cc",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

      rzp.on('payment.failed', handlePaymentFailure);
    } catch (error) {
      console.error('Payment creation failed:', error);
      setBackendError(true);
    }
  };

  const handlePaymentFailure = (response) => {
    console.error('Payment failed:', response);
    // Navigate back to PersonalInfo with existing data
    navigate('/personal-info', {
      state: {
        amount: amount || 0,
        items: items || [],
        donation: donation || 0,
        orderDetails,
        vendorEmail,
        vendorPhone,
        restaurantId,
        restaurantName,
        error: response.error?.description || 'Payment could not be processed',
        // Preserve user details to avoid re-entering
        preservedUserDetails: userDetails
      },
    });
  };

  const handleTryAgain = () => {
    navigate('/checkout', { state: { cartItems: orderDetails.items, vendorEmail, vendorPhone } });
  };

  // Add game logic functions
  const computerMove = (currentBoard) => {
    const emptySquares = currentBoard.reduce((acc, val, idx) => 
      val === null ? [...acc, idx] : acc, []);
    return emptySquares[Math.floor(Math.random() * emptySquares.length)];
  };

  const checkBackendConnection = () => {
    return Math.random() > 0.7; // 30% chance of successful connection
  };

  const checkWinner = (currentBoard) => {
    const winLines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6] // diagonals
    ];

    for (const line of winLines) {
      const [a, b, c] = line;
      if (currentBoard[a] && 
          currentBoard[a] === currentBoard[b] && 
          currentBoard[a] === currentBoard[c]) {
        return currentBoard[a];
      }
    }
    return null;
  };

  const handleSquareClick = async (index) => {
    if (board[index] || isProcessingPayment || hasWinner) return;

    // Player move
    const newBoard = [...board];
    newBoard[index] = 'X';
    setBoard(newBoard);

    // Check if player won
    const winner = checkWinner(newBoard);
    if (winner) {
      setHasWinner(true);
      return;
    }

    // Increment reconnection attempts
    const newAttempts = reconnectionAttempts + 1;
    setReconnectionAttempts(newAttempts);

    if (checkBackendConnection() || newAttempts >= 3) {
      setBackendError(false);
      handlePayNow();
      return;
    }

    // Computer move
    setTimeout(() => {
      const emptySquares = newBoard.reduce((acc, val, idx) => 
        val === null ? [...acc, idx] : acc, []
      );
      
      if (emptySquares.length > 0) {
        const computerMove = emptySquares[Math.floor(Math.random() * emptySquares.length)];
        newBoard[computerMove] = 'O';
        setBoard([...newBoard]);
        
        // Check if computer won
        const computerWinner = checkWinner(newBoard);
        if (computerWinner) {
          setHasWinner(true);
        }
      }
    }, 500);
  };

  // Add rematch handler
  const handleRematch = () => {
    setBoard(Array(9).fill(null));
    setHasWinner(false);
  };

  // Add this new function to close the error overlay
  const handleCloseError = () => {
    setBackendError(false);
    setBoard(Array(9).fill(null));
    setReconnectionAttempts(0);
  };

  // Update the BackendErrorMessage component
  const BackendErrorMessage = () => (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-black/80 p-8 rounded-lg border border-green-500/20 max-w-md text-center relative">
        {/* Add close button */}
        <button
          onClick={handleCloseError}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-8">
          <h2 className="text-xl font-mono text-white mb-4">
            Payment System Reconnection
          </h2>
          <p className="text-sm text-green-300 mb-4">
            {reconnectionAttempts}/3 attempts • Click squares to retry
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-8 mx-auto" style={{ width: '280px', height: '280px' }}>
          {board.map((square, index) => (
            <button 
              key={index}
              onClick={() => handleSquareClick(index)}
              disabled={square !== null || isProcessingPayment || hasWinner}
              className={`
                w-full h-full border-2 border-green-800 flex items-center justify-center 
                transition-all duration-200 hover:bg-green-900/20
                ${square ? 'cursor-not-allowed' : 'cursor-pointer'}
                ${square === 'X' ? 'text-green-400' : square === 'O' ? 'text-red-400' : 'text-white'}
              `}
            >
              {square === 'X' && <X size={48} />}
              {square === 'O' && <Circle size={48} />}
            </button>
          ))}
        </div>

        <div className="text-sm font-mono text-gray-400 mb-4">
          {hasWinner ? (
            <div className="space-y-4">
              <div className="text-green-400">
                {board.filter(x => x === 'X').length > board.filter(o => o === 'O').length 
                  ? 'You won!' 
                  : 'Computer won!'}
              </div>
              <button
                onClick={handleRematch}
                className="px-4 py-2 bg-green-500/20 text-green-400 
                  border border-green-500/40 hover:bg-green-500/30"
              >
                Play Again
              </button>
            </div>
          ) : (
            reconnectionAttempts >= 3 
              ? "Maximum attempts reached. Retrying payment..." 
              : "Keep trying to establish connection"
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-black min-h-screen relative p-8 pb-32">
      {/* Show backend error if present */}
      {backendError && <BackendErrorMessage />}
      
      {/* Background patterns */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,#242_1px,transparent_1px),linear-gradient(-45deg,#111_1px,transparent_1px)] bg-[size:20px_20px]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,#222_1px,transparent_1px),linear-gradient(90deg,#111_1px,transparent_1px)] bg-[size:40px_40px] opacity-50" />
      </div>

      {/* Add payment processing overlay */}
      {isProcessingPayment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-12 h-12 text-green-400 animate-spin mb-4" />
            <div className="font-mono text-white space-y-2">
              <h3 className="text-xl">Processing Payment</h3>
              <p className="text-white/60 text-sm">Please wait while we confirm your order...</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto relative">
        {/* Header with synchronized pulse */}
        <div className="flex items-center space-x-4 mb-12">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-[pulse_1.5s_ease-in-out_infinite]" />
          <h2 className="text-3xl font-mono font-bold text-white">
            <span className="opacity-100">WAITING</span>{' '}
            <span className="relative">
              ROOM
              <span className="absolute -inset-1 bg-white/10 -skew-x-12 -z-10" />
            </span>
          </h2>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="flex items-center space-x-2 mb-8">
            {/* Synchronized alert circle pulse */}
            <AlertCircle className="w-6 h-6 text-green-400 animate-[pulse_1.5s_ease-in-out_infinite]" />
            <h1 className="text-1xl font-mono font-bold text-white">
              AWAITING ORDER CONFIRMATION{dots}
            </h1>
          </div>

          <div className="text-4xl font-mono text-green-400 mb-8 ">
            {formatTime(timeLeft)}
          </div>

          {timeLeft > 0 ? (
            <button 
              onClick={handlePayNow}
              className="flex items-center justify-center bg-green-400 text-black px-4 py-2  hover:bg-green-800 transition-colors mb-2"
            >
              <CreditCard className="mr-2" /> Pay ₹{remainingPayment} Now
            </button>
          ) : (
            <button 
              onClick={handleTryAgain}
              className="flex items-center justify-center bg-yellow-400 text-black px-4 py-2  hover:bg-red-900 transition-colors mb-2"
            >
              Try Again
            </button>
          )}

          <div className="text-sm font-mono text-gray-400 mb-6">
            to confirm your order
          </div>

          <div className="text-1xl font-mono text-green-300 mb-6">
            Order ID: {displayOrderId}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaitingRoom;
