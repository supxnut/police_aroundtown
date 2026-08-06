import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('auth_token');
      // Don't auto-redirect if checking auth or on login page
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/unauthorized')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
