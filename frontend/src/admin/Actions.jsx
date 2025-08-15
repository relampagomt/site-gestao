// frontend/src/admin/Actions.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import { useAuth } from "../contexts/AuthContext";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Checkbox } from "@/components/ui/checkbox.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.jsx";
import { Separator } from "@/components/ui/separator.jsx";
import ImagePreview from "@/components/ImagePreview.jsx";

import {
  Plus, Edit, Trash2, Search, Calendar as CalendarIcon, Layers, X,
  CheckCircle, Loader2, Clock, UploadCloud, Filter as FilterIcon
} from "lucide-react";

import { formatDateBR } from "@/utils/dates.js";

/* ========= Tipos de ação ========= */
const ACTION_OPTIONS = [
  {
    group: "Serviços de Panfletagem e Distribuição",
    items: ["PAP (Porta a Porta)", "Arrastão", "Semáforos", "Ponto fixo", "Distribuição em eventos", "Carro de Som", "Entrega personalizada"],
  },
  {
    group: "Serviços de Ações Promocionais e Interação",
    items: ["Distribuição de Amostras (Sampling)", "Degustação", "Demonstração", "Blitz promocional", "Captação de cadastros", "Distribuição de Brindes"],
  },
  {
    group: "Serviços Complementares",
    items: ["Criação e design", "Confecção e produção", "Impressão", "Logística (Coleta e Entrega)", "Planejamento estratégico", "Relatório e monitoramento"],
  },
];

