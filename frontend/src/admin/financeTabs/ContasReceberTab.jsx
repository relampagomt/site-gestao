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

const PATH = '/contas-receber';

const emptyForm = {
  vencimentoMask: '',
  dataEmissaoMask: '',
  dataBaixaMask: '',
  cliente: '',
  notaFiscal: '',
  valorStr: '',
  taxasStr: '',
  docRecebimento: '',
  valorLiquidoStr: '',
  status: 'Pendente',
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
  const taxas = Number(row?.taxasJuros ?? 0);
  let liq = Number(row?.valorLiqRecebido ?? row?.valorLiquidoRecebido ?? 0);
  const status = normalizeStatus(row?.status ?? row?.situacao ?? row?.paymentStatus);

  if ((isNaN(liq) || (!row?.valorLiqRecebido && !row?.valorLiquidoRecebido)) && status === 'Pago') {
    liq = Math.max(valor - taxas, 0);
  } else if (status !== 'Pago') {
    liq = 0;
  }
  const venc = String(row.date || row.vencimento || '').slice(0,10);
  const aberto = Math.max(valor - liq, 0);
  return { ...row, status, _valor: valor, _liq: liq, _aberto: aberto, _taxas: taxas, _venc: venc };
}

export default function ContasReceberTab() {
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
      const arr = Array.isArray(data) ? data.map(decorate) : [];
      setRows(arr);
    } catch (e) {
      console.error('Erro ao carregar contas a receber', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      const inMonth = month === 'todos' ? true : (String(r._venc).slice(5,7) === month);
      const inSearch =
        !q ||
        String(r.cliente || '').toLowerCase().includes(q) ||
        String(r.notaFiscal || '').toLowerCase().includes(q) ||
        String(r.status || '').toLowerCase().includes(q);
      return inMonth && inSearch;
    });
  }, [rows, search, month]);

  const kpis = useMemo(() => {
    let total=0, recebido=0, emAberto=0, atrasados=0;
    const today = new Date().toISOString().slice(0,10);
    for (const it of rows) {
      total += it._valor;
      recebido += Math.min(it._liq, it._valor);
      const pend = Math.max(it._valor - it._liq, 0);
      emAberto += pend;
      if (it._venc < today && pend>0) atrasados++;
    }
    return { total, recebido, emAberto, atrasados };
  }, [rows]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (row) => {
    setEditing(row);
    setForm({
      vencimentoMask: isoToMask(row._venc),
      dataEmissaoMask: isoToMask(row.dataEmissao || ''),
      dataBaixaMask: isoToMask(row.dataBaixa || ''),
      cliente: row.cliente || '',
      notaFiscal: row.notaFiscal || '',
      valorStr: (row.valor ?? row.amount ?? 0).toLocaleString('pt-BR',{minimumFractionDigits:2}),
      taxasStr: (row.taxasJuros ?? 0).toLocaleString('pt-BR',{minimumFractionDigits:2}),
      docRecebimento: row.documentoRecebimento || row.docRecebimento || '',
      valorLiquidoStr: (row.valorLiqRecebido ?? row.valorLiquidoRecebido ?? '').toString().replace('.',','),
      status: normalizeStatus(row.status || 'Pendente'),
    });
    setOpen(true);
  };
  const remove = async (id) => {
    if (!confirm('Remover este lançamento?')) return;
    try { await api.delete(`${PATH}/${id}`); await load(); } catch(e){ console.error(e); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const valor = toNumberBR(form.valorStr);
      const taxas = toNumberBR(form.taxasStr);

      const vencimento = maskToISO(form.vencimentoMask);
      const dataEmissao = maskToISO(form.dataEmissaoMask) || '';
      let dataBaixa = maskToISO(form.dataBaixaMask) || '';
      let valorLiquido = toNumberBR(form.valorLiquidoStr);
      const status = form.status; // usa direto o select

      if (normalizeStatus(status) === 'Pago') {
        if (!valorLiquido) valorLiquido = Math.max(valor - taxas, 0);
        if (!dataBaixa) dataBaixa = vencimento;
      } else {
        valorLiquido = 0;
      }

      const payload = {
        vencimento: vencimento || null,
        dataEmissao: dataEmissao || null,
        dataBaixa: dataBaixa || null,
        cliente: form.cliente || null,
        notaFiscal: form.notaFiscal || null,
        valor,
        taxasJuros: taxas,
        documentoRecebimento: form.docRecebimento || null,
        valorLiqRecebido: valorLiquido,
        status, // salva como o usuário escolheu
      };

      if (editing?.id) await api.put(`${PATH}/${editing.id}`, payload);
      else await api.post(PATH, payload);

      setOpen(false); setEditing(null); setForm(emptyForm); await load();
    } catch(e){ console.error('Erro ao salvar', e); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Contas a Receber</CardTitle>
          <CardDescription>Registre entradas, baixas e taxas/juros</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 opacity-60"/>
              <Input placeholder="Buscar..." value={search} onChange={(e)=>setSearch(e.target.value)}/>
            </div>
            <div>
              <Label>Mês</Label>
              <select className="w-full border rounded-md px-3 py-2" value={month} onChange={(e)=>setMonth(e.target.value)}>
                <option value="todos">Todos</option>
                <option value="01">Janeiro</option><option value="02">Fevereiro</option><option value="03">Março</option>
                <option value="04">Abril</option><option value="05">Maio</option><option value="06">Junho</option>
                <option value="07">Julho</option><option value="08">Agosto</option><option value="09">Setembro</option>
                <option value="10">Outubro</option><option value="11">Novembro</option><option value="12">Dezembro</option>
              </select>
            </div>
            <div className="flex items-end"><Button onClick={openNew} className="w-full">+ Nova Conta</Button></div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border"><div className="text-xs opacity-70">Entradas (a Receber)</div><div className="text-lg font-semibold">{BRL(kpis.total)}</div></div>
            <div className="p-3 rounded-lg border"><div className="text-xs opacity-70">Recebido Líquido</div><div className="text-lg font-semibold">{BRL(kpis.recebido)}</div></div>
            <div className="p-3 rounded-lg border"><div className="text-xs opacity-70">Em Aberto</div><div className="text-lg font-semibold">{BRL(kpis.emAberto)}</div></div>
            <div className="p-3 rounded-lg border"><div className="text-xs opacity-70">Atrasados</div><div className="text-lg font-semibold">{kpis.atrasados}</div></div>
          </div>

          {/* Tabela */}
          <div className="overflow-auto rounded-lg border">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-center">Vencimento</TableHead>
                <TableHead className="text-center">Cliente</TableHead>
                <TableHead className="text-center">Nota Fiscal</TableHead>
                <TableHead className="text-center">Valor</TableHead>
                <TableHead className="text-center">Taxas/Juros</TableHead>
                <TableHead className="text-center">Líquido</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {!loading && filtered.map(r=>(
                  <TableRow key={r.id}>
                    <TableCell className="text-center">{isoToBR(r._venc)}</TableCell>
                    <TableCell className="text-center">{r.cliente||'-'}</TableCell>
                    <TableCell className="text-center">{r.notaFiscal||'-'}</TableCell>
                    <TableCell className="text-center">{BRL(r._valor)}</TableCell>
                    <TableCell className="text-center">{BRL(r._taxas)}</TableCell>
                    <TableCell className="text-center">{BRL(r._liq)}</TableCell>
                    <TableCell className="text-center"><StatusBadge value={r.status}/></TableCell>
                    <TableCell className="text-center"><div className="flex justify-center gap-2">
                      <Button size="sm" variant="outline" onClick={()=>openEdit(r)}>Editar</Button>
                      <Button size="sm" variant="destructive" onClick={()=>remove(r.id)}>Excluir</Button>
                    </div></TableCell>
                  </TableRow>
                ))}
                {loading && (<TableRow><TableCell colSpan={8} className="text-center py-6">Carregando...</TableCell></TableRow>)}
                {!loading && filtered.length===0 && (<TableRow><TableCell colSpan={8} className="text-center py-6">Sem registros</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={open} onOpenChange={(v)=>{ if(!v){ setEditing(null); setForm(emptyForm);} setOpen(v); }}>
        <DialogContent className="w-[95vw] sm:max-w-3xl p-0">
          <form onSubmit={submit} className="max-h-[80vh] flex flex-col">
            <div className="p-6 pb-2">
              <DialogHeader className="pb-2">
                <DialogTitle>{editing?'Editar Conta a Receber':'Nova Conta a Receber'}</DialogTitle>
                <DialogDescription>Preencha os dados</DialogDescription>
              </DialogHeader>
            </div>
            <div className="px-6 pb-6 overflow-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><Label>Vencimento</Label><Input placeholder="dd/mm/aaaa" value={form.vencimentoMask} onChange={(e)=>setForm(f=>({...f,vencimentoMask:maskDateBR(e.target.value)}))}/></div>
                <div><Label>Emissão</Label><Input placeholder="dd/mm/aaaa" value={form.dataEmissaoMask} onChange={(e)=>setForm(f=>({...f,dataEmissaoMask:maskDateBR(e.target.value)}))}/></div>
                <div><Label>Baixa (se pago)</Label><Input placeholder="dd/mm/aaaa" value={form.dataBaixaMask} onChange={(e)=>setForm(f=>({...f,dataBaixaMask:maskDateBR(e.target.value)}))}/></div>
                <div className="sm:col-span-2"><Label>Cliente</Label><Input value={form.cliente} onChange={(e)=>setForm(f=>({...f,cliente:e.target.value}))}/></div>
                <div><Label>Nota Fiscal</Label><Input value={form.notaFiscal} onChange={(e)=>setForm(f=>({...f,notaFiscal:e.target.value}))}/></div>
                <div><Label>Valor</Label><Input placeholder="0,00" value={form.valorStr} onChange={(e)=>setForm(f=>({...f,valorStr:maskMoneyBR(e.target.value)}))}/></div>
                <div><Label>Taxas/Juros</Label><Input placeholder="0,00" value={form.taxasStr} onChange={(e)=>setForm(f=>({...f,taxasStr:maskMoneyBR(e.target.value)}))}/></div>
                <div><Label>Líquido Recebido (opcional)</Label><Input placeholder="0,00" value={form.valorLiquidoStr} onChange={(e)=>setForm(f=>({...f,valorLiquidoStr:maskMoneyBR(e.target.value)}))}/></div>
                <div className="sm:col-span-2"><Label>Documento de Recebimento</Label><Input value={form.docRecebimento} onChange={(e)=>setForm(f=>({...f,docRecebimento:e.target.value}))}/></div>
                <div><Label>Status</Label><select className="w-full border rounded-md px-3 py-2" value={form.status} onChange={(e)=>setForm(f=>({...f,status:e.target.value}))}><option>Pago</option><option>Pendente</option><option>Cancelado</option></select></div>
              </div>
            </div>
            <div className="border-t bg-background px-6 py-3 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={()=>{setOpen(false);setEditing(null);setForm(emptyForm);}}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={saving}>{saving?'Salvando...':'Salvar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
