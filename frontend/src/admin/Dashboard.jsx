import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { 
  Users, 
  Target, 
  TrendingUp, 
  DollarSign,
  Calendar,
  MapPin,
  Award,
  Activity,
  Package,
  Briefcase
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import api from '@/services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalClients: 0,
    totalMaterials: 0,
    totalActions: 0,
    totalVacancies: 0,
    loading: true
  });

  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setStats(prev => ({ ...prev, loading: true }));
      
      const [clientsRes, materialsRes, actionsRes, vacanciesRes] = await Promise.all([
        api.get('/clients').catch(() => ({ data: [] })),
        api.get('/materials').catch(() => ({ data: [] })),
        api.get('/actions').catch(() => ({ data: [] })),
        api.get('/job-vacancies').catch(() => ({ data: [] }))
      ]);

      setStats({
        totalClients: clientsRes.data?.length || 0,
        totalMaterials: materialsRes.data?.length || 0,
        totalActions: actionsRes.data?.length || 0,
        totalVacancies: vacanciesRes.data?.length || 0,
        loading: false
      });

      // Criar atividades recentes baseadas nos dados reais
      const activities = [];
      
      if (clientsRes.data?.length > 0) {
        activities.push({
          id: 1,
          action: 'Cliente cadastrado',
          client: clientsRes.data[clientsRes.data.length - 1]?.name || 'Cliente',
          time: 'Recente'
        });
      }

      if (actionsRes.data?.length > 0) {
        activities.push({
          id: 2,
          action: 'Ação criada',
          client: actionsRes.data[actionsRes.data.length - 1]?.client_name || 'Cliente',
          time: 'Recente'
        });
      }

      if (materialsRes.data?.length > 0) {
        activities.push({
          id: 3,
          action: 'Material registrado',
          client: materialsRes.data[materialsRes.data.length - 1]?.client_name || 'Cliente',
          time: 'Recente'
        });
      }

      if (vacanciesRes.data?.length > 0) {
        activities.push({
          id: 4,
          action: 'Vaga publicada',
          client: vacanciesRes.data[vacanciesRes.data.length - 1]?.company || 'Empresa',
          time: 'Recente'
        });
      }

      setRecentActivities(activities);
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  // Dados simulados para os gráficos (mantidos para demonstração)
  const monthlyData = [
    { month: 'Jan', campanhas: 0, receita: 0 },
    { month: 'Fev', campanhas: 0, receita: 0 },
    { month: 'Mar', campanhas: 0, receita: 0 },
    { month: 'Abr', campanhas: 0, receita: 0 },
    { month: 'Mai', campanhas: 0, receita: 0 },
    { month: 'Jun', campanhas: stats.totalActions, receita: 0 }
  ];

  const serviceData = [
    { name: 'Panfletagem Residencial', value: 35, color: '#dc2626' },
    { name: 'Sinaleiros/Pedestres', value: 28, color: '#ea580c' },
    { name: 'Eventos Estratégicos', value: 22, color: '#ca8a04' },
    { name: 'Ações Promocionais', value: 15, color: '#16a34a' }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight mb-4">Dashboard</h2>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {stats.loading ? (
                <div className="animate-pulse bg-gray-200 h-6 w-16 rounded"></div>
              ) : (
                stats.totalClients.toLocaleString()
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Clientes cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Ações</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {stats.loading ? (
                <div className="animate-pulse bg-gray-200 h-6 w-16 rounded"></div>
              ) : (
                stats.totalActions
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Ações promocionais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Materiais</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {stats.loading ? (
                <div className="animate-pulse bg-gray-200 h-6 w-16 rounded"></div>
              ) : (
                stats.totalMaterials
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Materiais registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vagas</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {stats.loading ? (
                <div className="animate-pulse bg-gray-200 h-6 w-16 rounded"></div>
              ) : (
                stats.totalVacancies
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Vagas disponíveis
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Gráfico de Linha - Receita Mensal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Receita Mensal</CardTitle>
            <CardDescription>
              Evolução da receita nos últimos 6 meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`R$ ${value.toLocaleString()}`, 'Receita']} />
                <Line type="monotone" dataKey="receita" stroke="#dc2626" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Barras - Campanhas por Mês */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Campanhas por Mês</CardTitle>
            <CardDescription>
              Número de campanhas realizadas mensalmente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="campanhas" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Gráfico de Pizza - Distribuição de Serviços */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Distribuição de Serviços</CardTitle>
            <CardDescription>
              Percentual de cada tipo de serviço
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={serviceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {serviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Atividades Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Atividades Recentes</CardTitle>
            <CardDescription>
              Últimas ações realizadas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4">
                    <Activity className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className="text-sm font-medium leading-none">
                        {activity.action}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {activity.client}
                      </p>
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground flex-shrink-0">
                      {activity.time}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma atividade recente</p>
                  <p className="text-xs text-muted-foreground">Comece adicionando clientes, ações ou materiais</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;


