
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

import {
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Search,
  Edit,
  Trash2,
} from 'lucide-react';

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
  vencimento: '',
  documento: '',
  descricao: '',
  valor: '',
  dataPagamento: '',
  valorPago: '',
};

const PAYABLES_PATH = '/contas-pagar';

const ContasPagarTab = () => {
  const [payables, setPayables] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('todos');
  const [yearFilter, setYearFilter] = useState('todos');

  // Load data
  const loadAll = async () => {
    setLoading(true);
    try {
      const response = await api.get(PAYABLES_PATH).catch(() => ({ data: [] }));
      setPayables(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Erro ao carregar contas a pagar:', err);
      setPayables([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Filtered data
  const filtered = useMemo(() => {
    let list = [...payables];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        [p.documento, p.descricao, String(p.valor), String(p.valorPago)]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(q))
      );
    }

    if (monthFilter !== 'todos') {
      list = list.filter((p) => String(p.vencimento || '').slice(5, 7) === monthFilter);
    }

    if (yearFilter !== 'todos') {
      list = list.filter((p) => String(p.vencimento || '').slice(0, 4) === yearFilter);
    }

    list.sort((a, b) => String(b.vencimento || '0000-01-01').localeCompare(String(a.vencimento || '0000-01-01')));
    return list;
  }, [payables, search, monthFilter, yearFilter]);

  // Month and Year options for filter
  const monthOptions = useMemo(() => {
    const months = [
      { value: '01', label: 'Janeiro' },
      { value: '02', label: 'Fevereiro' },
      { value: '03', label: 'Março' },
      { value: '04', label: 'Abril' },
      { value: '05', label: 'Maio' },
      { value: '06', label: 'Junho' },
      { value: '07', label: 'Julho' },
      { value: '08', label: 'Agosto' },
      { value: '09', label: 'Setembro' },
      { value: '10', label: 'Outubro' },
      { value: '11', label: 'Novembro' },
      { value: '12', label: 'Dezembro' },
    ];
    return months;
  }, []);

  const yearOptions = useMemo(() => {
    const years = new Set();
    payables.forEach((p) => {
      const year = String(p.vencimento || '').slice(0, 4);
      if (/^\d{4}$/.test(year)) years.add(year);
    });
    return Array.from(years).sort().reverse().map((year) => ({ value: year, label: year }));
  }, [payables]);

  // Form handlers
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onDateChange = (field) => (e) => {
    const v = maskBR(e.target.value);
    setForm((f) => ({ ...f, [field]: v }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (payable) => {
    setEditing(payable);
    setForm({
      vencimento: isoToBR(String(payable.vencimento || '').slice(0, 10)) || '',
      documento: payable.documento || '',
      descricao: payable.descricao || '',
      valor: String(payable.valor ?? ''),
      dataPagamento: isoToBR(String(payable.dataPagamento || '').slice(0, 10)) || '',
      valorPago: String(payable.valorPago ?? ''),
    });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const vencimentoISO = brToISO(form.vencimento);
      if (!isYMD(vencimentoISO)) {
        alert('Data de vencimento inválida. Use o formato DD/MM/AAAA.');
        setSaving(false);
        return;
      }

      let dataPagamentoISO = null;
      if (form.dataPagamento.trim()) {
        dataPagamentoISO = brToISO(form.dataPagamento);
        if (!isYMD(dataPagamentoISO)) {
          alert('Data de pagamento inválida. Use o formato DD/MM/AAAA.');
          setSaving(false);
          return;
        }
      }

      const payload = {
        vencimento: vencimentoISO,
        documento: form.documento || '',
        descricao: form.descricao || '',
        valor: Number(form.valor || 0),
        dataPagamento: dataPagamentoISO,
        valorPago: Number(form.valorPago || 0),
      };

      if (editing?.id) {
        await api.put(`${PAYABLES_PATH}/${editing.id}`, payload);
      } else {
        await api.post(PAYABLES_PATH, payload);
      }

      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      loadAll();
    } catch (err) {
      console.error('Erro ao salvar conta a pagar:', err);
      alert('Não foi possível salvar. Verifique o backend.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta conta a pagar?')) return;
    try {
      await api.delete(`${PAYABLES_PATH}/${id}`);
      loadAll();
    } catch (err) {
      console.error('Erro ao excluir conta a pagar:', err);
      alert('Não foi possível excluir. Verifique o backend.');
    }
  };

  // KPIs calculations
  const totalAPagar = filtered.reduce((s, p) => s + Number(p.valor || 0), 0);
  const totalPago = filtered.reduce((s, p) => s + Number(p.valorPago || 0), 0);
  const totalEmAberto = totalAPagar - totalPago;
  
  const contasVencidas = filtered.filter((p) => {
    const vencimento = new Date(p.vencimento);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return vencimento < hoje && Number(p.valorPago || 0) < Number(p.valor || 0);
  }).length;

  // Export
  const exportData = useMemo(() => {
    return filtered.map((p) => ({
      vencimento: isoToBR(String(p.vencimento || '').slice(0, 10)) || '',
      documento: p.documento || '',
      descricao: p.descricao || '',
      valor: Number(p.valor || 0),
      dataPagamento: isoToBR(String(p.dataPagamento || '').slice(0, 10)) || '',
      valorPago: Number(p.valorPago || 0),
    }));
  }, [filtered]);

  const exportColumns = [
    { key: 'vencimento', header: 'Vencimento' },
    { key: 'documento', header: 'Documento' },
    { key: 'descricao', header: 'Descrição' },
    { key: 'valor', header: 'Valor' },
    { key: 'dataPagamento', header: 'Data Pagamento' },
    { key: 'valorPago', header: 'Valor Pago' },
  ];

  const pdfOptions = {
    title: 'Relatório de Contas a Pagar',
    orientation: 'l',
    filtersSummary: `Filtros aplicados: ${
      [
        search ? `Busca: "${search}"` : '',
        monthFilter !== 'todos' ? `Mês: ${monthOptions.find(m => m.value === monthFilter)?.label || monthFilter}` : '',
        yearFilter !== 'todos' ? `Ano: ${yearFilter}` : '',
      ].filter(Boolean).join(' | ') || 'Nenhum filtro aplicado'
    }`,
    columnStyles: {
      0: { cellWidth: 30 }, 1: { cellWidth: 40 }, 2: { cellWidth: 60 },
      3: { cellWidth: 30 }, 4: { cellWidth: 30 }, 5: { cellWidth: 30 },
    },
    footerContent: `Totais: A Pagar: ${BRL(totalAPagar)} | Pago: ${BRL(totalPago)} | Em Aberto: ${BRL(totalEmAberto)}`
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total a Pagar</CardTitle>
            <TrendingDown className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{BRL(totalAPagar)}</div>
            <p className="text-xs text-muted-foreground">Valor total das contas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600">{BRL(totalPago)}</div>
            <p className="text-xs text-muted-foreground">Valor já pago</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total em Aberto</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-orange-600">{BRL(totalEmAberto)}</div>
            <p className="text-xs text-muted-foreground">Valor pendente</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas Vencidas</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600">{contasVencidas}</div>
            <p className="text-xs text-muted-foreground">Contas em atraso</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg md:text-xl font-semibold">Contas a Pagar</CardTitle>
              <CardDescription>Gerencie suas contas a pagar</CardDescription>
            </div>
            <div className="ml-auto">
              <ExportMenu data={exportData} columns={exportColumns} filename="contas-pagar" pdfOptions={pdfOptions} />
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

            <div className="w-full sm:w-auto">
              <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="w-56 md:w-64 max-w-full border rounded-md px-3 py-2 text-sm bg-background">
                <option value="todos">Todos os anos</option>
                {yearOptions.map((y) => <option key={y.value} value={y.value}>{y.label}</option>)}
              </select>
            </div>

            <Button variant="outline" size="sm" onClick={() => { setSearch(''); setMonthFilter('todos'); setYearFilter('todos'); }}>
              Limpar Filtros
            </Button>

            <Button size="sm" className="gap-2" onClick={openCreate}>
              <Plus className="size-4" />
              Nova Conta
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
                  filtered.map((p) => {
                    const vencimento = new Date(p.vencimento);
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    const valorPago = Number(p.valorPago || 0);
                    const valor = Number(p.valor || 0);
                    
                    let status = 'Em aberto';
                    let statusColor = 'secondary';
                    
                    if (valorPago >= valor) {
                      status = 'Pago';
                      statusColor = 'default';
                    } else if (vencimento < hoje) {
                      status = 'Vencido';
                      statusColor = 'destructive';
                    }

                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-center">{isoToBR(String(p.vencimento || '').slice(0, 10))}</TableCell>
                        <TableCell className="text-center">{p.documento || '—'}</TableCell>
                        <TableCell className="text-center">{p.descricao || '—'}</TableCell>
                        <TableCell className="text-center font-medium">{BRL(p.valor)}</TableCell>
                        <TableCell className="text-center">{p.dataPagamento ? isoToBR(String(p.dataPagamento).slice(0, 10)) : '—'}</TableCell>
                        <TableCell className="text-center font-medium">{BRL(p.valorPago)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={statusColor}>{status}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => openEdit(p)}>
                              <Edit className="size-4" />Editar
                            </Button>
                            <Button variant="destructive" size="sm" className="gap-2" onClick={() => handleDelete(p.id)}>
                              <Trash2 className="size-4" />Excluir
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
          <p className="text-xs text-muted-foreground mt-3 px-6 pb-6">
            Total: <strong>{filtered.length}</strong> conta(s) | A Pagar: <strong>{BRL(totalAPagar)}</strong> | Pago: <strong>{BRL(totalPago)}</strong> | Em Aberto: <strong className="text-orange-600">{BRL(totalEmAberto)}</strong>
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
          <form onSubmit={submit} className="max-h-[80vh] flex flex-col">
            <div className="p-6 pb-2">
              <DialogHeader className="pb-2">
                <DialogTitle>{editing ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}</DialogTitle>
                <DialogDescription>
                  Registre uma nova conta a pagar ou atualize uma existente.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Vencimento *</Label>
                  <Input 
                    name="vencimento" 
                    placeholder="DD/MM/AAAA" 
                    inputMode="numeric" 
                    value={form.vencimento} 
                    onChange={onDateChange('vencimento')} 
                    required 
                  />
                </div>

                <div>
                  <Label>Documento</Label>
                  <Input name="documento" value={form.documento} onChange={onChange} placeholder="Ex.: NF 12345" />
                </div>

                <div className="md:col-span-2">
                  <Label>Descrição *</Label>
                  <Textarea name="descricao" rows={2} value={form.descricao} onChange={onChange} placeholder="Descrição da conta" required />
                </div>

                <div>
                  <Label>Valor *</Label>
                  <Input type="number" step="0.01" name="valor" value={form.valor} onChange={onChange} required />
                </div>

                <div>
                  <Label>Data Pagamento</Label>
                  <Input 
                    name="dataPagamento" 
                    placeholder="DD/MM/AAAA" 
                    inputMode="numeric" 
                    value={form.dataPagamento} 
                    onChange={onDateChange('dataPagamento')} 
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>Valor Pago</Label>
                  <Input type="number" step="0.01" name="valorPago" value={form.valorPago} onChange={onChange} />
                </div>
              </div>
            </div>

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

export default ContasPagarTab;

