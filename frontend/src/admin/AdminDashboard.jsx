import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

import {
  LogOut,
  User,
  Shield,
  Settings,
  Users,
  Package,
  Activity,
  Briefcase,
  Home,
  Menu,
  X,
  Wallet, // ✅ novo ícone
} from 'lucide-react';

import Dashboard from './Dashboard';
import Clients from './Clients';
import Materials from './Materials';
import Actions from './Actions';
import Vacancies from './Vacancies';
import SettingsPage from './Settings';
import Finance from './Finance'; // ✅ novo

const AdminDashboard = () => {
  const { user, logout, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => logout();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, component: Dashboard },
    { id: 'clients', label: 'Clientes', icon: Users, component: Clients },
    { id: 'materials', label: 'Materiais', icon: Package, component: Materials },
    { id: 'actions', label: 'Ações', icon: Activity, component: Actions },
    { id: 'finance', label: 'Finanças', icon: Wallet, component: Finance }, // ✅ novo item
    { id: 'vacancies', label: 'Vagas', icon: Briefcase, component: Vacancies },
    { id: 'settings', label: 'Configurações', icon: Settings, component: SettingsPage },
  ];

  const ActiveComponent = menuItems.find((i) => i.id === activeTab)?.component || Dashboard;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <h1 className="text-xl font-bold text-red-600">Relâmpago</h1>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="mt-6 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center px-6 py-3 text-left hover:bg-gray-50 transition-colors ${
                  isActive ? 'bg-red-50 text-red-600 border-r-2 border-red-600' : 'text-gray-700'
                }`}
              >
                <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                <span className="text-sm lg:text-base truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-0 min-w-0">
        {/* Header */}
        <header className="bg-white border-b shadow-sm sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center min-w-0">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden mr-4 flex-shrink-0">
                  <Menu className="w-6 h-6" />
                </button>
              </div>

              <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
                <div className="hidden sm:flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700 truncate max-w-32">{user?.name}</span>
                  <Badge variant={isAdmin() ? 'default' : 'secondary'}>
                    {user?.role === 'admin' ? 'Admin' : 'Supervisor'}
                  </Badge>
                </div>

                <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center space-x-1 sm:space-x-2">
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sair</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-3 sm:p-6 lg:p-8 max-w-full overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            <ActiveComponent />
          </div>
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="fixed inset-0 bg-transparent z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
};

export default AdminDashboard;
