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

import { BRL, isoToBR, toNumberBR } from '@/lib/br.js';
import { maskMoneyBR, maskDateBR, maskToISO, isoToMask } from '@/lib/masks.js';

const PATH = '/contas-pagar';

const emptyForm = {
  vencimentoMask: '',   // dd/mm/aaaa
  documento: '',
  descricao: '',
  valorStr: '',         // string pt-BR com máscara
  dataPagamentoMask: '',// dd/mm/aaaa (opcional)
  status: 'Pendente',   // Pago | Pendente | Cancelado
  observacoes: '',
};

function normalizeStatus(any) {
  const raw = (any ?? '').toString().trim().toLowerCase();
  if (['pago','paid','quitado','settled','1','true'].includes(raw)) return 'Pago';
  if (['cancelado','canceled','cancelled','estornado'].includes(raw)) return 'Cancelado';
  if (['pendente','pending','','0','false','em aberto'].includes(raw)) return 'Pendente';
  return any ? String(any) : 'Pendente';
}
function StatusBadge({ value }) {
  const v = normalizeStatus(value);
  if (v === 'Pago') return <Badge className="bg-green-600">Pago</Badge>;
  if (v === 'Pendente') return <Badge className="bg-amber-600">Pendente</Badge>;
  if (v === 'Cancelado') return <Badge className="bg-gray-500">Cancelado</Badge>;
  return <Badge className="bg-gray-500">{v}</Badge>;
}

function decorate(row) {
  const valor = Number(row?.valor ?? row?.amount ?? 0);
  let pago = Number(row?.valorPago ?? 0);
  const status = normalizeStatus(row?.status ?? row?.situacao ?? row?.paymentStatus);

  if ((!row?.valorPago || isNaN(pago)) && status === 'Pago') pago = valor;
  if (status === 'Cancelado') pago = 0;

  const aberto = Math.max(valor - pago, 0);
  return { ...row, status, _valor: valor, _pago: pago, _aberto: aberto };
}

