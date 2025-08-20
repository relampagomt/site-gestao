// frontend/src/admin/AdminDashboard.jsx
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
  Users as UsersIcon, // 👈 ícone plural para Clientes
  UserCog,           // 👈 ícone diferente para Usuários
  Package,
  Activity,
  Briefcase,
  Home,
  Menu,
  X,
  Wallet,
} from 'lucide-react';

import Dashboard from './Dashboard';
import Clients from './Clients';
import UsersPage from './Users';
import Materials from './Materials';
import Actions from './Actions';
import Vacancies from './Vacancies';
import SettingsPage from './Settings';
import Finance from './Finance';

const AdminDashboard = () => {
  const { user, logout, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => logout();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, component: Dashboard },
    { id: 'clients',   label: 'Clientes',  icon: UsersIcon, component: Clients },
    { id: 'users',     label: 'Usuários',  icon: UserCog,   component: UsersPage },
    { id: 'materials', label: 'Materiais', icon: Package,   component: Materials },
    { id: 'actions',   label: 'Ações',     icon: Activity,  component: Actions },
    { id: 'finance',   label: 'Finanças',  icon: Wallet,    component: Finance },
    { id: 'vacancies', label: 'Vagas',     icon: Briefcase, component: Vacancies },
    { id: 'settings',  label: 'Configurações', icon: Settings, component: SettingsPage },
  ];

  const ActiveComponent = menuItems.find((i) => i.id === activeTab)?.component || Dashboard;

  /* ===== CSS global para “legend em lista no canto” =====
     - Move a legend para a lateral direita como lista vertical (rolável no mobile)
     - Dá padding à área do gráfico para não ficar por baixo da legend
     - Esconde os rótulos que ficavam ao redor das fatias (pie labels)
     - Vale para Recharts e Google Charts (sem alterar JS dos gráficos)
  */
  const sideLegendCSS = `
    /* ---------- Base: evitar clipping e permitir que a legend fique visível ---------- */
    .recharts-wrapper,
    .google-visualization-chart,
    .google-visualization-chart svg {
      overflow: visible !important;
    }

    /* ---------- RECHARTS: reservar espaço à direita para a legend ---------- */
    .recharts-wrapper {
      position: relative !important;
      padding-right: 240px !important;   /* espaço p/ a lista */
      box-sizing: border-box;
      min-height: 280px;                  /* evita esmagar em cards baixos */
    }
    @media (max-width: 640px) {
      .recharts-wrapper { padding-right: 190px !important; min-height: 260px; }
    }

    /* RECHARTS: posicionar e “listar” a legend no canto direito */
    .recharts-legend-wrapper {
      position: absolute !important;
      pointer-events: auto !important;
      left: auto !important;
      right: 10px !important;
      top: 50% !important;
      transform: translateY(-50%);
      width: 220px;
      max-width: 40vw;
      max-height: calc(100% - 20px);
      overflow: auto;                     /* rola no mobile se precisar */
      text-align: left !important;
      background: transparent;
      padding: 4px 0;
    }
    .recharts-default-legend {
      display: block !important;
    }
    .recharts-default-legend ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: block !important;
    }
    .recharts-default-legend li {
      display: flex !important;
      align-items: center;
      gap: 8px;
      margin: 4px 0;
      line-height: 1.2;
      white-space: normal;
      word-break: break-word;
    }

    /* RECHARTS: esconder rótulos ao redor das fatias do pie */
    .recharts-pie-label-line,
    .recharts-pie-label-text {
      display: none !important;
    }

    /* ---------- GOOGLE CHARTS: reservar espaço à direita e posicionar legend ---------- */
    .google-visualization-piechart,
    .google-visualization-chart {
      position: relative !important;
      padding-right: 240px !important;
      box-sizing: border-box;
      min-height: 280px;
    }
    @media (max-width: 640px) {
      .google-visualization-piechart,
      .google-visualization-chart {
        padding-right: 190px !important;
        min-height: 260px;
      }
    }

    /* A legend do Google é HTML; posicionamos absoluta no canto */
    .google-visualization-legend {
      position: absolute !important;
      right: 10px !important;
      top: 50% !important;
      transform: translateY(-50%);
      width: 220px;
      max-width: 40vw;
      max-height: calc(100% - 20px);
      overflow: auto;
      text-align: left;
    }
    .google-visualization-legend table {
      width: 100%;
      border-collapse: collapse;
    }
    .google-visualization-legend tr > td {
      padding: 3px 0;
      vertical-align: top;
    }

    /* GOOGLE CHARTS: esconder rótulos que ficavam “ao redor” das fatias */
    .google-visualization-piechart svg text {
      display: none !important;
    }

    /* ---------- Ajuste opcional: reduzir levemente SÓ o gráfico, não a legend ---------- */
    .recharts-surface,
    .google-visualization-chart svg {
      transform: scale(0.90);
      transform-origin: center center;
    }
    @media (max-width: 640px) {
      .recharts-surface,
      .google-visualization-chart svg {
        transform: scale(0.84);
      }
    }
  `;

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
                  {isAdmin() ? (
                    <Shield className="w-4 h-4 text-gray-500" />
                  ) : (
                    <User className="w-4 h-4 text-gray-500" />
                  )}
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
        <main className="p-3 sm:p-6 lg:p-8 max-w-full overflow-x-auto md:overflow-x-visible">
          {/* CSS que move a legend p/ o canto e oculta labels ao redor do gráfico */}
          <style dangerouslySetInnerHTML={{ __html: sideLegendCSS }} />
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
