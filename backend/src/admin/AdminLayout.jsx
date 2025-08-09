import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Target, 
  Briefcase, 
  Settings,
  Menu,
  X,
  LogOut,
  User,
  Package
} from 'lucide-react';

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  const menuItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/clients', icon: Users, label: 'Clientes' },
    { path: '/admin/actions', icon: Target, label: 'Ações' },
    { path: '/admin/materials', icon: Package, label: 'Materiais' },
    { path: '/admin/vacancies', icon: Briefcase, label: 'Vagas' },
    { path: '/admin/settings', icon: Settings, label: 'Configurações' }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-16'} bg-red-700 text-white transition-all duration-300 flex flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-red-600">
          <div className="flex items-center justify-between">
            {isSidebarOpen && (
              <div>
                <h2 className="text-xl font-bold">RELÂMPAGO</h2>
                <p className="text-red-200 text-sm">Painel Administrativo</p>
              </div>
            )}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center p-3 rounded-lg transition-colors ${
                      isActive(item.path)
                        ? 'bg-red-600 text-white'
                        : 'text-red-100 hover:bg-red-600 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {isSidebarOpen && <span className="ml-3">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-red-600">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            {isSidebarOpen && (
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium">Administrador</p>
                <p className="text-xs text-red-200">admin@relampago.com</p>
              </div>
            )}
          </div>
          {isSidebarOpen && (
            <button className="mt-3 w-full flex items-center justify-center p-2 text-red-200 hover:text-white hover:bg-red-600 rounded-lg transition-colors">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">
              {menuItems.find(item => isActive(item.path))?.label || 'Painel Administrativo'}
            </h1>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {new Date().toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;


