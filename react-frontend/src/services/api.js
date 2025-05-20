import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor for auth token
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

// Enhanced response interceptor
api.interceptors.response.use(
  (response) => {
    // Standardize successful responses
    if (response.data && typeof response.data === 'object') {
      return {
        ...response,
        data: {
          success: true,
          ...(response.data.success !== undefined ? response.data : { data: response.data })
        }
      };
    }
    return response;
  },
  (error) => {
    // Enhanced error handling
    if (error.response) {
      const apiError = {
        message: error.response.data?.message || 'Request failed',
        status: error.response.status,
        data: error.response.data,
        config: error.config
      };

      console.error('API Error:', apiError);
      
      if (error.response.status === 401) {
        window.location.href = '/login';
      }

      return Promise.reject(apiError);
    } else if (error.request) {
      console.error('API No Response:', error.request);
      return Promise.reject({ 
        message: 'No response from server',
        isNetworkError: true 
      });
    } else {
      console.error('API Setup Error:', error.message);
      return Promise.reject({ 
        message: 'Request setup failed',
        details: error.message 
      });
    }
  }
);

export default api;
