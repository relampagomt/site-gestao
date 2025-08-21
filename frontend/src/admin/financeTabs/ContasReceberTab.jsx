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

/* ===== Helpers ===== */
const BRL = (n) =>
  `R$ ${Number(n || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

const parseMoney = (val) => {
  if (val === null || val === undefined) return 0;
  const s = String(val).trim();
  if (!s) return 0;
  const cleaned = s
    .replace(/[^\d.,-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

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
  cliente: '',
  notaFiscal: '',
  dataEmissaoBr: '',
  valor: '',
  taxasJuros: '',
  docRecebimento: '',
  dataBaixaBr: '',
  valorLiquidoRecebido: '',
  observacoes: '',
  status: 'pendente',
};

export default function ContasReceberTab() {
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
      const { data } = await api.get('/contas-receber');
      setItens(Array.isArray(data) ? data : data?.items || []);
    } catch (e) {
      console.error('Erro ao buscar contas a receber', e);
      setItens([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const normalize = (r) => {
    const v = parseMoney(r?.valor);
    const vl = parseMoney(r?.valorLiquidoRecebido);
    let status = (r?.status || '').toString().toLowerCase();
    if (!status || !['pago', 'pendente', 'cancelado'].includes(status)) {
      status = vl >= v && v > 0 ? 'pago' : 'pendente';
    }
    return { ...r, valor: v, valorLiquidoRecebido: vl, status };
  };

  const lista = useMemo(() => {
    let arr = itens.map(normalize);
    if (mes !== 'todos') arr = arr.filter((i) => (i?.vencimento || '').slice(0, 7) === mes);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((i) =>
        [i.cliente, i.notaFiscal, i.docRecebimento, i.observacoes, BRL(i.valor), isoToBR(i.vencimento)]
          .filter(Boolean)
          .some((f) => String(f).toLowerCase().includes(q))
      );
    }
    return arr.sort((a, b) => String(a.vencimento || '').localeCompare(String(b.vencimento || '')));
  }, [itens, mes, search]);

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

  /* KPIs */
  const totalRecebidoLiq = useMemo(() => lista.reduce((s, i) => s + (i.valorLiquidoRecebido || 0), 0), [lista]);
  const totalReceber = useMemo(() => lista.reduce((s, i) => s + (i.valor || 0), 0), [lista]);
  const totalEmAberto = useMemo(() => lista
      .filter(i => i.status !== 'pago' && i.status !== 'cancelado')
      .reduce((s, i) => s + ((i.valor || 0) - (i.valorLiquidoRecebido || 0)), 0),
    [lista]);
  const vencidos = useMemo(() =>
    lista.filter(i => i.status !== 'pago' && i.status !== 'cancelado' && isOverdue(i.vencimento)).length, [lista]);

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setOpen(true); };
  const openEdit = (row) => {
    const n = normalize(row);
    setEditing(row);
    setForm({
      vencimentoBr: isoToBR(row.vencimento),
      cliente: row.cliente || '',
      notaFiscal: row.notaFiscal || '',
      dataEmissaoBr: isoToBR(row.dataEmissao || ''),
      valor: String(n.valor ?? ''),
      taxasJuros: String(parseMoney(row.taxasJuros) ?? ''),
      docRecebimento: row.docRecebimento || '',
      dataBaixaBr: isoToBR(row.dataBaixa || ''),
      valorLiquidoRecebido: String(n.valorLiquidoRecebido ?? ''),
      observacoes: row.observacoes || '',
      status: n.status,
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
      cliente: form.cliente || '',
      notaFiscal: form.notaFiscal || '',
      dataEmissao: brToISO(form.dataEmissaoBr) || null,
      valor: parseMoney(form.valor),
      taxasJuros: parseMoney(form.taxasJuros),
      docRecebimento: form.docRecebimento || '',
      dataBaixa: brToISO(form.dataBaixaBr) || null,
      valorLiquidoRecebido: parseMoney(form.valorLiquidoRecebido),
      observacoes: form.observacoes || '',
      status: form.status,
    };
    try {
      if (editing?.id) await api.put(`/contas-receber/${editing.id}`, payload);
      else await api.post('/contas-receber', payload);
      setOpen(false);
      setEditing(null);
      setForm({ ...emptyForm });
      await fetchAll();
    } catch (err) {
      console.error('Erro ao salvar conta a receber:', err);
      alert('Não foi possível salvar. Verifique o backend.');
    } finally {
      setSaving(false);
    }
  };

  const removeRow = async (id) => {
    if (!confirm('Excluir esta conta?')) return;
    try {
      await api.delete(`/contas-receber/${id}`);
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
            <CardTitle className="text-sm">Entradas (a Receber)</CardTitle>
            <CardDescription>Receitas registradas</CardDescription>
          </CardHeader>
        <CardContent><div className="text-xl sm:text-2xl font-bold">{BRL(totalReceber)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Recebido Líquido</CardTitle>
            <CardDescription>Valor já recebido</CardDescription>
          </CardHeader>
          <CardContent><div className="text-xl sm:text-2xl font-bold text-green-600">{BRL(totalRecebidoLiq)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Em Aberto</CardTitle>
            <CardDescription>{vencidos} recebimento(s) vencido(s)</CardDescription>
          </CardHeader>
          <CardContent><div className="text-xl sm:text-2xl font-bold text-orange-600">{BRL(totalEmAberto)}</div></CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar contas..." value={search} onChange={(e)=>setSearch(e.target.value)} />
        </div>
        <select className="w-full md:w-56 border rounded-md px-3 py-2 text-sm bg-background" value={mes} onChange={(e)=>setMes(e.target.value)}>
          <option value="todos">Todos os meses</option>
          {meses.map((m)=><option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <Button variant="outline" onClick={()=>{ setSearch(''); setMes('todos'); }}>Limpar Filtros</Button>
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
                  <TableHead className="text-center">Cliente</TableHead>
                  <TableHead className="text-center">Nota Fiscal</TableHead>
                  <TableHead className="text-center">Data Emissão</TableHead>
                  <TableHead className="text-center">Valor</TableHead>
                  <TableHead className="text-center">Taxas/Juros</TableHead>
                  <TableHead className="text-center">Doc. Receb.</TableHead>
                  <TableHead className="text-center">Data Baixa</TableHead>
                  <TableHead className="text-center">Valor Líq. Recebido</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8">Carregando…</TableCell></TableRow>
                ) : lista.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8">Nenhuma conta encontrada.</TableCell></TableRow>
                ) : (
                  lista.map((i)=>{
                    const badgeVariant = i.status === 'pago' ? 'default' : i.status === 'pendente' ? 'secondary' : 'destructive';
                    return (
                      <TableRow key={i.id}>
                        <TableCell className="text-center">{isoToBR(i.vencimento)}</TableCell>
                        <TableCell className="text-center">{i.cliente || '—'}</TableCell>
                        <TableCell className="text-center">{i.notaFiscal || '—'}</TableCell>
                        <TableCell className="text-center">{i.dataEmissao ? isoToBR(i.dataEmissao) : '—'}</TableCell>
                        <TableCell className="text-center">{BRL(i.valor)}</TableCell>
                        <TableCell className="text-center">{BRL(i.taxasJuros || 0)}</TableCell>
                        <TableCell className="text-center">{i.docRecebimento || '—'}</TableCell>
                        <TableCell className="text-center">{i.dataBaixa ? isoToBR(i.dataBaixa) : '—'}</TableCell>
                        <TableCell className="text-center">{BRL(i.valorLiquidoRecebido || 0)}</TableCell>
                        <TableCell className="text-center"><Badge variant={badgeVariant} className="capitalize">{i.status}</Badge></TableCell>
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
            Total: <strong>{lista.length}</strong> conta(s) | A Receber: <strong>{BRL(totalReceber)}</strong> | Recebido Líq.: <strong className="text-green-600">{BRL(totalRecebidoLiq)}</strong> | Em Aberto: <strong className="text-orange-600">{BRL(totalEmAberto)}</strong>
          </p>
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={open} onOpenChange={(v)=>{ if(!v){ setEditing(null); setForm({...emptyForm}); } setOpen(v); }}>
        <DialogContent className="w-[95vw] sm:max-w-3xl p-0">
          <form onSubmit={submit} className="max-h-[80vh] flex flex-col">
            <div className="p-6 pb-2">
              <DialogHeader className="pb-2">
                <DialogTitle>{editing ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}</DialogTitle>
                <DialogDescription>Registre uma nova conta a receber ou atualize uma existente.</DialogDescription>
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
                  <Label>Cliente *</Label>
                  <Input name="cliente" value={form.cliente} onChange={onChange} required />
                </div>
                <div>
                  <Label>Nota Fiscal</Label>
                  <Input name="notaFiscal" value={form.notaFiscal} onChange={onChange} />
                </div>
                <div>
                  <Label>Data Emissão</Label>
                  <Input name="dataEmissaoBr" placeholder="DD/MM/AAAA" inputMode="numeric"
                    value={form.dataEmissaoBr} onChange={(e)=>setForm(f=>({...f, dataEmissaoBr: maskBR(e.target.value)}))} />
                </div>
                <div>
                  <Label>Valor *</Label>
                  <Input type="text" inputMode="decimal" placeholder="0,00" name="valor" value={form.valor} onChange={onChange} required />
                </div>
                <div>
                  <Label>Taxas/Juros</Label>
                  <Input type="text" inputMode="decimal" placeholder="0,00" name="taxasJuros" value={form.taxasJuros} onChange={onChange} />
                </div>
                <div>
                  <Label>Doc. Recebimento</Label>
                  <Input name="docRecebimento" value={form.docRecebimento} onChange={onChange} />
                </div>
                <div>
                  <Label>Data Baixa</Label>
                  <Input name="dataBaixaBr" placeholder="DD/MM/AAAA" inputMode="numeric"
                    value={form.dataBaixaBr} onChange={(e)=>setForm(f=>({...f, dataBaixaBr: maskBR(e.target.value)}))} />
                </div>
                <div>
                  <Label>Valor Líq. Recebido</Label>
                  <Input type="text" inputMode="decimal" placeholder="0,00" name="valorLiquidoRecebido" value={form.valorLiquidoRecebido} onChange={onChange} />
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
