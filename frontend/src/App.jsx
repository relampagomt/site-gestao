// frontend/src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Layout e páginas do Admin
import AdminLayout from "./admin/AdminLayout.jsx";
import AdminDashboard from "./admin/AdminDashboard.jsx";
import Clients from "./admin/Clients.jsx";
import Materials from "./admin/Materials.jsx";
import Actions from "./admin/Actions.jsx";
import Finance from "./admin/Finance.jsx";
import Vacancies from "./admin/Vacancies.jsx";
import Users from "./admin/Users.jsx";

// Páginas públicas (ajuste os caminhos se necessário)
import Login from "./auth/Login.jsx";            // caso seu login esteja em outra pasta, ajuste
import NotFound from "./pages/NotFound.jsx";     // se não existir, há um fallback abaixo
import Forbidden from "./pages/Forbidden.jsx";   // se não existir, há um fallback abaixo

// Contexto de autenticação
import { AuthProvider, useAuth } from "./contexts/AuthContext";

/**
 * Guardião de rota simples.
 * - Se não estiver autenticado, redireciona para /login.
 * - Se a prop `roles` for passada, exige que o usuário tenha um desses papéis.
 */
function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth() || {};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (Array.isArray(roles) && roles.length > 0) {
    const ok = roles.includes(user.role);
    if (!ok) return <Navigate to="/403" replace />;
  }

  return children;
}

/**
 * Fallbacks simples caso você não tenha criado as páginas 403/404 ainda.
 * Se você já tem `pages/Forbidden.jsx` e `pages/NotFound.jsx`, eles serão usados acima.
 */
function FallbackForbidden() {
  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">403</h1>
        <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
      </div>
    </div>
  );
}
function FallbackNotFound() {
  return (
    <div className="min-h-[60vh] grid place-items-center p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">404</h1>
        <p className="text-muted-foreground">Página não encontrada.</p>
      </div>
    </div>
  );
}

// Usa fallback se os componentes opcionais não existirem
const ForbiddenPage = Forbidden || FallbackForbidden;
const NotFoundPage = NotFound || FallbackNotFound;

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Público */}
          <Route path="/login" element={<Login />} />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["admin", "supervisor"]}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="materials" element={<Materials />} />
            <Route path="actions" element={<Actions />} />
            <Route path="finance" element={<Finance />} />
            <Route path="vacancies" element={<Vacancies />} />
            <Route path="users" element={<Users />} /> {/* ✅ RESTAURADO */}
            {/* ❌ NÃO registrar rota de /admin/settings para remover "Configurações" */}
          </Route>

          {/* Utilidades */}
          <Route path="/403" element={<ForbiddenPage />} />

          {/* Redirecionamento raiz */}
          <Route path="/" element={<Navigate to="/admin" replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
