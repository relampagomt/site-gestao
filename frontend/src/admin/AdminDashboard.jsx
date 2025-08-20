// frontend/src/admin/AdminDashboard.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

import {
  LogOut,
  User,
  Shield,
  Settings,
  Users as UsersIcon,
  UserCog,
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

  /* ===== CSS GLOBAL (legenda fixa + esconder rótulos ao redor) ===== */
  const fixedLegendCSS = `
    /* Evitar clipping geral */
    .recharts-wrapper,
    .google-visualization-chart,
    .google-visualization-chart svg { overflow: visible !important; }

    /* Reserva de espaço do lado direito para a lista fixa */
    .chart-has-fixed-legend {
      position: relative !important;
      padding-right: 240px !important;
      box-sizing: border-box;
      min-height: 260px;
    }
    @media (max-width: 640px){
      .chart-has-fixed-legend { padding-right: 190px !important; }
    }

    /* Caixa da lista fixa */
    .chart-fixed-legend {
      position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
      width: 220px; max-width: 40vw; max-height: calc(100% - 20px);
      overflow-y: auto; padding-right: 4px;
    }
    .chart-fixed-legend ul { list-style: none; padding: 0; margin: 0; }
    .chart-fixed-legend li { display: flex; align-items: center; gap: 8px; margin: 4px 0; line-height: 1.2; word-break: break-word; }
    .chart-fixed-legend .swatch { width: 10px; height: 10px; border-radius: 2px; flex: 0 0 auto; border: 1px solid rgba(0,0,0,.1); }
    .chart-fixed-legend .label { font-size: 12px; }

    /* Esconder rótulos que "circulam" o gráfico (Recharts e Google Pie) — a lista lateral assume o papel */
    .recharts-pie-label-text, .recharts-pie-label-line { display: none !important; }
    .google-visualization-piechart svg text { display: none !important; }
  `;

  /* ===== LÓGICA: gerar lista fixa para Google Charts e Recharts ===== */
  const observerRef = useRef(null);

  useEffect(() => {
    if (activeTab !== 'dashboard') return;

    const SELECTOR_CHART_WRAPPERS = [
      '.recharts-wrapper',
      '.google-visualization-chart',
      '.google-visualization-piechart',
    ].join(',');

    const sanitize = (s) => (s || '').replace(/\s+/g, ' ').trim();

    const extractPercent = (txt) => {
      const m = sanitize(txt).match(/(\d+(?:[.,]\d+)?)\s*%/);
      if (!m) return null;
      const num = Number(m[1].replace(',', '.'));
      return isNaN(num) ? null : num;
    };

    // — GOOGLE CHARTS (ex.: "Segmentos (Clientes)") —
    const extractItemsForGoogle = (wrap) => {
      // 1) Tenta pegar os rótulos visuais do SVG (labels ao redor do pie)
      const labels = Array.from(wrap.querySelectorAll('svg text'))
        .map((t) => sanitize(t.textContent))
        .filter(Boolean)
        .filter((t) => /%/.test(t));   // só itens que têm percentual

      // Dedup
      const unique = Array.from(new Set(labels));

      // Ordena por % decrescente para ficar mais legível
      unique.sort((a, b) => (extractPercent(b) ?? 0) - (extractPercent(a) ?? 0));

      // Cor: nem sempre é confiável obter do SVG; deixamos sem cor ou usamos um fallback neutro
      return unique.map((txt) => ({ text: txt, color: '#999' }));
    };

    // — RECHARTS —
    const extractItemsForRecharts = (wrap) => {
      const labels = Array.from(wrap.querySelectorAll('.recharts-pie-label-text'))
        .map((n) => sanitize(n.textContent))
        .filter(Boolean);

      const unique = Array.from(new Set(labels));
      unique.sort((a, b) => (extractPercent(b) ?? 0) - (extractPercent(a) ?? 0));

      // Se conseguirmos pegar algumas cores de setores, melhor; senão usa neutro
      const sectorPaths = Array.from(wrap.querySelectorAll('.recharts-pie-sector path[fill]'));
      const colors = sectorPaths.map((p) => p.getAttribute('fill')).filter(Boolean);
      return unique.map((txt, i) => ({ text: txt, color: colors[i % colors.length] || '#999' }));
    };

    const buildLegend = (wrap) => {
      // Limpa / reconstrói sempre (gráficos podem redesenhar)
      wrap.querySelector('.chart-fixed-legend')?.remove();
      wrap.classList.add('chart-has-fixed-legend');

      let items = [];
      if (wrap.matches('.google-visualization-chart, .google-visualization-piechart')) {
        items = extractItemsForGoogle(wrap);
      } else if (wrap.matches('.recharts-wrapper')) {
        items = extractItemsForRecharts(wrap);
      }

      if (!items.length) return;

      const box = document.createElement('div');
      box.className = 'chart-fixed-legend';
      const ul = document.createElement('ul');

      items.forEach(({ text, color }) => {
        const li = document.createElement('li');

        const sw = document.createElement('span');
        sw.className = 'swatch';
        sw.style.background = color || '#999';

        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = text;

        li.appendChild(sw);
        li.appendChild(label);
        ul.appendChild(li);
      });

      box.appendChild(ul);
      wrap.appendChild(box);
    };

    const scanAll = () => {
      const wrappers = document.querySelectorAll(SELECTOR_CHART_WRAPPERS);
      wrappers.forEach((w) => buildLegend(w));
    };

    // Primeira varredura
    scanAll();

    // Observa mudanças para reconstruir quando os gráficos redesenharem
    const obs = new MutationObserver(() => {
      scanAll();
    });

    obs.observe(document.body, { childList: true, subtree: true });
    observerRef.current = obs;

    return () => {
      obs.disconnect();
      observerRef.current = null;
    };
  }, [activeTab]);

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
                  {isAdmin() ? <Shield className="w-4 h-4 text-gray-500" /> : <User className="w-4 h-4 text-gray-500" />}
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
          <style dangerouslySetInnerHTML={{ __html: fixedLegendCSS }} />
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
