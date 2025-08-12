import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RoleGuard = ({ children, roles = [] }) => {
  const { user, isAuthenticated } = useAuth();

  // Se não estiver autenticado, redireciona para login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Se não tiver usuário ou role, redireciona para admin
  if (!user || !user.role) {
    return <Navigate to="/admin" replace />;
  }

  // Se o role do usuário não estiver na lista de roles permitidos, redireciona para admin
  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

export default RoleGuard;

