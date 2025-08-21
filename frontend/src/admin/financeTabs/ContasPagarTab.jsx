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
import { Search, Edit, Trash2, Plus } from 'lucide-react';

const BRL = (n) =>
  `R$ ${Number(n || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

const maskBR = (v) => {
  let s = (v || '').replace(/\D/g, '').slice(0, 8);
  if (s.length >= 5) s = `${s.slice(0, 2)}/${s.slice(2, 4)}/${s.slice(4)}`;
  else if (s.length >= 3) s = `${s.slice(0, 2)}/${s.slice(2)}`;
  return s;
};
const isoToBR = (iso) => (iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '');
const brToISO = (br) => {
  if (!br || !/^\d{2}\/\d{2}\/\d{4}$/.test(br)) return '';
  const [d, m, y] = br.split('/');
  return `${y}-${m}-${d}`;
};
const todayISO = () => new Date().toISOString().slice(0, 10);
const isOverdue = (vencISO) => vencISO && vencISO < todayISO();

const emptyForm = {
  vencimentoBr: '',
  documento: '',
  descricao: '',
  valor: '',
  dataPagamentoBr: '',
  valorPago: '',
  observacoes: '',
  status: 'pendente', // novo campo
};

export default function ContasPagarTab() {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [mes, setMes] = useState('todos');

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/contas-pagar');
      setItens(Array.isArray(data) ? data : data?.items || []);
    } catch (e) {
      console.error('Erro ao buscar contas a pagar', e);
      setItens([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // normaliza | status final
  const normalize = (r) => {
    const v = Number(r?.valor || 0);
    const vp = Number(r?.valorPago || 0);
    let status = (r?.status || '').toString().toLowerCase();
    if (!status || !['pago', 'pendente', 'cancelado'].includes(status)) {
      status = vp >= v && v > 0 ? 'pago' : 'pendente';
    }
    return { ...r, status };
  };

  const lista = useMemo(() => {
    let arr = itens.map(normalize);

    if (mes !== 'todos') {
      arr = arr.filter((i) => (i?.vencimento || '').slice(0, 7) === mes);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((i) =>
        [i.documento, i.descricao, i.observacoes, BRL(i.valor), isoToBR(i.vencimento)]
          .filter(Boolean)
          .some((f) => String(f).toLowerCase().includes(q))
      );
    }
    return arr.sort((a, b) => String(a.vencimento || '').localeCompare(String(b.vencimento || '')));
  }, [itens, mes, search]);

  // meses disponíveis
  const meses = useMemo(() => {
    const s = new Set();
    itens.forEach((i) => {
      const k = String(i.vencimento || '').slice(0, 7);
      if (/\d{4}-\d{2}/.test(k)) s.add(k);
    });
    return Array.from(s)
      .sort()
      .map((ym) => {
        const [y, m] = ym.split('-');
        const label = new Date(Number(y), Number(m) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return { value: ym, label };
      });
  }, [itens]);

  // KPIs
  const totalPago = useMemo(
    () =>
      lista
        .filter((i) => i.status === 'pago')
        .reduce((s, i) => s + Number(i.valorPago || i.valor || 0), 0),
    [lista]
  );
  const totalGasto = useMemo(() => lista.reduce((s, i) => s + Number(i.valor || 0), 0), [lista]);
  const totalAberto = useMemo(
    () =>
      lista
        .filter((i) => i.status !== 'pago' && i.status !== 'cancelado')
        .reduce((s, i) => s + (Number(i.valor || 0) - Number(i.valorPago || 0)), 0),
    [lista]
  );
  const vencidas = useMemo(
    () => lista.filter((i) => i.status !== 'pago' && i.status !== 'cancelado' && isOverdue(i.vencimento)).length,
    [lista]
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      vencimentoBr: isoToBR(row.vencimento),
      documento: row.documento || '',
      descricao: row.descricao || '',
      valor: String(row.valor ?? ''),
      dataPagamentoBr: isoToBR(row.dataPagamento || ''),
      valorPago: String(row.valorPago ?? ''),
      observacoes: row.observacoes || '',
      status: normalize(row).status,
    });
    setOpen(true);
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      vencimento: brToISO(form.vencimentoBr),
      documento: form.documento || '',
      descricao: form.descricao || '',
      valor: Number(form.valor || 0),
      dataPagamento: brToISO(form.dataPagamentoBr) || null,
      valorPago: Number(form.valorPago || 0),
      observacoes: form.observacoes || '',
      status: form.status,
    };
    try {
      if (editing?.id) await api.put(`/contas-pagar/${editing.id}`, payload);
      else await api.post('/contas-pagar', payload);
      setOpen(false);
      setEditing(null);
      setForm({ ...emptyForm });
      await fetchAll();
    } catch (err) {
      console.error('Erro ao salvar conta a pagar:', err);
      alert('Não foi possível salvar. Verifique o backend.');
    } finally {
      setSaving(false);
    }
  };

  const removeRow = async (id) => {
    if (!confirm('Excluir esta conta?')) return;
    try {
      await api.delete(`/contas-pagar/${id}`);
      await fetchAll();
    } catch (err) {
      console.error('Erro ao excluir:', err);
      alert('Não foi possível excluir.');
    }
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Saídas/Despesas</CardTitle>
            <CardDescription>Gastos registrados</CardDescription>
          </CardHeader>
          <CardContent><div className="text-xl sm:text-2xl font-bold">{BRL(totalGasto)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Pago</CardTitle>
            <CardDescription>Valor já pago</CardDescription>
          </CardHeader>
          <CardContent><div className="text-xl sm:text-2xl font-bold text-green-600">{BRL(totalPago)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Em Aberto</CardTitle>
            <CardDescription>{vencidas} conta(s) vencida(s)</CardDescription>
          </CardHeader>
          <CardContent><div className="text-xl sm:text-2xl font-bold text-orange-600">{BRL(totalAberto)}</div></CardContent>
        </Card>
      </div>

      {/* Filtros / ações */}
      <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar contas..." value={search} onChange={(e)=>setSearch(e.target.value)} />
        </div>

        <select className="w-full md:w-56 border rounded-md px-3 py-2 text-sm bg-background"
                value={mes} onChange={(e)=>setMes(e.target.value)}>
          <option value="todos">Todos os meses</option>
          {meses.map((m)=><option key={m.value} value={m.value}>{m.label}</option>)}
        </select>

        <Button variant="outline" onClick={()=>{setSearch(''); setMes('todos')}}>Limpar Filtros</Button>
        <Button className="gap-2" onClick={openCreate}><Plus className="size-4" /> Nova Conta</Button>
      </div>

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
                ) : lista.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8">Nenhuma conta encontrada.</TableCell></TableRow>
                ) : (
                  lista.map((i)=> {
                    const status = normalize(i).status;
                    const badgeVariant =
                      status === 'pago' ? 'default' : status === 'pendente' ? 'secondary' : 'destructive';
                    return (
                      <TableRow key={i.id}>
                        <TableCell className="text-center">{isoToBR(i.vencimento)}</TableCell>
                        <TableCell className="text-center">{i.documento || '—'}</TableCell>
                        <TableCell className="text-center">{i.descricao || '—'}</TableCell>
                        <TableCell className="text-center">{BRL(i.valor)}</TableCell>
                        <TableCell className="text-center">{i.dataPagamento ? isoToBR(i.dataPagamento) : '—'}</TableCell>
                        <TableCell className="text-center">{BRL(i.valorPago || 0)}</TableCell>
                        <TableCell className="text-center"><Badge variant={badgeVariant} className="capitalize">{status}</Badge></TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button variant="outline" size="sm" className="gap-2" onClick={()=>openEdit(i)}><Edit className="size-4" />Editar</Button>
                            <Button variant="destructive" size="sm" className="gap-2" onClick={()=>removeRow(i.id)}><Trash2 className="size-4" />Excluir</Button>
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
            Total: <strong>{lista.length}</strong> conta(s) | A Pagar: <strong>{BRL(totalGasto)}</strong> | Pago: <strong className="text-green-600">{BRL(totalPago)}</strong> | Em Aberto: <strong className="text-orange-600">{BRL(totalAberto)}</strong>
          </p>
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={open} onOpenChange={(v)=>{ if(!v){ setEditing(null); setForm({...emptyForm}); } setOpen(v); }}>
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
                  <Input name="vencimentoBr" placeholder="DD/MM/AAAA" inputMode="numeric"
                    value={form.vencimentoBr} onChange={(e)=>setForm(f=>({...f, vencimentoBr: maskBR(e.target.value)}))} required/>
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
                  <Input name="dataPagamentoBr" placeholder="DD/MM/AAAA" inputMode="numeric"
                    value={form.dataPagamentoBr} onChange={(e)=>setForm(f=>({...f, dataPagamentoBr: maskBR(e.target.value)}))} />
                </div>
                <div>
                  <Label>Valor Pago</Label>
                  <Input type="number" step="0.01" name="valorPago" value={form.valorPago} onChange={onChange} />
                </div>
                <div>
                  <Label>Status</Label>
                  <select name="status" value={form.status} onChange={onChange} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Label>Observações</Label>
                  <Textarea name="observacoes" rows={3} value={form.observacoes} onChange={onChange} />
                </div>
              </div>
            </div>
            <div className="border-t bg-background px-6 py-3 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={()=>{ setOpen(false); setEditing(null); setForm({...emptyForm}); }}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
