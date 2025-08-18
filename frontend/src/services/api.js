// frontend/src/services/api.js
import axios from 'axios';

// Base URL:
// - Produção (Vercel): defina VITE_API_URL = "https://site-gestao.onrender.com/api"
// - Dev local: cai no fallback http://localhost:5000/api
const baseURL =
  (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').trim() ||
  'http://localhost:5000/api';

const api = axios.create({
  baseURL,
  // NÃO defina Content-Type global aqui — quebra multipart/form-data de uploads!
});

// Interceptor para JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // Se for FormData, deixe o browser definir o boundary (remove qualquer content-type manual)
    if (config.data instanceof FormData) {
      if (config.headers && ('Content-Type' in config.headers)) delete config.headers['Content-Type'];
      if (config.headers && ('content-type' in config.headers)) delete config.headers['content-type'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para 401, 403 e 5xx
api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message || error?.message || 'Erro desconhecido';
    
    if (status === 401) {
      // Token inválido ou expirado
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!location.pathname.includes('/login')) {
        location.href = '/login';
      }
    } else if (status === 403) {
      // Acesso negado - usuário não tem permissão
      console.warn('Acesso negado:', message);
      // Você pode mostrar uma notificação aqui se tiver um sistema de toast
      // toast.error(message);
    } else if (status >= 500) {
      // Erro interno do servidor
      console.error('Erro interno do servidor:', message);
      // Você pode mostrar uma notificação aqui se tiver um sistema de toast
      // toast.error('Erro interno do servidor. Tente novamente mais tarde.');
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

export const metricsService = {
  // GET /api/metrics/service-distribution
  getServiceDistribution: async () => {
    const { data } = await api.get('/metrics/service-distribution');
    return data;
  },
  // (opcional) GET /api/metrics/monthly-campaigns
  getMonthlyCampaigns: async () => {
    const { data } = await api.get('/metrics/monthly-campaigns');
    return data;
  },
};

// Upload de arquivo (imagem) para /api/upload
export const uploadService = {
  uploadFile: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await api.post('/upload', fd /* sem headers aqui */);
    return data; // { url, public_id, ... }
  },
};

export default api;
