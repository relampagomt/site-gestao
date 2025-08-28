// frontend/src/admin/Commercial.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import api from "@/services/api";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog.jsx";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Plus, Search, Edit, Trash2, Filter as FilterIcon } from "lucide-react";

// Export CSV/XLSX (mesmo componente usado nas outras páginas)
import ExportMenu from "@/components/export/ExportMenu";

/* ================= Helpers ================= */

// número flex (aceita "1.234,56", "1234.56" etc)
const parseFlex = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  let s = String(v).trim();
  if (!s) return 0;
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};
const BRL = (n) =>
  Number(parseFlex(n)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const INT_BR = (n) => new Intl.NumberFormat("pt-BR").format(Number(n || 0));

// estágios do funil (padronizados)
const STAGES = [
  "Novo",
  "Em contato",
  "Qualificando",
  "Proposta",
  "Negociação",
  "Fechado (ganho)",
  "Fechado (perdido)",
];

// origens comuns (exemplo — ajuste livre)
const SOURCES = [
  "Indicação",
  "Orgânico",
  "Tráfego Pago",
  "WhatsApp",
  "Instagram",
  "Site",
  "Evento",
];

/* Hook utilitário para carregar listas */
const useList = (path) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const reload = async () => {
    setLoading(true); setErr("");
    try {
      const { data } = await api.get(path);
      setData(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr("Falha ao carregar registros.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, [path]);
  return { data, loading, err, reload, setData };
};

/* ================= Modelo ================= */
const emptyRecord = () => ({
  name: "",
  company: "",
  phone: "",
  stage: "Novo",
  value: "",
  source: "",
  notes: "",
});

export default function Commercial() {
  // fonte oficial: apenas REGISTROS (sem a aba de Ordens para evitar redundância)
  const records = useList("/commercial/records");

  // busca / filtros
  const [q, setQ] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fStage, setFStage] = useState("");
  const [fSource, setFSource] = useState("");
  const activeFiltersCount = (fStage ? 1 : 0) + (fSource ? 1 : 0);

  // paginação
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // formulário (criar/editar)
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyRecord());
  const [editId, setEditId] = useState(null);

  const resetForm = () => {
    setForm(emptyRecord());
    setEditId(null);
  };

  // normalização + filtros locais
  const normalized = useMemo(() => {
    return (records.data || []).map((r) => ({
      ...r,
      _value: parseFlex(r.value),
      _stage: r.stage || "Novo",
      _source: r.source || "",
      _name: r.name || "",
      _company: r.company || "",
      _phone: r.phone || "",
      _notes: r.notes || "",
    }));
  }, [records.data]);

  const filtered = useMemo(() => {
    let list = [...normalized];

    // busca livre por nome/empresa/telefone/origem/estágio
    const k = q.trim().toLowerCase();
    if (k) {
      list = list.filter((r) =>
        [r._name, r._company, r._phone, r._source, r._stage]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(k))
      );
    }

    // filtros
    if (fStage) list = list.filter((r) => r._stage === fStage);
    if (fSource) list = list.filter((r) => r._source === fSource);

    // ordenação simples: por estágio & nome
    list.sort((a, b) =>
      STAGES.indexOf(a._stage) - STAGES.indexOf(b._stage) ||
      String(a._name).localeCompare(String(b._name), "pt-BR")
    );

    return list;
  }, [normalized, q, fStage, fSource]);

  // KPIs
  const kpiCount = filtered.length;
  const kpiPipeline = useMemo(() => {
    // considera tudo que NÃO está perdido
    return filtered
      .filter((r) => r._stage !== "Fechado (perdido)")
      .reduce((s, r) => s + parseFlex(r._value), 0);
  }, [filtered]);
  const kpiWon = useMemo(() => {
    return filtered
      .filter((r) => r._stage === "Fechado (ganho)")
      .reduce((s, r) => s + parseFlex(r._value), 0);
  }, [filtered]);

  // pagina atual
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  // export (apenas a página atual, como nas outras telas)
  const exportData = useMemo(() => {
    return pageItems.map((r) => ({
      "Nome": r._name,
      "Empresa": r._company,
      "Telefone": r._phone,
      "Estágio": r._stage,
      "Valor": parseFlex(r._value),
      "Origem": r._source,
      "Notas": r._notes,
    }));
  }, [pageItems]);

  // handlers
  const onFormChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };
  const openCreate = () => { resetForm(); setFormOpen(true); };
  const openEdit = (row) => {
    setEditId(row.id);
    setForm({
      name: row.name || "",
      company: row.company || "",
      phone: row.phone || "",
      stage: row.stage || "Novo",
      value: String(row.value ?? ""),
      source: row.source || "",
      notes: row.notes || "",
    });
    setFormOpen(true);
  };
  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      value: parseFlex(form.value),
    };
    const method = editId ? "put" : "post";
    const url = editId ? `/commercial/records/${editId}` : `/commercial/records`;
    await api[method](url, payload);
    setFormOpen(false);
    resetForm();
    records.reload();
  };
  const del = async (row) => {
    if (!confirm("Excluir este registro?")) return;
    await api.delete(`/commercial/records/${row.id}`);
    records.reload();
  };

  const clearFilters = () => {
    setQ("");
    setFStage("");
    setFSource("");
  };
  const goPrev = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const goNext = useCallback(() => setPage((p) => Math.min(totalPages, p + 1)), [totalPages]);

  /* ================= UI ================= */
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-xl">Comercial — Registros</CardTitle>
              <CardDescription>CRM simples para contatos e oportunidades</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={openCreate}>
                <Plus className="mr-2 size-4" />
                Novo Registro
              </Button>

              <ExportMenu
                data={exportData}
                fileBaseName={`comercial_registros`}
                buttonProps={{ variant: "outline", size: "sm" }}
              />

              <Button
                variant={filtersOpen || activeFiltersCount ? "secondary" : "outline"}
                size="sm"
                onClick={() => setFiltersOpen(true)}
              >
                <FilterIcon className="mr-2 size-4" />
                Filtros {activeFiltersCount ? <Badge variant="secondary" className="ml-2">{activeFiltersCount}</Badge> : null}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Busca rápida */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative md:w-2/3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por nome, empresa, telefone, origem ou estágio..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="flex-1 md:text-right">
              {(q || fStage || fSource) ? (
                <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar filtros</Button>
              ) : null}
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Registros</p>
              <p className="text-2xl font-bold leading-tight">{INT_BR(kpiCount)}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Pipeline (R$)</p>
              <p className="text-2xl font-bold leading-tight">{BRL(kpiPipeline)}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Fechados (ganho)</p>
              <p className="text-2xl font-bold leading-tight">{BRL(kpiWon)}</p>
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table className="[text-align:_center] [&_th]:!text-center [&_td]:!text-center [&_th]:!align-middle [&_td]:!align-middle">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs md:text-sm">Nome</TableHead>
                  <TableHead className="text-xs md:text-sm">Empresa</TableHead>
                  <TableHead className="text-xs md:text-sm">Telefone</TableHead>
                  <TableHead className="text-xs md:text-sm">Estágio</TableHead>
                  <TableHead className="text-xs md:text-sm">Valor</TableHead>
                  <TableHead className="text-xs md:text-sm">Origem</TableHead>
                  <TableHead className="text-xs md:text-sm">Notas</TableHead>
                  <TableHead className="text-xs md:text-sm w-[160px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-muted-foreground">Carregando...</TableCell>
                  </TableRow>
                ) : pageItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-muted-foreground">Nenhum registro encontrado</TableCell>
                  </TableRow>
                ) : (
                  pageItems.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.name || "—"}</TableCell>
                      <TableCell>{r.company || "—"}</TableCell>
                      <TableCell>{r.phone || "—"}</TableCell>
                      <TableCell>{r.stage || "—"}</TableCell>
                      <TableCell className="font-medium">{BRL(r.value)}</TableCell>
                      <TableCell>{r.source || "—"}</TableCell>
                      <TableCell className="max-w-[280px] truncate" title={r.notes || ""}>
                        {r.notes || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-2">
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => openEdit(r)}>
                            <Edit className="size-4" /> Editar
                          </Button>
                          <Button variant="destructive" size="sm" className="gap-2" onClick={() => del(r)}>
                            <Trash2 className="size-4" /> Excluir
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginação */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="order-2 sm:order-1 text-xs text-muted-foreground">
              Exibindo <b>{pageItems.length}</b> de <b>{filtered.length}</b> — Pipeline exibido: <b>{BRL(kpiPipeline)}</b>
            </div>
            <div className="order-1 sm:order-2 flex items-center justify-between gap-2">
              <Button type="button" variant="outline" size="sm" className="min-w-[92px] h-9" disabled={page <= 1} onClick={goPrev}>Anterior</Button>
              <div className="shrink-0 text-xs tabular-nums">
                <span className="inline-block rounded-md border bg-muted/60 px-2.5 py-1">
                  Página <b>{page}</b><span className="opacity-60">/{totalPages}</span>
                </span>
              </div>
              <Button type="button" variant="outline" size="sm" className="min-w-[92px] h-9" disabled={page >= totalPages} onClick={goNext}>Próxima</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MODAL: FILTROS AVANÇADOS */}
      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Filtros</DialogTitle>
          </DialogHeader>

          <div className="grid md:grid-cols-12 gap-4">
            <div className="md:col-span-6">
              <Label className="text-xs">Estágio</Label>
              <select
                className="border rounded px-3 h-11 w-full"
                value={fStage}
                onChange={(e) => setFStage(e.target.value)}
              >
                <option value="">Todos</option>
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="md:col-span-6">
              <Label className="text-xs">Origem</Label>
              <select
                className="border rounded px-3 h-11 w-full"
                value={fSource}
                onChange={(e) => setFSource(e.target.value)}
              >
                <option value="">Todas</option>
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="md:col-span-12 flex items-center gap-2 pt-1">
              <Button type="button" onClick={() => setFiltersOpen(false)} className="px-6">Aplicar</Button>
              <Button type="button" variant="secondary" onClick={() => { clearFilters(); setFiltersOpen(false); }} className="px-6">Limpar filtros</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: CRIAR/EDITAR REGISTRO */}
      <Dialog open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Registro" : "Novo Registro"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={submit} className="grid md:grid-cols-12 gap-4">
            <div className="md:col-span-6">
              <Label className="text-xs">Nome</Label>
              <Input name="name" value={form.name} onChange={onFormChange} className="h-11 w-full" required />
            </div>

            <div className="md:col-span-6">
              <Label className="text-xs">Empresa</Label>
              <Input name="company" value={form.company} onChange={onFormChange} className="h-11 w-full" />
            </div>

            <div className="md:col-span-6">
              <Label className="text-xs">Telefone</Label>
              <Input name="phone" value={form.phone} onChange={onFormChange} className="h-11 w-full" placeholder="(00) 00000-0000" />
            </div>

            <div className="md:col-span-6">
              <Label className="text-xs">Estágio</Label>
              <select name="stage" value={form.stage} onChange={onFormChange} className="border rounded px-3 h-11 w-full">
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="md:col-span-6">
              <Label className="text-xs">Valor (R$)</Label>
              <Input name="value" value={form.value} onChange={onFormChange} className="h-11 w-full" placeholder="Ex.: 2.500,00" />
            </div>

            <div className="md:col-span-6">
              <Label className="text-xs">Origem</Label>
              <select name="source" value={form.source} onChange={onFormChange} className="border rounded px-3 h-11 w-full">
                <option value="">Selecione</option>
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="md:col-span-12">
              <Label className="text-xs">Notas</Label>
              <Textarea name="notes" value={form.notes} onChange={onFormChange} rows={4} />
            </div>

            <div className="md:col-span-12 flex items-center justify-end gap-2 pt-1">
              <DialogFooter className="gap-2">
                <Button type="button" variant="secondary" onClick={() => setFormOpen(false)} className="px-6">Cancelar</Button>
                <Button type="submit" className="px-6">{editId ? "Salvar" : "Adicionar"}</Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
