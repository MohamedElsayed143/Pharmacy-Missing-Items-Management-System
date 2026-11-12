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

// Response interceptor to handle unauthorized 401s
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if invalid/expired and redirect to login if not already there
      if (!window.location.hash.includes('login')) {
        localStorage.removeItem('pharmacy_auth_token');
        localStorage.removeItem('pharmacy_auth_user');
      }
    }
    return Promise.reject(error);
  }
);
