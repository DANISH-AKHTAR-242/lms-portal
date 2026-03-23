import api from './http';

const idempotencyHeaders = () => ({
  'Idempotency-Key':
    globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
});

export const createOrder = async (courseId) => {
  const { data } = await api.post(
    '/api/v1/payment/order',
    { courseId },
    { headers: idempotencyHeaders() },
  );
  return data;
};

export const verifyPayment = async (payload) => {
  const { data } = await api.post('/api/v1/payment/verify', payload, {
    headers: idempotencyHeaders(),
  });
  return data;
};

export const markPaymentFailed = async (paymentId) => {
  const { data } = await api.post(
    '/api/v1/payment/failed',
    { paymentId },
    { headers: idempotencyHeaders() },
  );
  return data;
};
