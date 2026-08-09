import axios from 'axios';
import { useAuthStore } from '../store/auth';

const API_URL = 'http://10.0.2.2:3000/api/v1'; // Android emulator → host

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
