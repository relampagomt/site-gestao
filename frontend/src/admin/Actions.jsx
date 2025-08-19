// frontend/src/admin/Actions.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import { useAuth } from "../contexts/AuthContext";

// shadcn/ui
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

// ícones
import {
  Plus, Edit, Trash2, Search, Calendar as CalendarIcon, Layers, X, Filter as FilterIcon,
} from "lucide-react";

// util de data (garante 24h e sem UTC)
import { formatDateBR, brToYMD, ymdToBR, normalizeHM, composeLocalISO } from "@/utils/dates.js";

// Exportar
import ExportMenu from "@/components/export/ExportMenu";

// Calendário
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";

// Pré-visualização de imagem (mantive se você usa)
import ImagePreview from "@/components/ImagePreview.jsx";

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

const periodOptions = ["Manhã", "Tarde", "Noite"];

const ymdToBRsafe = (ymd) => {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}/.test(ymd)) return "";
  const [y, m, d] = ymd.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

const maskDateBR = (v) => {
  let s = v.replace(/\D/g, "");
  if (s.length >= 3) s = s.slice(0, 2) + "/" + s.slice(2);
  if (s.length >= 6) s = s.slice(0, 5) + "/" + s.slice(5, 9);
  return s;
};

// extrai "HH:MM" de "YYYY-MM-DDTHH:MM:SS"
const hhmmFromISO = (iso) => {
  if (!iso) return "";
  const t = String(iso).split("T")[1] || "";
  return t.slice(0, 5);
};

const deriveStatusFromItem = (item) => {
  if (item?.status) return item.status;
  return item?.active === false ? "concluido" : "aguardando";
};
const activeFromStatus = (status) => status !== "concluido";

// ajuste de fim exclusivo (allDay)
const addDays = (ymd, n = 1) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n, 0, 0, 0);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

/* ========= Input 24h (sem AM/PM) ========= */
const TimeInput24 = ({ value, onChange, ...props }) => {
  const handle = (e) => {
    const v = String(e.target.value || "");
    const [h = "", m = ""] = v.split(":");
    const hh = String(parseInt(h || "0", 10)).padStart(2, "0");
    const mm = String(parseInt(m || "0", 10)).padStart(2, "0");
    onChange?.(`${hh}:${mm}`);
  };
  return (
    <input
      type="time"
      step={60}
      value={value || ""}
      onChange={handle}
      className="w-full border rounded-md px-3 py-2 text-sm bg-background"
      {...props}
    />
  );
};

