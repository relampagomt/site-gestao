import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Checkbox } from "@/components/ui/checkbox.jsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.jsx";
import { Separator } from "@/components/ui/separator.jsx";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  UploadCloud,
  X,
  Filter as FilterIcon,
} from "lucide-react";
import api from "@/services/api";
import ImagePreview from "@/components/ImagePreview.jsx";

// Import the new ExportMenu component
import ExportMenu from "@/components/export/ExportMenu";

/* ==================== Datas (força DD/MM/AAAA) ==================== */
const TZ = "America/Cuiaba";
const isYMD = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
const isDMY = (s) => /^\d{2}\/\d{2}\/\d{4}$/.test(String(s || ""));

function toYMDInCuiaba(value) {
  if (!value) return "";
  const s = String(value).trim();
  if (isYMD(s.slice(0, 10))) return s.slice(0, 10);
  if (isDMY(s)) {
    const [d, m, y] = s.split("/");
    return `${y}-${m}-${d}`;
  }
  const d = new Date(s);
  if (isNaN(d)) return "";
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
}

function ymdToBR(ymd) {
  if (!ymd || !isYMD(ymd)) return "";
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

function brToYMD(br) {
  if (!br || !isDMY(br)) return "";
  const [d, m, y] = br.split("/");
  return `${y}-${m}-${d}`;
}

const Materials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [month, setMonth] = useState("");

  // Modal de cadastro/edição
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create");
  const [form, setForm] = useState({
    dateBr: "", quantity: "", clientName: "", responsible: "", notes: "",
    sampleUrl: "", protocolUrl: ""
  });
  const [saving, setSaving] = useState(false);
  const [uploadingSample, setUploadingSample] = useState(false);
  const [uploadingProtocol, setUploadingProtocol] = useState(false);

  // Modal de exclusão
  const [openDelete, setOpenDelete] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Buscar materiais
  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/materials");
      setMaterials(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Erro ao buscar materiais:", err);
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  // Handlers do formulário
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const onDateBrChange = (e) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
    if (v.length >= 6) v = v.slice(0, 5) + "/" + v.slice(5, 9);
    setForm(prev => ({ ...prev, dateBr: v }));
  };

  const openCreate = () => {
    setMode("create");
    setForm({
      dateBr: "", quantity: "", clientName: "", responsible: "", notes: "",
      sampleUrl: "", protocolUrl: ""
    });
    setOpen(true);
  };

  const openEdit = (material) => {
    setMode("edit");
    const ymd = toYMDInCuiaba(material.date);
    setForm({
      dateBr: ymdToBR(ymd),
      quantity: String(material.quantity || ""),
      clientName: material.client_name || material.clientName || "",
      responsible: material.responsible || "",
      notes: material.notes || "",
      sampleUrl: material.material_sample_url || material.sampleUrl || "",
      protocolUrl: material.protocol_url || material.protocolUrl || ""
    });
    setOpen(true);
  };

  const confirmDelete = (material) => {
    setRowToDelete(material);
    setOpenDelete(true);
  };

  // Upload handlers
  const onSampleChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingSample(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setForm(prev => ({ ...prev, sampleUrl: response.data.url }));
    } catch (err) {
      console.error("Erro no upload da amostra:", err);
      alert("Erro no upload da amostra.");
    } finally {
      setUploadingSample(false);
    }
  };

  const onProtocolChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingProtocol(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setForm(prev => ({ ...prev, protocolUrl: response.data.url }));
    } catch (err) {
      console.error("Erro no upload do protocolo:", err);
      alert("Erro no upload do protocolo.");
    } finally {
      setUploadingProtocol(false);
    }
  };

  // Submissão do formulário
  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        date: brToYMD(form.dateBr),
        quantity: Number(form.quantity),
        client_name: form.clientName,
        responsible: form.responsible,
        notes: form.notes,
        material_sample_url: form.sampleUrl,
        protocol_url: form.protocolUrl
      };
      
      if (mode === "create") {
        await api.post("/materials", payload);
      } else {
        const id = rowToDelete?.id ?? rowToDelete?._id ?? rowToDelete?.uuid;
        await api.put(`/materials/${id}`, payload);
      }
      setOpen(false);
      fetchMaterials();
    } catch (err) {
      console.error("Erro ao salvar material:", err);
      alert("Erro ao salvar material.");
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
      await api.delete(`/materials/${id}`);
      setOpenDelete(false);
      setRowToDelete(null);
      fetchMaterials();
    } catch (err) {
      console.error("Erro ao excluir material:", err);
      alert("Erro ao excluir material.");
    } finally {
      setDeleting(false);
    }
  }

  /* ===================== FILTROS AVANÇADOS ===================== */
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fClients, setFClients] = useState([]);
  const [fResponsibles, setFResponsibles] = useState([]);
  const [fHasSample, setFHasSample] = useState("");
  const [fHasProtocol, setFHasProtocol] = useState("");
  const [fQtyMin, setFQtyMin] = useState("");
  const [fQtyMax, setFQtyMax] = useState("");
  const [fStartBr, setFStartBr] = useState("");
  const [fEndBr, setFEndBr] = useState("");

  const uniqueClients = useMemo(() => {
    const s = new Set();
    materials.forEach((m) => {
      const v = (m.client_name ?? m.clientName ?? "").trim();
      if (v) s.add(v);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [materials]);

  const uniqueResponsibles = useMemo(() => {
    const s = new Set();
    materials.forEach((m) => {
      const v = (m.responsible ?? "").trim();
      if (v) s.add(v);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [materials]);

  const toggle = (setter, value) =>
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  const clearFilters = () => {
    setFClients([]);
    setFResponsibles([]);
    setFHasSample("");
    setFHasProtocol("");
    setFQtyMin("");
    setFQtyMax("");
    setFStartBr("");
    setFEndBr("");
  };

  const filtersCount =
    (fClients.length ? 1 : 0) +
    (fResponsibles.length ? 1 : 0) +
    (fHasSample ? 1 : 0) +
    (fHasProtocol ? 1 : 0) +
    ((fStartBr || fEndBr) ? 1 : 0) +
    ((fQtyMin || fQtyMax) ? 1 : 0);

  // filtro + ordenação
  const filtered = useMemo(() => {
    let list = Array.isArray(materials) ? [...materials] : [];

    // normaliza data
    list = list
      .map((m) => ({ ...m, _ymd: toYMDInCuiaba(m.date) }))
      .filter((m) => m._ymd);

    // mês (mantido)
    if (month) list = list.filter((m) => m._ymd.slice(0, 7) === month);

    // busca por digitação
    const k = q.trim().toLowerCase();
    if (k) {
      list = list.filter((m) =>
        [m.client_name, m.responsible, String(m.quantity), m.notes]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(k))
      );
    }

    // filtros novos
    if (fClients.length > 0) {
      const set = new Set(fClients);
      list = list.filter((m) => set.has((m.client_name ?? m.clientName ?? "").trim()));
    }
    if (fResponsibles.length > 0) {
      const set = new Set(fResponsibles);
      list = list.filter((m) => set.has((m.responsible ?? "").trim()));
    }
    if (fHasSample) {
      const want = fHasSample === "sim";
      list = list.filter((m) => Boolean(m.material_sample_url || m.sampleUrl) === want);
    }
    if (fHasProtocol) {
      const want = fHasProtocol === "sim";
      list = list.filter((m) => Boolean(m.protocol_url || m.protocolUrl) === want);
    }
    if (fQtyMin !== "" || fQtyMax !== "") {
      const min = fQtyMin === "" ? -Infinity : Number(fQtyMin);
      const max = fQtyMax === "" ? Infinity : Number(fQtyMax);
      list = list.filter((m) => {
        const qn = Number(m.quantity ?? 0);
        return qn >= min && qn <= max;
      });
    }
    if (fStartBr || fEndBr) {
      const start = brToYMD(fStartBr) || "0000-01-01";
      const end = brToYMD(fEndBr) || "9999-12-31";
      list = list.filter((m) => m._ymd >= start && m._ymd <= end);
    }

    // ordena por data desc
    list.sort((a, b) => b._ymd.localeCompare(a._ymd));
    return list;
  }, [materials, q, month, fClients, fResponsibles, fHasSample, fHasProtocol, fQtyMin, fQtyMax, fStartBr, fEndBr]);

  // Prepare data for export
  const exportData = useMemo(() => {
    return filtered.map((m) => {
      const ymd = m._ymd ?? toYMDInCuiaba(m.date);
      return {
        data: ymdToBR(ymd),
        cliente: m.client_name ?? m.clientName ?? "",
        responsavel: m.responsible ?? "",
        quantidade: m.quantity ?? "",
        observacoes: m.notes ?? "",
        amostra: (m.material_sample_url || m.sampleUrl) ? "Sim" : "—",
        protocolo: (m.protocol_url || m.protocolUrl) ? "Sim" : "—",
      };
    });
  }, [filtered]);

  const exportColumns = [
    { key: 'data', header: 'Data' },
    { key: 'cliente', header: 'Cliente' },
    { key: 'responsavel', header: 'Responsável' },
    { key: 'quantidade', header: 'Quantidade' },
    { key: 'observacoes', header: 'Observações' },
    { key: 'amostra', header: 'Amostra' },
    { key: 'protocolo', header: 'Protocolo' },
  ];

  const pdfOptions = {
    title: 'Relatório de Materiais',
    orientation: 'l', // landscape for more columns
    filtersSummary: `Filtros aplicados: ${filtersCount > 0 ? 
      [
        month ? `Mês: ${month}` : '',
        fClients.length > 0 ? `Clientes: ${fClients.join(', ')}` : '',
        fResponsibles.length > 0 ? `Responsáveis: ${fResponsibles.join(', ')}` : '',
        fHasSample ? `Amostra: ${fHasSample === 'sim' ? 'Com amostra' : 'Sem amostra'}` : '',
        fHasProtocol ? `Protocolo: ${fHasProtocol === 'sim' ? 'Com protocolo' : 'Sem protocolo'}` : '',
        (fQtyMin || fQtyMax) ? `Quantidade: ${fQtyMin || '0'} - ${fQtyMax || '∞'}` : '',
        (fStartBr || fEndBr) ? `Período: ${fStartBr || '...'} - ${fEndBr || '...'}` : '',
      ].filter(Boolean).join(' | ') : 'Nenhum filtro aplicado'
    }`,
    columnStyles: {
      0: { cellWidth: 25 }, // Data
      1: { cellWidth: 50 }, // Cliente
      2: { cellWidth: 40 }, // Responsável
      3: { cellWidth: 25 }, // Quantidade
      4: { cellWidth: 60 }, // Observações
      5: { cellWidth: 20 }, // Amostra
      6: { cellWidth: 20 }, // Protocolo
    }
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-3 md:px-6 py-4 md:py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">Materiais</h1>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg md:text-xl font-semibold">Registros</CardTitle>
              <CardDescription>Lista de materiais cadastrados</CardDescription>
            </div>
            <div className="ml-auto">
              <ExportMenu
                data={exportData}
                columns={exportColumns}
                filename="materiais"
                pdfOptions={pdfOptions}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros + Exportações + Novo */}
          <div className="flex flex-col xl:flex-row xl:items-center gap-2 lg:gap-3">
            <div className="relative flex-1 w-full md:w-[320px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar materiais..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            {/* Filtro por mês (mantido) */}
            <div className="flex items-center gap-2">
              <Label htmlFor="filter-month" className="text-xs md:text-sm whitespace-nowrap">Mês</Label>
              <Input
                id="filter-month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-[130px]"
                lang="pt-BR"
              />
              {month && (
                <Button variant="outline" size="sm" onClick={() => setMonth("")}>
                  Limpar mês
                </Button>
              )}
            </div>

            {/* ====== FILTROS AVANÇADOS (POPOVER) ====== */}
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
                <div className="flex flex-col max-h-[calc(100vh-340px)]">
                  <div className="px-4 py-3 border-b">
                    <p className="text-sm font-medium">Filtrar materiais</p>
                    <p className="text-xs text-muted-foreground">Refine os resultados com seletores.</p>
                  </div>

                  {/* BODY */}
                  <div
                    className="p-4 grid md:grid-cols-2 gap-4 flex-1 overflow-y-auto pr-2 overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
                    onWheel={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                  >
                    {/* Clientes */}
                    <div className="space-y-2 md:col-span-1">
                      <Label>Clientes</Label>
                      <div className="max-h-[32vh] overflow-y-auto pr-1">
                        {uniqueClients.length === 0 ? (
                          <p className="text-xs text-muted-foreground">—</p>
                        ) : uniqueClients.map((c) => (
                          <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={fClients.includes(c)} onCheckedChange={() => toggle(setFClients, c)} />
                            <span className="truncate">{c}</span>
                          </label>
                        ))}
                      </div>
                      {fClients.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {fClients.map((c) => (
                            <Badge key={c} variant="secondary" className="gap-1">
                              {c}
                              <button type="button" onClick={() => toggle(setFClients, c)} className="ml-1 opacity-70 hover:opacity-100">
                                <X className="size-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Responsáveis */}
                    <div className="space-y-2 md:col-span-1">
                      <Label>Responsáveis</Label>
                      <div className="max-h-[32vh] overflow-y-auto pr-1">
                        {uniqueResponsibles.length === 0 ? (
                          <p className="text-xs text-muted-foreground">—</p>
                        ) : uniqueResponsibles.map((r) => (
                          <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={fResponsibles.includes(r)} onCheckedChange={() => toggle(setFResponsibles, r)} />
                            <span className="truncate">{r}</span>
                          </label>
                        ))}
                      </div>
                      {fResponsibles.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {fResponsibles.map((r) => (
                            <Badge key={r} variant="secondary" className="gap-1">
                              {r}
                              <button type="button" onClick={() => toggle(setFResponsibles, r)} className="ml-1 opacity-70 hover:opacity-100">
                                <X className="size-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <Separator className="md:col-span-2" />

                    {/* Amostra / Protocolo */}
                    <div className="space-y-2">
                      <Label>Amostra</Label>
                      <select
                        className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                        value={fHasSample}
                        onChange={(e) => setFHasSample(e.target.value)}
                      >
                        <option value="">Todos</option>
                        <option value="sim">Com amostra</option>
                        <option value="nao">Sem amostra</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Protocolo</Label>
                      <select
                        className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                        value={fHasProtocol}
                        onChange={(e) => setFHasProtocol(e.target.value)}
                      >
                        <option value="">Todos</option>
                        <option value="sim">Com protocolo</option>
                        <option value="nao">Sem protocolo</option>
                      </select>
                    </div>

                    {/* Quantidade */}
                    <div className="space-y-2">
                      <Label>Quantidade mínima</Label>
                      <Input
                        type="number"
                        placeholder="Ex.: 1000"
                        value={fQtyMin}
                        onChange={(e) => setFQtyMin(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantidade máxima</Label>
                      <Input
                        type="number"
                        placeholder="Ex.: 50000"
                        value={fQtyMax}
                        onChange={(e) => setFQtyMax(e.target.value)}
                      />
                    </div>

                    {/* Período */}
                    <div className="space-y-2">
                      <Label>Data inicial</Label>
                      <Input
                        placeholder="DD/MM/AAAA"
                        value={fStartBr}
                        onChange={(e) => {
                          let v = e.target.value.replace(/\D/g, "");
                          if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
                          if (v.length >= 6) v = v.slice(0, 5) + "/" + v.slice(5, 9);
                          setFStartBr(v);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data final</Label>
                      <Input
                        placeholder="DD/MM/AAAA"
                        value={fEndBr}
                        onChange={(e) => {
                          let v = e.target.value.replace(/\D/g, "");
                          if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
                          if (v.length >= 6) v = v.slice(0, 5) + "/" + v.slice(5, 9);
                          setFEndBr(v);
                        }}
                      />
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

            {/* Novo */}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2" onClick={openCreate}>
                  <Plus className="size-4" />
                  <span className="whitespace-nowrap">Novo</span>
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-2xl p-0">
                <div className="max-h-[80vh] overflow-y-auto p-6">
                  <DialogHeader className="pb-2">
                    <DialogTitle>{mode === "create" ? "Novo Material" : "Editar Material"}</DialogTitle>
                    <DialogDescription>
                      {mode === "create" ? "Cadastre um recebimento/coleta." : "Edite as informações do material."}
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={onSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>Data</Label>
                        <Input
                          name="dateBr"
                          placeholder="DD/MM/AAAA"
                          inputMode="numeric"
                          value={form.dateBr}
                          onChange={onDateBrChange}
                          required
                        />
                      </div>
                      <div>
                        <Label>Quantidade</Label>
                        <Input
                          type="number"
                          name="quantity"
                          placeholder="Ex.: 10000"
                          value={form.quantity}
                          onChange={onChange}
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Cliente</Label>
                        <Input
                          name="clientName"
                          placeholder="Nome do cliente"
                          value={form.clientName}
                          onChange={onChange}
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Responsável pela coleta/recebimento</Label>
                        <Input
                          name="responsible"
                          placeholder="Responsável"
                          value={form.responsible}
                          onChange={onChange}
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Observações</Label>
                        <Textarea name="notes" placeholder="Opcional" value={form.notes} onChange={onChange} />
                      </div>
                    </div>

                    {/* Amostra do Material */}
                    <div className="space-y-2">
                      <Label>Amostra do Material</Label>
                      <div className="flex items-center gap-3">
                        <Input type="file" accept="image/*" onChange={onSampleChange} />
                        <Button type="button" variant="outline" disabled className="gap-2">
                          <UploadCloud className="size-4" />
                          {uploadingSample ? "Enviando..." : "Upload"}
                        </Button>
                      </div>
                      {form.sampleUrl && (
                        <div className="relative inline-flex items-center gap-2 mt-2">
                          <ImagePreview src={form.sampleUrl} alt="Amostra" size={96} />
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, sampleUrl: "" }))}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Protocolo */}
                    <div className="space-y-2">
                      <Label>Protocolo</Label>
                      <div className="flex items-center gap-3">
                        <Input type="file" accept="image/*,application/pdf" onChange={onProtocolChange} />
                        <Button type="button" variant="outline" disabled className="gap-2">
                          <UploadCloud className="size-4" />
                          {uploadingProtocol ? "Enviando..." : "Upload"}
                        </Button>
                      </div>
                      {form.protocolUrl && (
                        <div className="relative inline-flex items-center gap-2 mt-2">
                          <ImagePreview src={form.protocolUrl} alt="Protocolo" size={96} />
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, protocolUrl: "" }))}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      )}
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

          {/* Tabela */}
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Data</TableHead>
                  <TableHead className="text-center">Cliente</TableHead>
                  <TableHead className="text-center">Responsável</TableHead>
                  <TableHead className="text-center">Quantidade</TableHead>
                  <TableHead className="text-center">Observações</TableHead>
                  <TableHead className="text-center">Amostra</TableHead>
                  <TableHead className="text-center">Protocolo</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-6">Carregando…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-6">Nenhum registro</TableCell></TableRow>
                ) : (
                  filtered.map((m) => {
                    const id = m.id ?? m._id ?? m.uuid;
                    const ymd = m._ymd ?? toYMDInCuiaba(m.date);
                    return (
                      <TableRow key={id || `${m.client_name}-${m.date}-${m.quantity}`}>
                        <TableCell className="text-center font-medium">{ymdToBR(ymd)}</TableCell>
                        <TableCell className="text-center">{m.client_name ?? m.clientName ?? "—"}</TableCell>
                        <TableCell className="text-center">{m.responsible ?? "—"}</TableCell>
                        <TableCell className="text-center">{m.quantity ?? "—"}</TableCell>
                        <TableCell className="text-center max-w-[200px] truncate">{m.notes ?? "—"}</TableCell>
                        <TableCell className="text-center">
                          {(m.material_sample_url || m.sampleUrl) ? (
                            <ImagePreview src={m.material_sample_url || m.sampleUrl} alt="Amostra" size={32} />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {(m.protocol_url || m.protocolUrl) ? (
                            <ImagePreview src={m.protocol_url || m.protocolUrl} alt="Protocolo" size={32} />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button size="sm" variant="outline" className="gap-2" onClick={() => openEdit(m)}>
                              <Edit className="size-4" /> Editar
                            </Button>
                            <Button size="sm" variant="destructive" className="gap-2" onClick={() => confirmDelete(m)}>
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
            <DialogTitle>Excluir material?</DialogTitle>
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

export default Materials;

