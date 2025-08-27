// frontend/src/admin/Finance.jsx
// Drop-in: substitui seu arquivo atual.
// Implementa o novo modelo de campos, máscaras de data, export CSV/PDF embutido,
// tabela, gráficos e PATCH de status.

import React, { useEffect, useMemo, useState } from 'react';
import api from '@/services/api';

// shadcn/ui – use os que você já tem no projeto
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
import { Separator } from '@/components/ui/separator.jsx';

// Ícones (lucide-react)
import { Download, FileDown, PencilLine as Edit, Plus, Trash2, X } from 'lucide-react';

// Charts
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

import { format } from 'date-fns';

// =================== Constantes ===================
const TX_PATH = '/api/transactions';

const emptyForm = {
  id: '',
  type: 'entrada',
  date: '',
  action_text: '',
  category: '',
  status: 'Pendente',
  client_text: '',
  material_text: '',
  amount: '',
  notes: '',
};

// =================== Utils ===================

const BRL = (v) =>
  (Number(v || 0)).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });

const isYMD = (s) => /^\d{4}-\d{2}-\d{2}/.test(String(s || ''));

const maskDateBR = (value) => {
  const v = String(value || '').replace(/\D/g, '').slice(0, 8);
  const a = [];
  if (v.length >= 2) a.push(v.slice(0, 2));
  if (v.length >= 4) a.push(v.slice(2, 4));
  if (v.length > 4) a.push(v.slice(4, 8));
  return a.join('/');
};

const fixDateInput = (s) => {
  // aceita dd/mm/aaaa ou yyyy-mm-dd e devolve dd/mm/aaaa
  if (!s) return '';
  const str = String(s);
  if (isYMD(str)) {
    const [y, m, d] = str.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  return maskDateBR(str);
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

const clampMoney = (s) => {
  if (s === '' || s === null || s === undefined) return '';
  const clean = String(s).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const n = Number(clean);
  if (!Number.isFinite(n)) return '';
  return n.toFixed(2);
};

const statusTone = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'pago') return 'success';
  if (s === 'cancelado') return 'destructive';
  return 'secondary';
};

const typeTone = (type) => {
  const t = String(type || '').toLowerCase();
  if (t === 'entrada' || t === 'receber') return 'success';
  return 'destructive';
};

// =================== Componente ===================

