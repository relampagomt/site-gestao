// frontend/src/admin/components/ServiceDistributionChart.jsx
import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { metricsService } from '@/services/api';

const PALETTE = {
  'Panfletagem Residencial': '#dc2626',  // vermelho
  'Sinaleiros/Pedestres': '#ea580c',     // laranja
  'Eventos Estratégicos': '#ca8a04',     // dourado
  'Ações Promocionais': '#16a34a',       // verde
  'Outros': '#64748b',                   // cinza
};

export default function ServiceDistributionChart() {
  const [loading, setLoading] = useState(true);
  const [dist, setDist] = useState({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await metricsService.getServiceDistribution();
        if (alive) setDist(data || {});
      } catch (e) {
        console.error('Erro ao carregar distribuição de serviços', e);
        if (alive) setDist({});
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const chartData = useMemo(() => {
    const entries = Object.entries(dist);
    if (!entries.length) return [];
    return entries
      .filter(([, v]) => typeof v === 'number' && v >= 0)
      .map(([name, value]) => ({
        name,
        value,
        color: PALETTE[name] || PALETTE['Outros'],
      }))
      .sort((a, b) => b.value - a.value);
  }, [dist]);

  const total = useMemo(
    () => chartData.reduce((acc, cur) => acc + cur.value, 0),
    [chartData]
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-6 w-56 bg-gray-200 rounded mb-2 animate-pulse" />
        <div className="h-4 w-72 bg-gray-100 rounded mb-6 animate-pulse" />
        <div className="h-52 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  if (!chartData.length || total === 0) {
    return (
      <div className="p-6">
        <h3 className="font-semibold text-lg">Distribuição de Serviços</h3>
        <p className="text-sm text-gray-500 mb-4">Percentual de cada tipo de serviço</p>
        <div className="text-sm text-gray-500">Sem dados suficientes para exibir o gráfico.</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h3 className="font-semibold text-lg">Distribuição de Serviços</h3>
      <p className="text-sm text-gray-500 mb-4">Percentual de cada tipo de serviço</p>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius="45%"
              outerRadius="70%"
              paddingAngle={2}
            >
              {chartData.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => {
                const v = Number(value || 0);
                const pct = total ? Math.round((v / total) * 100) : 0;
                return [`${v} (${pct}%)`, name];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* legenda simples */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {chartData.map(({ name, value, color }) => {
          const pct = total ? Math.round((value / total) * 100) : 0;
          return (
            <div key={name} className="flex items-center gap-2 text-sm">
              <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: color }} />
              <span className="text-gray-700">{name}</span>
              <span className="ml-auto text-gray-500">{value} ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
