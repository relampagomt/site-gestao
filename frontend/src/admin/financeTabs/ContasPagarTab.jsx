import React, { useEffect, useMemo, useState } from 'react';
import api from '@/services/api';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Search } from 'lucide-react';
import { BRL, brToISO, isoToBR, maskDateBR, toNumberBR } from '@/lib/br.js';

const path = '/contas-pagar';

const emptyForm = {
  vencimentoBr: '',
  documento: '',
  descricao: '',
  valorStr: '',
  dataPagamentoBr: '',
  valorPagoStr: '',
  status: 'Pendente',
  observacoes: '',
};

const ContasPagarTab = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // filtros
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('todos');

  // modal
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(path);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Erro ao carregar contas a pagar', e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // opções de meses
  const monthOptions = useMemo(() => {
    const set = new Set();
    rows.forEach(r => {
      const ym = String(r.vencimento || '').slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(ym)) set.add(ym);
    });
    return Array.from(set).sort().reverse().map(ym => {
      const [y, m] = ym.split('-');
      return { value: ym, label: new Date(y, m - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) };
    });
  }, [rows]);

  // filtrados
  const filtered = useMemo(() => {
    let list = [...rows];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        [r.documento, r.descricao, r.observacoes, String(r.valor), String(r.valorPago)]
          .filter(Boolean)
          .some(v => String(v).toLowerCase().includes(q))
      );
    }
    if (month !== 'todos') {
      list = list.filter(r => String(r.vencimento || '').slice(0, 7) === month);
    }
    list.sort((a, b) => String(a.vencimento || '').localeCompare(String(b.vencimento || '')));
    return list;
  }, [rows, search, month]);

  // KPIs
  const totalValor = filtered.reduce((s, r) => s + Number(r.valor || 0), 0);
  const totalPago  = filtered.reduce((s, r) => s + Number(r.valorPago || 0), 0);
  const emAberto   = Math.max(totalValor - totalPago, 0);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      vencimentoBr: isoToBR(r.vencimento),
      documento: r.documento || '',
      descricao: r.descricao || '',
      valorStr: r.valor != null ? String(r.valor).replace('.', ',') : '',
      dataPagamentoBr: isoToBR(r.dataPagamento),
      valorPagoStr: r.valorPago != null ? String(r.valorPago).replace('.', ',') : '',
      status: r.status || 'Pendente',
      observacoes: r.observacoes || '',
    });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        vencimento: brToISO(form.vencimentoBr),
        documento: form.documento || '',
        descricao: form.descricao || '',
        valor: toNumberBR(form.valorStr),
        dataPagamento: form.dataPagamentoBr ? brToISO(form.dataPagamentoBr) : null,
        valorPago: toNumberBR(form.valorPagoStr),
        status: form.status || 'Pendente',
        observacoes: form.observacoes || '',
      };

      if (editing?.id) await api.put(`${path}/${editing.id}`, payload);
      else await api.post(path, payload);

      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      load();
    } catch (err) {
      console.error('Erro ao salvar conta a pagar', err);
      alert('Não foi possível salvar. Verifique o backend.');
    } finally {
      setSaving(false);
    }
  };

  const destroyItem = async (id) => {
    if (!window.confirm('Confirma excluir esta conta?')) return;
    try {
      await api.delete(`${path}/${id}`);
      load();
    } catch (e) {
      console.error('Erro ao excluir', e);
      alert('Não foi possível excluir.');
    }
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Saídas/Despesas</CardTitle>
            <CardDescription>Gastos registrados</CardDescription>
          </CardHeader>
          <CardContent><div className="text-xl sm:text-2xl font-bold">{BRL(totalValor)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Pago</CardTitle>
            <CardDescription>Valor já pago</CardDescription>
          </CardHeader>
          <CardContent><div className="text-xl sm:text-2xl font-bold">{BRL(totalPago)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Em Aberto</CardTitle>
            <CardDescription>conta(s) vencida(s)</CardDescription>
          </CardHeader>
          <CardContent><div className="text-xl sm:text-2xl font-bold text-orange-600">{BRL(emAberto)}</div></CardContent>
        </Card>
      </div>

      {/* Filtros / ações */}
      <Card className="mb-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg md:text-xl font-semibold">Contas a Pagar</CardTitle>
              <CardDescription>Gerencie suas contas a pagar</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar contas..." value={search} onChange={(e)=>setSearch(e.target.value)} />
            </div>
            <select
              value={month}
              onChange={(e)=>setMonth(e.target.value)}
              className="w-56 border rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="todos">Todos os meses</option>
              {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <Button variant="outline" size="sm" onClick={()=>{ setSearch(''); setMonth('todos'); }}>Limpar Filtros</Button>
            <Button size="sm" onClick={openCreate}>+ Nova Conta</Button>
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
                  filtered.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-center">{isoToBR(r.vencimento)}</TableCell>
                      <TableCell className="text-center">{r.documento || '—'}</TableCell>
                      <TableCell className="text-center">{r.descricao || '—'}</TableCell>
                      <TableCell className="text-center">{BRL(r.valor || 0)}</TableCell>
                      <TableCell className="text-center">{isoToBR(r.dataPagamento)}</TableCell>
                      <TableCell className="text-center">{BRL(r.valorPago || 0)}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="capitalize" variant={r.status === 'Pago' ? 'default' : r.status === 'Cancelado' ? 'destructive' : 'secondary'}>
                          {r.status || 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <Button size="sm" variant="outline" onClick={()=>openEdit(r)}>Editar</Button>
                          <Button size="sm" variant="destructive" onClick={()=>destroyItem(r.id)}>Excluir</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-3 px-6 pb-6">
            Total: {filtered.length} conta(s) | A Pagar: <strong>{BRL(totalValor)}</strong> | Pago: <strong>{BRL(totalPago)}</strong> | Em Aberto: <strong className="text-orange-600">{BRL(emAberto)}</strong>
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
                <DialogTitle>{editing ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}</DialogTitle>
                <DialogDescription>Registre/atualize uma conta a pagar.</DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Vencimento *</Label>
                  <Input
                    placeholder="DD/MM/AAAA"
                    value={form.vencimentoBr}
                    onChange={(e)=>setForm(f=>({...f, vencimentoBr: maskDateBR(e.target.value)}))}
                    required
                  />
                </div>
                <div>
                  <Label>Documento</Label>
                  <Input value={form.documento} onChange={(e)=>setForm(f=>({...f, documento: e.target.value}))} />
                </div>
                <div className="md:col-span-2">
                  <Label>Descrição *</Label>
                  <Input value={form.descricao} onChange={(e)=>setForm(f=>({...f, descricao: e.target.value}))} required />
                </div>
                <div>
                  <Label>Valor *</Label>
                  <Input
                    placeholder="0,00"
                    value={form.valorStr}
                    onChange={(e)=>setForm(f=>({...f, valorStr: e.target.value}))}
                    required
                  />
                </div>
                <div>
                  <Label>Data Pagamento</Label>
                  <Input
                    placeholder="DD/MM/AAAA"
                    value={form.dataPagamentoBr}
                    onChange={(e)=>setForm(f=>({...f, dataPagamentoBr: maskDateBR(e.target.value)}))}
                  />
                </div>
                <div>
                  <Label>Valor Pago</Label>
                  <Input
                    placeholder="0,00"
                    value={form.valorPagoStr}
                    onChange={(e)=>setForm(f=>({...f, valorPagoStr: e.target.value}))}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={form.status}
                    onChange={(e)=>setForm(f=>({...f, status: e.target.value}))}
                  >
                    <option>Pago</option>
                    <option>Pendente</option>
                    <option>Cancelado</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Label>Observações</Label>
                  <Input value={form.observacoes} onChange={(e)=>setForm(f=>({...f, observacoes: e.target.value}))} />
                </div>
              </div>
            </div>

            <div className="border-t bg-background px-6 py-3 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={()=>{ setOpen(false); setEditing(null); setForm(emptyForm); }}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContasPagarTab;