/* ========= Seleção de tipos ========= */
const TypeSelector = ({ value, onToggle }) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="inline-flex flex-wrap gap-2">
            {value.length === 0 ? "Selecionar tipos" : (
              value.slice(0, 2).map((t) => <Badge key={t} variant="secondary" className="mr-1">{t}</Badge>)
            )}
            {value.length > 2 && <Badge variant="outline">+{value.length - 2}</Badge>}
          </span>
          <Layers className="size-4 opacity-70" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" side="bottom" sideOffset={8} className="p-0 w-[min(92vw,420px)] max-h-[70vh] overflow-hidden">
        <div
          className="px-3 py-3 max-h-[60vh] overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Tipos de ação</span>
            {value.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => value.forEach((t) => onToggle(t))}>
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
                    const isSelected = value.includes(opt);
                    return (
                      <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={isSelected} onCheckedChange={() => onToggle(opt)} />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
                <Separator className="my-3" />
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

/* ========= Página ========= */
const Actions = () => {
  const { user } = useAuth();
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  // Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // Form
  const [form, setForm] = useState({
    client_name: "",
    company_name: "",
    types: [],
    startBr: "",
    startHm: "",
    endBr: "",
    endHm: "",
    day_periods: [],
    material_qty: "",
    material_photo_url: "",
    notes: "",
    status: "aguardando",
    supervisor: "",
    team: [],         // equipe (array de nomes)
    teamInput: "",    // input temporário para adicionar integrante
  });

  // Filtros
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fClients, setFClients] = useState([]);
  const [fCompanies, setFCompanies] = useState([]);
  const [fTypes, setFTypes] = useState([]);
  const [fPeriods, setFPeriods] = useState([]);
  const [fStatus, setFStatus] = useState([]);
  const [fStartBr, setFStartBr] = useState("");
  const [fEndBr, setFEndBr] = useState("");

  // Load
  const loadActions = async () => {
    setLoading(true);
    try {
      const response = await api.get("/actions");
      setActions(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Erro ao carregar ações:", err);
      setActions([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadActions(); }, []);

  // Form helpers
  const onChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const onDateChange = (field) => (e) => onChange(field, maskDateBR(e.target.value));
  const toggleType = (type) =>
    setForm((prev) => ({
      ...prev,
      types: prev.types.includes(type) ? prev.types.filter((t) => t !== type) : [...prev.types, type],
    }));
  const togglePeriod = (period) =>
    setForm((prev) => ({
      ...prev,
      day_periods: prev.day_periods.includes(period)
        ? prev.day_periods.filter((p) => p !== period)
        : [...prev.day_periods, period],
    }));

  const addTeam = () => {
    const v = form.teamInput.trim();
    if (!v) return;
    if (!form.team.includes(v)) onChange("team", [...form.team, v]);
    onChange("teamInput", "");
  };
  const removeTeam = (name) => onChange("team", form.team.filter((n) => n !== name));

  const resetForm = () => setForm({
    client_name: "",
    company_name: "",
    types: [],
    startBr: "",
    startHm: "",
    endBr: "",
    endHm: "",
    day_periods: [],
    material_qty: "",
    material_photo_url: "",
    notes: "",
    status: "aguardando",
    supervisor: "",
    team: [],
    teamInput: "",
  });

  // Upload (mantive sua lógica)
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const uploadFile = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      return response.data?.url || null;
    } catch (err) {
      console.error("Erro no upload:", err);
      return null;
    }
  };
  const onMaterialChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMaterial(true);
    try {
      const url = await uploadFile(file);
      if (!url) throw new Error("Falha no upload da imagem.");
      onChange("material_photo_url", url);
    } catch (err) {
      console.error("Erro no upload do material:", err);
      alert("Erro ao enviar a imagem. Tente novamente.");
    } finally {
      setUploadingMaterial(false);
    }
  };

  // Create
  const handleCreate = async (e) => {
    e.preventDefault();

    if (form.types.length === 0) return alert("Selecione ao menos um tipo de ação.");

    const startISO = composeLocalISO(form.startBr, form.startHm);
    const endISO = composeLocalISO(form.endBr, form.endHm);
    if (!startISO || !endISO) return alert("Datas inválidas. Use DD/MM/AAAA e hora HH:MM.");
    if (startISO > endISO) return alert("Término não pode ser anterior ao início.");

    try {
      const payload = {
        client_name: form.client_name,
        company_name: form.company_name,
        types: form.types,
        type: form.types.join(", "),
        start_date: startISO,
        end_date: endISO,
        day_periods: form.day_periods,
        material_qty: Number(form.material_qty || 0),
        material_photo_url: form.material_photo_url || "",
        notes: form.notes || "",
        status: form.status,
        active: activeFromStatus(form.status),
        supervisor: form.supervisor || "",
        team: form.team || [],
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

  // Edit
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      client_name: item.client_name || "",
      company_name: item.company_name || "",
      types: ensureArrayTypes(item),
      startBr: ymdToBRsafe(String(item.start_date || "").slice(0, 10)),
      startHm: hhmmFromISO(item.start_date),
      endBr: ymdToBRsafe(String(item.end_date || "").slice(0, 10)),
      endHm: hhmmFromISO(item.end_date),
      day_periods: Array.isArray(item.day_periods) ? item.day_periods : [],
      material_qty: item.material_qty ?? "",
      material_photo_url: item.material_photo_url || "",
      notes: item.notes || "",
      status: deriveStatusFromItem(item),
      supervisor: item.supervisor || "",
      team: Array.isArray(item.team) ? item.team : [],
      teamInput: "",
    });
    setIsEditOpen(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editing) return;

    if (form.types.length === 0) return alert("Selecione ao menos um tipo de ação.");

    const startISO = composeLocalISO(form.startBr, form.startHm);
    const endISO = composeLocalISO(form.endBr, form.endHm);
    if (!startISO || !endISO) return alert("Datas inválidas. Use DD/MM/AAAA e hora HH:MM.");
    if (startISO > endISO) return alert("Término não pode ser anterior ao início.");

    try {
      const payload = {
        client_name: form.client_name,
        company_name: form.company_name,
        types: form.types,
        type: form.types.join(", "),
        start_date: startISO,
        end_date: endISO,
        day_periods: form.day_periods,
        material_qty: Number(form.material_qty || 0),
        material_photo_url: form.material_photo_url || "",
        notes: form.notes || "",
        status: form.status,
        active: activeFromStatus(form.status),
        supervisor: form.supervisor || "",
        team: form.team || [],
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

  // Filtros auxiliares
  const uniqueClients = useMemo(() => {
    const set = new Set();
    actions.forEach((a) => { const v = (a.client_name || "").trim(); if (v) set.add(v); });
    return Array.from(set).sort();
  }, [actions]);
  const uniqueCompanies = useMemo(() => {
    const set = new Set();
    actions.forEach((a) => { const v = (a.company_name || "").trim(); if (v) set.add(v); });
    return Array.from(set).sort();
  }, [actions]);

  const toggleFilter = (setter, value) => setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  const toggleFilterType = (type) => toggleFilter(setFTypes, type);
  const onFilterDateChange = (setter) => (e) => setter(maskDateBR(e.target.value));
  const clearFilters = () => { setFClients([]); setFCompanies([]); setFTypes([]); setFPeriods([]); setFStatus([]); setFStartBr(""); setFEndBr(""); };
  const filtersCount =
    (fClients.length ? 1 : 0) + (fCompanies.length ? 1 : 0) + (fTypes.length ? 1 : 0) +
    (fPeriods.length ? 1 : 0) + (fStatus.length ? 1 : 0) + ((fStartBr || fEndBr) ? 1 : 0);

  const filtered = useMemo(() => {
    let list = Array.isArray(actions) ? [...actions] : [];
    const k = q.trim().toLowerCase();
    if (k) {
      list = list.filter((a) => {
        const types = ensureArrayTypes(a).join(" ");
        const periods = Array.isArray(a.day_periods) ? a.day_periods.join(" ") : "";
        const teamStr = Array.isArray(a.team) ? a.team.join(" ") : "";
        return [a.client_name, a.company_name, types, periods, a.notes, teamStr, a.supervisor]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(k));
      });
    }
    if (fClients.length > 0) {
      const set = new Set(fClients);
      list = list.filter((a) => set.has((a.client_name || "").trim()));
    }
    if (fCompanies.length > 0) {
      const set = new Set(fCompanies);
      list = list.filter((a) => set.has((a.company_name || "").trim()));
    }
    if (fTypes.length > 0) {
      const set = new Set(fTypes);
      list = list.filter((a) => ensureArrayTypes(a).some((t) => set.has(t)));
    }
    if (fPeriods.length > 0) {
      const set = new Set(fPeriods);
      list = list.filter((a) => Array.isArray(a.day_periods) && a.day_periods.some((p) => set.has(p)));
    }
    if (fStatus.length > 0) {
      const set = new Set(fStatus);
      list = list.filter((a) => set.has(deriveStatusFromItem(a)));
    }
    if (fStartBr || fEndBr) {
      const start = brToYMD(fStartBr) || "0000-01-01";
      const end = brToYMD(fEndBr) || "9999-12-31";
      list = list.filter((a) => {
        const aStart = a.start_date ? String(a.start_date).slice(0, 10) : "0000-01-01";
        const aEnd = a.end_date ? String(a.end_date).slice(0, 10) : "9999-12-31";
        return aStart <= end && aEnd >= start;
      });
    }
    list.sort((a, b) => String(b.start_date || "0000-01-01").localeCompare(String(a.start_date || "0000-01-01")));
    return list;
  }, [actions, q, fClients, fCompanies, fTypes, fPeriods, fStatus, fStartBr, fEndBr]);

  // Export
  const exportData = useMemo(() => {
    return filtered.map((a) => {
      const types = ensureArrayTypes(a).join(" | ");
      const periods = Array.isArray(a?.day_periods) ? a.day_periods.join(" | ") : "";
      const start = a.start_date ? formatDateBR(a.start_date) : "";
      const end = a.end_date ? formatDateBR(a.end_date) : "";
      const status = deriveStatusFromItem(a);
      return {
        cliente: a.client_name || "",
        empresa: a.company_name || "",
        tipos: types,
        periodos: periods,
        inicio: start,
        termino: end,
        quantidade_material: a.material_qty ?? "",
        status: status,
        observacoes: a.notes || "",
        supervisor: a.supervisor || "",
        equipe: Array.isArray(a.team) ? a.team.join(" | ") : "",
        foto_url: a.material_photo_url || ""
      };
    });
  }, [filtered]);

  const exportColumns = [
    { key: 'cliente', header: 'Cliente' },
    { key: 'empresa', header: 'Empresa' },
    { key: 'tipos', header: 'Tipos' },
    { key: 'periodos', header: 'Períodos' },
    { key: 'inicio', header: 'Início' },
    { key: 'termino', header: 'Término' },
    { key: 'quantidade_material', header: 'Qtd. Material' },
    { key: 'status', header: 'Status' },
    { key: 'supervisor', header: 'Supervisor' },
    { key: 'equipe', header: 'Equipe' },
    { key: 'observacoes', header: 'Observações' },
    { key: 'foto_url', header: 'Foto (URL)' },
  ];

  const pdfOptions = {
    title: 'Relatório de Ações',
    orientation: 'l',
    filtersSummary: `Filtros aplicados: ${
      filtersCount > 0 ?
        [
          fClients.length > 0 ? `Clientes: ${fClients.join(', ')}` : '',
          fCompanies.length > 0 ? `Empresas: ${fCompanies.join(', ')}` : '',
          fTypes.length > 0 ? `Tipos: ${fTypes.join(', ')}` : '',
          fPeriods.length > 0 ? `Períodos: ${fPeriods.join(', ')}` : '',
          fStatus.length > 0 ? `Status: ${fStatus.join(', ')}` : '',
          (fStartBr || fEndBr) ? `Período: ${fStartBr || '...'} - ${fEndBr || '...'}` : '',
        ].filter(Boolean).join(' | ')
        : 'Nenhum filtro aplicado'
    }`,
  };

  // Eventos p/ calendário
  const events = useMemo(() => {
    return actions.map((a) => {
      const titleParts = [
        a.client_name || "",
        a.supervisor ? `Sup: ${a.supervisor}` : "",
        Array.isArray(a.team) && a.team.length ? `Eq: ${a.team.join(", ")}` : "",
      ].filter(Boolean);
      const title = titleParts.join(" • ");

      const start = a.start_date; // já salvo como "YYYY-MM-DDTHH:MM:00"
      const end = a.end_date;

      const hasTime =
        (typeof start === "string" && /T\d{2}:\d{2}/.test(start)) ||
        (typeof end === "string" && /T\d{2}:\d{2}/.test(end));

      const status = deriveStatusFromItem(a);
      const colors = status === "concluido" ? { backgroundColor: "#16a34a", borderColor: "#15803d" }
        : status === "andamento" ? { backgroundColor: "#2563eb", borderColor: "#1d4ed8" }
        : { backgroundColor: "#f59e0b", borderColor: "#d97706" };

      if (!hasTime) {
        // allDay: end exclusivo (+1 dia)
        const s = String(start).slice(0, 10);
        const e = String(end).slice(0, 10);
        return { id: a.id, title, start: s, end: addDays(e, 1), allDay: true, ...colors };
      }
      return { id: a.id, title, start, end, allDay: false, ...colors };
    });
  }, [actions]);

  return (
    <div className="max-w-screen-2xl mx-auto px-3 md:px-6 py-4 md:py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">Ações</h1>
      </div>

      {/* Calendário */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg md:text-xl font-semibold">Dashboard</CardTitle>
          <CardDescription>Visão mensal de ações</CardDescription>
        </CardHeader>
        <CardContent>
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locales={[ptBrLocale]}
            locale="pt-br"
            timeZone="local"
            height="auto"
            headerToolbar={{
              start: "prev,next today",
              center: "title",
              end: ""
            }}
            eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
            events={events}
          />
        </CardContent>
      </Card>

      {/* Lista + filtros + export */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg md:text-xl font-semibold">Registros</CardTitle>
              <CardDescription>Lista de ações cadastradas</CardDescription>
            </div>
            <div className="ml-auto">
              <ExportMenu data={exportData} columns={exportColumns} filename="acoes" pdfOptions={pdfOptions} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3">
            <div className="relative flex-1 w-full md:w-[320px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar ações..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>

            {/* Filtros */}
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <FilterIcon className="size-4" />
                  Filtros
                  {filtersCount > 0 && <Badge variant="secondary">{filtersCount}</Badge>}
                </Button>
              </PopoverTrigger>

              <PopoverContent align="end" side="bottom" sideOffset={8} collisionPadding={12} className="w-[min(92vw,620px)] p-0">
                <div className="flex flex-col max-h-[calc(100vh-120px)]">
                  <div className="px-4 py-3 border-b">
                    <p className="text-sm font-medium">Filtrar ações</p>
                    <p className="text-xs text-muted-foreground">Refine os resultados com seletores.</p>
                  </div>

                  <div
                    className="p-4 grid md:grid-cols-2 gap-4 flex-1 overflow-y-auto pr-2 overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
                    onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}
                  >
                    {/* Clientes */}
                    <div className="space-y-2">
                      <Label>Clientes</Label>
                      <div className="max-h-[32vh] overflow-y-auto pr-1">
                        {uniqueClients.map((c) => (
                          <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={fClients.includes(c)} onCheckedChange={() => toggleFilter(setFClients, c)} />
                            <span className="truncate">{c}</span>
                          </label>
                        ))}
                      </div>
                      {fClients.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {fClients.map((c) => (
                            <Badge key={c} variant="secondary" className="gap-1">
                              {c}
                              <button type="button" onClick={() => toggleFilter(setFClients, c)} className="ml-1 opacity-70 hover:opacity-100">
                                <X className="size-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Empresas */}
                    <div className="space-y-2">
                      <Label>Empresas</Label>
                      <div className="max-h-[32vh] overflow-y-auto pr-1">
                        {uniqueCompanies.map((c) => (
                          <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={fCompanies.includes(c)} onCheckedChange={() => toggleFilter(setFCompanies, c)} />
                            <span className="truncate">{c}</span>
                          </label>
                        ))}
                      </div>
                      {fCompanies.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {fCompanies.map((c) => (
                            <Badge key={c} variant="secondary" className="gap-1">
                              {c}
                              <button type="button" onClick={() => toggleFilter(setFCompanies, c)} className="ml-1 opacity-70 hover:opacity-100">
                                <X className="size-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <div className="space-y-2">
                        {["aguardando", "andamento", "concluido"].map((s) => (
                          <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={fStatus.includes(s)} onCheckedChange={() => toggleFilter(setFStatus, s)} />
                            <span className="capitalize">{s}</span>
                          </label>
                        ))}
                      </div>
                      {fStatus.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {fStatus.map((s) => (
                            <Badge key={s} variant="secondary" className="gap-1">
                              {s}
                              <button type="button" onClick={() => toggleFilter(setFStatus, s)} className="ml-1 opacity-70 hover:opacity-100">
                                <X className="size-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Períodos */}
                    <div className="space-y-2">
                      <Label>Períodos do dia</Label>
                      <div className="space-y-2">
                        {periodOptions.map((p) => (
                          <label key={p} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={fPeriods.includes(p)} onCheckedChange={() => toggleFilter(setFPeriods, p)} />
                            <span>{p}</span>
                          </label>
                        ))}
                      </div>
                      {fPeriods.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {fPeriods.map((p) => (
                            <Badge key={p} variant="secondary" className="gap-1">
                              {p}
                              <button type="button" onClick={() => toggleFilter(setFPeriods, p)} className="ml-1 opacity-70 hover:opacity-100">
                                <X className="size-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Date range */}
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
                    <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar filtros</Button>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setFiltersOpen(false)}>Fechar</Button>
                      <Button size="sm" onClick={() => setFiltersOpen(false)}>Aplicar</Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Create */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="size-4" />
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
                        <Label>Nome do cliente</Label>
                        <Input value={form.client_name} onChange={(e) => onChange("client_name", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Nome da empresa</Label>
                        <Input value={form.company_name} onChange={(e) => onChange("company_name", e.target.value)} />
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <Label>Tipo(s) de ação</Label>
                        <TypeSelector value={form.types} onToggle={toggleType} />
                        {form.types.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-1">
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

                      {/* Início / Término */}
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-2"><CalendarIcon className="size-4" /> Início (data)</Label>
                        <Input placeholder="DD/MM/AAAA" inputMode="numeric" value={form.startBr} onChange={onDateChange("startBr")} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Início (hora)</Label>
                        <TimeInput24 value={form.startHm} onChange={(v) => onChange("startHm", normalizeHM(v))} />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-2"><CalendarIcon className="size-4" /> Término (data)</Label>
                        <Input placeholder="DD/MM/AAAA" inputMode="numeric" value={form.endBr} onChange={onDateChange("endBr")} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Término (hora)</Label>
                        <TimeInput24 value={form.endHm} onChange={(v) => onChange("endHm", normalizeHM(v))} />
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
                        <Label>Supervisor</Label>
                        <Input value={form.supervisor} onChange={(e) => onChange("supervisor", e.target.value)} placeholder="Quem supervisiona a ação" />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Adicionar integrante da equipe</Label>
                        <div className="flex gap-2">
                          <Input value={form.teamInput} onChange={(e) => onChange("teamInput", e.target.value)} placeholder="Nome" />
                          <Button type="button" onClick={addTeam}>Adicionar</Button>
                        </div>
                        {form.team.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {form.team.map((n) => (
                              <Badge key={n} variant="secondary" className="gap-1">
                                {n}
                                <button type="button" onClick={() => removeTeam(n)} className="ml-1 opacity-70 hover:opacity-100">
                                  <X className="size-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label>Quantidade de material</Label>
                        <Input type="number" min={0} value={form.material_qty} onChange={(e) => onChange("material_qty", e.target.value)} />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Amostra do material (imagem)</Label>
                        <div className="flex items-center gap-3">
                          <Input type="file" accept="image/*" onChange={onMaterialChange} />
                          <Button type="button" variant="outline" disabled className="gap-2">Upload</Button>
                        </div>
                        {form.material_photo_url && (
                          <div className="relative inline-flex items-center gap-2 mt-2">
                            <ImagePreview src={form.material_photo_url} alt="Amostra do material" size={96} />
                            <button type="button" onClick={() => onChange("material_photo_url", "")} className="bg-white border rounded-full p-1 shadow" title="Remover">
                              <X className="size-4 text-red-600" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <Label>Observações</Label>
                        <Textarea rows={3} value={form.notes} onChange={(e) => onChange("notes", e.target.value)} />
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <Label>Status</Label>
                        <select
                          className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                          value={form.status} onChange={(e) => onChange("status", e.target.value)}
                        >
                          <option value="aguardando">Aguardando</option>
                          <option value="andamento">Andamento</option>
                          <option value="concluido">Concluída</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                      <Button type="submit" size="sm">Salvar</Button>
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
                  <TableHead className="text-center">Cliente</TableHead>
                  <TableHead className="text-center">Empresa</TableHead>
                  <TableHead className="text-center">Tipos</TableHead>
                  <TableHead className="text-center">Períodos</TableHead>
                  <TableHead className="text-center">Início</TableHead>
                  <TableHead className="text-center">Término</TableHead>
                  <TableHead className="text-center">Qtd. Material</TableHead>
                  <TableHead className="text-center">Supervisor</TableHead>
                  <TableHead className="text-center">Equipe</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-6">Carregando…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-6">Nenhum registro</TableCell></TableRow>
                ) : filtered.map((a) => {
                  const types = ensureArrayTypes(a);
                  const periods = Array.isArray(a.day_periods) ? a.day_periods : [];
                  const status = deriveStatusFromItem(a);
                  const statusColor = status === "concluido" ? "default" : status === "andamento" ? "secondary" : "outline";
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="text-center font-medium">{a.client_name || "—"}</TableCell>
                      <TableCell className="text-center">{a.company_name || "—"}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {types.slice(0, 2).map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                          {types.length > 2 && <Badge variant="outline" className="text-xs">+{types.length - 2}</Badge>}
                          {types.length === 0 && <span className="text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {periods.map((p) => <Badge key={p} variant="outline" className="text-xs">{p}</Badge>)}
                          {periods.length === 0 && <span className="text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{a.start_date ? formatDateBR(a.start_date, { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"}</TableCell>
                      <TableCell className="text-center">{a.end_date ? formatDateBR(a.end_date, { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"}</TableCell>
                      <TableCell className="text-center">{a.material_qty ?? "—"}</TableCell>
                      <TableCell className="text-center">{a.supervisor || "—"}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {Array.isArray(a.team) && a.team.length ? a.team.map((m) => <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>) : <span className="text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center"><Badge variant={statusColor} className="capitalize">{status}</Badge></TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <Button size="sm" variant="outline" className="gap-2" onClick={() => openEdit(a)}>
                            <Edit className="size-4" /> Editar
                          </Button>
                          <Button size="sm" variant="destructive" className="gap-2" onClick={() => handleDelete(a.id)}>
                            <Trash2 className="size-4" /> Excluir
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground mt-3">Total: <strong>{filtered.length}</strong> ação(ões)</p>
        </CardContent>
      </Card>

      {/* Editar */}
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
                  <Label>Nome do cliente</Label>
                  <Input value={form.client_name} onChange={(e) => onChange("client_name", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Nome da empresa</Label>
                  <Input value={form.company_name} onChange={(e) => onChange("company_name", e.target.value)} />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Tipo(s) de ação</Label>
                  <TypeSelector value={form.types} onToggle={toggleType} />
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

                {/* Início / Término */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2"><CalendarIcon className="size-4" /> Início (data)</Label>
                  <Input placeholder="DD/MM/AAAA" inputMode="numeric" value={form.startBr} onChange={onDateChange("startBr")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Início (hora)</Label>
                  <TimeInput24 value={form.startHm} onChange={(v) => onChange("startHm", normalizeHM(v))} />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2"><CalendarIcon className="size-4" /> Término (data)</Label>
                  <Input placeholder="DD/MM/AAAA" inputMode="numeric" value={form.endBr} onChange={onDateChange("endBr")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Término (hora)</Label>
                  <TimeInput24 value={form.endHm} onChange={(v) => onChange("endHm", normalizeHM(v))} />
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
                  <Label>Supervisor</Label>
                  <Input value={form.supervisor} onChange={(e) => onChange("supervisor", e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label>Equipe</Label>
                  <div className="flex gap-2">
                    <Input value={form.teamInput} onChange={(e) => onChange("teamInput", e.target.value)} placeholder="Nome" />
                    <Button type="button" onClick={addTeam}>Adicionar</Button>
                  </div>
                  {form.team.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {form.team.map((n) => (
                        <Badge key={n} variant="secondary" className="gap-1">
                          {n}
                          <button type="button" onClick={() => removeTeam(n)} className="ml-1 opacity-70 hover:opacity-100">
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Quantidade de material</Label>
                  <Input type="number" min={0} value={form.material_qty} onChange={(e) => onChange("material_qty", e.target.value)} />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Amostra do material (imagem)</Label>
                  <div className="flex items-center gap-3">
                    <Input type="file" accept="image/*" onChange={onMaterialChange} />
                    <Button type="button" variant="outline" disabled className="gap-2">Upload</Button>
                  </div>
                  {form.material_photo_url && (
                    <div className="relative inline-flex items-center gap-2 mt-2">
                      <ImagePreview src={form.material_photo_url} alt="Amostra do material" size={96} />
                      <button type="button" onClick={() => onChange("material_photo_url", "")} className="bg-white border rounded-full p-1 shadow" title="Remover">
                        <X className="size-4 text-red-600" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Observações</Label>
                  <Textarea rows={3} value={form.notes} onChange={(e) => onChange("notes", e.target.value)} />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Status</Label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={form.status} onChange={(e) => onChange("status", e.target.value)}
                  >
                    <option value="aguardando">Aguardando</option>
                    <option value="andamento">Andamento</option>
                    <option value="concluido">Concluída</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
                <Button type="submit" size="sm">Atualizar</Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Actions;
