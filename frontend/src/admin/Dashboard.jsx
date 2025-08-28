// frontend/src/admin/Dashboard.jsx
import RecentActivities from "./RecentActivities.jsx";
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

/* ===== Legend lateral fixa (compacta e rolável) ===== */
const SideLegend = ({ data = [], maxHeight = 200 }) => {
  const total = (data || []).reduce((acc, d) => acc + (Number(d.value) || 0), 0) || 1;
  return (
    <div className="overflow-y-auto pr-1" style={{ maxHeight }}>
      <ul className="space-y-1">
        {data.map((d, idx) => {
          const pct = Math.round(((Number(d.value) || 0) / total) * 100);
          const color = d.color || COLORS[idx % COLORS.length];
          return (
            <li key={idx} className="flex items-center gap-2">
              <span
                className="inline-block rounded-sm border border-black/10"
                style={{ width: 9, height: 9, background: color }}
              />
              <span className="truncate text-[11px] sm:text-xs leading-tight">
                {d.name} {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

/* ===== Hook: detectar mobile ===== */
const useIsMobile = (breakpoint = 640) => {
  const get = () => (typeof window !== 'undefined' ? window.innerWidth < breakpoint : false);
  const [isMobile, setIsMobile] = useState(get);
  useEffect(() => {
    const onResize = () => setIsMobile(get());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return isMobile;
};

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
    maxSlices = 12,
    minPercent = 0.03,
    labelOthers = 'Outros'
  } = opts;

  const entries = [...map.entries()]
    .map(([name, value]) => ({ name, value: Number(value) || 0 }))
    .filter(e => e.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = entries.reduce((acc, e) => acc + e.value, 0) || 1;
  const withPct = entries.map(e => ({ ...e, percent: e.value / total }));

  const keep = withPct.filter(e => e.percent >= minPercent);
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

  const data = keep.map((e, idx) => ({
    name: e.name,
    value: e.value,
    color: COLORS[idx % COLORS.length],
  }));

  const restTotal = rest.reduce((acc, e) => acc + e.value, 0);
  if (restTotal > 0) {
    data.push({
      name: `${labelOthers} (${rest.length})`,
      value: restTotal,
      color: '#9ca3af',
    });
  }

  return data;
}

/* ================= componente ================= */
const Dashboard = () => {
  const { isAdmin } = useAuth();
  const isMobile = useIsMobile();

  // Dimensões responsivas (~45% menores no mobile)
  const lineBarHeight = isMobile ? 125 : 230; // 230 * 0.55 ≈ 126
  const pieHeight = isMobile ? 130 : 240;     // 240 * 0.55 ≈ 132
  const pieOuterR = isMobile ? 44 : 80;       // 80 * 0.55 ≈ 44
  const legendMaxH = isMobile ? 120 : 200;
  const legendWClass = isMobile ? 'w-36' : 'w-44 sm:w-52';

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
        api.get('/vacancies').catch(() => ({ data: [] })),
        Promise.resolve({ data: [] })
      ]);

      const clients = Array.isArray(clientsRes.data) ? clientsRes.data : [];
      const actions = Array.isArray(actionsRes.data) ? actionsRes.data : [];
      const materials = Array.isArray(materialsRes.data) ? materialsRes.data : [];
      const vacancies = Array.isArray(vacanciesRes.data) ? vacanciesRes.data : [];

      setStats({
        totalClients: clients.length,
        totalMaterials: materials.length,
        totalActions: actions.length,
        totalVacancies: vacancies.length,
        loading: false
      });

      setClientsArr(clients);
      setActionsArr(actions);

      const lastActions = actions
        .slice()
        .sort((a, b) => new Date(b.created_at || b.start_date || 0) - new Date(a.created_at || a.start_date || 0))
        .slice(0, 6)
        .map((a, idx) => ({
          id: a.id || idx,
          text: a.client_name || a.company_name || a.title || 'Ação criada',
          date: a.created_at || a.start_date || a.updated_at || '',
        }));
      setRecentActivities(lastActions);

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
    // TOP 10 (sem limiar), resto em "Outros"
    return buildPieDataFromMap(map, { maxSlices: 10, minPercent: 0, labelOthers: 'Outros' });
  }, [clientsArr]);

  const actionTypesPie = useMemo(() => {
    const map = new Map();
    for (const a of actionsArr) {
      const raw = String(a?.type || '').trim();
      const arr = raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : Array.isArray(a?.types) ? a.types : [];
      for (const t of arr) map.set(t, (map.get(t) || 0) + 1);
    }
    return buildPieDataFromMap(map, { maxSlices: 10, minPercent: 0.03, labelOthers: 'Outros' });
  }, [actionsArr]);

  const hasRevenue = useMemo(
    () => monthlyData.some(d => (d.receita || 0) > 0),
    [monthlyData]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold">Dashboard</h2>
        </div>
      </div>

      {/* Cards de KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {stats.loading ? <div className="animate-pulse bg-gray-200 h-6 w-16 rounded" /> : stats.totalClients}
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
            <p className="text-xs text-muted-foreground">Vagas cadastradas</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos de linha/barras */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Receita e Campanhas</CardTitle>
            <CardDescription>Últimos meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={lineBarHeight}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) =>
                    name === 'receita'
                      ? [`R$ ${Number(value || 0).toLocaleString('pt-BR')}`, 'Receita']
                      : [value, 'Campanhas']
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
            <ResponsiveContainer width="100%" height={lineBarHeight}>
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
              <CardDescription>Percentual por segmento cadastrado nos clientes (Top 10)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height={pieHeight}>
                    <PieChart>
                      <Pie
                        data={clientsSegmentsPie}
                        cx="50%"
                        cy="50%"
                        outerRadius={pieOuterR}
                        labelLine={false}
                        label={false}
                        dataKey="value"
                      >
                        {clientsSegmentsPie.map((entry, idx) => (
                          <Cell key={`cseg-${idx}`} fill={entry.color || COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n, p) => [v, p?.payload?.name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className={legendWClass}>
                  <SideLegend data={clientsSegmentsPie} maxHeight={legendMaxH} />
                </div>
              </div>
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
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={pieHeight}>
                  <PieChart>
                    <Pie
                      data={actionTypesPie}
                      cx="50%"
                      cy="50%"
                      outerRadius={pieOuterR}
                      labelLine={false}
                      label={false}
                      dataKey="value"
                    >
                      {actionTypesPie.map((entry, idx) => (
                        <Cell key={`atype-${idx}`} fill={entry.color || COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n, p) => [v, p?.payload?.name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className={legendWClass}>
                <SideLegend data={actionTypesPie} maxHeight={legendMaxH} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Atividades Recentes (substituído pelo componente com modal + histórico paginado)
          Footer sem botão "Ver todo o histórico" */}
      <RecentActivities showFooterHistory={false} />
    </div>
  );
};

export default Dashboard;