export default function ContasPagarTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('todos');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(PATH);
      const arr = Array.isArray(data) ? data : [];
      setRows(arr.map(decorate));
    } catch (e) {
      console.error('Erro ao carregar contas a pagar', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const mm = month;
    return rows.filter(r => {
      const inMonth = mm === 'todos' ? true : (String(r.date || r.vencimento || '').slice(5, 7) === mm);
      const inSearch =
        !q ||
        String(r.descricao || r.notes || '').toLowerCase().includes(q) ||
        String(r.documento || '').toLowerCase().includes(q) ||
        String(r.status || '').toLowerCase().includes(q);
      return inMonth && inSearch;
    });
  }, [rows, search, month]);

  const kpis = useMemo(() => {
    let total = 0, pago = 0, emAberto = 0, atrasados = 0;
    const today = new Date().toISOString().slice(0,10);
    for (const it of rows) {
      total += it._valor;
      pago  += Math.min(it._pago, it._valor);
      const pend = Math.max(it._valor - it._pago, 0);
      emAberto += pend;
      if ((it.date || it.vencimento || '') < today && pend > 0) atrasados++;
    }
    return { total, pago, emAberto, atrasados };
  }, [rows]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      vencimentoMask: isoToMask((row.date || row.vencimento || '').slice(0,10)),
      documento: row.documento || '',
      descricao: row.descricao || row.notes || '',
      valorStr: (row.valor ?? row.amount ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      dataPagamentoMask: isoToMask((row.dataPagamento || '').slice(0,10)),
      status: normalizeStatus(row.status || 'Pendente'),
      observacoes: row.observacoes || '',
    });
    setOpen(true);
  };

  const remove = async (id) => {
    if (!confirm('Remover este lançamento?')) return;
    try {
      await api.delete(`${PATH}/${id}`);
      await load();
    } catch (e) {
      console.error('Erro ao remover conta a pagar', e);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const valor = toNumberBR(form.valorStr);
      const vencimento = maskToISO(form.vencimentoMask);
      let dataPagamento = maskToISO(form.dataPagamentoMask) || '';
      const status = normalizeStatus(form.status);
      let valorPago = 0;

      if (status === 'Pago') {
        valorPago = valor;
        if (!dataPagamento) dataPagamento = vencimento; // default = vencimento
      } else {
        valorPago = 0; // Pendente/Cancelado
      }

      const payload = {
        vencimento: vencimento || null,       // ISO
        documento: form.documento || null,
        descricao: form.descricao || '',
        valor,                                // number
        dataPagamento: dataPagamento || null, // ISO | null
        valorPago,                            // derivado
        status,
        observacoes: form.observacoes || '',
      };

      if (editing?.id) {
        await api.put(`${PATH}/${editing.id}`, payload);
      } else {
        await api.post(PATH, payload);
      }
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await load();
    } catch (e) {
      console.error('Erro ao salvar conta a pagar', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Contas a Pagar</CardTitle>
          <CardDescription>Gerencie despesas, vencimentos e pagamentos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 opacity-60" />
              <Input placeholder="Buscar..." value={search} onChange={(e)=>setSearch(e.target.value)} />
            </div>
            <div>
              <Label>Mês</Label>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={month}
                onChange={(e)=>setMonth(e.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="01">Janeiro</option>
                <option value="02">Fevereiro</option>
                <option value="03">Março</option>
                <option value="04">Abril</option>
                <option value="05">Maio</option>
                <option value="06">Junho</option>
                <option value="07">Julho</option>
                <option value="08">Agosto</option>
                <option value="09">Setembro</option>
                <option value="10">Outubro</option>
                <option value="11">Novembro</option>
                <option value="12">Dezembro</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={openNew} className="w-full">+ Nova Conta</Button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border">
              <div className="text-xs opacity-70">Saídas / Despesas</div>
              <div className="text-lg font-semibold">{BRL(kpis.total)}</div>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="text-xs opacity-70">Total Pago</div>
              <div className="text-lg font-semibold">{BRL(kpis.pago)}</div>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="text-xs opacity-70">Em Aberto</div>
              <div className="text-lg font-semibold">{BRL(kpis.emAberto)}</div>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="text-xs opacity-70">Atrasados</div>
              <div className="text-lg font-semibold">{kpis.atrasados}</div>
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-auto rounded-lg border">
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
                {!loading && filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-center">{isoToBR(r.date || r.vencimento)}</TableCell>
                    <TableCell className="text-center">{r.documento || '-'}</TableCell>
                    <TableCell className="text-center">{r.descricao || r.notes || '-'}</TableCell>
                    <TableCell className="text-center">{BRL(r._valor)}</TableCell>
                    <TableCell className="text-center">{isoToBR(r.dataPagamento) || '-'}</TableCell>
                    <TableCell className="text-center">{BRL(r._pago)}</TableCell>
                    <TableCell className="text-center"><StatusBadge value={r.status} /></TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        <Button size="sm" variant="outline" onClick={()=>openEdit(r)}>Editar</Button>
                        <Button size="sm" variant="destructive" onClick={()=>remove(r.id)}>Excluir</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {loading && (
                  <TableRow><TableCell colSpan={8} className="text-center py-6">Carregando...</TableCell></TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-6">Nenhum registro</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={open} onOpenChange={(v)=>{ if(!v){ setEditing(null); setForm(emptyForm);} setOpen(v); }}>
        <DialogContent className="w-[95vw] sm:max-w-2xl p-0">
          <form onSubmit={submit} className="max-h-[80vh] flex flex-col">
            <div className="p-6 pb-2">
              <DialogHeader className="pb-2">
                <DialogTitle>{editing ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}</DialogTitle>
                <DialogDescription>Registre/atualize uma conta a pagar.</DialogDescription>
              </DialogHeader>
            </div>

            <div className="px-6 pb-6 overflow-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Vencimento</Label>
                  <Input
                    placeholder="dd/mm/aaaa"
                    value={form.vencimentoMask}
                    onChange={(e)=>setForm(f=>({...f, vencimentoMask: maskDateBR(e.target.value)}))}
                  />
                </div>
                <div>
                  <Label>Documento</Label>
                  <Input value={form.documento} onChange={(e)=>setForm(f=>({...f, documento: e.target.value}))} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Descrição</Label>
                  <Input value={form.descricao} onChange={(e)=>setForm(f=>({...f, descricao: e.target.value}))} />
                </div>
                <div>
                  <Label>Valor</Label>
                  <Input
                    placeholder="0,00"
                    value={form.valorStr}
                    onChange={(e)=>setForm(f=>({...f, valorStr: maskMoneyBR(e.target.value)}))}
                  />
                </div>
                <div>
                  <Label>Data Pagamento (se pago)</Label>
                  <Input
                    placeholder="dd/mm/aaaa"
                    value={form.dataPagamentoMask}
                    onChange={(e)=>setForm(f=>({...f, dataPagamentoMask: maskDateBR(e.target.value)}))}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <select
                    className="w-full border rounded-md px-3 py-2"
                    value={form.status}
                    onChange={(e)=>setForm(f=>({...f, status: e.target.value}))}
                  >
                    <option>Pago</option>
                    <option>Pendente</option>
                    <option>Cancelado</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
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
}
