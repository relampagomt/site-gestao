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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx';
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

/* =============== Helpers =============== */
const BRL = (n) =>
  `R$ ${Number(n || 0)
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

const COLORS = ['#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#2563eb', '#7c3aed'];

const monthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d
    .toLocaleString('pt-BR', { month: 'short' })
    .replace('.', '')
    .replace(/^\w/, (c) => c.toUpperCase());
};
const monthLabelFull = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  const mon = d
    .toLocaleString('pt-BR', { month: 'short' })
    .replace('.', '')
    .replace(/^\w/, (c) => c.toUpperCase());
  return `${mon}/${y}`;
};

/* ======== Datas BR ↔ ISO ======== */
const isDMY = (s) => /^\d{2}\/\d{2}\/\d{4}$/.test(String(s || ''));
const isYMD = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

const isoToBR = (iso) => {
  if (!isYMD(iso)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const brToISO = (br) => {
  if (!isDMY(br)) return '';
  const [d, m, y] = br.split('/');
  return `${y}-${m}-${d}`;
};

const maskBR = (v) => {
  const d = String(v || '').replace(/\D/g, '').slice(0, 8);
  const p1 = d.slice(0, 2);
  const p2 = d.slice(2, 4);
  const p3 = d.slice(4, 8);
  return [p1, p2, p3].filter(Boolean).join('/');
};

/* ======== Endpoint ======== */
const TX_PATH = '/transactions';

/* =============== Página =============== */
const Finance = () => {
  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // filtros
  const [q, setQ] = useState('');
  const [selectedActions, setSelectedActions] = useState([]); // ids
  const [monthFilter, setMonthFilter] = useState(''); // '' = todos, senão 'YYYY-MM'

  // modal criar/editar
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null); // objeto da transação sendo editada ou null

  const todayISO = new Date().toISOString().slice(0, 10);
  const todayBR = isoToBR(todayISO);

  const emptyForm = {
    type: 'entrada', // entrada | saida | despesa
    dateBr: todayBR,
    amount: '',
    category: '',
    notes: '',
    action_id: '',
  };
  const [form, setForm] = useState(emptyForm);

  /* -------- Load -------- */
  const loadAll = async () => {
    setLoading(true);
    try {
      const [aRes, tRes] = await Promise.all([
        api.get('/actions').catch(() => ({ data: [] })),
        api.get(TX_PATH).catch(() => ({ data: [] })),
      ]);
      const arr = (d) => (Array.isArray(d) ? d : d?.items || d?.data || d?.results || []);
      setActions(arr(aRes.data));
      setTransactions(arr(tRes.data));
    } catch (err) {
      console.error('Erro ao carregar finanças:', err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadAll();
  }, []);

  /* -------- Month options (puxa dos lançamentos) -------- */
  const monthOptions = useMemo(() => {
    const set = new Set();
    transactions.forEach((t) => {
      const ymd = String(t.date || '').slice(0, 10);
      if (isYMD(ymd)) set.add(ymd.slice(0, 7));
    });
    const arr = Array.from(set.values()).sort((a, b) => b.localeCompare(a)); // desc
    return arr.map((k) => ({ key: k, label: monthLabelFull(k) }));
  }, [transactions]);

  /* -------- Filtered -------- */
  const filtered = useMemo(() => {
    let list = Array.isArray(transactions) ? [...transactions] : [];

    if (monthFilter) {
      list = list.filter((t) => {
        const ymd = String(t.date || '').slice(0, 10);
        return isYMD(ymd) && ymd.startsWith(monthFilter);
      });
    }

    if (selectedActions.length) list = list.filter((t) => selectedActions.includes(t.action_id));

    const k = q.trim().toLowerCase();
    if (k)
      list = list.filter((t) =>
        [t.category, t.type, t.notes, t.amount].filter(Boolean).some((v) => String(v).toLowerCase().includes(k)),
      );

    list.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    return list;
  }, [transactions, selectedActions, q, monthFilter]);

  /* -------- Charts data -------- */
  const monthly = useMemo(() => {
    const buckets = new Map(); // yyyy-mm => {month, entrada, saida}
    filtered.forEach((t) => {
      const ymd = String(t.date || '').slice(0, 10);
      if (!isYMD(ymd)) return;
      const key = ymd.slice(0, 7);
      if (!buckets.has(key)) buckets.set(key, { month: monthLabel(key), entrada: 0, saida: 0 });
      const row = buckets.get(key);
      const amt = Number(t.amount || 0);
      if (t.type === 'entrada') row.entrada += amt;
      else row.saida += amt;
    });
    return Array.from(buckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, v]) => v);
  }, [filtered]);

  const actionsStatusChart = useMemo(() => {
    const counts = { aguardando: 0, andamento: 0, concluída: 0, cancelada: 0 };
    actions.forEach((a) => {
      const s = String(a.status || (a.active ? 'andamento' : 'aguardando')).toLowerCase();
      if (s.includes('cancel')) counts.cancelada += 1;
      else if (s.includes('conclu')) counts.concluída += 1;
      else if (s.includes('andam') || a.active) counts.andamento += 1;
      else counts.aguardando += 1;
    });
    return [
      { name: 'Aguardando', value: counts.aguardando, color: '#f59e0b' },
      { name: 'Andamento', value: counts.andamento, color: '#2563eb' },
      { name: 'Concluída', value: counts.concluída, color: '#16a34a' },
      { name: 'Cancelada', value: counts.cancelada, color: '#dc2626' },
    ].filter((d) => d.value > 0);
  }, [actions]);

  /* -------- Form handlers -------- */
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
        actionId: form.action_id || null, // compat
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

  /* -------- Popover: selecionar ações -------- */
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
      <PopoverContent align="start" className="p-0 w-[min(92vw,560px)] max-h-[70vh] overflow-hidden">
        <div className="max-h-[60vh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <Command>
            <CommandInput placeholder="Buscar ação..." />
            <CommandEmpty>Nenhuma ação encontrada.</CommandEmpty>
            <CommandList className="max-h-none">
              <CommandGroup heading="Ações">
                {actions.map((a) => {
                  const checked = selectedActions.includes(a.id);
                  const label = a.client_name || a.company_name || `Ação ${a.id}`;
                  return (
                    <CommandItem key={a.id} value={label} className="flex items-center gap-2" onSelect={() => toggleAction(a.id)}>
                      <Checkbox checked={checked} onCheckedChange={() => toggleAction(a.id)} />
                      <span className="flex-1">{label}</span>
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

  /* -------- Totais -------- */
  const totalEntrada = filtered.filter((t) => t.type === 'entrada').reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalSaida = filtered.filter((t) => t.type !== 'entrada').reduce((s, t) => s + Number(t.amount || 0), 0);
  const saldo = totalEntrada - totalSaida;

  /* -------- Render -------- */
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">Finanças</h1>
      </div>

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
            <p className="text-xs text-muted-foreground">Pagamentos e custos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-xl sm:text-2xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>{BRL(saldo)}</div>
            <p className="text-xs text-muted-foreground">Entradas - Saídas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros + Novo lançamento */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Registros</CardTitle>
          <CardDescription>Lista de lançamentos financeiros</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Controles padronizados */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por categoria, valor, observação..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            {/* Filtro por mês */}
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background w-[160px]"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            >
              <option value="">Todos os meses</option>
              {monthOptions.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>

            {/* Filtro por ações */}
            <ActionsSelector />

            {/* Botão Novo Lançamento */}
            <Dialog open={open} onOpenChange={(v) => { if (!v) { setEditing(null); setForm(emptyForm); } setOpen(v); }}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  <span className="whitespace-nowrap">Novo Lançamento</span>
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-lg p-0">
                <div className="max-h-[80vh] overflow-y-auto p-6">
                  <DialogHeader className="pb-2">
                    <DialogTitle>{editing ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle>
                    <DialogDescription>Registre ou atualize uma entrada, saída ou despesa.</DialogDescription>
                  </DialogHeader>

                  <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>Tipo</Label>
                        <select
                          name="type"
                          value={form.type}
                          onChange={onChange}
                          className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                        >
                          <option value="entrada">Entrada</option>
                          <option value="saida">Saída</option>
                          <option value="despesa">Despesa</option>
                        </select>
                      </div>

                      <div>
                        <Label>Data</Label>
                        <Input
                          name="dateBr"
                          placeholder="DD/MM/AAAA"
                          inputMode="numeric"
                          value={form.dateBr}
                          onChange={onDateBRChange}
                          required
                        />
                      </div>

                      <div>
                        <Label>Valor</Label>
                        <Input type="number" step="0.01" name="amount" value={form.amount} onChange={onChange} required />
                      </div>

                      <div>
                        <Label>Categoria</Label>
                        <Input name="category" value={form.category} onChange={onChange} placeholder="Ex.: Mídia, Produção..." />
                      </div>

                      <div className="md:col-span-2">
                        <Label>Ação vinculada (opcional)</Label>
                        <select
                          name="action_id"
                          value={form.action_id || ''}
                          onChange={(e) => setForm((f) => ({ ...f, action_id: e.target.value || null }))}
                          className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                        >
                          <option value="">—</option>
                          {actions.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.client_name || a.company_name || `Ação ${a.id}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <Label>Observações</Label>
                        <Textarea name="notes" rows={3} value={form.notes} onChange={onChange} />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditing(null); setForm(emptyForm); }}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={saving}>
                        {saving ? 'Salvando...' : 'Salvar'}
                      </Button>
                    </div>
                  </form>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Data</TableHead>
                  <TableHead className="text-center">Tipo</TableHead>
                  <TableHead className="text-center">Categoria</TableHead>
                  <TableHead className="text-center">Ação</TableHead>
                  <TableHead className="text-center">Valor</TableHead>
                  <TableHead className="text-center">Obs.</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Carregando…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum lançamento encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((t) => {
                    const ac = actions.find((a) => a.id === t.action_id);
                    const label = ac ? ac.client_name || ac.company_name || `Ação ${ac.id}` : '—';
                    return (
                      <TableRow key={t.id || `${t.date}-${t.amount}-${t.category}`}>
                        <TableCell className="text-center">{isoToBR(String(t.date || '').slice(0, 10)) || '—'}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={t.type === 'entrada' ? 'secondary' : 'outline'} className="capitalize">
                            {t.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{t.category || '—'}</TableCell>
                        <TableCell className="text-center">{label}</TableCell>
                        <TableCell className="text-center">{BRL(t.amount)}</TableCell>
                        <TableCell className="text-center">
                          {t.notes ? <span className="line-clamp-1 max-w-[260px] inline-block">{t.notes}</span> : '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button size="sm" variant="secondary" className="min-h-[32px] gap-1" onClick={() => openEdit(t)}>
                              <Edit className="h-4 w-4" />
                              Editar
                            </Button>
                            <Button size="sm" variant="destructive" className="min-h-[32px] gap-1" onClick={() => handleDelete(t.id)}>
                              <Trash2 className="h-4 w-4" />
                              Excluir
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Fluxo de Caixa: barras agrupadas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Fluxo de Caixa por Mês</CardTitle>
            <CardDescription>Entradas x Saídas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v, k) => [BRL(v), k === 'entrada' ? 'Entradas' : 'Saídas']} />
                <Legend />
                <Bar dataKey="entrada" name="Entradas" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="saida" name="Saídas" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status das Ações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Status das Ações</CardTitle>
            <CardDescription>Ativas/Andamento, Concluídas, Aguardando e Canceladas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={actionsStatusChart}
                  cx="50%"
                  cy="50%"
                  dataKey="value"
                  outerRadius={90}
                  labelLine={false}
                  label={({ name, percent }) => (percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : '')}
                >
                  {actionsStatusChart.map((e, i) => (
                    <Cell key={e.name} fill={e.color || COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Finance;