const Finance = () => {
  const [transactions, setTransactions] = useState([]);
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
      const { data } = await api.get(TX_PATH);
      setTransactions(Array.isArray(data) ? data : []);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Criação/Edição
  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  };

  const openEdit = (tx) => {
    setEditing(tx);
    setForm({
      id: tx.id,
      type: tx.type || 'entrada',
      date: fixDateInput(tx.date),
      action_text: fixDateInput(tx.action_text),
      category: tx.category || '',
      status: tx.status || 'Pendente',
      client_text: tx.client_text || '',
      material_text: tx.material_text || '',
      amount: String(tx.amount ?? ''),
      notes: tx.notes || '',
    });
    setOpen(true);
  };

  const onFormChange = (e) => {
    const { name, value } = e.target;
    if (name === 'date' || name === 'action_text') {
      setForm((f) => ({ ...f, [name]: maskDateBR(value) }));
    } else if (name === 'amount') {
      setForm((f) => ({ ...f, [name]: value }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        date: brToISO(form.date),
        action_text: brToISO(form.action_text) || form.action_text || '',
        amount: clampMoney(form.amount),
      };
      delete payload.id;

      if (editing?.id) {
        await api.put(`${TX_PATH}/${editing.id}`, payload);
      } else {
        await api.post(TX_PATH, payload);
      }
      setOpen(false);
      await loadAll();
    } catch (e) {
      alert('Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este lançamento?')) return;
    try {
      await api.delete(`${TX_PATH}/${id}`);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch {
      alert('Não foi possível excluir.');
    }
  };

  // Filtro/Busca
  const filtered = useMemo(() => {
    let list = [...transactions];

    if (typeFilter !== 'todos') list = list.filter((t) => String(t.type || '').toLowerCase() === typeFilter);

    if (monthFilter !== 'todos') {
      const [y, m] = monthFilter.split('-').map((x) => Number(x));
      list = list.filter((t) => {
        const s = String(t.date || '');
        if (!isYMD(s)) return false;
        const yy = Number(s.slice(0, 4));
        const mm = Number(s.slice(5, 7));
        return yy === y && mm === m;
      });
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) =>
        [
          t.category,
          t.status,
          t.client_text,
          t.material_text,
          t.notes,
          t.type,
          isoToBR(String(t.date || '').slice(0, 10)),
          isoToBR(String(t.action_text || '').slice(0, 10)),
        ]
          .join(' ')
          .toLowerCase()
          .includes(q),
      );
    }

    return list;
  }, [transactions, typeFilter, monthFilter, search]);

  // KPIs
  const totalEntrada = filtered.filter((t) => (t.type || '').toLowerCase() === 'entrada').reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalSaida = filtered.filter((t) => (t.type || '').toLowerCase() !== 'entrada').reduce((s, t) => s + Number(t.amount || 0), 0);
  const saldo = totalEntrada - totalSaida;

  // Export
  const exportRows = useMemo(() => filtered.map((t) => {
    const venc = isoToBR(String(t.date || '').slice(0, 10)) || '';
    const rawPag = String(t.action_text || '');
    const pagamento = isYMD(rawPag) ? isoToBR(rawPag.slice(0, 10)) : (rawPag || '');
    return {
      vencimento: venc,
      pagamento,
      tipo: t.type || '',
      categoria: t.category || '',
      status: t.status || 'Pendente',
      meio_pagamento: t.client_text || '',
      juros: t.material_text || '',
      valor: Number(t.amount || 0),
      observacoes: t.notes || '',
    };
  }), [filtered]);

  const exportCSV = () => {
    const headers = ['Vencimento', 'Pagamento', 'Tipo', 'Categoria', 'Status', 'Meio de Pagamento', 'Juros', 'Valor', 'Obs.'];
    const lines = [headers.join(';')]
      .concat(
        exportRows.map((r) =>
          [
            r.vencimento,
            r.pagamento,
            r.tipo,
            r.categoria,
            r.status,
            r.meio_pagamento,
            r.juros,
            r.valor.toString().replace('.', ','),
            r.observacoes?.replaceAll(';', ','),
          ].join(';'),
        ),
      )
      .join('\n');

    const blob = new Blob([lines], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transacoes-${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();
      doc.text('Transações', 14, 16);

      autoTable(doc, {
        startY: 22,
        styles: { fontSize: 8 },
        head: [['Vencimento', 'Pagamento', 'Tipo', 'Categoria', 'Status', 'Meio Pag.', 'Juros', 'Valor', 'Obs.']],
        body: exportRows.map((r) => [
          r.vencimento,
          r.pagamento,
          r.tipo,
          r.categoria,
          r.status,
          r.meio_pagamento,
          r.juros,
          BRL(r.valor),
          r.observacoes,
        ]),
      });

      doc.save(`transacoes-${format(new Date(), 'yyyyMMdd-HHmmss')}.pdf`);
    } catch {
      alert('Falha ao exportar PDF');
    }
  };

  // =================== UI ===================

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Entradas</CardTitle>
            <CardDescription>Receitas registradas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{BRL(totalEntrada)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saídas/Despesas</CardTitle>
            <CardDescription>Gastos registrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{BRL(totalSaida)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saldo</CardTitle>
            <CardDescription>Entradas - Saídas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{BRL(saldo)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Entradas vs Saídas</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Entradas', valor: totalEntrada },
                  { name: 'Saídas', valor: totalSaida },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => BRL(v)} />
                <Tooltip formatter={(v) => BRL(v)} />
                <Bar dataKey="valor" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gastos por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={Object.entries(
                    filtered
                      .filter((t) => String(t.type || '').toLowerCase() !== 'entrada')
                      .reduce((acc, t) => {
                        const k = t.category || '—';
                        acc[k] = (acc[k] || 0) + Number(t.amount || 0);
                        return acc;
                      }, {}),
                  ).map(([name, value]) => ({ name, value }))}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                  label={(e) => `${e.name} (${BRL(e.value)})`}
                >
                  {filtered.map((_, idx) => (
                    <Cell key={idx} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip formatter={(v) => BRL(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Transações */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Transações</CardTitle>
            <CardDescription>Gerencie entradas, saídas e despesas</CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="entrada">Entradas</SelectItem>
                <SelectItem value="saida">Saídas</SelectItem>
                <SelectItem value="despesa">Despesas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Todos os meses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os meses</SelectItem>
                {Array.from({ length: 12 }).map((_, i) => {
                  const d = new Date();
                  const y = d.getFullYear();
                  const m = String(i + 1).padStart(2, '0');
                  return (
                    <SelectItem key={m} value={`${y}-${m}`}>
                      {`${m}/${y}`}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Button variant="secondary" onClick={() => { setSearch(''); setTypeFilter('todos'); setMonthFilter('todos'); }}>
              <X className="size-4 mr-2" />
              Limpar Filtros
            </Button>

            <Button onClick={openNew}>
              <Plus className="size-4 mr-2" />
              Novo Lançamento
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative grow">
              <Input
                placeholder="Buscar transações..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={exportCSV}><Download className="size-4 mr-2" /> Exportar CSV</Button>
            <Button variant="outline" onClick={exportPDF}><FileDown className="size-4 mr-2" /> Exportar PDF</Button>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Vencimento</TableHead>
                  <TableHead className="text-center">Pagamento</TableHead>
                  <TableHead className="text-center">Tipo</TableHead>
                  <TableHead className="text-center">Categoria</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Meio de Pagamento</TableHead>
                  <TableHead className="text-center">Juros</TableHead>
                  <TableHead className="text-center">Valor</TableHead>
                  <TableHead className="text-center">Obs.</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => {
                  const typeColor = typeTone(t.type);
                  const statusVariant = statusTone(t.status);

                  const venc = isoToBR(String(t.date || '').slice(0, 10)) || '—';
                  const rawPag = String(t.action_text || '');
                  const pagamento = isYMD(rawPag) ? isoToBR(rawPag.slice(0, 10)) : (rawPag || '—');

                  return (
                    <TableRow key={t.id}>
                      <TableCell className="text-center">{venc}</TableCell>
                      <TableCell className="text-center">{pagamento}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={typeColor} className="capitalize">{t.type}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{t.category || '—'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={statusVariant}>{t.status || 'Pendente'}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{t.client_text || '—'}</TableCell>
                      <TableCell className="text-center">{t.material_text || '—'}</TableCell>
                      <TableCell className="text-center font-medium">{BRL(t.amount)}</TableCell>
                      <TableCell className="text-center">{t.notes || '—'}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(t)}><Edit className="size-4" />Editar</Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(t.id)}><Trash2 className="size-4" />Excluir</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                      Nenhuma transação encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="text-sm text-muted-foreground">
            Total: {filtered.length} | Entradas: <span className="text-emerald-600">{BRL(totalEntrada)}</span> | Saídas: <span className="text-red-600">{BRL(totalSaida)}</span> | Saldo: <span className="text-emerald-700 font-semibold">{BRL(saldo)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                    <SelectItem value="despesa">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Vencimento</Label>
                <Input
                  name="date"
                  placeholder="dd/mm/aaaa"
                  value={form.date}
                  onChange={onFormChange}
                  inputMode="numeric"
                />
              </div>

              <div>
                <Label>Pagamento</Label>
                <Input
                  name="action_text"
                  placeholder="dd/mm/aaaa ou texto"
                  value={form.action_text}
                  onChange={onFormChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label>Categoria</Label>
                <Input name="category" value={form.category} onChange={onFormChange} />
              </div>

              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pago">Pago</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Meio de Pagamento</Label>
                <Input name="client_text" value={form.client_text} onChange={onFormChange} placeholder="PIX, TED, Boleto..." />
              </div>

              <div>
                <Label>Juros</Label>
                <Input name="material_text" value={form.material_text} onChange={onFormChange} placeholder="Ex.: 2% a.m." />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label>Valor</Label>
                <Input
                  name="amount"
                  value={form.amount}
                  onChange={onFormChange}
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </div>
              <div className="md:col-span-3">
                <Label>Observações</Label>
                <Textarea name="notes" value={form.notes} onChange={onFormChange} rows={2} />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Finance;
