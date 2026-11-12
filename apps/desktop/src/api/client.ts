import axios from 'axios';

export const API_BASE_URL = 'http://localhost:4000/api';
export const SOCKET_URL = 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pharmacy_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle session expiration cleanly
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only clear token and redirect if the workstation session itself is expired or invalid.
    // Do NOT clear token on PIN failures (which return 403 or code: INVALID_PIN) or other errors.
    if (error.response && error.response.status === 401) {
      const code = error.response.data?.code;
      if (code === 'SESSION_EXPIRED' || (!code && !error.response.data?.error?.includes('PIN'))) {
        if (!window.location.hash.includes('login')) {
          localStorage.removeItem('pharmacy_auth_token');
          localStorage.removeItem('pharmacy_auth_user');
          window.location.hash = '#/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
