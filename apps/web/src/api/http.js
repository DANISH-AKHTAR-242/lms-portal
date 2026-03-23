import axios from 'axios';
import { clearCsrfToken, fetchCsrfToken, getCachedCsrfToken } from './csrf';
import { useAuthStore } from '../store/authStore';
import { API_PREFIX } from '@lms/shared/constants/index';

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);
const apiBaseURL = import.meta.env.VITE_API_URL || '/';

if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  throw new Error('VITE_API_URL must be defined in production builds');
}

const api = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const method = (config.method || 'get').toLowerCase();

  if (MUTATING_METHODS.has(method) && !config.skipCsrf) {
    const token = getCachedCsrfToken() || (await fetchCsrfToken(api));
    if (token) {
      config.headers = {
        ...config.headers,
        'X-CSRF-Token': token,
      };
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;

    if (status === 403 && error.response?.data?.message?.includes('CSRF')) {
      clearCsrfToken();
    }

    if (status !== 401 || originalRequest._retry) {
      throw error;
    }

    if (originalRequest.url?.includes(`${API_PREFIX}/user/refresh`)) {
      useAuthStore.getState().clearSession();
      throw error;
    }

    originalRequest._retry = true;

    try {
      await api.post(`${API_PREFIX}/user/refresh`, null, { skipCsrf: true });
      return api(originalRequest);
    } catch (refreshError) {
      useAuthStore.getState().clearSession();
      throw refreshError;
    }
  },
);

export default api;
