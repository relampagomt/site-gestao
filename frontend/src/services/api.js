// frontend/src/services/api.js
import axios from 'axios';

const baseURL =
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  // Em produção, seu backend está por trás de /api (proxy/render)
  '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para 401
api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // redireciona para login somente se não estiver já lá
      if (!location.pathname.includes('/login')) {
        location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// --------- Serviços ---------

export const authService = {
  login: async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    return data;
  },
  getCurrentUser: async () => {
    const { data } = await api.get('/auth/me');
    return data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

// NOVO: métricas
export const metricsService = {
  // GET /api/metrics/services/distribution
  getServiceDistribution: async () => {
    const { data } = await api.get('/metrics/services/distribution');
    // data = { "Panfletagem Residencial": 10, "Sinaleiros/Pedestres": 3, ... }
    return data;
  },
};

export default api;
