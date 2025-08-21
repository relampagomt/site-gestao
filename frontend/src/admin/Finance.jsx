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
import { TrendingUp, ArrowDownCircle, ArrowUpCircle, Plus, Search, Edit, Trash2, Download } from 'lucide-react';

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

import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
  let clean = String(v || '').replace(/\D/g, '');
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

const isYMD = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '').slice(0, 10));

const emptyForm = {
  type: 'entrada',
  dueDateBr: '',     // Data de Vencimento (DD/MM/AAAA)
  payDateBr: '',     // Data de Pagamento (DD/MM/AAAA) - opcional
  paymentMethod: '', // Meio de Pagamento -> client_text
  interestRate: '',  // Taxa de Juros -> material_text
  amount: '',
  category: '',
  status: 'Pendente',
  invoiceNumber: '', // NOVO: Nota Fiscal
  notes: '',
  // retrocompat (leitura)
  action_text: '',
  client_text: '',
  material_text: '',
  action_id: '',
  client_id: '',
  material_id: '',
  invoice_number: ''
};

const TX_PATH = '/transactions';

// Cores
const COLORS = {
  entrada: '#16a34a',    // verde
  saida: '#dc2626',      // vermelho
  despesa: '#f59e0b',    // laranja/âmbar
  pendente: '#f59e0b',   // laranja para a coluna PENDENTE no gráfico
  cancelado: '#000000'   // preto para a coluna CANCELADO no gráfico
};

// paleta fixa por categoria (pie)
const CATEGORY_PALETTE = [
  '#0ea5e9', '#8b5cf6', '#22c55e', '#f97316', '#14b8a6', '#ef4444',
  '#84cc16', '#06b6d4', '#a855f7', '#eab308', '#10b981', '#f43f5e',
  '#3b82f6', '#f59e0b', '#6366f1'
];
const hashStr = (s) => { let h = 0; for (let i = 0; i < String(s).length; i++) h = (h * 31 + String(s).charCodeAt(i)) >>> 0; return h; };
const colorForCategory = (name='') => CATEGORY_PALETTE[ hashStr(String(name).toLowerCase()) % CATEGORY_PALETTE.length ];

