import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// Base dinâmica: em prod usamos "/api" (Vercel → Render); em dev você pode setar VITE_PUBLIC_API_URL
const API_BASE = (import.meta?.env?.VITE_PUBLIC_API_URL) || '/api';

async function api(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // pode não vir JSON (ex: 204), tudo bem
  }

  if (!res.ok) {
    const message =
      data?.message ||
      data?.error ||
      `Erro ${res.status}${data?.detail ? `: ${data.detail}` : ''}`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

async function loginRequest(username, password) {
  return api('/auth/login', {
    method: 'POST',
    body: { username, password },
  });
}

async function meRequest(token) {
  return api('/auth/me', {
    method: 'GET',
    token,
  });
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restaura sessão e valida token
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          // opcional: revalidar com /auth/me
          const fresh = await meRequest(token);
          const userData = fresh?.user || fresh || JSON.parse(savedUser);
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        } catch (error) {
          console.error('Token inválido:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const data = await loginRequest(username, password);

      // Aceita formatos comuns de resposta
      const accessToken =
        data?.access_token ||
        data?.token ||
        data?.accessToken ||
        null;

      let userData = data?.user || null;

      if (!accessToken) {
        throw new Error('Token de acesso não recebido');
      }

      // Se a API não retornou user no login, tenta buscar no /auth/me
      if (!userData) {
        try {
          const fresh = await meRequest(accessToken);
          userData = fresh?.user || fresh || null;
        } catch (e) {
          // segue só com token
        }
      }

      localStorage.setItem('token', String(accessToken));
      if (userData) localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      return { success: true };
    } catch (error) {
      console.error('Erro no login:', error);
      return {
        success: false,
        message: error?.data?.message || error?.message || 'Erro ao fazer login',
      };
    }
  };

  const logout = () => {
    try {
      // se a API tiver uma rota /auth/logout baseada em token, poderíamos chamá-la aqui.
      // api('/auth/logout', { method: 'POST', token: localStorage.getItem('token') }).catch(() => {});
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  const isAdmin = () => user?.role === 'admin';
  const isSupervisor = () => user?.role === 'supervisor' || user?.role === 'admin';

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
    isAdmin,
    isSupervisor,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
