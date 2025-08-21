// frontend/src/admin/financeTabs/ContasPagarTab.jsx
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
import { Search, Edit, Trash2, ArrowDownCircle, TrendingUp } from 'lucide-react';

// export (mesmo menu do seu Lançamentos)
import ExportMenu from '@/components/export/ExportMenu';

/** ================= Helpers iguais ao Lançamentos ================== */
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
  vencimentoBr: '',
  documento: '',
  descricao: '',
  valor: '',
  dataPagamentoBr: '',
  valorPago: '',
  observacoes: '',
};

const ENDPOINT = '/contas-pagar';

export default function ContasPagarTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // modal
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // filtros
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('todos');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(ENDPOINT);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Erro ao carregar contas a pagar:', e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const monthOptions = useMemo(() => {
    const s = new Set();
    rows.forEach((r) => {
      const key = String(r.vencimento || '').slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(key)) s.add(key);
    });
    return [...s]
      .sort()
      .reverse()
      .map((ym) => {
        const [y, m] = ym.split('-');
        const label = new Date(y, m - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return { value: ym, label };
      });
  }, [rows]);

  const filtered = useMemo(() => {
    let list = [...rows];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        [r.documento, r.descricao, r.observacoes, r.valor, r.valorPago]
          .filter(Boolean)
          .some((f) => String(f).toLowerCase().includes(q))
      );
    }
    if (monthFilter !== 'todos') {
      list = list.filter((r) => String(r.vencimento || '').slice(0, 7) === monthFilter);
    }
    list.sort((a, b) => String(b.vencimento || '').localeCompare(String(a.vencimento || '')));
    return list;
  }, [rows, search, monthFilter]);

  // KPIs iguais
  const totalGasto = filtered.reduce((s, r) => s + Number(r.valor || 0), 0);
  const totalPago = filtered.reduce((s, r) => s + Number(r.valorPago || 0), 0);
  const emAberto = totalGasto - totalPago;

  // Export
  const exportData = filtered.map((r) => ({
    vencimento: isoToBR(String(r.vencimento || '').slice(0, 10)) || '',
    documento: r.documento || '',
    descricao: r.descricao || '',
    valor: Number(r.valor || 0),
    data_pagamento: isoToBR(String(r.dataPagamento || '').slice(0, 10)) || '',
    valor_pago: Number(r.valorPago || 0),
    status: (Number(r.valorPago || 0) >= Number(r.valor || 0)) ? 'Pago' : 'Em aberto',
    observacoes: r.observacoes || '',
  }));
  const exportColumns = [
    { key: 'vencimento', header: 'Vencimento' },
    { key: 'documento', header: 'Documento' },
    { key: 'descricao', header: 'Descrição' },
    { key: 'valor', header: 'Valor' },
    { key: 'data_pagamento', header: 'Data Pagamento' },
    { key: 'valor_pago', header: 'Valor Pago' },
    { key: 'status', header: 'Status' },
    { key: 'observacoes', header: 'Observações' },
  ];
  const pdfOptions = {
    title: 'Contas a Pagar',
    orientation: 'l',
    filtersSummary:
      `Mês: ${monthFilter === 'todos'
        ? 'Todos'
        : (monthOptions.find(m => m.value === monthFilter)?.label || monthFilter)
      } | Busca: ${search || '—'}`,
    footerContent:
      `Totais do período — Saídas/Despesas: ${BRL(totalGasto)} | Pago: ${BRL(totalPago)} | Em aberto: ${BRL(emAberto)}`
  };

  // modal handlers
  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const onDateBR = (name) => (e) => setForm((f) => ({ ...f, [name]: maskBR(e.target.value) }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };
  const openEdit = (r) => {
    setEditing(r);
    setForm({
      vencimentoBr: isoToBR(String(r.vencimento || '').slice(0, 10)) || '',
      documento: r.documento || '',
      descricao: r.descricao || '',
      valor: String(r.valor ?? ''),
      dataPagamentoBr: isoToBR(String(r.dataPagamento || '').slice(0, 10)) || '',
      valorPago: String(r.valorPago ?? ''),
      observacoes: r.observacoes || '',
    });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const vencISO = brToISO(form.vencimentoBr);
    if (!isYMD(vencISO)) return alert('Vencimento inválido');
    const dataPagISO = form.dataPagamentoBr ? brToISO(form.dataPagamentoBr) : '';

    const payload = {
      vencimento: vencISO,
      documento: form.documento || '',
      descricao: form.descricao || '',
      valor: Number(form.valor || 0),
      dataPagamento: dataPagISO || null,
      valorPago: Number(form.valorPago || 0),
      observacoes: form.observacoes || '',
    };

    setSaving(true);
    try {
      if (editing?.id) await api.put(`${ENDPOINT}/${editing.id}`, payload);
      else await api.post(ENDPOINT, payload);
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      load();
    } catch (err) {
      console.error('Erro ao salvar conta a pagar:', err);
      alert('Não foi possível salvar. Verifique o backend de contas a pagar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirmar exclusão?')) return;
    try {
      await api.delete(`${ENDPOINT}/${id}`);
      load();
    } catch (e) {
      console.error('Erro ao excluir:', e);
      alert('Não foi possível excluir.');
    }
  };

  return (
    <>
      {/* KPIs (MESMO layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saídas/Despesas</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{BRL(totalGasto)}</div>
            <p className="text-xs text-muted-foreground">Gastos registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{BRL(totalPago)}</div>
            <p className="text-xs text-muted-foreground">Valor já pago</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Aberto</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{BRL(emAberto)}</div>
            <p className="text-xs text-muted-foreground">conta(s) vencida(s)</p>
          </CardContent>
        </Card>
      </div>

      {/* Card de filtros/ações IDENTICO */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg md:text-xl font-semibold">Contas a Pagar</CardTitle>
              <CardDescription>Gerencie suas contas a pagar</CardDescription>
            </div>
            <div className="ml-auto">
              <ExportMenu data={exportData} columns={exportColumns} filename="contas-a-pagar" pdfOptions={pdfOptions} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3">
            <div className="relative flex-1 w-full md:w-[320px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar contas..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="w-full sm:w-auto">
              <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="w-56 md:w-64 max-w-full border rounded-md px-3 py-2 text-sm bg-background">
                <option value="todos">Todos os meses</option>
                {monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSearch(''); setMonthFilter('todos'); }}
            >
              Limpar Filtros
            </Button>

            <Button size="sm" className="gap-2" onClick={openCreate}>
              + Nova Conta
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* TABELA no mesmo padrão */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Vencimento</TableHead>
                  <TableHead className="text-center">Documento</TableHead>
                  <TableHead className="text-center">Descrição</TableHead>
                  <TableHead className="text-center">Valor</TableHead>
                  <TableHead className="text-center">Data Pagamento</TableHead>
                  <TableHead className="text-center">Valor Pago</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8">Carregando…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8">Nenhuma conta encontrada.</TableCell></TableRow>
                ) : (
                  filtered.map((r) => {
                    const pago = Number(r.valorPago || 0) >= Number(r.valor || 0);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-center">{isoToBR(String(r.vencimento || '').slice(0, 10))}</TableCell>
                        <TableCell className="text-center">{r.documento || '—'}</TableCell>
                        <TableCell className="text-center">{r.descricao || '—'}</TableCell>
                        <TableCell className="text-center font-medium">{BRL(r.valor)}</TableCell>
                        <TableCell className="text-center">{isoToBR(String(r.dataPagamento || '').slice(0, 10)) || '—'}</TableCell>
                        <TableCell className="text-center">{BRL(r.valorPago || 0)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={pago ? 'default' : 'destructive'}>{pago ? 'Pago' : 'Em aberto'}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => openEdit(r)}><Edit className="size-4" />Editar</Button>
                            <Button variant="destructive" size="sm" className="gap-2" onClick={() => handleDelete(r.id)}><Trash2 className="size-4" />Excluir</Button>
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
            Total: <strong>{filtered.length}</strong> conta(s) | A Pagar: <strong>{BRL(totalGasto)}</strong> | Pago: <strong>{BRL(totalPago)}</strong> | Em Aberto: <strong>{BRL(emAberto)}</strong>
          </p>
        </CardContent>
      </Card>

      {/* MODAL no mesmo padrão de UX */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) { setEditing(null); setForm(emptyForm); }
          setOpen(v);
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-2xl p-0">
          <form onSubmit={submit} className="max-h-[80vh] flex flex-col">
            <div className="p-6 pb-2">
              <DialogHeader className="pb-2">
                <DialogTitle>{editing ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}</DialogTitle>
                <DialogDescription>Registre uma nova conta a pagar ou atualize uma existente.</DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Vencimento *</Label>
                  <Input name="vencimentoBr" placeholder="DD/MM/AAAA" inputMode="numeric" value={form.vencimentoBr} onChange={onDateBR('vencimentoBr')} required />
                </div>
                <div>
                  <Label>Documento</Label>
                  <Input name="documento" value={form.documento} onChange={onChange} />
                </div>
                <div className="md:col-span-2">
                  <Label>Descrição *</Label>
                  <Input name="descricao" value={form.descricao} onChange={onChange} required />
                </div>
                <div>
                  <Label>Valor *</Label>
                  <Input type="number" step="0.01" name="valor" value={form.valor} onChange={onChange} required />
                </div>
                <div>
                  <Label>Data Pagamento</Label>
                  <Input name="dataPagamentoBr" placeholder="DD/MM/AAAA" inputMode="numeric" value={form.dataPagamentoBr} onChange={onDateBR('dataPagamentoBr')} />
                </div>
                <div>
                  <Label>Valor Pago</Label>
                  <Input type="number" step="0.01" name="valorPago" value={form.valorPago} onChange={onChange} />
                </div>
                <div className="md:col-span-2">
                  <Label>Observações</Label>
                  <Textarea name="observacoes" rows={3} value={form.observacoes} onChange={onChange} />
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
    </>
  );
}
