import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import api from '../config/api';

const CashfreeResponse = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [processing, setProcessing] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Processing payment response...');

  useEffect(() => {
    const handleCashfreeResponse = async () => {
      try {
        console.log('Cashfree response received:', {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
          params
        });
        
        // Extract parameters from URL
        const urlParams = new URLSearchParams(location.search);
        
        // Get order ID from URL params or session storage
        let orderId = urlParams.get('order_id') || 
                     urlParams.get('orderId') || 
                     params.orderId ||
                     sessionStorage.getItem('currentOrderId');
        
        console.log('Extracted order ID:', orderId);

        if (!orderId) {
          console.error('No order ID found');
          setStatusMessage('Order ID not found. Redirecting...');
          setTimeout(() => {
            navigate('/', { 
              state: { 
                message: 'Payment completed but order details unclear. Please check your email.',
                type: 'warning'
              }
            });
          }, 3000);
          return;
        }

        // Poll order status until it's processed
        setStatusMessage('Checking payment status...');
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds max
        
        const pollOrderStatus = async () => {
          try {
            const response = await api.get(`/payment/order-status/${orderId}`);
            const { status, processed } = response.data;
            
            console.log('Order status check:', { status, processed, attempts });
            
            if (status === 'SUCCESS' && processed) {
              console.log('Payment processed successfully, redirecting to confirmation');
              
              // Clear session storage
              sessionStorage.removeItem('currentOrderId');
              
              // Redirect to order confirmation
              navigate('/order-confirmation', {
                state: {
                  orderId: orderId,
                  paymentSuccess: true,
                  fromCashfree: true,
                  emailsSent: response.data.emailsSent || 0,
                  missedCallStatus: response.data.missedCallStatus
                },
                replace: true
              });
              return;
            }
            
            if (status === 'NOT_FOUND') {
              console.error('Order not found');
              setStatusMessage('Order not found. Redirecting...');
              setTimeout(() => {
                navigate('/', { 
                  state: { 
                    message: 'Order not found. Please contact support if payment was deducted.',
                    type: 'error'
                  }
                });
              }, 3000);
              return;
            }
            
            // If still pending and we haven't exceeded max attempts
            if (attempts < maxAttempts) {
              attempts++;
              setStatusMessage(`Waiting for payment confirmation... (${attempts}/${maxAttempts})`);
              setTimeout(pollOrderStatus, 1000); // Check again in 1 second
            } else {
              // Timeout - redirect anyway with a warning
              console.warn('Payment status check timed out');
              setStatusMessage('Payment verification taking longer than expected. Redirecting...');
              
              setTimeout(() => {
                navigate('/order-confirmation', {
                  state: {
                    orderId: orderId,
                    paymentSuccess: true,
                    fromCashfree: true,
                    needsVerification: true,
                    message: 'Payment completed but verification is taking time. Please check your email.'
                  },
                  replace: true
                });
              }, 3000);
            }
            
          } catch (error) {
            console.error('Error checking order status:', error);
            attempts++;
            
            if (attempts < maxAttempts) {
              setStatusMessage(`Retrying payment verification... (${attempts}/${maxAttempts})`);
              setTimeout(pollOrderStatus, 2000); // Retry in 2 seconds
            } else {
              // If all attempts failed, redirect with error message
              setStatusMessage('Payment verification failed. Redirecting...');
              setTimeout(() => {
                navigate('/order-confirmation', {
                  state: {
                    orderId: orderId,
                    paymentSuccess: true,
                    fromCashfree: true,
                    hasError: true,
                    errorMessage: 'Could not verify payment status. Please check your email or contact support.'
                  },
                  replace: true
                });
              }, 3000);
            }
          }
        };

        // Start polling
        pollOrderStatus();

      } catch (error) {
        console.error('Error processing Cashfree response:', error);
        setStatusMessage('Error processing payment response. Redirecting...');
        
        setTimeout(() => {
          const orderId = sessionStorage.getItem('currentOrderId');
          if (orderId) {
            navigate('/order-confirmation', {
              state: {
                orderId: orderId,
                paymentSuccess: true,
                fromCashfree: true,
                hasError: true,
                errorMessage: error.message
              },
              replace: true
            });
          } else {
            navigate('/', { 
              state: { 
                message: 'Payment processing error. Please contact support.',
                type: 'error'
              }
            });
          }
        }, 3000);
      } finally {
        setProcessing(false);
      }
    };

    handleCashfreeResponse();
  }, [navigate, location, params]);

  if (processing) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-400/20 border-t-green-400 rounded-full animate-spin mb-4 mx-auto" />
          <div className="font-mono text-white space-y-2">
            <h3 className="text-xl">Processing Payment</h3>
            <p className="text-white/60 text-sm">{statusMessage}</p>
            <p className="text-white/40 text-xs">Do not refresh this page</p>
          </div>
        </div>
      </div>
    );
  }

  return null; // Component will redirect, so no need to render anything
};

export default CashfreeResponse;
