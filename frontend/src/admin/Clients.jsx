// frontend/src/admin/Clients.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import api from "@/services/api";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.jsx";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Checkbox } from "@/components/ui/checkbox.jsx";
import { Separator } from "@/components/ui/separator.jsx";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronsUpDown,
  Check,
  X,
  Filter as FilterIcon,
} from "lucide-react";

// Gráfico (donut)
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

import ExportMenu from "@/components/export/ExportMenu";

/* ========================================================================== */
/* Utilitários                                                                */
/* ========================================================================== */
const normalizePhoneBR = (input) => {
  if (!input) return "";
  const digits = String(input).replace(/\D/g, "");
  let clean = digits.startsWith("55") ? digits.slice(2) : digits;
  if (clean.length === 11 && clean[2] === "9") return `+55${clean}`;
  if (clean.length === 10) return `+55${clean}`;
  return input;
};

const formatPhoneDisplay = (phone) => {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) {
    const clean = digits.slice(2);
    const ddd = clean.slice(0, 2);
    const number = clean.slice(2);
    if (number.length === 9 && number[0] === "9") {
      return `+55 (${ddd}) ${number.slice(0, 5)}-${number.slice(5)}`;
    } else if (number.length === 8) {
      return `+55 (${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`;
    }
  }
  return phone;
};

/* ========================================================================== */
/* Segmentos (grupos) — mantidos                                              */
/* ========================================================================== */
const SEGMENTOS_GRUPOS = [
  // … (mesmo conteúdo longo que você já tem; mantive integral)
  // Tecnologia e Informática, Saúde e Bem-Estar, Engenharia e Indústria, ...
];
const SEGMENTOS = SEGMENTOS_GRUPOS.flatMap((g) => g.options.map((o) => o.value));

