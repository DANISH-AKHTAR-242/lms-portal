import { createOrder, markPaymentFailed, verifyPayment } from '../../api/paymentApi';

const loadRazorpay = () => {
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const startCourseCheckout = async ({ courseId, user }) => {
  const sdkReady = await loadRazorpay();
  if (!sdkReady) throw new Error('Unable to load Razorpay checkout');

  const orderResponse = await createOrder(courseId);
  const order = orderResponse?.order;

  if (!order?.id) {
    throw new Error('Order creation failed');
  }

  const key = import.meta.env.VITE_RAZORPAY_KEY_ID;
  if (!key) {
    throw new Error('Missing VITE_RAZORPAY_KEY_ID');
  }

  return new Promise((resolve, reject) => {
    const rz = new window.Razorpay({
      key,
      amount: order.amount,
      currency: order.currency,
      name: 'LMS Portal',
      description: orderResponse?.course?.name || 'Course purchase',
      order_id: order.id,
      prefill: {
        name: user?.name || '',
        email: user?.email || '',
      },
      handler: async (response) => {
        try {
          const verifyResponse = await verifyPayment(response);
          resolve(verifyResponse);
        } catch (error) {
          reject(error);
        }
      },
      modal: {
        ondismiss: async () => {
          try {
            await markPaymentFailed(order.id);
          } catch {
            // best effort
          }
          reject(new Error('Payment cancelled by user'));
        },
      },
    });

    rz.on('payment.failed', async () => {
      try {
        await markPaymentFailed(order.id);
      } catch {
        // best effort
      }
    });

    rz.open();
  });
};
