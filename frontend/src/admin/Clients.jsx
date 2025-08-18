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
  CommandEmpty,
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

// Import the new ExportMenu component
import ExportMenu from "@/components/export/ExportMenu";

/* ============================================================================
   TELEFONE BR (+55) — normalização e máscara com celular/fixo
   Regras:
   - Prefixo +55 sempre
   - Celular: 9 dígitos iniciando com 9
   - Fixo: 8 dígitos
   - Máscara visual: +55 (DD) 9XXXX-XXXX ou +55 (DD) XXXX-XXXX
============================================================================ */

const normalizePhoneBR = (input) => {
  if (!input) return "";
  const digits = input.replace(/\D/g, "");
  
  // Se começa com 55, remove
  let clean = digits.startsWith("55") ? digits.slice(2) : digits;
  
  // Se tem 11 dígitos e o terceiro é 9 (celular), ou 10 dígitos (fixo)
  if (clean.length === 11 && clean[2] === "9") {
    return `+55${clean}`;
  } else if (clean.length === 10) {
    return `+55${clean}`;
  }
  
  // Retorna como está se não se encaixa nos padrões
  return input;
};

const formatPhoneDisplay = (phone) => {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  
  if (digits.startsWith("55") && digits.length >= 12) {
    const clean = digits.slice(2);
    const ddd = clean.slice(0, 2);
    const number = clean.slice(2);
    
    if (number.length === 9 && number[0] === "9") {
      // Celular: +55 (DD) 9XXXX-XXXX
      return `+55 (${ddd}) ${number.slice(0, 5)}-${number.slice(5)}`;
    } else if (number.length === 8) {
      // Fixo: +55 (DD) XXXX-XXXX
      return `+55 (${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`;
    }
  }
  
  return phone;
};

/* ============================================================================
   SEGMENTOS — base + customizados
============================================================================ */

