// frontend/src/services/api.js
import axios from 'axios';

/* ============ Base URL robusta ============ */
/**
 * Prioridade:
 * 1) VITE_API_URL ou VITE_API_BASE_URL (se vier sem /api, a gente acrescenta)
 * 2) window.location.origin + '/api' (ideal quando usa rewrite do Vercel)
 * 3) fallback local: http://localhost:5000/api
 */
function computeBaseURL() {
  const env =
    (import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      '').trim();

  const chosen = env || (typeof window !== 'undefined'
    ? `${window.location.origin}/api`
    : 'http://localhost:5000/api');

  // remove barra final
  const noTrail = chosen.replace(/\/+$/, '');
  // garante /api no final (sem duplicar)
  return noTrail.endsWith('/api') ? noTrail : `${noTrail}/api`;
}

const baseURL = computeBaseURL();

const api = axios.create({
  baseURL,
  // NÃO fixe Content-Type global: quebra multipart/form-data
});

/* ============ Interceptors ============ */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // Se for FormData, deixe o navegador definir o boundary
    if (config.data instanceof FormData) {
      if (config.headers && ('Content-Type' in config.headers)) delete config.headers['Content-Type'];
      if (config.headers && ('content-type' in config.headers)) delete config.headers['content-type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message || error?.message || 'Erro desconhecido';

    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!location.pathname.includes('/login')) location.href = '/login';
    } else if (status === 403) {
      console.warn('Acesso negado:', message);
    } else if (status >= 500) {
      console.error('Erro interno do servidor:', message);
    }
    return Promise.reject(error);
  }
);

/* ============ Utils ============ */
export async function checkApi() {
  try {
    const res = await api.get('/healthcheck', {
      timeout: 4000,
      validateStatus: () => true,
    });
    return res.status === 200 && (res.data?.status === 'ok' || res.data === 'ok');
  } catch {
    return false;
  }
}

/**
 * Tenta uma lista de caminhos até encontrar um 200.
 * Útil para compatibilizar /metrics/xyz vs /xyz.
 */
async function getWithFallbacks(paths) {
  let lastErr;
  for (const p of paths) {
    try {
      const res = await api.get(p, { validateStatus: () => true });
      if (res.status >= 200 && res.status < 300) return res.data;
      lastErr = new Error(`GET ${p} -> status ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Nenhum endpoint retornou sucesso');
}

/* ============ Serviços ============ */
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
  // Compatível com /metrics/service-distribution e /service-distribution
  getServiceDistribution: async () =>
    getWithFallbacks(['/metrics/service-distribution', '/service-distribution']),

  // Compatível com /metrics/monthly-campaigns e /monthly-campaigns
  getMonthlyCampaigns: async () =>
    getWithFallbacks(['/metrics/monthly-campaigns', '/monthly-campaigns']),
};

export const uploadService = {
  uploadFile: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await api.post('/upload', fd);
    return data; // { url, ... }
  },
};

export default api;
