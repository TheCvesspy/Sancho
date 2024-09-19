// src/services/api.js

import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:5000', // Hardcoded URL for testing
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
