// frontend/src/admin/AdminLayout.jsx
import React, { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';

import {
  Home,
  Users,
  Package,
  Activity,
  Briefcase,
  Settings,
  Wallet,
  Menu,
  X,
  User as UserIcon,
  LogOut,
} from 'lucide-react';

const MenuItem = ({ to, icon: Icon, label, end = false, onClick }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `w-full flex items-center px-5 py-3 rounded-md transition-colors ${
        isActive
          ? 'bg-red-50 text-red-600'
          : 'text-gray-700 hover:bg-gray-50'
      }`
    }
    onClick={onClick}
  >
    <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
    <span className="truncate">{label}</span>
  </NavLink>
);

export default function AdminLayout() {
  const { user, logout, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const menu = useMemo(
    () => [
      { to: '/admin', label: 'Dashboard', icon: Home, end: true },
      { to: '/admin/clients', label: 'Clientes', icon: Users },
      { to: '/admin/materials', label: 'Materiais', icon: Package },
      { to: '/admin/actions', label: 'Ações', icon: Activity },
      { to: '/admin/finance', label: 'Finanças', icon: Wallet }, // ✅ nova página
      { to: '/admin/vacancies', label: 'Vagas', icon: Briefcase },
      { to: '/admin/settings', label: 'Configurações', icon: Settings },
    ],
    []
  );

  const currentTitle = useMemo(() => {
    const found =
      menu.find((m) => (m.end ? location.pathname === m.to : location.pathname.startsWith(m.to))) ||
      menu[0];
    return found.label;
  }, [location.pathname, menu]);

  const handleLogout = () => logout();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar (mobile drawer + desktop fixa) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-0`}
      >
        {/* Topo da sidebar */}
        <div className="flex items-center justify-between h-16 px-5 border-b">
          <h1 className="text-xl font-bold text-red-600">Relâmpago</h1>
          <button className="md:hidden" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navegação */}
        <nav className="p-4 space-y-1 overflow-y-auto">
          {menu.map((item) => (
            <MenuItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
            />
          ))}
        </nav>
      </aside>

      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Conteúdo principal */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <header className="bg-white border-b shadow-sm sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="h-16 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  className="md:hidden"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Abrir menu"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <h2 className="text-lg sm:text-xl font-semibold truncate">{currentTitle}</h2>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 min-w-0">
                  <UserIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700 truncate max-w-[10rem]">
                    {user?.name || 'Usuário'}
                  </span>
                  <Badge variant={isAdmin?.() ? 'default' : 'secondary'}>
                    {user?.role === 'admin' ? 'Admin' : 'Supervisor'}
                  </Badge>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sair</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Área das rotas filhas */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
