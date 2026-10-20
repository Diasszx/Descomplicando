import axios from 'axios';
import { webEnv } from './env';

export const apiClient = axios.create({
  baseURL: webEnv.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
