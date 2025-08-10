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
  Activity
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalClients: 1247,
    activeActions: 23,
    monthlyRevenue: 125000,
    completedCampaigns: 89
  });

  // Dados simulados para os gráficos
  const monthlyData = [
    { month: 'Jan', campanhas: 12, receita: 85000 },
    { month: 'Fev', campanhas: 19, receita: 95000 },
    { month: 'Mar', campanhas: 15, receita: 110000 },
    { month: 'Abr', campanhas: 22, receita: 125000 },
    { month: 'Mai', campanhas: 18, receita: 135000 },
    { month: 'Jun', campanhas: 25, receita: 150000 }
  ];

  const serviceData = [
    { name: 'Panfletagem Residencial', value: 35, color: '#dc2626' },
    { name: 'Sinaleiros/Pedestres', value: 28, color: '#ea580c' },
    { name: 'Eventos Estratégicos', value: 22, color: '#ca8a04' },
    { name: 'Ações Promocionais', value: 15, color: '#16a34a' }
  ];

  const recentActivities = [
    { id: 1, action: 'Nova campanha criada', client: 'Supermercado Central', time: '2 horas atrás' },
    { id: 2, action: 'Relatório gerado', client: 'Farmácia Popular', time: '4 horas atrás' },
    { id: 3, action: 'Cliente cadastrado', client: 'Loja de Roupas Fashion', time: '6 horas atrás' },
    { id: 4, action: 'Campanha finalizada', client: 'Restaurante Sabor', time: '1 dia atrás' }
  ];

  return (
    <div className="space-y-6">


      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.totalClients.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +12% em relação ao mês passado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ações Ativas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.activeActions}</div>
            <p className="text-xs text-muted-foreground">
              +3 novas esta semana
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">R$ {stats.monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +8% em relação ao mês passado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campanhas Concluídas</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.completedCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              Este mês
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
              {recentActivities.map((activity) => (
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
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo Rápido */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Resumo Executivo</CardTitle>
          <CardDescription>
            Visão geral do desempenho da empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-600">98.5%</div>
              <p className="text-sm text-muted-foreground">Taxa de Satisfação</p>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">15.2 dias</div>
              <p className="text-sm text-muted-foreground">Tempo Médio de Campanha</p>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-purple-600">2.3M</div>
              <p className="text-sm text-muted-foreground">Panfletos Distribuídos</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;


