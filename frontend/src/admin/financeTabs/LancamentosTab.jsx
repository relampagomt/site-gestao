
// frontend/src/admin/financeTabs/LancamentosTab.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '@/services/api';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.jsx';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command.jsx';

import {
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  Layers,
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

// Export (CSV/XLSX/PDF) menu
import ExportMenu from '@/components/export/ExportMenu';

/* =============== Helpers =============== */
const BRL = (n) =>
  `R$ ${Number(n || 0)
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

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
  notes: '',
  action_id: '',
  client_id: '',
  material_id: '',
};

const TX_PATH = '/transactions';

const LancamentosTab = () => {
  const [transactions, setTransactions] = useState([]);
  const [actions, setActions] = useState([]);
  const [clients, setClients] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('todos');
  const [monthFilter, setMonthFilter] = useState('todos');
  const [selectedActions, setSelectedActions] = useState([]);

  // Load data
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
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setTransactions([]);
      setActions([]);
      setClients([]);
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Label resolvers
  const actionLabelById = (id) => {
    const a = actions.find((x) => String(x.id) === String(id));
    return a ? (a.client_name || a.company_name || a.title || `Ação ${a.id}`) : '';
  };
  const clientLabelById = (id) => {
    const c = clients.find((x) => String(x.id) === String(id));
    return c ? (c.name || c.full_name || c.company_name || c.client_name || `Cliente ${c.id}`) : '';
  };
  const materialLabelById = (id) => {
    const m = materials.find((x) => String(x.id) === String(id));
    if (!m) return '';
    const date = isoToBR(String(m.date || '').slice(0, 10));
    const client = m.client_name || m.client || '';
    const qty = (m.quantity ?? '') !== '' ? ` • Qtd: ${m.quantity}` : '';
    return [client, date].filter(Boolean).join(' — ') + qty;
  };

  // Filtered data
  const filtered = useMemo(() => {
    let list = [...transactions];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        [t.category, t.notes, String(t.amount), actionLabelById(t.action_id), clientLabelById(t.client_id), materialLabelById(t.material_id)]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(q))
      );
    }

    if (typeFilter !== 'todos') {
      list = list.filter((t) => t.type === typeFilter);
    }

    if (monthFilter !== 'todos') {
      const [year, month] = monthFilter.split('-');
      list = list.filter((t) => String(t.date || '').slice(0, 7) === `${year}-${month}`);
    }

    if (selectedActions.length > 0) {
      const actionSet = new Set(selectedActions);
      list = list.filter((t) => actionSet.has(t.action_id));
    }

    list.sort((a, b) => String(b.date || '0000-01-01').localeCompare(String(a.date || '0000-01-01')));
    return list;
  }, [transactions, search, typeFilter, monthFilter, selectedActions, actions, clients, materials]);

  // Month options for filter
  const monthOptions = useMemo(() => {
    const months = new Set();
    transactions.forEach((t) => {
      const dateStr = String(t.date || '').slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(dateStr)) months.add(dateStr);
    });
    return Array.from(months)
      .sort()
      .reverse()
      .map((ym) => {
        const [y, m] = ym.split('-');
        const monthName = new Date(y, m - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return { value: ym, label: monthName };
      });
  }, [transactions]);

  // Charts
  const categoryChart = useMemo(() => {
    const counts = {};
    filtered.forEach((t) => {
      const cat = t.category || 'Sem categoria';
      counts[cat] = (counts[cat] || 0) + Number(t.amount || 0);
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filtered]);

  const monthlyChart = useMemo(() => {
    const months = {};
    filtered.forEach((t) => {
      const month = String(t.date || '').slice(0, 7);
      if (!months[month]) months[month] = { entrada: 0, saida: 0, despesa: 0 };
      months[month][t.type || 'entrada'] += Number(t.amount || 0);
    });
    return Object.entries(months)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);
  }, [filtered]);

  const actionsChart = useMemo(() => {
    const actionCounts = {};
    actions.forEach((a) => {
      const status = String(a.status || (a.active ? 'andamento' : 'aguardando')).toLowerCase();
      if (status.includes('cancel')) actionCounts.cancelada = (actionCounts.cancelada || 0) + 1;
      else if (status.includes('conclu')) actionCounts.concluída = (actionCounts.concluída || 0) + 1;
      else if (status.includes('andam') || a.active) actionCounts.andamento = (actionCounts.andamento || 0) + 1;
      else actionCounts.aguardando = (actionCounts.aguardando || 0) + 1;
    });
    return [
      { name: 'Aguardando', value: actionCounts.aguardando || 0, color: '#f59e0b' },
      { name: 'Andamento', value: actionCounts.andamento || 0, color: '#2563eb' },
      { name: 'Concluída', value: actionCounts.concluída || 0, color: '#16a34a' },
      { name: 'Cancelada', value: actionCounts.cancelada || 0, color: '#dc2626' },
    ].filter((d) => d.value > 0);
  }, [actions]);

  // Form handlers
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onDateBRChange = (e) => {
    const v = maskBR(e.target.value);
    setForm((f) => ({ ...f, dateBr: v }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (tx) => {
    setEditing(tx);
    setForm({
      type: tx.type || 'entrada',
      dateBr: isoToBR(String(tx.date || '').slice(0, 10)) || '',
      amount: String(tx.amount ?? ''),
      category: tx.category || '',
      notes: tx.notes || '',
      action_id: tx.action_id || '',
      client_id: tx.client_id || '',
      material_id: tx.material_id || '',
    });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const dateISO = brToISO(form.dateBr);
      if (!isYMD(dateISO)) {
        alert('Data inválida. Use o formato DD/MM/AAAA.');
        setSaving(false);
        return;
      }
      const payload = {
        type: form.type,
        date: dateISO,
        amount: Number(form.amount || 0),
        category: form.category || '',
        notes: form.notes || '',
        action_id: form.action_id || null,
        client_id: form.client_id || null,
        material_id: form.material_id || null,
        actionId: form.action_id || null,
        clientId: form.client_id || null,
        materialId: form.material_id || null,
      };

      if (editing?.id) {
        await api.put(`${TX_PATH}/${editing.id}`, payload);
      } else {
        await api.post(TX_PATH, payload);
      }

      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      loadAll();
    } catch (err) {
      console.error('Erro ao salvar transação:', err);
      alert('Não foi possível salvar. Verifique o backend de transações.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este lançamento?')) return;
    try {
      await api.delete(`${TX_PATH}/${id}`);
      loadAll();
    } catch (err) {
      console.error('Erro ao excluir transação:', err);
      alert('Não foi possível excluir. Verifique o backend.');
    }
  };

  // Actions selector (filtro)
  const [actionsOpen, setActionsOpen] = useState(false);
  const toggleAction = (id) =>
    setSelectedActions((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const ActionsSelector = () => (
    <Popover open={actionsOpen} onOpenChange={setActionsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          {selectedActions.length === 0 ? 'Filtrar por ações' : <span className="truncate">{selectedActions.length} selecionada(s)</span>}
          <Layers className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={8}
        collisionPadding={16}
        className="z-[100] p-0 w-[min(92vw,560px)]"
      >
        <div
          className="max-h-[60vh] overflow-y-auto overscroll-contain touch-pan-y [touch-action:pan-y] [-webkit-overflow-scrolling:touch]"
          onWheel={(e) => e.stopPropagation()}
          onWheelCapture={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <Command>
            <CommandInput placeholder="Buscar ação..." />
            <CommandEmpty>Nenhuma ação encontrada.</CommandEmpty>
            <CommandList className="max-h-none">
              <CommandGroup heading="Ações">
                {actions.map((a) => {
                  const checked = selectedActions.includes(a.id);
                  const label = actionLabelById(a.id);
                  return (
                    <CommandItem key={a.id} value={label} className="flex items-center gap-2" onSelect={() => toggleAction(a.id)}>
                      <Checkbox checked={checked} onCheckedChange={() => toggleAction(a.id)} />
                      <span className="flex-1 truncate">{label}</span>
                      {checked && <span className="text-xs text-muted-foreground">selecionada</span>}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      </PopoverContent>
    </Popover>
  );

  // Totais
  const totalEntrada = filtered.filter((t) => t.type === 'entrada').reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalSaida = filtered.filter((t) => t.type !== 'entrada').reduce((s, t) => s + Number(t.amount || 0), 0);
  const saldo = totalEntrada - totalSaida;

  // Export
  const exportData = useMemo(() => {
    return filtered.map((t) => ({
      data: isoToBR(String(t.date || '').slice(0, 10)) || '',
      tipo: t.type || '',
      categoria: t.category || '',
      acao: actionLabelById(t.action_id),
      cliente: clientLabelById(t.client_id),
      material: materialLabelById(t.material_id),
      valor: Number(t.amount || 0),
      observacoes: t.notes || '',
    }));
  }, [filtered, actions, clients, materials]);

  const exportColumns = [
    { key: 'data', header: 'Data' },
    { key: 'tipo', header: 'Tipo' },
    { key: 'categoria', header: 'Categoria' },
    { key: 'acao', header: 'Ação' },
    { key: 'cliente', header: 'Cliente' },
    { key: 'material', header: 'Material' },
    { key: 'valor', header: 'Valor' },
    { key: 'observacoes', header: 'Observações' },
  ];

  const pdfOptions = {
    title: 'Relatório de Lançamentos',
    orientation: 'l',
    filtersSummary: `Filtros aplicados: ${
      [
        search ? `Busca: "${search}"` : '',
        typeFilter !== 'todos' ? `Tipo: ${typeFilter}` : '',
        monthFilter !== 'todos' ? `Mês: ${monthOptions.find(m => m.value === monthFilter)?.label || monthFilter}` : '',
        selectedActions.length > 0 ? `Ações: ${selectedActions.length} selecionada(s)` : '',
      ].filter(Boolean).join(' | ') || 'Nenhum filtro aplicado'
    }`,
    columnStyles: {
      0: { cellWidth: 22 }, 1: { cellWidth: 22 }, 2: { cellWidth: 38 },
      3: { cellWidth: 46 }, 4: { cellWidth: 46 }, 5: { cellWidth: 60 },
      6: { cellWidth: 26 }, 7: { cellWidth: 70 },
    },
    footerContent: `Totais do período: Entradas: ${BRL(totalEntrada)} | Saídas: ${BRL(totalSaida)} | Saldo: ${BRL(saldo)}`
  };

  // Itens para selects do formulário
  const actionItems = useMemo(() => actions.map(a => ({ id: a.id, label: actionLabelById(a.id) })), [actions]);
  const clientItems = useMemo(() => clients.map(c => ({ id: c.id, label: clientLabelById(c.id) })), [clients]);
  const materialItems = useMemo(() => materials.map(m => ({ id: m.id, label: materialLabelById(m.id) })), [materials]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <p className="text-xs text-muted-foreground">Diferença entre entradas e saídas</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Categoria</CardTitle>
            <CardDescription>Valores por categoria (top 8)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryChart}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'][index % 8]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => BRL(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evolução Mensal</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v) => BRL(v)} />
                <Legend />
                <Bar dataKey="entrada" stackId="a" fill="#16a34a" name="Entradas" />
                <Bar dataKey="saida" stackId="a" fill="#dc2626" name="Saídas" />
                <Bar dataKey="despesa" stackId="a" fill="#f59e0b" name="Despesas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg md:text-xl font-semibold">Lançamentos</CardTitle>
              <CardDescription>Gerencie entradas, saídas e despesas</CardDescription>
            </div>
            <div className="ml-auto">
              <ExportMenu data={exportData} columns={exportColumns} filename="lancamentos" pdfOptions={pdfOptions} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3">
            <div className="relative w-full sm:w-[320px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar transações..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="w-full sm:w-[180px]">
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                <option value="todos">Todos os tipos</option>
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
                <option value="despesa">Despesa</option>
              </select>
            </div>

            <div className="w-full sm:w-[180px]">
              <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                <option value="todos">Todos os meses</option>
                {monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <div className="w-full sm:w-[180px]">
              <ActionsSelector />
            </div>

            <Button variant="outline" size="sm" onClick={() => { setSearch(''); setTypeFilter('todos'); setMonthFilter('todos'); setSelectedActions([]); }}>
              Limpar Filtros
            </Button>

            <Button size="sm" className="gap-2" onClick={openCreate}>
              <Plus className="size-4" />
              Novo Lançamento
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Data</TableHead>
                  <TableHead className="text-center">Tipo</TableHead>
                  <TableHead className="text-center">Categoria</TableHead>
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
                  <TableRow><TableCell colSpan={9} className="text-center py-8">Carregando…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8">Nenhuma transação encontrada.</TableCell></TableRow>
                ) : (
                  filtered.map((t) => {
                    const actionLabel = actionLabelById(t.action_id);
                    const clientLabel = clientLabelById(t.client_id);
                    const materialLabel = materialLabelById(t.material_id);
                    const typeColor = t.type === 'entrada' ? 'default' : t.type === 'saida' ? 'destructive' : 'secondary';

                    return (
                      <TableRow key={t.id}>
                        <TableCell className="text-center">{isoToBR(String(t.date || '').slice(0, 10))}</TableCell>
                        <TableCell className="text-center"><Badge variant={typeColor} className="capitalize">{t.type}</Badge></TableCell>
                        <TableCell className="text-center">{t.category || '—'}</TableCell>
                        <TableCell className="text-center">{actionLabel || '—'}</TableCell>
                        <TableCell className="text-center">{clientLabel || '—'}</TableCell>
                        <TableCell className="text-center">{materialLabel || '—'}</TableCell>
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

      {/* Create/Edit Modal */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) { setEditing(null); setForm(emptyForm); }
          setOpen(v);
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-2xl p-0">
          {/* Container do modal com altura fixa e layout colunar */}
          <form onSubmit={submit} className="max-h-[80vh] flex flex-col">
            {/* Cabeçalho (fora da área rolável) */}
            <div className="p-6 pb-2">
              <DialogHeader className="pb-2">
                <DialogTitle>{editing ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle>
                <DialogDescription>
                  Registre ou atualize uma entrada, saída ou despesa. Você pode vincular (opcionalmente) a uma Ação, a um Cliente e a um Material.
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Corpo rolável */}
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

                {/* Vinculações opcionais */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Ação (opcional)</Label>
                    <SearchSelect
                      items={[{ id: '', label: '—' }, ...actionItems]}
                      value={String(form.action_id || '')}
                      onChange={(v) => setForm((f) => ({ ...f, action_id: v || '' }))}
                      placeholder="Buscar ação..."
                    />
                  </div>
                  <div>
                    <Label>Cliente (opcional)</Label>
                    <SearchSelect
                      items={[{ id: '', label: '—' }, ...clientItems]}
                      value={String(form.client_id || '')}
                      onChange={(v) => setForm((f) => ({ ...f, client_id: v || '' }))}
                      placeholder="Buscar cliente..."
                    />
                  </div>
                  <div>
                    <Label>Material (opcional)</Label>
                    <SearchSelect
                      items={[{ id: '', label: '—' }, ...materialItems]}
                      value={String(form.material_id || '')}
                      onChange={(v) => setForm((f) => ({ ...f, material_id: v || '' }))}
                      placeholder="Buscar material..."
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <Label>Observações</Label>
                  <Textarea name="notes" rows={3} value={form.notes} onChange={onChange} />
                </div>
              </div>
            </div>

            {/* Rodapé fixo (fora da área rolável) */}
            <div className="border-t bg-background px-6 py-3 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setOpen(false); setEditing(null); setForm(emptyForm); }}
              >
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

/* ------------------------- Componentes Auxiliares ------------------------- */

const SearchSelect = ({ items, value, onChange, placeholder = 'Buscar...' }) => {
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => String(i.id) === String(value));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-between">
          <span className="truncate">{selected ? selected.label : '—'}</span>
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>

      {/* Abrir embaixo, com limite de altura e scroll interno */}
      <PopoverContent
        side="bottom"
        align="center"
        sideOffset={10}
        collisionPadding={12}
        className="z-[100] p-0 w-[min(92vw,520px)] max-h-[50vh] overflow-hidden"
      >
        <div
          className="max-h-[50vh] overflow-y-auto overscroll-contain touch-pan-y [touch-action:pan-y] [-webkit-overflow-scrolling:touch]"
          onWheel={(e) => e.stopPropagation()}
          onWheelCapture={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <Command>
            <CommandInput placeholder={placeholder} />
            <CommandEmpty>Nenhuma opção encontrada.</CommandEmpty>
            <CommandList className="max-h-none">
              <CommandGroup>
                {items.map((opt) => (
                  <CommandItem
                    key={String(opt.id)}
                    value={opt.label}
                    onSelect={() => { onChange(String(opt.id)); setOpen(false); }}
                    className="flex items-center gap-2 px-3 py-2"
                  >
                    <span className="truncate">{opt.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default LancamentosTab;

