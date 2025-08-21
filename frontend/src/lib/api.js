// frontend/src/lib/api.js
import axios from "axios";

/**
 * Axios pré-configurado para falar com o backend.
 * Base URL:
 *   - VITE_API_BASE_URL (ex.: https://site-gestao.onrender.com/api)
 *   - fallback: https://site-gestao.onrender.com/api
 */
const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "https://site-gestao.onrender.com/api",
  withCredentials: false,
});

// Anexa o Bearer token salvo após login
api.interceptors.request.use((config) => {
  try {
    const token =
      localStorage.getItem("token") ||
      sessionStorage.getItem("token"); // caso use sessionStorage
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch (_) {
    // ignore
  }
  return config;
});

// Tratamento simples de erro (opcional)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // você pode centralizar mensagens aqui, se quiser
    return Promise.reject(err);
  }
);

export default api;
