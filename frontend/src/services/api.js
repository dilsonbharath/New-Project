import axios from 'axios';

// Use proxy for API calls in development (relative paths)
const API_URL = import.meta.env.VITE_API_URL || '/api';
const ROUTER_MODE = import.meta.env.VITE_ROUTER_MODE || 'browser';
const BASE_URL = import.meta.env.BASE_URL || '/';

function getLoginRedirectPath() {
  const normalizedBase = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`;
  if (ROUTER_MODE === 'hash') {
    return `${normalizedBase}#/login`;
  }
  return `${normalizedBase}login`;
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = getLoginRedirectPath();
    }
    return Promise.reject(error);
  }
);

export default api;
