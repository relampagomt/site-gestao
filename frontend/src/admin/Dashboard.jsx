// frontend/src/admin/Dashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Activity, Briefcase, Package, Target, Users } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import api from '@/services/api';
import { useAuth } from '../contexts/AuthContext';

const COLORS = ['#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#2563eb', '#7c3aed', '#0ea5e9', '#22c55e', '#f97316', '#e11d48'];

/* ================= helpers de data ================= */
function monthKey(d) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  return `${y}-${m}`;
}
function monthLabelPT(d) {
  return d
    .toLocaleString('pt-BR', { month: 'short' })
    .replace('.', '')
    .replace(/^\w/, c => c.toUpperCase());
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

/* ================= normalizadores ================= */
const splitComma = (s) =>
  String(s || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);

function ensureArrayTypes(item) {
  if (Array.isArray(item?.types)) return item.types.filter(Boolean);
  const cand = item?.service_type || item?.type || item?.category || item?.action_type || '';
  return typeof cand === 'string' && cand.trim() ? splitComma(cand) : [];
}

function ensureClientSegments(c) {
  if (Array.isArray(c?.segments)) return c.segments.filter(Boolean);
  if (typeof c?.segment === 'string') return splitComma(c.segment);
  if (typeof c?.segmentos === 'string') return splitComma(c.segmentos);
  return [];
}

/* ================= builders ================= */
function buildMonthlyFromActions(actions, monthsDates) {
  const buckets = Object.fromEntries(
    monthsDates.map(d => [monthKey(d), { month: monthLabelPT(d), campanhas: 0, receita: 0 }])
  );
  actions.forEach(a => {
    const rawDate = a.date || a.start_date || a.created_at || a.updated_at;
    if (!rawDate) return;
    const dt = new Date(rawDate);
    if (isNaN(dt)) return;
    const key = monthKey(new Date(dt.getFullYear(), dt.getMonth(), 1));
    if (!buckets[key]) return;
    buckets[key].campanhas += 1;
    const val = Number(a.budget || a.amount || a.value || 0);
    if (!Number.isNaN(val)) buckets[key].receita += val;
  });
  return Object.values(buckets);
}

/** ===== Pizza: dinâmica (top N + manter >= minPercent + "Outros (n)") ===== */
function buildPieDataFromMap(map, opts = {}) {
  const {
    maxSlices = 12,       // máximo de categorias visíveis
    minPercent = 0.03,    // mantém sempre >= 3%
    labelOthers = 'Outros'
  } = opts;

  const entries = [...map.entries()]
    .map(([name, value]) => ({ name, value: Number(value) || 0 }))
    .filter(e => e.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = entries.reduce((acc, e) => acc + e.value, 0) || 1;
  const withPct = entries.map(e => ({ ...e, percent: e.value / total }));

  // 1) tudo acima do limiar fica
  const keep = withPct.filter(e => e.percent >= minPercent);

  // 2) completa com as maiores restantes até atingir maxSlices (ou todas)
  const limit = Math.min(maxSlices, withPct.length);
  if (keep.length < limit) {
    for (const e of withPct) {
      if (!keep.some(k => k.name === e.name)) {
        keep.push(e);
        if (keep.length >= limit) break;
      }
    }
  }

  const keepNames = new Set(keep.map(e => e.name));
  const rest = withPct.filter(e => !keepNames.has(e.name));

  // monta dataset com paleta
  const data = keep.map((e, idx) => ({
    name: e.name,
    value: e.value,
    color: COLORS[idx % COLORS.length],
  }));

  if (rest.length) {
    const otherVal = rest.reduce((acc, e) => acc + e.value, 0);
    data.push({
      name: `${labelOthers} (${rest.length})`,
      value: otherVal,
      color: COLORS[data.length % COLORS.length],
    });
  }

  return data;
}

/* ================= componente ================= */
const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState({
    totalClients: 0,
    totalMaterials: 0,
    totalActions: 0,
    totalVacancies: 0,
    loading: true
  });

  const [clientsArr, setClientsArr] = useState([]);
  const [actionsArr, setActionsArr] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async () => {
    try {
      setStats(prev => ({ ...prev, loading: true }));

      const monthsDates = lastNMonths(6);

      const [
        clientsRes, materialsRes, actionsRes, vacanciesRes, monthlyRes
      ] = await Promise.all([
        api.get('/clients').catch(() => ({ data: [] })),
        api.get('/materials').catch(() => ({ data: [] })),
        api.get('/actions').catch(() => ({ data: [] })),
        api.get('/job-vacancies').catch(() => ({ data: [] })),
        api.get('/metrics/monthly-campaigns').catch(() => ({ data: null })),
      ]);

      const arr = d => (Array.isArray(d) ? d : (d?.items || d?.data || d?.actions || d?.results || []));
      const clients = arr(clientsRes.data);
      const materials = arr(materialsRes.data);
      const actions = arr(actionsRes.data);
      const vacancies = arr(vacanciesRes.data);

      // guardar para as pizzas
      setClientsArr(clients);
      setActionsArr(actions);

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
    }
  };

  // pizzas (derivadas do estado)
  const clientsSegmentsPie = useMemo(() => {
    const map = new Map();
    for (const c of clientsArr) {
      for (const seg of ensureClientSegments(c)) {
        map.set(seg, (map.get(seg) || 0) + 1);
      }
    }
    // manter ≥ 2% e até 12 fatias
    return buildPieDataFromMap(map, { maxSlices: 12, minPercent: 0.02, labelOthers: 'Outros' });
  }, [clientsArr]);

  const actionTypesPie = useMemo(() => {
    const map = new Map();
    for (const a of actionsArr) {
      const types = ensureArrayTypes(a);
      if (types.length === 0) {
        map.set('Outro', (map.get('Outro') || 0) + 1);
      } else {
        for (const t of types) map.set(t, (map.get(t) || 0) + 1);
      }
    }
    // manter ≥ 3% e até 12 fatias
    return buildPieDataFromMap(map, { maxSlices: 12, minPercent: 0.03, labelOthers: 'Outros' });
  }, [actionsArr]);

  const hasRevenue = useMemo(
    () => monthlyData.some(d => (d.receita || 0) > 0),
    [monthlyData]
  );

  // rótulo de pizza: só mostra ≥ 3% para evitar poluição visual
  const pieLabel = ({ name, percent }) => (percent >= 0.03 ? `${name} ${(percent * 100).toFixed(0)}%` : '');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">Dashboard</h1>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Client card - Admin only */}
        {isAdmin() && (
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
        )}

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

      {/* Linhas e Barras */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
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
                <Tooltip
                  formatter={(v, k) =>
                    k === 'receita'
                      ? [`R$ ${Number(v).toLocaleString()}`, 'Receita']
                      : [v, 'Campanhas']
                  }
                />
                <Line type="monotone" dataKey="campanhas" stroke="#2563eb" strokeWidth={2} />
                {hasRevenue && <Line type="monotone" dataKey="receita" stroke="#dc2626" strokeWidth={2} />}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

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

      {/* ===== DUAS PIZZAS ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Pizza 1: Segmentos (Clientes) - Admin only */}
        {isAdmin() && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Segmentos (Clientes)</CardTitle>
              <CardDescription>Percentual por segmento cadastrado nos clientes</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={clientsSegmentsPie}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    labelLine={false}
                    dataKey="value"
                    label={pieLabel}
                  >
                    {clientsSegmentsPie.map((entry, idx) => (
                      <Cell key={`cseg-${idx}`} fill={entry.color || COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n, p) => [v, p?.payload?.name]} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Pizza 2: Tipos de Ação */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Tipos de Ação</CardTitle>
            <CardDescription>Percentual por tipo (com suporte a múltiplos por ação)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={actionTypesPie}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  labelLine={false}
                  dataKey="value"
                  label={pieLabel}
                >
                  {actionTypesPie.map((entry, idx) => (
                    <Cell key={`atype-${idx}`} fill={entry.color || COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n, p) => [v, p?.payload?.name]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

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
  );
};

export default Dashboard;