const baseSegments = [
  "Administrativo", "Alimentação", "Automotivo", "Beleza", "Construção",
  "Educação", "Eletrônicos", "Energia", "Entretenimento", "Esportes",
  "Farmacêutico", "Financeiro", "Imobiliário", "Industrial", "Jurídico",
  "Logística", "Moda", "Petróleo", "Saúde", "Tecnologia", "Telecomunicações",
  "Turismo", "Varejo"
];

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  // Modal de cadastro/edição
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create");
  const [form, setForm] = useState({
    name: "", company: "", email: "", phone: "", segments: [], notes: ""
  });
  const [saving, setSaving] = useState(false);

  // Modal de exclusão
  const [openDelete, setOpenDelete] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Segmentos extras (digitados pelo usuário nesta sessão)
  const [extraSegments, setExtraSegments] = useState([]);
  const baseSegmentSet = useMemo(() => new Set(baseSegments), []);

  // Buscar clientes
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

  // Garantir que segments seja sempre array
  const ensureArraySegments = (client) => {
    const segs = client?.segments;
    if (Array.isArray(segs)) return segs;
    if (typeof segs === "string") return segs.split(",").map(s => s.trim()).filter(Boolean);
    return [];
  };

  // Handlers do formulário
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === "phone" ? normalizePhoneBR(value) : value
    }));
  };

  const openCreate = () => {
    setMode("create");
    setForm({ name: "", company: "", email: "", phone: "", segments: [], notes: "" });
    setOpen(true);
  };

  const openEdit = (client) => {
    setMode("edit");
    setForm({
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

  // Submissão do formulário
  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (mode === "create") {
        await api.post("/clients", payload);
      } else {
        const id = rowToDelete?.id ?? rowToDelete?._id ?? rowToDelete?.uuid;
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

  /* ===================== FILTROS (NOVO) ===================== */
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fCompanies, setFCompanies] = useState([]);     // múltipla
  const [fSegments, setFSegments] = useState([]);      // múltipla
  const [fHasEmail, setFHasEmail] = useState("");      // '', 'sim', 'nao'
  const [fHasPhone, setFHasPhone] = useState("");      // '', 'sim', 'nao'

  const uniqueCompanies = useMemo(() => {
    const s = new Set();
    clients.forEach((c) => {
      const v = (c.company ?? c.company_name ?? c.companyName ?? "").trim();
      if (v) s.add(v);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [clients]);

  // Segs personalizados vindos dos dados + os digitados nesta sessão
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
  };

  const filtersCount =
    (fCompanies.length ? 1 : 0) +
    (fSegments.length ? 1 : 0) +
    (fHasEmail ? 1 : 0) +
    (fHasPhone ? 1 : 0);

  /* --------- Lista filtrada --------- */
  const filtered = useMemo(() => {
    let list = Array.isArray(clients) ? [...clients] : [];

    // busca por digitação (mantida)
    const k = q.trim().toLowerCase();
    if (k) {
      list = list.filter((c) => {
        const segs = ensureArraySegments(c).join(" ");
        return [c.name, c.company, c.company_name, c.email, c.phone, segs]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(k));
      });
    }

    // filtros avançados
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

  // Prepare data for export
  const exportData = useMemo(() => {
    return filtered.map((c) => ({
      name: c.name || "",
      company: c.company ?? c.company_name ?? c.companyName ?? "",
      segments: ensureArraySegments(c).join(" | "),
      email: c.email || "",
      phone: formatPhoneDisplay(c.phone || ""),
    }));
  }, [filtered]);

  const exportColumns = [
    { key: 'name', header: 'Nome' },
    { key: 'company', header: 'Empresa' },
    { key: 'segments', header: 'Segmentos' },
    { key: 'email', header: 'E-mail' },
    { key: 'phone', header: 'Telefone' },
  ];

  const pdfOptions = {
    title: 'Relatório de Clientes',
    orientation: 'p',
    filtersSummary: `Filtros aplicados: ${filtersCount > 0 ? 
      [
        fCompanies.length > 0 ? `Empresas: ${fCompanies.join(', ')}` : '',
        fSegments.length > 0 ? `Segmentos: ${fSegments.join(', ')}` : '',
        fHasEmail ? `E-mail: ${fHasEmail === 'sim' ? 'Com e-mail' : 'Sem e-mail'}` : '',
        fHasPhone ? `Telefone: ${fHasPhone === 'sim' ? 'Com telefone' : 'Sem telefone'}` : '',
      ].filter(Boolean).join(' | ') : 'Nenhum filtro aplicado'
    }`,
    columnStyles: {
      0: { cellWidth: 40 }, // Nome
      1: { cellWidth: 35 }, // Empresa
      2: { cellWidth: 45 }, // Segmentos
      3: { cellWidth: 35 }, // E-mail
      4: { cellWidth: 30 }, // Telefone
    }
  };

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
                data={exportData}
                columns={exportColumns}
                filename="clientes"
                pdfOptions={pdfOptions}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros + botões */}
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
                className="w-[min(92vw,620px)] p-0"
              >
                {/* flex column: header fixo, body rolável, footer fixo */}
                <div className="flex flex-col max-h-[calc(100vh-120px)]">
                  <div className="px-4 py-3 border-b">
                    <p className="text-sm font-medium">Filtrar clientes</p>
                    <p className="text-xs text-muted-foreground">Refine os resultados com seletores.</p>
                  </div>

                  {/* BODY */}
                  <div
                    className="p-4 grid md:grid-cols-2 gap-4 flex-1 overflow-y-auto pr-2 overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
                    onWheel={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                  >
                    {/* Empresas */}
                    <div className="space-y-2">
                      <Label>Empresas</Label>
                      <div className="max-h-[32vh] overflow-y-auto pr-1">
                        {uniqueCompanies.length === 0 ? (
                          <p className="text-xs text-muted-foreground">—</p>
                        ) : uniqueCompanies.map((comp) => (
                          <label key={comp} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={fCompanies.includes(comp)} onCheckedChange={() => toggle(setFCompanies, comp)} />
                            <span className="truncate">{comp}</span>
                          </label>
                        ))}
                      </div>

                      {/* Chips dos selecionados */}
                      {fCompanies.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {fCompanies.map((c) => (
                            <Badge key={c} variant="secondary" className="gap-1">
                              {c}
                              <button type="button" onClick={() => toggle(setFCompanies, c)} className="ml-1 opacity-70 hover:opacity-100">
                                <X className="size-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Segmentos */}
                    <div className="space-y-2">
                      <Label>Segmentos</Label>
                      <div className="max-h-[32vh] overflow-y-auto pr-1">
                        {/* Base */}
                        {baseSegments.map((seg) => (
                          <label key={seg} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={fSegments.includes(seg)} onCheckedChange={() => toggle(setFSegments, seg)} />
                            <span className="truncate">{seg}</span>
                          </label>
                        ))}
                        {/* Customizados */}
                        {customSegmentsFromData.map((seg) => (
                          <label key={seg} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={fSegments.includes(seg)} onCheckedChange={() => toggle(setFSegments, seg)} />
                            <span className="truncate italic text-muted-foreground">{seg}</span>
                          </label>
                        ))}
                      </div>

                      {/* Chips dos selecionados */}
                      {fSegments.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {fSegments.map((s) => (
                            <Badge key={s} variant="secondary" className="gap-1">
                              {s}
                              <button type="button" onClick={() => toggle(setFSegments, s)} className="ml-1 opacity-70 hover:opacity-100">
                                <X className="size-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* E-mail / Telefone */}
                    <div className="space-y-2">
                      <Label>E-mail</Label>
                      <select
                        className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                        value={fHasEmail}
                        onChange={(e) => setFHasEmail(e.target.value)}
                      >
                        <option value="">Todos</option>
                        <option value="sim">Com e-mail</option>
                        <option value="nao">Sem e-mail</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <select
                        className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                        value={fHasPhone}
                        onChange={(e) => setFHasPhone(e.target.value)}
                      >
                        <option value="">Todos</option>
                        <option value="sim">Com telefone</option>
                        <option value="nao">Sem telefone</option>
                      </select>
                    </div>
                  </div>

                  <div className="px-4 py-3 border-t flex justify-between">
                    <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar filtros</Button>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setFiltersOpen(false)}>Fechar</Button>
                      <Button size="sm" onClick={() => setFiltersOpen(false)}>Aplicar</Button>
                    </div>
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

              {/* Modal mais estreito e centralizado */}
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
                        <Label>Segmentos</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between">
                              {form.segments.length > 0 ? `${form.segments.length} selecionado(s)` : "Selecionar segmentos"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Buscar segmento..." />
                              <CommandList>
                                <CommandEmpty>Nenhum segmento encontrado.</CommandEmpty>
                                <CommandGroup>
                                  {baseSegments.map((segment) => (
                                    <CommandItem
                                      key={segment}
                                      onSelect={() => {
                                        setForm(prev => ({
                                          ...prev,
                                          segments: prev.segments.includes(segment)
                                            ? prev.segments.filter(s => s !== segment)
                                            : [...prev.segments, segment]
                                        }));
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          form.segments.includes(segment) ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      {segment}
                                    </CommandItem>
                                  ))}
                                  {customSegmentsFromData.map((segment) => (
                                    <CommandItem
                                      key={segment}
                                      onSelect={() => {
                                        setForm(prev => ({
                                          ...prev,
                                          segments: prev.segments.includes(segment)
                                            ? prev.segments.filter(s => s !== segment)
                                            : [...prev.segments, segment]
                                        }));
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          form.segments.includes(segment) ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      <span className="italic text-muted-foreground">{segment}</span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        
                        {/* Chips dos segmentos selecionados */}
                        {form.segments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {form.segments.map((segment) => (
                              <Badge key={segment} variant="secondary" className="gap-1">
                                {segment}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setForm(prev => ({
                                      ...prev,
                                      segments: prev.segments.filter(s => s !== segment)
                                    }));
                                  }}
                                  className="ml-1 opacity-70 hover:opacity-100"
                                >
                                  <X className="size-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
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

          {/* Tabela centralizada (títulos + dados) */}
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
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-6">Nenhum registro</TableCell></TableRow>
                ) : (
                  filtered.map((c) => {
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

