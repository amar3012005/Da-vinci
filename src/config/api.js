import axios from 'axios';

const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.foodles.shop'                   // Production backend
  : 'http://localhost:5000';                     // Local development

console.log('🌐 API Configuration:', {
  environment: process.env.NODE_ENV,
  apiUrl: API_URL,
  mode: process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT',
  host: window.location.host
});

const api = axios.create({
  baseURL: API_URL, // Use the API_URL constant instead of REACT_APP_API_URL
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add connection status check
const checkConnection = async () => {
  try {
    const response = await api.get('/health');
    console.log('🟢 Backend connected successfully:', {
      url: API_URL,
      status: response.data.status,
      services: response.data.services
    });
    return true;
  } catch (error) {
    console.error('🔴 Backend connection failed:', {
      url: API_URL,
      error: error.message
    });
    return false;
  }
};

// Check connection on init
checkConnection();

// Add request logging for debugging
api.interceptors.request.use(request => {
  console.log('📤 Making request to:', {
    url: `${request.baseURL}${request.url}`,
    method: request.method?.toUpperCase(),
    environment: process.env.NODE_ENV,
    origin: window.location.origin
  });
  return request;
});

api.interceptors.response.use(
  response => {
    console.log('📥 Response Received:', {
      url: response.config.url,
      status: response.status,
      timestamp: new Date().toISOString()
    });
    return response;
  },
  error => {
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message
    });
    return Promise.reject(error);
  }
);

export default api;