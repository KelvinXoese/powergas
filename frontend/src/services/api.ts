import axios from 'axios';
import { useAuthStore } from '../store/auth';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({ baseURL: API_URL, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = false;
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && !refreshing) {
      original._retry = true;
      refreshing = true;
      try {
        const { data } = await api.post('/auth/refresh');
        useAuthStore.getState().setAccessToken(data.data.accessToken);
        refreshing = false;
        return api(original);
      } catch {
        refreshing = false;
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  },
);