/* =================== Componente =================== */
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
    } catch { setTransactions([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadAll(); }, []);

  // Filtrados + ordenação
  const filtered = useMemo(() => {
    let list = [...transactions];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        [
          t.category, t.notes, String(t.amount),
          t.action_text, t.client_text, t.material_text, t.status, t.type,
          t.invoice_number
        ].filter(Boolean).some((f) => String(f).toLowerCase().includes(q))
      );
    }

    if (typeFilter !== 'todos') list = list.filter((t) => t.type === typeFilter);

    if (monthFilter !== 'todos') {
      const [y, m] = monthFilter.split('-');
      list = list.filter((t) => String(t.date || '').slice(0, 7) === `${y}-${m}`);
    }

    // sort por date desc, id desc
    return list.sort((a, b) => {
      const da = String(a.date || '');
      const db = String(b.date || '');
      if (db !== da) return db.localeCompare(da);
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  }, [transactions, search, typeFilter, monthFilter]);

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
      if (t.type === 'entrada') return; // ignorar entradas
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
      if (!months[month]) months[month] = { month, entrada: 0, pendente: 0, cancelado: 0, saida: 0, despesa: 0 };

      const val = Number(t.amount || 0);
      if (t.type === 'entrada') {
        if ((t.status || 'Pendente') === 'Pago') months[month].entrada += val;
        else if ((t.status || 'Pendente') === 'Pendente') months[month].pendente += val;
        else if ((t.status || 'Pendente') === 'Cancelado') months[month].cancelado += val;
      } else if (t.type === 'saida') {
        months[month].saida += val;
      } else if (t.type === 'despesa') {
        months[month].despesa += val;
      }
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  }, [filtered]);

  // KPIs
  const totalEntrada = filtered.filter((t) => t.type === 'entrada' && (t.status || 'Pendente') === 'Pago').reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalSaida = filtered.filter((t) => t.type !== 'entrada').reduce((s, t) => s + Number(t.amount || 0), 0);
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
      nf: t.invoice_number ?? '',
      observacoes: t.notes || '',
    };
  }), [filtered]);

  const exportCSV = () => {
    const headers = ['Vencimento','Pagamento','Tipo','Categoria','Status','Meio de Pagamento','Juros','Valor','Nota Fiscal','Observações'];
    const body = exportRows.map(r => [
      r.vencimento, r.pagamento, r.tipo, r.categoria, r.status, r.meio_pagamento, r.juros, String(r.valor).replace('.', ','), r.nf, r.observacoes
    ]);
    const csv = [headers, ...body].map(row =>
      row.map(v => {
        let s = v == null ? '' : String(v);
        const needsQuotes = /[",;\n]/.test(s);
        s = s.replace(/"/g, '""');
        return needsQuotes ? `"${s}"` : s;
      }).join(';')
    ).join('\n');

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `financas.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt' });
    doc.setFontSize(14);
    doc.text('Relatório Financeiro', 40, 40);

    const totalLine = `Entradas (pagas): ${BRL(totalEntrada)} | Saídas: ${BRL(totalSaida)} | Saldo: ${BRL(saldo)}`;
    doc.setFontSize(10);
    doc.text(totalLine, 40, 60);

    const head = [['Vencimento','Pagamento','Tipo','Categoria','Status','Meio de Pagamento','Juros','Valor','Nota Fiscal','Observações']];
    const body = exportRows.map(r => [r.vencimento, r.pagamento, r.tipo, r.categoria, r.status, r.meio_pagamento, r.juros, BRL(r.valor), r.nf || '', r.observacoes]);

    // @ts-ignore
    doc.autoTable({
      head, body,
      startY: 80,
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [33, 33, 33] },
      columnStyles: {
        0: { cellWidth: 70 }, 1: { cellWidth: 70 }, 2: { cellWidth: 60 },
        3: { cellWidth: 110 }, 4: { cellWidth: 70 }, 5: { cellWidth: 110 },
        6: { cellWidth: 70 }, 7: { cellWidth: 70 }, 8: { cellWidth: 70 }, 9: { cellWidth: 180 },
      }
    });

    doc.save('financas.pdf');
  };

  // Handlers form
  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const onDueDateChange = (e) => setForm((f) => ({ ...f, dueDateBr: maskBR(e.target.value) }));
  const onPayDateChange = (e) => setForm((f) => ({ ...f, payDateBr: maskBR(e.target.value) }));

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (tx) => {
    const dueDateBr = isoToBR(String(tx.date || '').slice(0, 10)) || '';
    const action = String(tx.action_text || '');
    const payDateBr = isYMD(action) ? isoToBR(action.slice(0,10)) : '';
    setEditing(tx);
    setForm({
      type: tx.type || 'entrada',
      dueDateBr,
      payDateBr,
      paymentMethod: tx.client_text || '',
      interestRate: tx.material_text || '',
      amount: String(tx.amount ?? ''),
      category: tx.category || '',
      status: tx.status || 'Pendente',
      invoiceNumber: tx.invoice_number ?? '',
      notes: tx.notes || '',
      action_text: tx.action_text || '',
      client_text: tx.client_text || '',
      material_text: tx.material_text || '',
      action_id: tx.action_id || '',
      client_id: tx.client_id || '',
      material_id: tx.material_id || '',
      invoice_number: tx.invoice_number ?? ''
    });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const dateISO = brToISO(form.dueDateBr);
      if (!isYMD(dateISO)) { alert('Data de Vencimento inválida. Use DD/MM/AAAA.'); setSaving(false); return; }

      const payISO = brToISO(form.payDateBr);
      const payload = {
        type: form.type,
        date: dateISO, // vencimento
        action_text: isYMD(payISO) ? payISO : '', // pagamento opcional (ISO)
        client_text: form.paymentMethod || '',     // meio de pagamento
        material_text: form.interestRate || '',    // juros (string)
        amount: Number(form.amount || 0),
        category: form.category || '',
        status: form.status || 'Pendente',
        invoice_number: form.invoiceNumber || '',
        notes: form.notes || '',
        action_id: null, client_id: null, material_id: null,
      };

      if (editing?.id) await api.put(`${TX_PATH}/${editing.id}`, payload);
      else await api.post(TX_PATH, payload);

      setOpen(false); setEditing(null); setForm(emptyForm); loadAll();
    } catch {
      alert('Não foi possível salvar. Verifique o backend.');
    } finally { setSaving(false); }
  };

  const updateStatus = async (tx, newStatus) => {
    try {
      await api.patch(`${TX_PATH}/${tx.id}`, { status: newStatus });
      setTransactions((prev) => prev.map((t) => (t.id === tx.id ? { ...t, status: newStatus } : t)));
    } catch { alert('Não foi possível atualizar o status.'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este lançamento?')) return;
    try { await api.delete(`${TX_PATH}/${id}`); loadAll(); }
    catch { alert('Não foi possível excluir.'); }
  };

  /* =================== UI =================== */
  return (
    <div className="max-w-screen-2xl mx-auto px-3 md:px-6 py-4 md:py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">Finanças</h1>

        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={exportCSV}>
            <Download className="size-4" /> Exportar CSV
          </Button>
          <Button variant="outline" className="gap-2" onClick={exportPDF}>
            <Download className="size-4" /> Exportar PDF
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas (pagas)</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{BRL(totalEntrada)}</div>
            <p className="text-xs text-muted-foreground">Somente com status Pago</p>
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
            <p className="text-xs text-muted-foreground">Entradas (pagas) - Saídas/Despesas</p>
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
              <BarChart data={monthlyChart} margin={{ top: 10, right: 10, left: 0, bottom: 20 }} barCategoryGap="20%" barGap={6}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis
                  tickFormatter={(v) => (v === 0 ? 'R$ 0' : BRL_COMPACT(v))}
                  domain={[0, (dataMax) => (dataMax || 0) * 1.15 + 1]}
                  allowDecimals={false}
                />
                <Tooltip formatter={(v) => BRL(v)} />
                <Legend />
                <Bar dataKey="entrada" name="Entradas (pagas)" fill={COLORS.entrada} />
                <Bar dataKey="pendente" name="Pendente" fill={COLORS.pendente} />
                <Bar dataKey="cancelado" name="Cancelado" fill={COLORS.cancelado} />
                <Bar dataKey="saida" name="Saídas" fill={COLORS.saida} />
                <Bar dataKey="despesa" name="Despesas" fill={COLORS.despesa} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg md:text-xl font-semibold">Transações</CardTitle>
              <CardDescription>Gerencie entradas, saídas e despesas</CardDescription>
            </div>
            <div className="relative w-80 max-w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input className="pl-10 pr-3" placeholder="Buscar transações..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Vencimento</TableHead>
                  <TableHead className="text-center">Pagamento</TableHead>
                  <TableHead className="text-center">Tipo</TableHead>
                  <TableHead className="text-center">Categoria</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Nota Fiscal</TableHead>
                  <TableHead className="text-center">Meio de Pagamento</TableHead>
                  <TableHead className="text-center">Juros</TableHead>
                  <TableHead className="text-center">Valor</TableHead>
                  <TableHead className="text-center">Obs.</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8">Carregando…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8">Nenhuma transação encontrada.</TableCell></TableRow>
                ) : (
                  filtered.map((t) => {
                    const payRaw = String(t.action_text || '');
                    const pagamento = isYMD(payRaw) ? isoToBR(payRaw.slice(0,10)) : (payRaw || '—');

                    // status cores exigidas
                    const statusColor =
                      (t.status || 'Pendente') === 'Pago' ? 'bg-green-600 text-white' :
                      (t.status || 'Pendente') === 'Cancelado' ? 'bg-red-600 text-white' :
                      'bg-yellow-500 text-black';

                    // tipo visual
                    const typeBadge =
                      t.type === 'entrada' ? 'bg-green-600 text-white' :
                      t.type === 'saida' ? 'bg-red-600 text-white' : 'bg-amber-500 text-black';

                    return (
                      <TableRow key={t.id}>
                        <TableCell className="text-center">{isoToBR(String(t.date || '').slice(0, 10))}</TableCell>
                        <TableCell className="text-center">{pagamento}</TableCell>
                        <TableCell className="text-center">
                          <span className={`px-2 py-1 rounded text-xs capitalize ${typeBadge}`}>{t.type}</span>
                        </TableCell>
                        <TableCell className="text-center">{t.category || '—'}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs ${statusColor}`}>{t.status || 'Pendente'}</span>
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
                        <TableCell className="text-center">{t.invoice_number ?? '—'}</TableCell>
                        <TableCell className="text-center">{t.client_text || '—'}</TableCell>
                        <TableCell className="text-center">{t.material_text || '—'}</TableCell>
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
            Total: <strong>{filtered.length}</strong> | Entradas (pagas): <strong>{BRL(totalEntrada)}</strong> | Saídas: <strong>{BRL(totalSaida)}</strong> | Saldo: <strong className={saldo >= 0 ? 'text-green-600' : 'text-red-600'}>{BRL(saldo)}</strong>
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
                <DialogDescription>Datas no formato DD/MM/AAAA. Pagamento é opcional.</DialogDescription>
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

                {/* Datas lado a lado em md+ */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Data de Vencimento</Label>
                    <Input name="dueDateBr" placeholder="DD/MM/AAAA" inputMode="numeric" value={form.dueDateBr} onChange={onDueDateChange} required />
                  </div>
                  <div>
                    <Label>Data de Pagamento</Label>
                    <Input name="payDateBr" placeholder="DD/MM/AAAA" inputMode="numeric" value={form.payDateBr} onChange={onPayDateChange} />
                  </div>
                </div>

                <div>
                  <Label>Valor</Label>
                  <Input type="number" step="0.01" name="amount" value={form.amount} onChange={onChange} required />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Input name="category" value={form.category} onChange={onChange} placeholder="Ex.: Mídia, Produção..." />
                </div>

                {/* Linha com Status e Nota Fiscal (à direita de Status) */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Status</Label>
                    <select name="status" value={form.status} onChange={onChange} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                      <option>Pago</option>
                      <option>Pendente</option>
                      <option>Cancelado</option>
                    </select>
                  </div>
                  <div>
                    <Label>Nota Fiscal</Label>
                    <Input type="number" name="invoiceNumber" value={form.invoiceNumber} onChange={onChange} placeholder="Ex.: 12345" />
                  </div>
                </div>

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Meio de Pagamento</Label>
                    <Input name="paymentMethod" value={form.paymentMethod} onChange={onChange} placeholder="Ex.: PIX, Boleto, Cartão..." />
                  </div>
                  <div>
                    <Label>Taxa de Juros</Label>
                    <Input name="interestRate" value={form.interestRate} onChange={onChange} placeholder="Ex.: 2.5" />
                  </div>

                  {editing && form.action_text && !isYMD(String(form.action_text)) && (
                    <div className="md:col-span-2">
                      <Label>Pagamento (texto antigo)</Label>
                      <Input value={form.action_text} readOnly className="bg-muted" />
                    </div>
                  )}
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
