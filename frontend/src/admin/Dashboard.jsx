import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Activity, Briefcase, Package, Target, Users } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import api from '@/services/api';

const COLORS = ['#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#2563eb', '#7c3aed'];

function monthKey(d) {
  // chave AAAA-MM
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  return `${y}-${m}`;
}
function monthLabelPT(d) {
  return d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '').replace(/^\w/, c => c.toUpperCase());
}
function lastNMonths(n = 6) {
  const out = [];
  const base = new Date();
  base.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setMonth(d.getMonth() - i);
    out.push(d);
  }
  return out;
}

/** Fallbacks calculando a partir das ações */
function buildMonthlyFromActions(actions, monthsDates) {
  const buckets = Object.fromEntries(monthsDates.map(d => [monthKey(d), { month: monthLabelPT(d), campanhas: 0, receita: 0 }]));
  actions.forEach(a => {
    const rawDate = a.date || a.start_date || a.created_at || a.updated_at;
    if (!rawDate) return;
    const dt = new Date(rawDate);
    if (isNaN(dt)) return;
    const key = monthKey(new Date(dt.getFullYear(), dt.getMonth(), 1));
    if (!buckets[key]) return;
    buckets[key].campanhas += 1;
    // se houver orçamento/valor na ação, some como "receita" (opcional)
    const val = Number(a.budget || a.amount || a.value || 0);
    if (!Number.isNaN(val)) buckets[key].receita += val;
  });
  return Object.values(buckets);
}

function buildDistributionFromActions(actions) {
  const map = new Map();
  actions.forEach(a => {
    const t = (a.service_type || a.type || a.category || a.action_type || 'Outro').toString();
    map.set(t, (map.get(t) || 0) + 1);
  });
  return Array.from(map.entries()).map(([name, value], idx) => ({
    name,
    value,
    color: COLORS[idx % COLORS.length],
  }));
}

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalClients: 0,
    totalMaterials: 0,
    totalActions: 0,
    totalVacancies: 0,
    loading: true
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [serviceData, setServiceData] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setStats(prev => ({ ...prev, loading: true }));

      const monthsDates = lastNMonths(6);

      const [
        clientsRes, materialsRes, actionsRes, vacanciesRes,
        distRes, monthlyRes
      ] = await Promise.all([
        api.get('/clients').catch(() => ({ data: [] })),
        api.get('/materials').catch(() => ({ data: [] })),
        api.get('/actions').catch(() => ({ data: [] })),
        api.get('/job-vacancies').catch(() => ({ data: [] })),
        api.get('/metrics/service-distribution').catch(() => ({ data: null })),
        api.get('/metrics/monthly-campaigns').catch(() => ({ data: null })),
      ]);

      const clients = clientsRes.data || [];
      const materials = materialsRes.data || [];
      const actions = actionsRes.data || [];
      const vacancies = vacanciesRes.data || [];

      // contadores
      setStats({
        totalClients: clients.length,
        totalMaterials: materials.length,
        totalActions: actions.length,
        totalVacancies: vacancies.length,
        loading: false
      });

      // atividades recentes simples
      const activities = [];
      if (clients.length > 0) activities.push({ id: 'c', action: 'Cliente cadastrado', client: clients.at(-1)?.name || 'Cliente', time: 'Recente' });
      if (actions.length > 0) activities.push({ id: 'a', action: 'Ação criada', client: actions.at(-1)?.client_name || 'Cliente', time: 'Recente' });
      if (materials.length > 0) activities.push({ id: 'm', action: 'Material registrado', client: materials.at(-1)?.client_name || 'Cliente', time: 'Recente' });
      if (vacancies.length > 0) activities.push({ id: 'v', action: 'Vaga publicada', client: vacancies.at(-1)?.company || 'Empresa', time: 'Recente' });
      setRecentActivities(activities);

      // distribuição (API -> fallback a partir das ações)
      if (Array.isArray(distRes.data?.distribution) && distRes.data.distribution.length) {
        const dist = distRes.data.distribution.map((d, i) => ({
          name: d.name ?? d.type ?? d.service ?? `Tipo ${i + 1}`,
          value: Number(d.count ?? d.value ?? 0),
          color: COLORS[i % COLORS.length]
        })).filter(d => d.value > 0);
        setServiceData(dist);
      } else {
        setServiceData(buildDistributionFromActions(actions));
      }

      // campanhas por mês (API -> fallback)
      if (Array.isArray(monthlyRes.data) && monthlyRes.data.length) {
        const normalized = monthlyRes.data.map((row, i) => ({
          month: row.month ?? row.label ?? monthLabelPT(monthsDates[i] || new Date()),
          campanhas: Number(row.campaigns ?? row.total ?? row.campanhas ?? 0),
          receita: Number(row.revenue ?? row.receita ?? 0),
        }));
        setMonthlyData(normalized);
      } else {
        setMonthlyData(buildMonthlyFromActions(actions, monthsDates));
      }

    } catch (err) {
      console.error('Erro ao buscar dados do dashboard:', err);
      setStats(prev => ({ ...prev, loading: false }));
      setMonthlyData([]);
      setServiceData([]);
    }
  };

  // título do gráfico de linha muda se houver receita > 0
  const hasRevenue = useMemo(
    () => monthlyData.some(d => (d.receita || 0) > 0),
    [monthlyData]
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight mb-4">Dashboard</h2>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {stats.loading ? <div className="animate-pulse bg-gray-200 h-6 w-16 rounded" /> : stats.totalClients.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Clientes cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Ações</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {stats.loading ? <div className="animate-pulse bg-gray-200 h-6 w-16 rounded" /> : stats.totalActions}
            </div>
            <p className="text-xs text-muted-foreground">Ações promocionais</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Materiais</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {stats.loading ? <div className="animate-pulse bg-gray-200 h-6 w-16 rounded" /> : stats.totalMaterials}
            </div>
            <p className="text-xs text-muted-foreground">Materiais registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vagas</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {stats.loading ? <div className="animate-pulse bg-gray-200 h-6 w-16 rounded" /> : stats.totalVacancies}
            </div>
            <p className="text-xs text-muted-foreground">Vagas disponíveis</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Linha: campanhas (e receita se houver) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">
              {hasRevenue ? 'Campanhas e Receita (últimos 6 meses)' : 'Campanhas por Mês (últimos 6 meses)'}
            </CardTitle>
            <CardDescription>Dados calculados a partir das ações</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v, k) => k === 'receita' ? [`R$ ${Number(v).toLocaleString()}`, 'Receita'] : [v, 'Campanhas']} />
                <Line type="monotone" dataKey="campanhas" stroke="#2563eb" strokeWidth={2} />
                {hasRevenue && <Line type="monotone" dataKey="receita" stroke="#dc2626" strokeWidth={2} />}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Barras: campanhas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Campanhas por Mês</CardTitle>
            <CardDescription>Número de campanhas realizadas</CardDescription>
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
        {/* Pizza: distribuição de serviços */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Distribuição de Serviços</CardTitle>
            <CardDescription>Percentual de cada tipo de serviço</CardDescription>
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
                  dataKey="value"
                >
                  {serviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
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
            <CardDescription>Últimas ações realizadas no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4">
                    <Activity className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className="text-sm font-medium leading-none">{activity.action}</p>
                      <p className="text-sm text-muted-foreground truncate">{activity.client}</p>
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground flex-shrink-0">{activity.time}</div>
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