/* ========= Helpers ========= */
const ensureArrayTypes = (item) => {
  if (Array.isArray(item?.types)) return item.types;
  if (typeof item?.type === "string" && item.type.trim()) {
    return item.type.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

// status <-> active (compat)
const deriveStatusFromItem = (item) => {
  const s = String(item?.status || "").toLowerCase();
  if (s === "aguardando" || s === "andamento" || s === "concluída" || s === "concluida")
    return s === "concluida" ? "concluída" : s;
  if (typeof item?.active === "boolean") return item.active ? "andamento" : "aguardando";
  return "aguardando";
};
const activeFromStatus = (status) => status === "andamento";

// Datas em BR <-> ISO
const isYMD = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
const isDMY = (s) => /^\d{2}\/\d{2}\/\d{4}$/.test(String(s || ""));
const ymdToBR = (ymd) => (isYMD(ymd) ? `${ymd.slice(8,10)}/${ymd.slice(5,7)}/${ymd.slice(0,4)}` : "");
const brToYMD = (br) => {
  if (!isDMY(br)) return "";
  const [d, m, y] = br.split("/");
  return `${y}-${m}-${d}`;
};
const maskBR = (v) => {
  const d = String(v || "").replace(/\D/g, "").slice(0, 8);
  const p1 = d.slice(0, 2);
  const p2 = d.slice(2, 4);
  const p3 = d.slice(4, 8);
  return [p1, p2, p3].filter(Boolean).join("/");
};

// Upload (igual Materiais)
async function uploadFile(file) {
  if (!file) return "";
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post("/upload", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data?.url || data?.secure_url || data?.location || "";
}

/* ========= Estado inicial ========= */
const initialForm = {
  client_name: "",
  company_name: "",
  types: [],
  startBr: "",
  endBr: "",
  day_periods: [],
  material_qty: "",
  material_photo_url: "",
  notes: "",
  status: "aguardando",
};

const periodOptions = ["manhã", "tarde", "noite"];

/* ========= Componente ========= */
const Actions = () => {
  const { user } = useAuth();
  const isAdmin = String(user?.role || user?.claims?.role || "").toLowerCase() === "admin";

  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState([]);
  const [query, setQuery] = useState("");

  // dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // upload state
  const [uploadingMaterial, setUploadingMaterial] = useState(false);

  const [form, setForm] = useState({ ...initialForm });

  /* -------- Load -------- */
  const loadActions = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/actions");
      const list = Array.isArray(data) ? data : data?.actions || [];
      setActions(list);
    } catch (err) {
      console.error("Erro ao carregar ações:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadActions(); }, []);

  /* =================== FILTROS =================== */
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fStatus, setFStatus] = useState("");
  const [fTypes, setFTypes] = useState([]);
  const [fPeriods, setFPeriods] = useState([]);
  const [fStartBr, setFStartBr] = useState("");
  const [fEndBr, setFEndBr] = useState("");

  const toggleFilterType = (t) => setFTypes((prev) => prev.includes(t) ? prev.filter((i) => i !== t) : [...prev, t]);
  const toggleFilterPeriod = (p) => setFPeriods((prev) => prev.includes(p) ? prev.filter((i) => i !== p) : [...prev, p]);
  const onFilterDateChange = (setter) => (e) => setter(maskBR(e.target.value));
  const clearFilters = () => { setFStatus(""); setFTypes([]); setFPeriods([]); setFStartBr(""); setFEndBr(""); };
  const filtersCount = (fStatus ? 1 : 0) + (fTypes.length ? 1 : 0) + (fPeriods.length ? 1 : 0) + ((fStartBr || fEndBr) ? 1 : 0);

  /* -------- Filter -------- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const startF = brToYMD(fStartBr);
    const endF = brToYMD(fEndBr);
    let base = actions;

    if (q) {
      base = base.filter((a) => {
        const typesBlob = ensureArrayTypes(a).join(" ").toLowerCase();
        const statusBlob = deriveStatusFromItem(a);
        const blob = `${a.client_name} ${a.company_name} ${a.notes} ${typesBlob} ${statusBlob}`.toLowerCase();
        return blob.includes(q);
      });
    }
    if (fStatus) base = base.filter((a) => deriveStatusFromItem(a) === fStatus);
    if (fTypes.length > 0) base = base.filter((a) => fTypes.some((t) => ensureArrayTypes(a).includes(t)));
    if (fPeriods.length > 0) base = base.filter((a) => {
      const arr = Array.isArray(a.day_periods) ? a.day_periods : [];
      return fPeriods.some((p) => arr.includes(p));
    });
    if (startF || endF) {
      base = base.filter((a) => {
        const s = a.start_date || a.end_date || "";
        const e = a.end_date || a.start_date || "";
        if (!s || !e) return false;
        if (startF && e < startF) return false;
        if (endF && s > endF) return false;
        return true;
      });
    }
    return base;
  }, [actions, query, fStatus, fTypes, fPeriods, fStartBr, fEndBr]);

  /* -------- Form helpers -------- */
  const resetForm = () => setForm({ ...initialForm });
  const onChange = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));
  const onDateChange = (k) => (e) => onChange(k, maskBR(e.target.value));
  const toggleType = (type) => setForm((prev) => ({ ...prev, types: prev.types.includes(type) ? prev.types.filter((t) => t !== type) : [...prev.types, type] }));
  const togglePeriod = (period) => setForm((prev) => ({ ...prev, day_periods: prev.day_periods.includes(period) ? prev.day_periods.filter((p) => p !== period) : [...prev.day_periods, period] }));

  // Upload imediato da amostra
  const onMaterialChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMaterial(true);
    try {
      const url = await uploadFile(file);
      if (!url) throw new Error("Falha no upload da imagem.");
      setForm((f) => ({ ...f, material_photo_url: url }));
    } catch (err) {
      console.error("Erro no upload do material:", err);
      alert("Erro ao enviar a imagem. Tente novamente.");
    } finally {
      setUploadingMaterial(false);
    }
  };

  /* -------- Create -------- */
  const handleCreate = async (e) => {
    e.preventDefault();
    const startISO = brToYMD(form.startBr);
    const endISO = brToYMD(form.endBr);
    if (form.types.length === 0) return alert("Selecione ao menos um tipo de ação.");
    if (startISO && endISO && startISO > endISO) return alert("Data de término não pode ser anterior à data de início.");

    try {
      const payload = {
        client_name: form.client_name,
        company_name: form.company_name,
        types: form.types,
        type: form.types.join(", "),
        start_date: startISO || null,
        end_date: endISO || null,
        day_periods: form.day_periods,
        material_qty: Number(form.material_qty || 0),
        material_photo_url: form.material_photo_url || "",
        notes: form.notes || "",
        status: form.status,
        active: activeFromStatus(form.status),
      };
      await api.post("/actions", payload);
      await loadActions();
      setIsCreateOpen(false);
      resetForm();
    } catch (err) {
      console.error("Erro ao criar ação:", err);
      alert("Erro ao criar ação: " + (err?.response?.data?.message || err.message));
    }
  };

  /* -------- Edit -------- */
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      client_name: item.client_name || "",
      company_name: item.company_name || "",
      types: ensureArrayTypes(item),
      startBr: ymdToBR(item.start_date || ""),
      endBr: ymdToBR(item.end_date || ""),
      day_periods: Array.isArray(item.day_periods) ? item.day_periods : [],
      material_qty: item.material_qty ?? "",
      material_photo_url: item.material_photo_url || "",
      notes: item.notes || "",
      status: deriveStatusFromItem(item),
    });
    setIsEditOpen(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editing) return;
    const startISO = brToYMD(form.startBr);
    const endISO = brToYMD(form.endBr);
    if (form.types.length === 0) return alert("Selecione ao menos um tipo de ação.");
    if (startISO && endISO && startISO > endISO) return alert("Data de término não pode ser anterior à data de início.");

    try {
      const payload = {
        client_name: form.client_name,
        company_name: form.company_name,
        types: form.types,
        type: form.types.join(", "),
        start_date: startISO || null,
        end_date: endISO || null,
        day_periods: form.day_periods,
        material_qty: Number(form.material_qty || 0),
        material_photo_url: form.material_photo_url || "",
        notes: form.notes || "",
        status: form.status,
        active: activeFromStatus(form.status),
      };
      await api.put(`/actions/${editing.id}`, payload);
      await loadActions();
      setIsEditOpen(false);
      setEditing(null);
      resetForm();
    } catch (err) {
      console.error("Erro ao atualizar ação:", err);
      alert("Erro ao atualizar ação: " + (err?.response?.data?.message || err.message));
    }
  };

  /* -------- Delete -------- */
  const handleDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir esta ação?")) return;
    try {
      await api.delete(`/actions/${id}`);
      await loadActions();
    } catch (err) {
      console.error("Erro ao excluir ação:", err);
      alert("Erro ao excluir ação: " + (err?.response?.data?.message || err.message));
    }
  };

  /* -------- TypeSelector (scroll fix) -------- */
  const [typesPopoverOpen, setTypesPopoverOpen] = useState(false);
  const TypeSelector = () => (
    <Popover open={typesPopoverOpen} onOpenChange={setTypesPopoverOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="inline-flex flex-wrap gap-2">
            {form.types.length === 0 ? "Selecionar tipos" : (
              form.types.slice(0, 2).map((t) => <Badge key={t} variant="secondary" className="mr-1">{t}</Badge>)
            )}
            {form.types.length > 2 && <Badge variant="outline">+{form.types.length - 2}</Badge>}
          </span>
          <Layers className="size-4 opacity-70" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={8}
        className="p-0 w-[min(92vw,420px)] max-h-[70vh] overflow-hidden"
      >
        <div
          className="px-3 py-3 max-h-[60vh] overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Tipos de ação</span>
            {form.types.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => onChange("types", [])}>
                Limpar
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {ACTION_OPTIONS.map((group) => (
              <div key={group.group}>
                <p className="text-xs font-semibold text-muted-foreground mb-2">{group.group}</p>
                <div className="space-y-2">
                  {group.items.map((opt) => {
                    const checked = form.types.includes(opt);
                    return (
                      <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={checked} onCheckedChange={() => toggleType(opt)} />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
                <Separator className="my-3" />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setTypesPopoverOpen(false)}>Fechar</Button>
            <Button onClick={() => setTypesPopoverOpen(false)}>Aplicar</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );

  /* ===================== RENDER ===================== */
  return (
    <div className="admin-page-container admin-space-y-6">
      <Card className="admin-card">
        <CardHeader className="admin-card-header admin-page-header">
          <div>
            <CardTitle className="admin-page-title">Ações</CardTitle>
            <CardDescription className="admin-card-description">
              Cadastre e gerencie ações promocionais e de distribuição.
            </CardDescription>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 opacity-60" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por cliente, empresa, tipo, status ou observação"
                className="pl-9 w-full sm:w-[260px]"
              />
            </div>

            {/* ====== FILTROS (fix: container flex com body rolável) ====== */}
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <FilterIcon className="size-4" />
                  Filtros
                  {filtersCount > 0 && (
                    <Badge variant="secondary" className="ml-1">{filtersCount}</Badge>
                  )}
                </Button>
              </PopoverTrigger>

              <PopoverContent
                align="end"
                side="bottom"
                sideOffset={8}
                collisionPadding={12}
                className="w-[min(92vw,560px)] p-0"
              >
                {/* container FLEX controla a altura máxima; body faz o scroll */}
                <div className="flex flex-col max-h-[calc(100vh-220px)]">
                  <div className="px-4 py-3 border-b">
                    <p className="text-sm font-medium">Filtrar ações</p>
                    <p className="text-xs text-muted-foreground">Refine os resultados com seletores.</p>
                  </div>

                  {/* BODY ROLÁVEL */}
                  <div
                    className="p-4 grid md:grid-cols-2 gap-4 flex-1 overflow-y-auto overscroll-contain touch-pan-y pr-2 [-webkit-overflow-scrolling:touch]"
                    onWheel={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                  >
                    {/* Status */}
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <select
                        className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                        value={fStatus}
                        onChange={(e) => setFStatus(e.target.value)}
                      >
                        <option value="">Todos</option>
                        <option value="aguardando">Aguardando</option>
                        <option value="andamento">Andamento</option>
                        <option value="concluída">Concluída</option>
                      </select>
                    </div>

                    {/* Períodos */}
                    <div className="space-y-2">
                      <Label>Períodos do dia</Label>
                      <div className="flex flex-wrap gap-4">
                        {periodOptions.map((p) => (
                          <label key={p} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox checked={fPeriods.includes(p)} onCheckedChange={() => toggleFilterPeriod(p)} />
                            <span className="text-sm">{p}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Tipos */}
                    <div className="space-y-2 md:col-span-2">
                      <Label>Tipo(s) de ação</Label>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {ACTION_OPTIONS.map((group) => (
                          <div key={group.group} className="sm:col-span-2">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">{group.group}</p>
                            <div className="grid sm:grid-cols-2 gap-2">
                              {group.items.map((opt) => (
                                <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                                  <Checkbox checked={fTypes.includes(opt)} onCheckedChange={() => toggleFilterType(opt)} />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                            <Separator className="my-3" />
                          </div>
                        ))}
                      </div>
                      {fTypes.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {fTypes.map((t) => (
                            <Badge key={t} variant="secondary" className="gap-1">
                              {t}
                              <button type="button" onClick={() => toggleFilterType(t)} className="ml-1 opacity-70 hover:opacity-100">
                                <X className="size-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Intervalo de datas */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><CalendarIcon className="size-4" /> Início (de)</Label>
                      <Input placeholder="DD/MM/AAAA" inputMode="numeric" value={fStartBr} onChange={onFilterDateChange(setFStartBr)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><CalendarIcon className="size-4" /> Término (até)</Label>
                      <Input placeholder="DD/MM/AAAA" inputMode="numeric" value={fEndBr} onChange={onFilterDateChange(setFEndBr)} />
                    </div>
                  </div>

                  <div className="px-4 py-3 border-t flex justify-between">
                    <Button variant="ghost" onClick={clearFilters}>Limpar filtros</Button>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setFiltersOpen(false)}>Fechar</Button>
                      <Button onClick={() => setFiltersOpen(false)}>Aplicar</Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Modal CRIAR */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="admin-btn-primary">
                  <Plus className="h-5 w-5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                  <span className="whitespace-nowrap">Nova Ação</span>
                </Button>
              </DialogTrigger>

              <DialogContent className="w-full max-w-lg max-h-[85vh] overflow-y-auto p-0">
                <div className="px-5 pt-5 pb-3 border-b">
                  <DialogHeader>
                    <DialogTitle className="text-base">Criar ação</DialogTitle>
                    <DialogDescription className="text-xs">Preencha os campos para criar uma nova ação.</DialogDescription>
                  </DialogHeader>
                </div>

                <div className="px-5 py-4">
                  <form className="space-y-4" onSubmit={handleCreate}>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="client_name">Nome do cliente</Label>
                        <Input id="client_name" value={form.client_name} onChange={(e) => onChange("client_name", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="company_name">Nome da empresa</Label>
                        <Input id="company_name" value={form.company_name} onChange={(e) => onChange("company_name", e.target.value)} />
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <Label>Tipo(s) de ação</Label>
                        <TypeSelector />
                        {form.types.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {form.types.map((t) => (
                              <Badge key={t} variant="secondary" className="gap-1">
                                {t}
                                <button type="button" onClick={() => toggleType(t)} className="ml-1 opacity-70 hover:opacity-100">
                                  <X className="size-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="startBr" className="flex items-center gap-2"><CalendarIcon className="size-4" /> Início</Label>
                        <Input id="startBr" placeholder="DD/MM/AAAA" inputMode="numeric" value={form.startBr} onChange={onDateChange("startBr")} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="endBr" className="flex items-center gap-2"><CalendarIcon className="size-4" /> Término</Label>
                        <Input id="endBr" placeholder="DD/MM/AAAA" inputMode="numeric" value={form.endBr} onChange={onDateChange("endBr")} />
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <Label>Períodos do dia</Label>
                        <div className="flex flex-wrap gap-4">
                          {periodOptions.map((p) => (
                            <label key={p} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox checked={form.day_periods.includes(p)} onCheckedChange={() => togglePeriod(p)} />
                              <span className="text-sm">{p}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="material_qty">Quantidade de material</Label>
                        <Input id="material_qty" type="number" min={0} value={form.material_qty} onChange={(e) => onChange("material_qty", e.target.value)} />
                      </div>

                      {/* Upload igual Materiais */}
                      <div className="space-y-2 md:col-span-2">
                        <Label>Amostra do material (imagem)</Label>
                        <div className="flex items-center gap-3">
                          <Input type="file" accept="image/*" onChange={onMaterialChange} />
                          <Button type="button" variant="outline" disabled className="gap-2">
                            <UploadCloud className="size-4" />
                            {uploadingMaterial ? "Enviando..." : "Upload"}
                          </Button>
                        </div>
                        {form.material_photo_url && (
                          <div className="relative inline-flex items-center gap-2 mt-2">
                            <ImagePreview src={form.material_photo_url} alt="Amostra do material" size={96} />
                            <button
                              type="button"
                              onClick={() => onChange("material_photo_url", "")}
                              className="bg-white border rounded-full p-1 shadow"
                              title="Remover"
                            >
                              <X className="size-4 text-red-600" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <Label htmlFor="notes">Observações</Label>
                        <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => onChange("notes", e.target.value)} />
                      </div>

                      {/* STATUS */}
                      <div className="space-y-1.5 md:col-span-2">
                        <Label htmlFor="status">Status</Label>
                        <select
                          id="status"
                          className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                          value={form.status}
                          onChange={(e) => onChange("status", e.target.value)}
                        >
                          <option value="aguardando">Aguardando</option>
                          <option value="andamento">Andamento</option>
                          <option value="concluída">Concluída</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-2 mt-4 border-t flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                      <Button type="submit" disabled={uploadingMaterial}>Salvar</Button>
                    </div>
                  </form>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        {/* Tabela */}
        <CardContent>
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <Table className="min-w-[1080px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">Cliente</TableHead>
                    <TableHead className="text-center">Empresa</TableHead>
                    <TableHead className="text-center">Tipos</TableHead>
                    <TableHead className="text-center">Validade</TableHead>
                    <TableHead className="text-center">Material</TableHead>
                    <TableHead className="text-center">Quantidade</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">Carregando...</TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Nenhuma ação encontrada.</TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((a) => {
                      const types = ensureArrayTypes(a);
                      const range = (a.start_date || a.end_date)
                        ? `${formatDateBR(a.start_date)} — ${formatDateBR(a.end_date)}`
                        : "—";
                      const status = deriveStatusFromItem(a);

                      return (
                        <TableRow key={a.id}>
                          <TableCell className="text-center font-medium">{a.client_name || "—"}</TableCell>
                          <TableCell className="text-center">{a.company_name || "—"}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center flex-wrap gap-1">
                              {types.slice(0, 3).map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
                              {types.length > 3 && <Badge variant="outline">+{types.length - 3}</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{range}</TableCell>
                          <TableCell className="text-center">
                            {a.material_photo_url ? (
                              <div className="flex justify-center">
                                <ImagePreview src={a.material_photo_url} alt="Amostra do material" size={48} />
                              </div>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-center">{a.material_qty ?? "—"}</TableCell>
                          <TableCell className="text-center">
                            {status === "aguardando" && (
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <Clock className="size-4" /> Aguardando
                              </span>
                            )}
                            {status === "andamento" && (
                              <span className="inline-flex items-center gap-1 text-blue-600">
                                <Loader2 className="size-4 animate-spin-slow" /> Andamento
                              </span>
                            )}
                            {status === "concluída" && (
                              <span className="inline-flex items-center gap-1 text-green-600">
                                <CheckCircle className="size-4" /> Concluída
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-2 flex-wrap">
                              <Button size="sm" variant="secondary" onClick={() => openEdit(a)} className="gap-1 min-h-[36px]">
                                <Edit className="size-4" /> Editar
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDelete(a.id)} className="gap-1 min-h-[36px]">
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
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Total: <strong>{filtered.length}</strong> ação(ões)
          </p>
        </CardContent>
      </Card>

      {/* Modal EDITAR */}
      <Dialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); if (!v) { setEditing(null); resetForm(); } }}>
        <DialogContent className="w-full max-w-lg max-h-[85vh] overflow-y-auto p-0">
          <div className="px-5 pt-5 pb-3 border-b">
            <DialogHeader>
              <DialogTitle className="text-base">Editar ação</DialogTitle>
              <DialogDescription className="text-xs">Atualize as informações e salve.</DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-5 py-4">
            <form className="space-y-4" onSubmit={handleEdit}>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="e_client_name">Nome do cliente</Label>
                  <Input id="e_client_name" value={form.client_name} onChange={(e) => onChange("client_name", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e_company_name">Nome da empresa</Label>
                  <Input id="e_company_name" value={form.company_name} onChange={(e) => onChange("company_name", e.target.value)} />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Tipo(s) de ação</Label>
                  <TypeSelector />
                  {form.types.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {form.types.map((t) => (
                        <Badge key={t} variant="secondary" className="gap-1">
                          {t}
                          <button type="button" onClick={() => toggleType(t)} className="ml-1 opacity-70 hover:opacity-100">
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="e_startBr" className="flex items-center gap-2"><CalendarIcon className="size-4" /> Início</Label>
                  <Input id="e_startBr" placeholder="DD/MM/AAAA" inputMode="numeric" value={form.startBr} onChange={onDateChange("startBr")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e_endBr" className="flex items-center gap-2"><CalendarIcon className="size-4" /> Término</Label>
                  <Input id="e_endBr" placeholder="DD/MM/AAAA" inputMode="numeric" value={form.endBr} onChange={onDateChange("endBr")} />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Períodos do dia</Label>
                  <div className="flex flex-wrap gap-4">
                    {periodOptions.map((p) => (
                      <label key={p} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={form.day_periods.includes(p)} onCheckedChange={() => togglePeriod(p)} />
                        <span className="text-sm">{p}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="e_material_qty">Quantidade de material</Label>
                  <Input id="e_material_qty" type="number" min={0} value={form.material_qty} onChange={(e) => onChange("material_qty", e.target.value)} />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Amostra do material (imagem)</Label>
                  <div className="flex items-center gap-3">
                    <Input type="file" accept="image/*" onChange={onMaterialChange} />
                    <Button type="button" variant="outline" disabled className="gap-2">
                      <UploadCloud className="size-4" />
                      {uploadingMaterial ? "Enviando..." : "Upload"}
                    </Button>
                  </div>
                  {form.material_photo_url && (
                    <div className="relative inline-flex items-center gap-2 mt-2">
                      <ImagePreview src={form.material_photo_url} alt="Amostra do material" size={96} />
                      <button
                        type="button"
                        onClick={() => onChange("material_photo_url", "")}
                        className="bg-white border rounded-full p-1 shadow"
                        title="Remover"
                      >
                        <X className="size-4 text-red-600" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="e_notes">Observações</Label>
                  <Textarea id="e_notes" rows={3} value={form.notes} onChange={(e) => onChange("notes", e.target.value)} />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="e_status">Status</Label>
                  <select
                    id="e_status"
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={form.status}
                    onChange={(e) => onChange("status", e.target.value)}
                  >
                    <option value="aguardando">Aguardando</option>
                    <option value="andamento">Andamento</option>
                    <option value="concluída">Concluída</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 mt-4 border-t flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setIsEditOpen(false); setEditing(null); resetForm(); }}>Cancelar</Button>
                <Button type="submit" disabled={uploadingMaterial}>Salvar</Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Actions;