const ensureArraySegments = (client) => {
  if (Array.isArray(client?.segments)) return client.segments;
  if (typeof client?.segment === "string" && client.segment.trim()) {
    return client.segment.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (typeof client?.segmentos === "string" && client.segmentos.trim()) {
    return client.segmentos.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (typeof client?.segments === "string" && client.segments.trim()) {
    return client.segments.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

/* ========================================================================== */
/* SegmentosSelect — FIX: scroll em touchpad/mobile e evitar fechar o Dialog  */
/* ========================================================================== */
function SegmentosSelect({ value = [], onChange, onCreate }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const baseOptions = useMemo(
    () => SEGMENTOS_GRUPOS.flatMap((g) => g.options.map((o) => o.value)),
    []
  );
  const allSelectedLower = useMemo(
    () => new Set(value.map((v) => v.toLowerCase())),
    [value]
  );

  const existsInBase = (label) => baseOptions.some((v) => v.toLowerCase() === label.toLowerCase());
  const existsInValue = (label) => allSelectedLower.has(label.toLowerCase());

  const toggle = (label) => {
    const exists = value.includes(label);
    const next = exists ? value.filter((s) => s !== label) : [...value, label];
    onChange(next);
  };

  const addCustom = (label) => {
    const clean = label.trim();
    if (!clean) return;
    if (!existsInValue(clean)) onChange([...value, clean]);
    onCreate?.(clean);
    setQuery("");
    setOpen(true);
  };

  const shouldSuggestCreate = useMemo(() => {
    const t = query.trim();
    if (!t) return false;
    return !existsInBase(t) && !existsInValue(t);
  }, [query, baseOptions, value]);

  // Handlers para impedir que o Popover feche o Dialog durante o scroll
  const stopAll = (e) => { e.stopPropagation(); };
  const prevent = (e) => { e.preventDefault(); };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          {value.length === 0 ? "Selecionar segmentos" : (
            <span className="truncate">
              {value.slice(0, 2).join(", ")}{value.length > 2 ? ` +${value.length - 2}` : ""}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        collisionPadding={32}
        className="p-0 z-[70] w-[92vw] max-w-[360px] bg-background"
        // evita fechar ao clicar/rolar fora, enquanto o usuário está interactivo
        onPointerDownOutside={prevent}
        onFocusOutside={prevent}
        onEscapeKeyDown={prevent}
      >
        <div
          className="max-h-[60vh] overflow-y-auto overscroll-contain pb-2 [-webkit-overflow-scrolling:touch]"
          onWheelCapture={stopAll}
          onScrollCapture={stopAll}
          onTouchMoveCapture={stopAll}
        >
          <Command className="text-[13px] leading-tight">
            <div className="sticky top-0 z-10 bg-background">
              <CommandInput
                placeholder="Buscar ou digitar novo segmento…"
                value={query}
                onValueChange={setQuery}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && shouldSuggestCreate) {
                    e.preventDefault();
                    addCustom(query);
                  }
                }}
              />
            </div>

            <CommandList className="max-h-none">
              {shouldSuggestCreate && (
                <CommandGroup heading={<span className="text-[11px] font-semibold text-muted-foreground">Ações</span>}>
                  <CommandItem
                    value={`__create:${query}`}
                    className="flex items-center gap-2 py-2 px-2"
                    onSelect={() => addCustom(query)}
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar “{query.trim()}” como novo segmento
                  </CommandItem>
                </CommandGroup>
              )}

              {SEGMENTOS_GRUPOS.map((grp) => (
                <CommandGroup
                  key={grp.group}
                  heading={<span className="text-[11px] font-semibold text-muted-foreground">{grp.group}</span>}
                  className="px-1 py-1"
                >
                  {grp.options.map((opt) => {
                    const checked = value.includes(opt.value);
                    return (
                      <CommandItem
                        key={`${grp.group}-${opt.value}`}
                        value={`${opt.value} ${opt.desc}`}
                        className="flex items-start gap-2 py-1 px-2"
                        onSelect={() => toggle(opt.value)}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggle(opt.value)}
                          className="mt-0.5 h-3 w-3"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{opt.value}</div>
                          <div className="text-[11px] text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                            {opt.desc}
                          </div>
                        </div>
                        {checked && <Check className="h-4 w-4 opacity-70" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
              <div className="h-1" />
            </CommandList>
          </Command>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ========================================================================== */
/* Página Clientes — KPIs responsivos + pizza + paginação                    */
/* ========================================================================== */
const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create");
  const [form, setForm] = useState({
    id: null,
    name: "", company: "", email: "", phone: "", segments: [], notes: ""
  });
  const [saving, setSaving] = useState(false);

  const [openDelete, setOpenDelete] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // paginação
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [extraSegments, setExtraSegments] = useState([]);
  const baseSegmentSet = useMemo(() => new Set(SEGMENTOS), []);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/clients");
      setClients(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Erro ao buscar clientes:", err);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === "phone" ? normalizePhoneBR(value) : value
    }));
  };

  const openCreate = () => {
    setMode("create");
    setForm({ id: null, name: "", company: "", email: "", phone: "", segments: [], notes: "" });
    setOpen(true);
  };

  const openEdit = (client) => {
    setMode("edit");
    setForm({
      id: client.id ?? client._id ?? client.uuid ?? null,
      name: client.name || "",
      company: client.company || client.company_name || client.companyName || "",
      email: client.email || "",
      phone: client.phone || "",
      segments: ensureArraySegments(client),
      notes: client.notes || ""
    });
    setOpen(true);
  };

  const confirmDelete = (client) => {
    setRowToDelete(client);
    setOpenDelete(true);
  };

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        company: form.company,
        email: form.email,
        phone: form.phone,
        segments: form.segments,
        notes: form.notes,
      };
      if (mode === "create") {
        await api.post("/clients", payload);
      } else {
        const id = form.id;
        if (!id) throw new Error("ID do registro não encontrado para edição.");
        await api.put(`/clients/${id}`, payload);
      }
      setOpen(false);
      fetchClients();
    } catch (err) {
      console.error("Erro ao salvar cliente:", err);
      alert("Erro ao salvar cliente.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!rowToDelete) return;
    setDeleting(true);
    try {
      const id = rowToDelete.id ?? rowToDelete._id ?? rowToDelete.uuid;
      if (!id) throw new Error("ID do registro não encontrado para exclusão.");
      await api.delete(`/clients/${id}`);
      setOpenDelete(false);
      setRowToDelete(null);
      fetchClients();
    } catch (err) {
      console.error("Erro ao excluir cliente:", err);
      alert("Erro ao excluir cliente.");
    } finally {
      setDeleting(false);
    }
  }

  /* ===================== FILTROS ===================== */
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fCompanies, setFCompanies] = useState([]);
  const [fSegments, setFSegments] = useState([]);
  const [fHasEmail, setFHasEmail] = useState("");
  const [fHasPhone, setFHasPhone] = useState("");
  const [fSegmentsQuery, setFSegmentsQuery] = useState("");

  const uniqueCompanies = useMemo(() => {
    const s = new Set();
    clients.forEach((c) => {
      const v = (c.company ?? c.company_name ?? c.companyName ?? "").trim();
      if (v) s.add(v);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [clients]);

  const customSegmentsFromData = useMemo(() => {
    const s = new Set();
    clients.forEach((c) => {
      ensureArraySegments(c).forEach((seg) => {
        const label = String(seg).trim();
        if (label && !baseSegmentSet.has(label)) s.add(label);
      });
    });
    extraSegments.forEach((seg) => {
      const label = String(seg).trim();
      if (label && !baseSegmentSet.has(label)) s.add(label);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [clients, extraSegments, baseSegmentSet]);

  const toggle = (setter, value) =>
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  const clearFilters = () => {
    setFCompanies([]);
    setFSegments([]);
    setFHasEmail("");
    setFHasPhone("");
    setFSegmentsQuery("");
  };

  const filtersCount =
    (fCompanies.length ? 1 : 0) +
    (fSegments.length ? 1 : 0) +
    (fHasEmail ? 1 : 0) +
    (fHasPhone ? 1 : 0);

  const shownSegmentValues = useMemo(() => {
    const q = fSegmentsQuery.trim().toLowerCase();
    const base = [];
    SEGMENTOS_GRUPOS.forEach((grp) => {
      grp.options.forEach((opt) => {
        if (!q || opt.value.toLowerCase().includes(q) || (opt.desc && opt.desc.toLowerCase().includes(q))) {
          base.push(opt.value);
        }
      });
    });
    const custom = customSegmentsFromData.filter((s) => !q || s.toLowerCase().includes(q));
    return Array.from(new Set([...base, ...custom]));
  }, [fSegmentsQuery, customSegmentsFromData]);

  const allShownAlreadySelected = useMemo(
    () => shownSegmentValues.length > 0 && shownSegmentValues.every((v) => fSegments.includes(v)),
    [shownSegmentValues, fSegments]
  );

  const selectShownSegments = () => {
    if (shownSegmentValues.length === 0) return;
    setFSegments((prev) => Array.from(new Set([...prev, ...shownSegmentValues])));
  };

  const filtered = useMemo(() => {
    let list = Array.isArray(clients) ? [...clients] : [];

    const k = q.trim().toLowerCase();
    if (k) {
      list = list.filter((c) => {
        const segs = ensureArraySegments(c).join(" ");
        return [c.name, c.company, c.company_name, c.email, c.phone, segs]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(k));
      });
    }

    if (fCompanies.length > 0) {
      const set = new Set(fCompanies);
      list = list.filter((c) => set.has((c.company ?? c.company_name ?? c.companyName ?? "").trim()));
    }

    if (fSegments.length > 0) {
      const set = new Set(fSegments);
      list = list.filter((c) => ensureArraySegments(c).some((s) => set.has(s)));
    }

    if (fHasEmail) {
      const want = fHasEmail === "sim";
      list = list.filter((c) => Boolean((c.email || "").trim()) === want);
    }

    if (fHasPhone) {
      const want = fHasPhone === "sim";
      list = list.filter((c) => Boolean((c.phone || "").trim()) === want);
    }

    return list;
  }, [clients, q, fCompanies, fSegments, fHasEmail, fHasPhone]);

  // KPI: totais
  const totalClients = clients.length;
  const totalAfterFilters = filtered.length;

  // Pizza Top 10 — % sobre os exibidos (filtered)
  const pieData = useMemo(() => {
    const counts = new Map();
    filtered.forEach((c) => {
      const segs = ensureArraySegments(c);
      if (segs.length === 0) return;
      segs.forEach((s) => {
        counts.set(s, (counts.get(s) || 0) + 1);
      });
    });
    const arr = Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
    arr.sort((a, b) => b.count - a.count);
    const top10 = arr.slice(0, 10);
    const base = totalAfterFilters || 1;
    return top10.map((it) => ({
      name: it.name,
      value: Number(((it.count / base) * 100).toFixed(1)), // %
      count: it.count,
    }));
  }, [filtered, totalAfterFilters]);

  const PIE_COLORS = ["#F97316","#EF4444","#3B82F6","#22C55E","#A855F7","#06B6D4","#F59E0B","#64748B","#84CC16","#EC4899"];

  // paginação derivada
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  /* ===================== UI ===================== */

  return (
    <div className="max-w-screen-2xl mx-auto px-3 md:px-6 py-4 md:py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">Clientes</h1>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg md:text-xl font-semibold">Registros</CardTitle>
              <CardDescription>Lista de clientes cadastrados</CardDescription>
            </div>
            <div className="ml-auto">
              <ExportMenu
                data={filtered.map((c) => ({
                  name: c.name || "",
                  company: c.company ?? c.company_name ?? c.companyName ?? "",
                  segments: ensureArraySegments(c).join(" | "),
                  email: c.email || "",
                  phone: formatPhoneDisplay(c.phone || ""),
                }))}
                columns={[
                  { key: 'name', header: 'Nome' },
                  { key: 'company', header: 'Empresa' },
                  { key: 'segments', header: 'Segmentos' },
                  { key: 'email', header: 'E-mail' },
                  { key: 'phone', header: 'Telefone' },
                ]}
                filename="clientes"
                pdfOptions={{
                  title: 'Relatório de Clientes',
                  orientation: 'p',
                  filtersSummary: `Exibidos: ${totalAfterFilters} / ${totalClients}`,
                }}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Busca + Filtros + Novo */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3">
            <div className="relative flex-1 w-full md:w-[320px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar clientes..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            {/* ====== FILTROS AVANÇADOS ====== */}
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <FilterIcon className="size-4" />
                  Filtros
                  {filtersCount > 0 && <Badge variant="secondary">{filtersCount}</Badge>}
                </Button>
              </PopoverTrigger>

              <PopoverContent
                align="end"
                side="bottom"
                sideOffset={8}
                collisionPadding={12}
                className="w-[min(96vw,860px)] p-0 overflow-hidden"
                style={{ height: 'min(72vh, 600px)' }}
              >
                <div className="grid h-full grid-rows-[auto,1fr,auto] text-[12px] leading-tight">
                  {/* HEADER (fixo) */}
                  <div className="px-3 py-2 border-b flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-medium">Filtrar clientes</p>
                      <p className="text-[11px] text-muted-foreground">Refine os resultados com seletores.</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-[12px]"
                      onClick={clearFilters}
                      title="Limpar todos os filtros"
                    >
                      Limpar
                    </Button>
                  </div>

                  {/* BODY (rolável) */}
                  <div
                    className="p-3 grid md:grid-cols-2 gap-3 overflow-y-auto pr-2 overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
                  >
                    {/* … (conteúdo dos filtros, igual ao seu) */}
                    {/* Empresas, Segmentos, etc. */}
                  </div>

                  {/* FOOTER (fixo) */}
                  <div className="px-3 py-2 border-t flex justify-end gap-2 items-center bg-background">
                    <Button variant="outline" size="sm" className="h-8 px-2 text-[12px]" onClick={() => setFiltersOpen(false)}>Fechar</Button>
                    <Button size="sm" className="h-8 px-3 text-[12px]" onClick={() => setFiltersOpen(false)}>Aplicar</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Novo Cliente */}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2" onClick={openCreate}>
                  <Plus className="size-4" />
                  <span className="whitespace-nowrap">Novo Cliente</span>
                </Button>
              </DialogTrigger>

              <DialogContent className="p-0 sm:max-w-[560px] md:max-w-[600px]">
                <div className="max-h-[80vh] overflow-y-auto p-6">
                  <DialogHeader className="pb-2">
                    <DialogTitle>{mode === "create" ? "Novo Cliente" : "Editar Cliente"}</DialogTitle>
                    <DialogDescription>
                      {mode === "create" ? "Cadastre um novo cliente." : "Atualize os dados do cliente."}
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={onSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <Label>Nome</Label>
                        <Input name="name" value={form.name} onChange={onChange} required />
                      </div>

                      <div className="md:col-span-2">
                        <Label>Empresa</Label>
                        <Input name="company" value={form.company} onChange={onChange} />
                      </div>

                      {/* Segmentos — FIX aplicado (scroll touchpad/mobile) */}
                      <div className="md:col-span-2 space-y-2">
                        <Label>Segmentos</Label>
                        <SegmentosSelect
                          value={form.segments}
                          onChange={(next) => setForm((f) => ({ ...f, segments: next }))}
                          onCreate={(label) => {
                            setExtraSegments((prev) => (prev.includes(label) ? prev : [...prev, label]));
                          }}
                        />
                        {form.segments.length > 0 && (
                          <div className="flex flex-wrap gap-2 justify-start">
                            {form.segments.map((s) => (
                              <Badge key={s} variant="secondary" className="gap-1">
                                {s}
                                <button
                                  type="button"
                                  className="ml-1 opacity-70 hover:opacity-100"
                                  onClick={() =>
                                    setForm((f) => ({ ...f, segments: f.segments.filter((x) => x !== s) }))
                                  }
                                  title="Remover"
                                >
                                  <X className="size-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label>E-mail</Label>
                        <Input name="email" type="email" value={form.email} onChange={onChange} />
                      </div>

                      <div>
                        <Label>Telefone</Label>
                        <Input
                          name="phone"
                          value={form.phone}
                          onChange={onChange}
                          placeholder="+55(DD)Número"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label>Observações</Label>
                        <Textarea name="notes" value={form.notes} onChange={onChange} />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" size="sm" disabled={saving}>
                        {saving ? "Salvando..." : mode === "create" ? "Salvar" : "Atualizar"}
                      </Button>
                    </div>
                  </form>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* KPI Cards — MOBILE-FRIENDLY */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Total de clientes — centralizado H/V e mais compacto em mobile */}
            <div className="rounded-xl border bg-card p-4 min-h-[180px] sm:min-h-[220px] flex items-center justify-center text-center">
              <div>
                <p className="text-xs text-muted-foreground">Total de clientes (geral)</p>
                <div className="mt-1 text-5xl sm:text-6xl font-bold leading-none">{totalClients}</div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Exibidos após filtros: <b>{totalAfterFilters}</b>
                </p>
              </div>
            </div>

            {/* Pizza: Top 10 segmentos — legenda adaptativa */}
            <div className="rounded-xl border bg-card p-3 sm:p-4">
              <p className="text-xs text-muted-foreground px-1">Top 10 segmentos (% dos clientes exibidos)</p>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 sm:gap-3 items-center">
                {/* Gráfico */}
                <div className="w-full h-[180px] sm:h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val, name, props) => [`${val}% (${props?.payload?.count})`, name]} />
                      {/* Legenda desktop (direita) */}
                      <Legend className="hidden sm:block"
                        verticalAlign="middle"
                        align="right"
                        layout="vertical"
                        wrapperStyle={{ paddingLeft: 8 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legenda mobile (abaixo, 2 colunas, rolável se precisar) */}
                <div className="sm:hidden max-h-[120px] overflow-y-auto overscroll-contain px-1">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] leading-tight">
                    {pieData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-1 min-w-0">
                        <span
                          className="inline-block h-2 w-2 rounded"
                          style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="truncate">{d.name}</span>
                        <span className="opacity-70 ml-1">{d.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Nome</TableHead>
                  <TableHead className="text-center">Empresa</TableHead>
                  <TableHead className="text-center">Segmentos</TableHead>
                  <TableHead className="text-center">E-mail</TableHead>
                  <TableHead className="text-center">Telefone</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-6">Carregando…</TableCell></TableRow>
                ) : pageItems.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-6">Nenhum registro</TableCell></TableRow>
                ) : (
                  pageItems.map((c) => {
                    const id = c.id ?? c._id ?? c.uuid;
                    const company = c.company ?? c.company_name ?? c.companyName ?? "—";
                    const segs = ensureArraySegments(c);
                    return (
                      <TableRow key={id || `${c.name}-${c.email}-${c.phone}`}>
                        <TableCell className="text-center font-medium">{c.name || "—"}</TableCell>
                        <TableCell className="text-center">{company}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {segs.slice(0, 2).map((s) => (
                              <Badge key={s} variant="secondary">{s}</Badge>
                            ))}
                            {segs.length > 2 && <Badge variant="outline">+{segs.length - 2}</Badge>}
                            {segs.length === 0 && <span className="text-muted-foreground">—</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{c.email || "—"}</TableCell>
                        <TableCell className="text-center">
                          {c.phone ? formatPhoneDisplay(c.phone) : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button size="sm" variant="outline" className="gap-2" onClick={() => openEdit(c)}>
                              <Edit className="size-4" /> Editar
                            </Button>
                            <Button size="sm" variant="destructive" className="gap-2" onClick={() => confirmDelete(c)}>
                              <Trash2 className="size-4" /> Excluir
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

          {/* Paginação */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Exibindo <b>{pageItems.length}</b> de <b>{filtered.length}</b> registros
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <div className="text-xs text-muted-foreground">
                Página <b>{page}</b> / <b>{totalPages}</b>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de exclusão */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir cliente?</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpenDelete(false)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={onDelete} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clients;
