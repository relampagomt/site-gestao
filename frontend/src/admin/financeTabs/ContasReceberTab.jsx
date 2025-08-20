
// frontend/src/admin/financeTabs/ContasReceberTab.jsx
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
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Search,
  Edit,
  Trash2,
} from 'lucide-react';

// Export (CSV/XLSX/PDF) menu
import ExportMenu from "@/components/export/ExportMenu";
import ImportButton from "@/components/ImportButton";

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
  cliente: '',
  notaFiscal: '',
  dataEmissao: '',
  valor: '',
  taxasJuros: '',
  documentoRecebimento: '',
  dataBaixa: '',
  valorLiqRecebido: '',
};

const RECEIVABLES_PATH = '/contas-receber';

const ContasReceberTab = () => {
  const [receivables, setReceivables] = useState([]);
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
      const response = await api.get(RECEIVABLES_PATH).catch(() => ({ data: [] }));
      setReceivables(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Erro ao carregar contas a receber:', err);
      setReceivables([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Filtered data
  const filtered = useMemo(() => {
    let list = [...receivables];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        [r.cliente, r.notaFiscal, r.documentoRecebimento, String(r.valor), String(r.valorLiqRecebido)]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(q))
      );
    }

    if (monthFilter !== 'todos') {
      list = list.filter((r) => String(r.vencimento || '').slice(5, 7) === monthFilter);
    }

    if (yearFilter !== 'todos') {
      list = list.filter((r) => String(r.vencimento || '').slice(0, 4) === yearFilter);
    }

    list.sort((a, b) => String(b.vencimento || '0000-01-01').localeCompare(String(a.vencimento || '0000-01-01')));
    return list;
  }, [receivables, search, monthFilter, yearFilter]);

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
    receivables.forEach((r) => {
      const year = String(r.vencimento || '').slice(0, 4);
      if (/^\d{4}$/.test(year)) years.add(year);
    });
    return Array.from(years).sort().reverse().map((year) => ({ value: year, label: year }));
  }, [receivables]);

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

  const openEdit = (receivable) => {
    setEditing(receivable);
    setForm({
      vencimento: isoToBR(String(receivable.vencimento || '').slice(0, 10)) || '',
      cliente: receivable.cliente || '',
      notaFiscal: receivable.notaFiscal || '',
      dataEmissao: isoToBR(String(receivable.dataEmissao || '').slice(0, 10)) || '',
      valor: String(receivable.valor ?? ''),
      taxasJuros: String(receivable.taxasJuros ?? ''),
      documentoRecebimento: receivable.documentoRecebimento || '',
      dataBaixa: isoToBR(String(receivable.dataBaixa || '').slice(0, 10)) || '',
      valorLiqRecebido: String(receivable.valorLiqRecebido ?? ''),
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

      let dataEmissaoISO = null;
      if (form.dataEmissao.trim()) {
        dataEmissaoISO = brToISO(form.dataEmissao);
        if (!isYMD(dataEmissaoISO)) {
          alert('Data de emissão inválida. Use o formato DD/MM/AAAA.');
          setSaving(false);
          return;
        }
      }

      let dataBaixaISO = null;
      if (form.dataBaixa.trim()) {
        dataBaixaISO = brToISO(form.dataBaixa);
        if (!isYMD(dataBaixaISO)) {
          alert('Data da baixa inválida. Use o formato DD/MM/AAAA.');
          setSaving(false);
          return;
        }
      }

      const payload = {
        vencimento: vencimentoISO,
        cliente: form.cliente || '',
        notaFiscal: form.notaFiscal || '',
        dataEmissao: dataEmissaoISO,
        valor: Number(form.valor || 0),
        taxasJuros: Number(form.taxasJuros || 0),
        documentoRecebimento: form.documentoRecebimento || '',
        dataBaixa: dataBaixaISO,
        valorLiqRecebido: Number(form.valorLiqRecebido || 0),
      };

      if (editing?.id) {
        await api.put(`${RECEIVABLES_PATH}/${editing.id}`, payload);
      } else {
        await api.post(RECEIVABLES_PATH, payload);
      }

      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      loadAll();
    } catch (err) {
      console.error('Erro ao salvar conta a receber:', err);
      alert('Não foi possível salvar. Verifique o backend.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir esta conta a receber?")) return;
    try {
      await api.delete(`${RECEIVABLES_PATH}/${id}`);
      loadAll();
    } catch (err) {
      console.error("Erro ao excluir conta a receber:", err);
      alert("Não foi possível excluir. Verifique o backend.");
    }
  };

  const handleImportData = async (data) => {
    setLoading(true);
    try {
      for (const item of data) {
        const payload = {
          vencimento: brToISO(item.VENCTO || ""),
          cliente: item.CLIENTE || "",
          notaFiscal: item["NOTA FISCAL"] || "",
          dataEmissao: item["DATA EMISSÃO"] ? brToISO(item["DATA EMISSÃO"]) : null,
          valor: Number(item.VALOR || 0),
          taxasJuros: Number(item["TAXAS/JUROS"] || 0),
          documentoRecebimento: item["DOCUMENTO RECEBIMENTO"] || "",
          dataBaixa: item["DATA DA BAIXA"] ? brToISO(item["DATA DA BAIXA"]) : null,
          valorLiqRecebido: Number(item["VALOR LIQ RECEBIDO"] || 0),
        };
        await api.post(RECEIVABLES_PATH, payload);
      }
      alert("Dados importados com sucesso!");
      loadAll();
    } catch (err) {
      console.error("Erro ao importar dados:", err);
      alert("Não foi possível importar os dados. Verifique o formato do arquivo e o backend.");
    } finally {
      setLoading(false);
    }
  };

  // KPIs calculations
  const totalAReceber = filtered.reduce((s, r) => s + Number(r.valor || 0), 0);
  const totalRecebidoLiq = filtered.reduce((s, r) => s + Number(r.valorLiqRecebido || 0), 0);
  const totalEmAberto = totalAReceber - totalRecebidoLiq;
  
  const recebimentosAtrasados = filtered.filter((r) => {
    const vencimento = new Date(r.vencimento);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return vencimento < hoje && Number(r.valorLiqRecebido || 0) < Number(r.valor || 0);
  }).length;

  // Export
  const exportData = useMemo(() => {
    return filtered.map((r) => ({
      vencimento: isoToBR(String(r.vencimento || '').slice(0, 10)) || '',
      cliente: r.cliente || '',
      notaFiscal: r.notaFiscal || '',
      dataEmissao: isoToBR(String(r.dataEmissao || '').slice(0, 10)) || '',
      valor: Number(r.valor || 0),
      taxasJuros: Number(r.taxasJuros || 0),
      documentoRecebimento: r.documentoRecebimento || '',
      dataBaixa: isoToBR(String(r.dataBaixa || '').slice(0, 10)) || '',
      valorLiqRecebido: Number(r.valorLiqRecebido || 0),
    }));
  }, [filtered]);

  const exportColumns = [
    { key: 'vencimento', header: 'Vencimento' },
    { key: 'cliente', header: 'Cliente' },
    { key: 'notaFiscal', header: 'Nota Fiscal' },
    { key: 'dataEmissao', header: 'Data Emissão' },
    { key: 'valor', header: 'Valor' },
    { key: 'taxasJuros', header: 'Taxas/Juros' },
    { key: 'documentoRecebimento', header: 'Doc. Recebimento' },
    { key: 'dataBaixa', header: 'Data Baixa' },
    { key: 'valorLiqRecebido', header: 'Valor Líq. Recebido' },
  ];

  const pdfOptions = {
    title: 'Relatório de Contas a Receber',
    orientation: 'l',
    filtersSummary: `Filtros aplicados: ${
      [
        search ? `Busca: "${search}"` : '',
        monthFilter !== 'todos' ? `Mês: ${monthOptions.find(m => m.value === monthFilter)?.label || monthFilter}` : '',
        yearFilter !== 'todos' ? `Ano: ${yearFilter}` : '',
      ].filter(Boolean).join(' | ') || 'Nenhum filtro aplicado'
    }`,
    columnStyles: {
      0: { cellWidth: 25 }, 1: { cellWidth: 35 }, 2: { cellWidth: 25 },
      3: { cellWidth: 25 }, 4: { cellWidth: 25 }, 5: { cellWidth: 25 },
      6: { cellWidth: 30 }, 7: { cellWidth: 25 }, 8: { cellWidth: 30 },
    },
    footerContent: `Totais: A Receber: ${BRL(totalAReceber)} | Recebido: ${BRL(totalRecebidoLiq)} | Em Aberto: ${BRL(totalEmAberto)}`
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{BRL(totalAReceber)}</div>
            <p className="text-xs text-muted-foreground">Valor total das contas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recebido Líquido</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600">{BRL(totalRecebidoLiq)}</div>
            <p className="text-xs text-muted-foreground">Valor já recebido</p>
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
            <CardTitle className="text-sm font-medium">Recebimentos Atrasados</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600">{recebimentosAtrasados}</div>
            <p className="text-xs text-muted-foreground">Contas em atraso</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg md:text-xl font-semibold">Contas a Receber</CardTitle>
              <CardDescription>Gerencie suas contas a receber</CardDescription>
            </div>
            <div className="ml-auto flex gap-2">
              <ImportButton onImport={handleImportData} />
              <ExportMenu data={exportData} columns={exportColumns} filename="contas-receber" pdfOptions={pdfOptions} />
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
                  <TableHead className="text-center">Cliente</TableHead>
                  <TableHead className="text-center">Nota Fiscal</TableHead>
                  <TableHead className="text-center">Data Emissão</TableHead>
                  <TableHead className="text-center">Valor</TableHead>
                  <TableHead className="text-center">Taxas/Juros</TableHead>
                  <TableHead className="text-center">Doc. Recebimento</TableHead>
                  <TableHead className="text-center">Data Baixa</TableHead>
                  <TableHead className="text-center">Valor Líq. Recebido</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8">Carregando…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8">Nenhuma conta encontrada.</TableCell></TableRow>
                ) : (
                  filtered.map((r) => {
                    const vencimento = new Date(r.vencimento);
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    const valorRecebido = Number(r.valorLiqRecebido || 0);
                    const valor = Number(r.valor || 0);
                    
                    let status = 'Em aberto';
                    let statusColor = 'secondary';
                    
                    if (valorRecebido >= valor) {
                      status = 'Recebido';
                      statusColor = 'default';
                    } else if (vencimento < hoje) {
                      status = 'Atrasado';
                      statusColor = 'destructive';
                    }

                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-center">{isoToBR(String(r.vencimento || '').slice(0, 10))}</TableCell>
                        <TableCell className="text-center">{r.cliente || '—'}</TableCell>
                        <TableCell className="text-center">{r.notaFiscal || '—'}</TableCell>
                        <TableCell className="text-center">{r.dataEmissao ? isoToBR(String(r.dataEmissao).slice(0, 10)) : '—'}</TableCell>
                        <TableCell className="text-center font-medium">{BRL(r.valor)}</TableCell>
                        <TableCell className="text-center">{BRL(r.taxasJuros)}</TableCell>
                        <TableCell className="text-center">{r.documentoRecebimento || '—'}</TableCell>
                        <TableCell className="text-center">{r.dataBaixa ? isoToBR(String(r.dataBaixa).slice(0, 10)) : '—'}</TableCell>
                        <TableCell className="text-center font-medium">{BRL(r.valorLiqRecebido)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={statusColor}>{status}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => openEdit(r)}>
                              <Edit className="size-4" />Editar
                            </Button>
                            <Button variant="destructive" size="sm" className="gap-2" onClick={() => handleDelete(r.id)}>
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
            Total: <strong>{filtered.length}</strong> conta(s) | A Receber: <strong>{BRL(totalAReceber)}</strong> | Recebido: <strong>{BRL(totalRecebidoLiq)}</strong> | Em Aberto: <strong className="text-orange-600">{BRL(totalEmAberto)}</strong>
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
        <DialogContent className="w-[95vw] sm:max-w-4xl p-0">
          <form onSubmit={submit} className="max-h-[80vh] flex flex-col">
            <div className="p-6 pb-2">
              <DialogHeader className="pb-2">
                <DialogTitle>{editing ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}</DialogTitle>
                <DialogDescription>
                  Registre uma nova conta a receber ou atualize uma existente.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                  <Label>Cliente *</Label>
                  <Input name="cliente" value={form.cliente} onChange={onChange} placeholder="Nome do cliente" required />
                </div>

                <div>
                  <Label>Nota Fiscal</Label>
                  <Input name="notaFiscal" value={form.notaFiscal} onChange={onChange} placeholder="Ex.: NF 12345" />
                </div>

                <div>
                  <Label>Data Emissão</Label>
                  <Input 
                    name="dataEmissao" 
                    placeholder="DD/MM/AAAA" 
                    inputMode="numeric" 
                    value={form.dataEmissao} 
                    onChange={onDateChange('dataEmissao')} 
                  />
                </div>

                <div>
                  <Label>Valor *</Label>
                  <Input type="number" step="0.01" name="valor" value={form.valor} onChange={onChange} required />
                </div>

                <div>
                  <Label>Taxas/Juros</Label>
                  <Input type="number" step="0.01" name="taxasJuros" value={form.taxasJuros} onChange={onChange} />
                </div>

                <div>
                  <Label>Documento Recebimento</Label>
                  <Input name="documentoRecebimento" value={form.documentoRecebimento} onChange={onChange} placeholder="Ex.: TED, PIX, etc." />
                </div>

                <div>
                  <Label>Data da Baixa</Label>
                  <Input 
                    name="dataBaixa" 
                    placeholder="DD/MM/AAAA" 
                    inputMode="numeric" 
                    value={form.dataBaixa} 
                    onChange={onDateChange('dataBaixa')} 
                  />
                </div>

                <div>
                  <Label>Valor Líquido Recebido</Label>
                  <Input type="number" step="0.01" name="valorLiqRecebido" value={form.valorLiqRecebido} onChange={onChange} />
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

export default ContasReceberTab;

