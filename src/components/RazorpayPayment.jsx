// ...existing code...

const handlePayment = async () => {
  try {
    // ...existing payment initialization code...

    const options = {
      // ...existing options...
      handler: async (response) => {
        try {
          // ...existing success handling...
        } catch (error) {
          console.error('Payment verification failed:', error);
          navigate('/payment-failure', {
            state: {
              amount: totalAmount,
              error: error.message
            }
          });
        }
      },
      modal: {
        ondismiss: () => {
          console.log('Payment cancelled by user');
          navigate('/payment-failure', {
            state: {
              amount: totalAmount,
              error: 'Payment cancelled by user'
            }
          });
        },
        escape: false,
      },
      prefill: {
        // ...existing prefill...
      }
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.on('payment.failed', function (response) {
      console.error('Payment failed:', response.error);
      navigate('/personal-info', {
        state: {
          amount: totalAmount,
          error: response.error.description,
          code: response.error.code
        }
      });
    });

    paymentObject.open();
  } catch (error) {
    console.error('Payment initiation failed:', error);
    navigate('/payment-failure', {
      state: {
        amount: totalAmount,
        error: 'Failed to initialize payment'
      }
    });
  }
};

// ...rest of existing code...
