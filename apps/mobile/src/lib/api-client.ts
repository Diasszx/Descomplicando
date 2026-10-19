import axios from 'axios';

const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});
