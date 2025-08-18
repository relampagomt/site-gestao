import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, requireAdmin = false, allowedRoles = [] }) => {
  const { isAuthenticated, loading, isAdmin, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 brand-text-vinho" />
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Verifica se há token e user no localStorage
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');
  
  if (!isAuthenticated || !token || !userData) {
    return <Navigate to="/login" replace />;
  }

  // Verifica role-based access
  const userRole = user?.role;
  let hasAccess = true;

  // Se requireAdmin for true (backward compatibility)
  if (requireAdmin && !isAdmin()) {
    hasAccess = false;
  }

  // Se allowedRoles for especificado, verifica se o usuário tem uma das roles permitidas
  if (allowedRoles.length > 0 && (!userRole || !allowedRoles.includes(userRole))) {
    hasAccess = false;
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h2>
          <p className="text-gray-600 mb-4">
            Você não tem permissão para acessar esta página.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            {allowedRoles.length > 0 
              ? `Requer perfil: ${allowedRoles.join(', ')}`
              : 'Requer permissões de administrador'
            }
          </p>
          <Navigate to="/admin" replace />
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;

