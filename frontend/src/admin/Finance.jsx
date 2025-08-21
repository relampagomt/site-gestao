// frontend/src/admin/Finance.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '@/services/api';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.jsx';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command.jsx';

import {
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Search,
  Edit,
  Trash2,
} from 'lucide-react';

import {
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';

import ExportMenu from '@/components/export/ExportMenu';

/* =================== Helpers =================== */
const BRL = (n) =>
  `R$ ${Number(n || 0)
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

const BRL_COMPACT = (n) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
    notation: 'compact',
  }).format(Number(n || 0));

const maskBR = (v) => {
  let clean = v.replace(/\D/g, '');
  if (clean.length >= 3) clean = clean.slice(0, 2) + '/' + clean.slice(2);
  if (clean.length >= 6) clean = clean.slice(0, 5) + '/' + clean.slice(5, 9);
  return clean;
};

const isoToBR = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

const brToISO = (br) => {
  if (!br || !/^\d{2}\/\d{2}\/\d{4}/.test(br)) return '';
  const [d, m, y] = br.split('/');
  return `${y}-${m}-${d}`;
};

const isYMD = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);

const emptyForm = {
  type: 'entrada',
  dateBr: '',
  amount: '',
  category: '',
  status: 'Pendente', // Pago | Pendente | Cancelado
  notes: '',
  action_text: '',
  client_text: '',
  material_text: '',
  // compat (itens antigos)
  action_id: '',
  client_id: '',
  material_id: '',
};

const TX_PATH = '/transactions';

// Cores
const COLORS = {
  entrada: '#16a34a',
  saida: '#dc2626',
  despesa: '#f59e0b',
};

// paleta fixa por categoria (pie)
const CATEGORY_PALETTE = [
  '#0ea5e9', '#8b5cf6', '#22c55e', '#f97316', '#14b8a6', '#ef4444',
  '#84cc16', '#06b6d4', '#a855f7', '#eab308', '#10b981', '#f43f5e',
  '#3b82f6', '#f59e0b', '#6366f1'
];
const hashStr = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};
const colorForCategory = (name='') => CATEGORY_PALETTE[ hashStr(name.toLowerCase()) % CATEGORY_PALETTE.length ];

/* =================== Componente =================== */
const Finance = () => {
  const [transactions, setTransactions] = useState([]);
  const [actions, setActions] = useState([]);     // só para rotular itens antigos (action_id)
  const [clients, setClients] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Filtros
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('todos');
  const [monthFilter, setMonthFilter] = useState('todos');

  // Load
  const loadAll = async () => {
    setLoading(true);
    try {
      const [txRes, actRes, cliRes, matRes] = await Promise.all([
        api.get(TX_PATH).catch(() => ({ data: [] })),
        api.get('/actions').catch(() => ({ data: [] })),
        api.get('/clients').catch(() => ({ data: [] })),
        api.get('/materials').catch(() => ({ data: [] })),
      ]);
      setTransactions(Array.isArray(txRes.data) ? txRes.data : []);
      setActions(Array.isArray(actRes.data) ? actRes.data : []);
      setClients(Array.isArray(cliRes.data) ? cliRes.data : (cliRes.data?.items || []));
      setMaterials(Array.isArray(matRes.data) ? matRes.data : (matRes.data?.items || []));
    } finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  // Resolvers para itens antigos
  const actionLabelById = (id) => actions.find((x) => String(x.id) === String(id))?.title || '';
  const clientLabelById = (id) => {
    const c = clients.find((x) => String(x.id) === String(id));
    return c ? (c.name || c.full_name || c.company_name || c.client_name) : '';
  };
  const materialLabelById = (id) => {
    const m = materials.find((x) => String(x.id) === String(id));
    if (!m) return '';
    const date = isoToBR(String(m.date || '').slice(0, 10));
    const client = m.client_name || m.client || '';
    const qty = (m.quantity ?? '') !== '' ? ` • Qtd: ${m.quantity}` : '';
    return [client, date].filter(Boolean).join(' — ') + qty;
  };

  // Filtrados
  const filtered = useMemo(() => {
    let list = [...transactions];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        [
          t.category, t.notes, String(t.amount),
          t.action_text, t.client_text, t.material_text,
          actionLabelById(t.action_id), clientLabelById(t.client_id), materialLabelById(t.material_id),
          t.status,
        ].filter(Boolean).some((f) => String(f).toLowerCase().includes(q))
      );
    }

    if (typeFilter !== 'todos') list = list.filter((t) => t.type === typeFilter);

    if (monthFilter !== 'todos') {
      const [y, m] = monthFilter.split('-');
      list = list.filter((t) => String(t.date || '').slice(0, 7) === `${y}-${m}`);
    }

    return list.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [transactions, search, typeFilter, monthFilter, actions, clients, materials]);

  // Opções de mês
  const monthOptions = useMemo(() => {
    const s = new Set();
    transactions.forEach((t) => {
      const ym = String(t.date || '').slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(ym)) s.add(ym);
    });
    return Array.from(s).sort().reverse().map((ym) => {
      const [y, m] = ym.split('-');
      const label = new Date(y, m - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return { value: ym, label };
    });
  }, [transactions]);

  // Charts
  const categoryChart = useMemo(() => {
    const map = {};
    filtered.forEach((t) => {
      if (t.type === 'entrada') return;           // ignora entradas
      const cat = t.category || 'Sem categoria';
      map[cat] = (map[cat] || 0) + Number(t.amount || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [filtered]);

  const monthlyChart = useMemo(() => {
    const months = {};
    filtered.forEach((t) => {
      const month = String(t.date || '').slice(0, 7) || '—';
      if (!months[month]) months[month] = { month, entrada: 0, saida: 0, despesa: 0 };
      if (t.type === 'entrada') months[month].entrada += Number(t.amount || 0);
      if (t.type === 'saida') months[month].saida += Number(t.amount || 0);
      if (t.type === 'despesa') months[month].despesa += Number(t.amount || 0);
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  }, [filtered]);

  // KPIs
  const totalEntrada = filtered.filter((t) => t.type === 'entrada').reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalSaida = filtered.filter((t) => t.type !== 'entrada').reduce((s, t) => s + Number(t.amount || 0), 0);
  const saldo = totalEntrada - totalSaida;

  // Export
  const exportData = useMemo(() => filtered.map((t) => ({
    data: isoToBR(String(t.date || '').slice(0, 10)) || '',
    tipo: t.type || '',
    categoria: t.category || '',
    status: t.status || 'Pendente',
    acao: t.action_text || actionLabelById(t.action_id) || '',
    cliente: t.client_text || clientLabelById(t.client_id) || '',
    material: t.material_text || materialLabelById(t.material_id) || '',
    valor: Number(t.amount || 0),
    observacoes: t.notes || '',
  })), [filtered, actions, clients, materials]);

  const exportColumns = [
    { key: 'data', header: 'Data' },
    { key: 'tipo', header: 'Tipo' },
    { key: 'categoria', header: 'Categoria' },
    { key: 'status', header: 'Status' },
    { key: 'acao', header: 'Ação' },
    { key: 'cliente', header: 'Cliente' },
    { key: 'material', header: 'Material' },
    { key: 'valor', header: 'Valor' },
    { key: 'observacoes', header: 'Observações' },
  ];

  const pdfOptions = {
    title: 'Relatório Financeiro',
    orientation: 'l',
    filtersSummary: `Filtros aplicados: ${
      [
        search ? `Busca: "${search}"` : '',
        typeFilter !== 'todos' ? `Tipo: ${typeFilter}` : '',
        monthFilter !== 'todos' ? `Mês: ${monthOptions.find(m => m.value === monthFilter)?.label || monthFilter}` : '',
      ].filter(Boolean).join(' | ') || 'Nenhum filtro aplicado'
    }`,
    columnStyles: {
      0: { cellWidth: 22 }, 1: { cellWidth: 22 }, 2: { cellWidth: 38 },
      3: { cellWidth: 22 }, 4: { cellWidth: 46 }, 5: { cellWidth: 60 },
      6: { cellWidth: 60 }, 7: { cellWidth: 26 }, 8: { cellWidth: 70 },
    },
    footerContent: `Totais do período: Entradas: ${BRL(totalEntrada)} | Saídas: ${BRL(totalSaida)} | Saldo: ${BRL(saldo)}`
  };

  // Handlers form
  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const onDateBRChange = (e) => setForm((f) => ({ ...f, dateBr: maskBR(e.target.value) }));

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (tx) => {
    setEditing(tx);
    setForm({
      type: tx.type || 'entrada',
      dateBr: isoToBR(String(tx.date || '').slice(0, 10)) || '',
      amount: String(tx.amount ?? ''),
      category: tx.category || '',
      status: tx.status || 'Pendente',
      notes: tx.notes || '',
      action_text: tx.action_text || '',
      client_text: tx.client_text || '',
      material_text: tx.material_text || '',
      action_id: tx.action_id || '',
      client_id: tx.client_id || '',
      material_id: tx.material_id || '',
    });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const dateISO = brToISO(form.dateBr);
      if (!isYMD(dateISO)) { alert('Data inválida. Use o formato DD/MM/AAAA.'); setSaving(false); return; }
      const payload = {
        type: form.type,
        date: dateISO,
        amount: Number(form.amount || 0),
        category: form.category || '',
        status: form.status || 'Pendente',
        notes: form.notes || '',
        action_text: form.action_text || '',
        client_text: form.client_text || '',
        material_text: form.material_text || '',
        // IDs antigos descontinuados
        action_id: null, client_id: null, material_id: null,
        actionId: null, clientId: null, materialId: null,
      };
      if (editing?.id) await api.put(`${TX_PATH}/${editing.id}`, payload);
      else await api.post(TX_PATH, payload);
      setOpen(false); setEditing(null); setForm(emptyForm); loadAll();
    } catch {
      alert('Não foi possível salvar. Verifique o backend de transações.');
    } finally { setSaving(false); }
  };

  const updateStatus = async (tx, newStatus) => {
    try {
      await api.patch?.(`${TX_PATH}/${tx.id}`, { status: newStatus }).catch(async () => {
        await api.put(`${TX_PATH}/${tx.id}`, { ...tx, status: newStatus });
      });
      setTransactions((prev) => prev.map((t) => (t.id === tx.id ? { ...t, status: newStatus } : t)));
    } catch {
      alert('Não foi possível atualizar o status.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este lançamento?')) return;
    try { await api.delete(`${TX_PATH}/${id}`); loadAll(); }
    catch { alert('Não foi possível excluir. Verifique o backend.'); }
  };

  /* =================== UI =================== */
  return (
    <div className="max-w-screen-2xl mx-auto px-3 md:px-6 py-4 md:py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">Finanças</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{BRL(totalEntrada)}</div>
            <p className="text-xs text-muted-foreground">Receitas registradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saídas/Despesas</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{BRL(totalSaida)}</div>
            <p className="text-xs text-muted-foreground">Gastos registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <TrendingUp className={`h-4 w-4 ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-xl sm:text-2xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {BRL(saldo)}
            </div>
            <p className="text-xs text-muted-foreground">Entradas - Saídas</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Gastos por Categoria</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryChart}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryChart.map((entry, i) => (
                    <Cell key={i} fill={colorForCategory(entry.name)} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => BRL(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Fluxo Mensal</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={monthlyChart}
                margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                barCategoryGap="20%"
                barGap={6}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis
                  tickFormatter={BRL_COMPACT}
                  domain={[0, (dataMax) => (dataMax || 0) * 1.15 + 1]}
                  allowDecimals={false}
                />
                <Tooltip formatter={(v) => BRL(v)} />
                <Legend />
                <Bar dataKey="entrada" name="Entradas" fill={COLORS.entrada} />
                <Bar dataKey="saida" name="Saídas" fill={COLORS.saida} />
                <Bar dataKey="despesa" name="Despesas" fill={COLORS.despesa} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Ações (search em cima) */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg md:text-xl font-semibold">Transações</CardTitle>
              <CardDescription>Gerencie entradas, saídas e despesas</CardDescription>
            </div>
            <div className="ml-auto">
              <ExportMenu data={exportData} columns={exportColumns} filename="financas" pdfOptions={pdfOptions} />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Linha 1: Search */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-10 pr-3"
              placeholder="Buscar transações..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Linha 2: filtros e ações (sem filtro por ações antigas) */}
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 items-center">
            <div className="w-full">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="todos">Todos os tipos</option>
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
                <option value="despesa">Despesa</option>
              </select>
            </div>

            <div className="w-full">
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="todos">Todos os meses</option>
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="w-full">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setSearch(''); setTypeFilter('todos'); setMonthFilter('todos'); }}
              >
                Limpar Filtros
              </Button>
            </div>

            <div className="w-full">
              <Button className="w-full gap-2" onClick={openCreate}>
                <Plus className="size-4" />
                Novo Lançamento
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Data</TableHead>
                  <TableHead className="text-center">Tipo</TableHead>
                  <TableHead className="text-center">Categoria</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Ação</TableHead>
                  <TableHead className="text-center">Cliente</TableHead>
                  <TableHead className="text-center">Material</TableHead>
                  <TableHead className="text-center">Valor</TableHead>
                  <TableHead className="text-center">Obs.</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8">Carregando…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8">Nenhuma transação encontrada.</TableCell></TableRow>
                ) : (
                  filtered.map((t) => {
                    const actionText = t.action_text || actionLabelById(t.action_id) || '—';
                    const clientText = t.client_text || clientLabelById(t.client_id) || '—';
                    const materialText = t.material_text || materialLabelById(t.material_id) || '—';
                    const typeColor = t.type === 'entrada' ? 'default' : t.type === 'saida' ? 'destructive' : 'secondary';
                    const statusVariant =
                      (t.status || 'Pendente') === 'Pago' ? 'default' :
                      (t.status || 'Pendente') === 'Cancelado' ? 'destructive' : 'secondary';

                    return (
                      <TableRow key={t.id}>
                        <TableCell className="text-center">{isoToBR(String(t.date || '').slice(0, 10))}</TableCell>
                        <TableCell className="text-center"><Badge variant={typeColor} className="capitalize">{t.type}</Badge></TableCell>
                        <TableCell className="text-center">{t.category || '—'}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Badge variant={statusVariant}>{t.status || 'Pendente'}</Badge>
                            <select
                              className="border rounded-md px-2 py-1 text-xs bg-background"
                              value={t.status || 'Pendente'}
                              onChange={(e) => updateStatus(t, e.target.value)}
                            >
                              <option>Pago</option>
                              <option>Pendente</option>
                              <option>Cancelado</option>
                            </select>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{actionText}</TableCell>
                        <TableCell className="text-center">{clientText}</TableCell>
                        <TableCell className="text-center">{materialText}</TableCell>
                        <TableCell className="text-center font-medium">{BRL(t.amount)}</TableCell>
                        <TableCell className="text-center">{t.notes || '—'}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => openEdit(t)}><Edit className="size-4" />Editar</Button>
                            <Button variant="destructive" size="sm" className="gap-2" onClick={() => handleDelete(t.id)}><Trash2 className="size-4" />Excluir</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-3 px-6 pb-6">
            Total: <strong>{filtered.length}</strong> transação(ões) | Entradas: <strong>{BRL(totalEntrada)}</strong> | Saídas: <strong>{BRL(totalSaida)}</strong> | Saldo: <strong className={saldo >= 0 ? 'text-green-600' : 'text-red-600'}>{BRL(saldo)}</strong>
          </p>
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog
        open={open}
        onOpenChange={(v) => { if (!v) { setEditing(null); setForm(emptyForm); } setOpen(v); }}
      >
        <DialogContent className="w-[95vw] sm:max-w-2xl p-0">
          <form onSubmit={submit} className="max-h-[80vh] flex flex-col">
            <div className="p-6 pb-2">
              <DialogHeader className="pb-2">
                <DialogTitle>{editing ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle>
                <DialogDescription>Registre uma entrada, saída ou despesa. Ação, Cliente e Material são texto livre; defina também o Status.</DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <select name="type" value={form.type} onChange={onChange} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                    <option value="despesa">Despesa</option>
                  </select>
                </div>
                <div>
                  <Label>Data</Label>
                  <Input name="dateBr" placeholder="DD/MM/AAAA" inputMode="numeric" value={form.dateBr} onChange={onDateBRChange} required />
                </div>
                <div>
                  <Label>Valor</Label>
                  <Input type="number" step="0.01" name="amount" value={form.amount} onChange={onChange} required />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Input name="category" value={form.category} onChange={onChange} placeholder="Ex.: Mídia, Produção..." />
                </div>
                <div>
                  <Label>Status</Label>
                  <select name="status" value={form.status} onChange={onChange} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                    <option>Pago</option>
                    <option>Pendente</option>
                    <option>Cancelado</option>
                  </select>
                </div>

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Ação (texto livre)</Label>
                    <Input name="action_text" value={form.action_text} onChange={onChange} placeholder="Ex.: Blitz Shopping, Campanha Setembro..." />
                  </div>
                  <div>
                    <Label>Cliente (texto livre)</Label>
                    <Input name="client_text" value={form.client_text} onChange={onChange} placeholder="Ex.: Supermercado Rio Branco" />
                  </div>
                  <div>
                    <Label>Material (texto livre)</Label>
                    <Input name="material_text" value={form.material_text} onChange={onChange} placeholder="Ex.: 3.000 panfletos" />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <Label>Observações</Label>
                  <Textarea name="notes" rows={3} value={form.notes} onChange={onChange} />
                </div>
              </div>
            </div>

            <div className="border-t bg-background px-6 py-3 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setOpen(false); setEditing(null); setForm(emptyForm); }}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Finance;
