import axios from 'axios';

const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.foodles.shop'
  : 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Backend is disabled for this project
export default api;