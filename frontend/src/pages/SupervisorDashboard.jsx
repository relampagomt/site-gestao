import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  LogOut, 
  User, 
  Users, 
  Package, 
  Activity, 
  Briefcase,
  Home,
  Menu,
  X
} from 'lucide-react';
import api from '../services/api';
import Clients from '../admin/Clients';
import Materials from '../admin/Materials';
import Actions from '../admin/Actions';
import Vacancies from '../admin/Vacancies';

const SupervisorDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    clients: 0,
    materials: 0,
    actions: 0,
    vacancies: 0,
    loading: true
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true }));
      
      const [clientsRes, materialsRes, actionsRes, vacanciesRes] = await Promise.all([
        api.get('/clients').catch(() => ({ data: [] })),
        api.get('/materials').catch(() => ({ data: [] })),
        api.get('/actions').catch(() => ({ data: [] })),
        api.get('/job-vacancies').catch(() => ({ data: [] }))
      ]);

      setDashboardData({
        clients: clientsRes.data?.length || 0,
        materials: materialsRes.data?.length || 0,
        actions: actionsRes.data?.length || 0,
        vacancies: vacanciesRes.data?.length || 0,
        loading: false
      });
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      setDashboardData(prev => ({ ...prev, loading: false }));
    }
  };

  const handleLogout = () => {
    logout();
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'clients', label: 'Clientes', icon: Users, component: Clients },
    { id: 'materials', label: 'Materiais', icon: Package, component: Materials },
    { id: 'actions', label: 'Ações', icon: Activity, component: Actions },
    { id: 'vacancies', label: 'Vagas', icon: Briefcase, component: Vacancies },
  ];

  const ActiveComponent = menuItems.find(item => item.id === activeTab)?.component;

  const DashboardContent = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Supervisor</h1>
        <p className="text-gray-600">Bem-vindo ao painel de controle, {user?.name}!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.loading ? (
                <div className="animate-pulse bg-gray-200 h-6 w-8 rounded"></div>
              ) : (
                dashboardData.clients
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Gerencie seus clientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Materiais</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.loading ? (
                <div className="animate-pulse bg-gray-200 h-6 w-8 rounded"></div>
              ) : (
                dashboardData.materials
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Controle de materiais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ações</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.loading ? (
                <div className="animate-pulse bg-gray-200 h-6 w-8 rounded"></div>
              ) : (
                dashboardData.actions
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Campanhas ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vagas</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.loading ? (
                <div className="animate-pulse bg-gray-200 h-6 w-8 rounded"></div>
              ) : (
                dashboardData.vacancies
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Oportunidades de emprego
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Funcionalidades do Supervisor</CardTitle>
          <CardDescription>
            Como supervisor, você pode:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Cadastrar novos clientes</span>
              <Badge>Disponível</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Registrar materiais</span>
              <Badge>Disponível</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Criar ações promocionais</span>
              <Badge>Disponível</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Gerenciar vagas de emprego</span>
              <Badge>Disponível</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Editar dados (limitado)</span>
              <Badge variant="secondary">Limitado</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Excluir registros</span>
              <Badge variant="outline">Apenas Admin</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <h1 className="text-xl font-bold text-red-600">Relâmpago</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="mt-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center px-6 py-3 text-left hover:bg-gray-50 transition-colors ${
                  activeTab === item.id ? 'bg-red-50 text-red-600 border-r-2 border-red-600' : 'text-gray-700'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Header */}
        <header className="bg-white border-b shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden mr-4"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <h2 className="text-xl font-semibold text-gray-900">
                  {menuItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
                </h2>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{user?.name}</span>
                  <Badge variant="secondary">Supervisor</Badge>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLogout}
                  className="flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {ActiveComponent ? <ActiveComponent /> : <DashboardContent />}
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default SupervisorDashboard;

