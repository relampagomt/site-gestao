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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command.jsx";
import ImagePreview from "@/components/ImagePreview.jsx";

import {
  Plus, Edit, Trash2, Search, Calendar as CalendarIcon, Layers, X,
  UploadCloud, Filter as FilterIcon, ChevronLeft, ChevronRight, Dot, PlusCircle
} from "lucide-react";

import { formatDateBR } from "@/utils/dates.js";
import ExportMenu from "@/components/export/ExportMenu";

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

const ymdToBR = (ymd) => {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}/.test(ymd)) return "";
  const [y, m, d] = ymd.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

const brToYMD = (br) => {
  if (!br || !/^\d{2}\/\d{2}\/\d{4}/.test(br)) return "";
  const [d, m, y] = br.split("/");
  return `${y}-${m}-${d}`;
};

const deriveStatusFromItem = (item) => {
  if (item?.status) return item.status;
  return item?.active === false ? "concluido" : "aguardando";
};
const activeFromStatus = (status) => status !== "concluido";

/* ========= Datas utilitárias ========= */
const toDate = (ymdOrIso) => {
  if (!ymdOrIso) return null;
  const s = String(ymdOrIso);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return new Date(s);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return null;
};
const toYMD = (dt) => {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const addDays = (dt, n) => {
  const d = new Date(dt);
  d.setDate(d.getDate() + n);
  return d;
};
const diffDaysInclusive = (a, b) => {
  const aa = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((bb - aa) / 86400000) + 1;
};
const startOfMonth = (dt) => new Date(dt.getFullYear(), dt.getMonth(), 1);
const endOfMonth = (dt) => new Date(dt.getFullYear(), dt.getMonth() + 1, 0);
const startOfWeekMon = (dt) => {
  const d = new Date(dt);
  const day = (d.getDay() + 6) % 7; // 0 seg ... 6 dom
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};
const endOfWeekMon = (dt) => addDays(startOfWeekMon(dt), 6);
const monthTitlePtBR = (dt) =>
  dt.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

/* ========= Estilo dos chips ========= */
const statusChipClass = (status) => {
  switch (status) {
    case "andamento": return "bg-blue-100 text-blue-800 border-blue-300";
    case "concluido": return "bg-green-100 text-green-800 border-green-300";
    default: return "bg-amber-100 text-amber-800 border-amber-300"; // aguardando
  }
};

/* ========= Calendário base ========= */
const WEEKDAYS_PT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function DayCell({
  dateObj,
  inMonth,
  isToday,
  events,
  onNewOnDate,
  onOpenEdit,
  onMoveAction, // (action, newStartYMD, newEndYMD)
}) {
  const key = toYMD(dateObj);
  const maxVisible = 3;
  const extra = Math.max(0, events.length - maxVisible);

  // DnD handlers
  const onDragOver = (e) => e.preventDefault();
  const onDrop = (e) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      const { action, start, end } = data;
      if (!action?.id || !start || !end) return;
      const dur = diffDaysInclusive(toDate(start), toDate(end));
      const newStart = key;
      const newEnd = toYMD(addDays(dateObj, dur - 1));
      onMoveAction(action, newStart, newEnd);
    } catch (_) {}
  };

  return (
    <div
      className={`bg-card min-h-[112px] sm:min-h-[130px] p-1.5 sm:p-2 flex flex-col ${inMonth ? "" : "opacity-50"}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={() => onNewOnDate(key)}
          className={`text-xs rounded px-1 ${isToday ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-accent"}`}
          title="Nova ação neste dia"
        >
          {dateObj.getDate()}
        </button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onNewOnDate(key)} title="Nova ação">
          <PlusCircle className="size-3.5" />
        </Button>
      </div>

      <div className="flex-1 space-y-1 overflow-hidden">
        {events.slice(0, maxVisible).map((a) => {
          const st = deriveStatusFromItem(a);
          const sup = a.supervisor ? ` • Sup: ${a.supervisor}` : "";
          const start = (a.start_datetime || a.start_date || "").slice(0, 10);
          const end = (a.end_datetime || a.end_date || a.start_datetime || a.start_date || "").slice(0, 10);

          const onDragStart = (e) => {
            e.dataTransfer.setData(
              "text/plain",
              JSON.stringify({ action: a, start, end })
            );
            e.dataTransfer.effectAllowed = "move";
          };

          return (
            <button
              key={`${a.id}-${key}`}
              onClick={() => onOpenEdit(a)}
              draggable
              onDragStart={onDragStart}
              className={`w-full text-left text-[10px] sm:text-xs border rounded px-1.5 py-1 ${statusChipClass(st)} hover:brightness-95 cursor-grab active:cursor-grabbing`}
              title={(a.client_name || a.company_name || "Ação")}
            >
              <span className="inline-flex items-center gap-1 truncate">
                <Dot className="size-4 -mx-1" />
                <span className="truncate">{(a.client_name || a.company_name || "Ação") + sup}</span>
              </span>
            </button>
          );
        })}
        {extra > 0 && <div className="text-[10px] sm:text-xs text-muted-foreground">+{extra} mais…</div>}
      </div>
    </div>
  );
}

const CalendarMonth = ({
  actions,
  cursor,
  setCursor,
  onNewOnDate,
  onOpenEdit,
  onMoveAction,
}) => {
  const gridStart = startOfWeekMon(startOfMonth(cursor));
  const gridEnd = endOfWeekMon(endOfMonth(cursor));

  const daysMap = useMemo(() => {
    const map = new Map();
    for (let d = new Date(gridStart); d <= gridEnd; d = addDays(d, 1)) {
      map.set(toYMD(d), []);
    }
    for (const a of actions) {
      const s = toDate(a.start_datetime || a.start_date);
      const e = toDate(a.end_datetime || a.end_date || a.start_datetime || a.start_date);
      if (!s || !e) continue;
      let cur = new Date(Math.max(s.getTime(), gridStart.getTime()));
      const last = new Date(Math.min(e.getTime(), gridEnd.getTime()));
      while (cur <= last) {
        const k = toYMD(cur);
        if (map.has(k)) map.get(k).push(a);
        cur = addDays(cur, 1);
      }
    }
    const order = { andamento: 0, aguardando: 1, concluido: 2 };
    for (const [k, list] of map.entries()) {
      list.sort((a, b) => (order[deriveStatusFromItem(a)] ?? 3) - (order[deriveStatusFromItem(b)] ?? 3));
      map.set(k, list);
    }
    return map;
  }, [actions, cursor]);

  const weeks = [];
  for (let d = new Date(gridStart); d <= gridEnd; d = addDays(d, 7)) {
    weeks.push([0,1,2,3,4,5,6].map(i => addDays(d, i)));
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg md:text-xl font-semibold">Calendário</CardTitle>
            <CardDescription>Visualização mensal das ações</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCursor(startOfMonth(new Date()))}>Hoje</Button>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => setCursor(addDays(startOfMonth(cursor), -1))}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setCursor(addDays(endOfMonth(cursor), 1))}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">{monthTitlePtBR(cursor)}</div>
        <div className="grid grid-cols-7 text-xs font-medium text-muted-foreground mt-1">
          {WEEKDAYS_PT.map((d) => <div key={d} className="px-2 py-1">{d}</div>)}
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-7 gap-[1px] bg-border rounded-lg overflow-hidden">
          {weeks.flatMap((week, wi) =>
            week.map((day) => {
              const key = toYMD(day);
              const inMonth = day.getMonth() === cursor.getMonth();
              const isToday = key === toYMD(new Date());
              const events = daysMap.get(key) || [];
              return (
                <DayCell
                  key={`${wi}-${key}`}
                  dateObj={day}
                  inMonth={inMonth}
                  isToday={isToday}
                  events={events}
                  onNewOnDate={onNewOnDate}
                  onOpenEdit={onOpenEdit}
                  onMoveAction={onMoveAction}
                />
              );
            })
          )}
        </div>

        <div className="flex flex-wrap gap-3 mt-3 text-xs">
          <div className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded bg-amber-200 border border-amber-300" /> Aguardando</div>
          <div className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded bg-blue-200 border border-blue-300" /> Andamento</div>
          <div className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded bg-green-200 border border-green-300" /> Concluída</div>
        </div>
      </CardContent>
    </Card>
  );
};

const CalendarWeek = ({
  actions,
  cursor,
  setCursor,
  onNewOnDate,
  onOpenEdit,
  onMoveAction,
}) => {
  const weekStart = startOfWeekMon(cursor);
  const days = [0,1,2,3,4,5,6].map(i => addDays(weekStart, i));
  const groups = useMemo(() => {
    const map = new Map(days.map(d => [toYMD(d), []]));
    for (const a of actions) {
      const s = toDate(a.start_datetime || a.start_date);
      const e = toDate(a.end_datetime || a.end_date || a.start_datetime || a.start_date);
      if (!s || !e) continue;
      for (const d of days) {
        if (s <= d && d <= e) map.get(toYMD(d)).push(a);
      }
    }
    const order = { andamento: 0, aguardando: 1, concluido: 2 };
    for (const [k, list] of map.entries()) {
      list.sort((a, b) => (order[deriveStatusFromItem(a)] ?? 3) - (order[deriveStatusFromItem(b)] ?? 3));
      map.set(k, list);
    }
    return map;
  }, [actions, cursor]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg md:text-xl font-semibold">Semana</CardTitle>
            <CardDescription>{ymdToBR(toYMD(weekStart))} – {ymdToBR(toYMD(addDays(weekStart,6)))}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>Hoje</Button>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => setCursor(addDays(weekStart, -1))}><ChevronLeft className="size-4" /></Button>
              <Button variant="outline" size="icon" onClick={() => setCursor(addDays(weekStart, 7))}><ChevronRight className="size-4" /></Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-[1px] bg-border rounded-lg overflow-hidden">
          {days.map((d) => {
            const key = toYMD(d);
            const isToday = key === toYMD(new Date());
            return (
              <DayCell
                key={key}
                dateObj={d}
                inMonth={true}
                isToday={isToday}
                events={groups.get(key) || []}
                onNewOnDate={onNewOnDate}
                onOpenEdit={onOpenEdit}
                onMoveAction={onMoveAction}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

const AgendaList = ({ actions, cursor, setCursor, onOpenEdit }) => {
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const rows = useMemo(() => {
    const list = [];
    for (const a of actions) {
      const s = toDate(a.start_datetime || a.start_date);
      const e = toDate(a.end_datetime || a.end_date || a.start_datetime || a.start_date);
      if (!s || !e) continue;
      if (e < monthStart || s > monthEnd) continue;
      list.push(a);
    }
    list.sort((a, b) =>
      (a.start_datetime || a.start_date || "").localeCompare(b.start_datetime || b.start_date || "")
    );
    return list;
  }, [actions, cursor]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg md:text-xl font-semibold">Agenda</CardTitle>
            <CardDescription>{monthTitlePtBR(cursor)}</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => setCursor(addDays(startOfMonth(cursor), -1))}><ChevronLeft className="size-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => setCursor(addDays(endOfMonth(cursor), 1))}><ChevronRight className="size-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhuma ação no período.</div>
        ) : (
          <div className="space-y-2">
            {rows.map((a) => {
              const st = deriveStatusFromItem(a);
              const dateTxt = a.start_datetime || a.start_date || "";
              const endTxt = a.end_datetime || a.end_date || "";
              const when = [dateTxt ? formatDateBR(dateTxt) : "", endTxt ? " → " + formatDateBR(endTxt) : ""].join("");
              const sup = a.supervisor ? ` • Sup: ${a.supervisor}` : "";
              return (
                <button
                  key={a.id}
                  onClick={() => onOpenEdit(a)}
                  className={`w-full text-left border rounded px-3 py-2 ${statusChipClass(st)} hover:brightness-95`}
                >
                  <div className="text-sm font-medium truncate">{(a.client_name || a.company_name || "Ação") + sup}</div>
                  <div className="text-xs opacity-80 truncate">{when}</div>
                  <div className="text-[11px] opacity-70 truncate">{ensureArrayTypes(a).join(" • ") || "—"}</div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/* ========= Página ========= */
const Actions = () => {
  const { user } = useAuth();
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  // Pessoas (sugestões) para supervisor/equipe
  const [people, setPeople] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const [s1, s2] = await Promise.all([
          api.get("/staff").catch(() => ({ data: [] })),
          api.get("/users").catch(() => ({ data: [] })),
        ]);
        const names = new Set();
        [...(s1.data || []), ...(s2.data || [])].forEach((p) => {
          const n = p?.name || p?.full_name || p?.username || p?.email || "";
          if (n) names.add(String(n));
        });
        setPeople(Array.from(names).sort());
      } catch (e) {
        setPeople([]);
      }
    })();
  }, []);

  // Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // Form
  const [form, setForm] = useState({
    client_name: "",
    company_name: "",
    types: [],
    startBr: "",
    startTime: "",
    endBr: "",
    endTime: "",
    day_periods: [],
    material_qty: "",
    material_photo_url: "",
    notes: "",
    status: "aguardando",
    supervisor: "",
    team: [],
  });

  const [uploadingMaterial, setUploadingMaterial] = useState(false);

  // Filtros
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fClients, setFClients] = useState([]);
  const [fCompanies, setFCompanies] = useState([]);
  const [fTypes, setFTypes] = useState([]);
  const [fPeriods, setFPeriods] = useState([]);
  const [fStatus, setFStatus] = useState([]);
  const [fStartBr, setFStartBr] = useState("");
  const [fEndBr, setFEndBr] = useState("");

  // View (month | week | agenda)
  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

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

  // Handlers
  const onChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const resetForm = () => setForm({
    client_name: "", company_name: "", types: [],
    startBr: "", startTime: "", endBr: "", endTime: "",
    day_periods: [], material_qty: "", material_photo_url: "",
    notes: "", status: "aguardando", supervisor: "", team: [],
  });

  const onDateChange = (field) => (e) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
    if (v.length >= 6) v = v.slice(0, 5) + "/" + v.slice(5, 9);
    onChange(field, v);
  };

  const toggleType = (type) => {
    setForm((prev) => ({
      ...prev,
      types: prev.types.includes(type) ? prev.types.filter((t) => t !== type) : [...prev.types, type],
    }));
  };
  const togglePeriod = (period) => {
    setForm((prev) => ({
      ...prev,
      day_periods: prev.day_periods.includes(period) ? prev.day_periods.filter((p) => p !== period) : [...prev.day_periods, period],
    }));
  };

  // Team chips
  const addTeamMember = (name) => {
    const n = String(name).trim();
    if (!n) return;
    setForm((f) => ({ ...f, team: f.team.includes(n) ? f.team : [...f.team, n] }));
  };
  const removeTeamMember = (name) => setForm((f) => ({ ...f, team: f.team.filter((t) => t !== name) }));

  // Upload
  const uploadFile = async (file) => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const response = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
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
      setForm((f) => ({ ...f, material_photo_url: url }));
    } catch (err) {
      alert("Erro ao enviar a imagem. Tente novamente.");
    } finally {
      setUploadingMaterial(false);
    }
  };

  // Util: montar datetimes ISO
  const composeISO = (dateBr, timeHHMM) => {
    const d = brToYMD(dateBr);
    if (!d) return null;
    const t = timeHHMM && /^\d{2}:\d{2}$/.test(timeHHMM) ? `${timeHHMM}:00` : "00:00:00";
    return `${d}T${t}`;
  };

  // CRUD
  const payloadFromForm = (base = {}) => {
    const startISOd = brToYMD(form.startBr);
    const endISOd = brToYMD(form.endBr);
    const startDT = composeISO(form.startBr, form.startTime);
    const endDT = composeISO(form.endBr, form.endTime);
    return {
      ...base,
      client_name: form.client_name,
      company_name: form.company_name,
      types: form.types,
      type: form.types.join(", "),
      start_date: startISOd || null,
      end_date: endISOd || null,
      start_datetime: startDT || null,
      end_datetime: endDT || null,
      day_periods: form.day_periods,
      material_qty: Number(form.material_qty || 0),
      material_photo_url: form.material_photo_url || "",
      notes: form.notes || "",
      status: form.status,
      active: activeFromStatus(form.status),
      supervisor: form.supervisor || "",
      team_members: form.team || [],
    };
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const startDT = composeISO(form.startBr, form.startTime);
    const endDT = composeISO(form.endBr, form.endTime);
    if (form.types.length === 0) return alert("Selecione ao menos um tipo de ação.");
    if (startDT && endDT && new Date(startDT) > new Date(endDT)) return alert("Término não pode ser anterior ao início.");

    try {
      await api.post("/actions", payloadFromForm());
      await loadActions();
      setIsCreateOpen(false);
      resetForm();
    } catch (err) {
      console.error("Erro ao criar ação:", err);
      alert("Erro ao criar ação: " + (err?.response?.data?.message || err.message));
    }
  };

  const openEdit = (item) => {
    setEditing(item);
    const sdt = item.start_datetime || item.start_date || "";
    const edt = item.end_datetime || item.end_date || "";
    const sDateObj = toDate(sdt);
    const eDateObj = toDate(edt);

    const pickTime = (dt) => dt ? `${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}` : "";

    setForm({
      client_name: item.client_name || "",
      company_name: item.company_name || "",
      types: ensureArrayTypes(item),
      startBr: sDateObj ? ymdToBR(toYMD(sDateObj)) : "",
      startTime: sDateObj ? pickTime(sDateObj) : "",
      endBr: eDateObj ? ymdToBR(toYMD(eDateObj)) : "",
      endTime: eDateObj ? pickTime(eDateObj) : "",
      day_periods: Array.isArray(item.day_periods) ? item.day_periods : [],
      material_qty: item.material_qty ?? "",
      material_photo_url: item.material_photo_url || "",
      notes: item.notes || "",
      status: deriveStatusFromItem(item),
      supervisor: item.supervisor || "",
      team: Array.isArray(item.team_members) ? item.team_members : [],
    });
    setIsEditOpen(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editing) return;

    const startDT = composeISO(form.startBr, form.startTime);
    const endDT = composeISO(form.endBr, form.endTime);
    if (form.types.length === 0) return alert("Selecione ao menos um tipo de ação.");
    if (startDT && endDT && new Date(startDT) > new Date(endDT)) return alert("Término não pode ser anterior ao início.");

    try {
      await api.put(`/actions/${editing.id}`, payloadFromForm());
      await loadActions();
      setIsEditOpen(false);
      setEditing(null);
      resetForm();
    } catch (err) {
      console.error("Erro ao atualizar ação:", err);
      alert("Erro ao atualizar ação: " + (err?.response?.data?.message || err.message));
    }
  };

  // Mover por drag & drop
  const onMoveAction = async (action, newStartYMD, newEndYMD) => {
    try {
      // preserva tudo e só troca as datas
      const payload = {
        client_name: action.client_name || "",
        company_name: action.company_name || "",
        types: ensureArrayTypes(action),
        type: ensureArrayTypes(action).join(", "),
        start_date: newStartYMD,
        end_date: newEndYMD,
        // mantém horas, se existirem
        start_datetime: action.start_datetime
          ? `${newStartYMD}T${action.start_datetime.slice(11,19)}`
          : null,
        end_datetime: action.end_datetime
          ? `${newEndYMD}T${action.end_datetime.slice(11,19)}`
          : null,
        day_periods: Array.isArray(action.day_periods) ? action.day_periods : [],
        material_qty: action.material_qty ?? 0,
        material_photo_url: action.material_photo_url || "",
        notes: action.notes || "",
        status: deriveStatusFromItem(action),
        active: activeFromStatus(deriveStatusFromItem(action)),
        supervisor: action.supervisor || "",
        team_members: Array.isArray(action.team_members) ? action.team_members : [],
      };
      await api.put(`/actions/${action.id}`, payload);
      await loadActions();
    } catch (err) {
      console.error("Erro ao mover ação:", err);
      alert("Não foi possível mover a ação.");
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

  // Filtros únicos
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
  const onFilterDateChange = (setter) => (e) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
    if (v.length >= 6) v = v.slice(0, 5) + "/" + v.slice(5, 9);
    setter(v);
  };
  const clearFilters = () => { setFClients([]); setFCompanies([]); setFTypes([]); setFPeriods([]); setFStatus([]); setFStartBr(""); setFEndBr(""); };

  const filtersCount =
    (fClients.length ? 1 : 0) + (fCompanies.length ? 1 : 0) + (fTypes.length ? 1 : 0) +
    (fPeriods.length ? 1 : 0) + (fStatus.length ? 1 : 0) + ((fStartBr || fEndBr) ? 1 : 0);

  // Lista filtrada (alimenta Tabela e Calendário)
  const filtered = useMemo(() => {
    let list = Array.isArray(actions) ? [...actions] : [];

    const k = q.trim().toLowerCase();
    if (k) {
      list = list.filter((a) => {
        const types = ensureArrayTypes(a).join(" ");
        const periods = Array.isArray(a.day_periods) ? a.day_periods.join(" ") : "";
        return [a.client_name, a.company_name, types, periods, a.notes]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(k));
      });
    }
    if (fClients?.length) {
      const set = new Set(fClients);
      list = list.filter((a) => set.has((a.client_name || "").trim()));
    }
    if (fCompanies?.length) {
      const set = new Set(fCompanies);
      list = list.filter((a) => set.has((a.company_name || "").trim()));
    }
    if (fTypes?.length) {
      const set = new Set(fTypes);
      list = list.filter((a) => ensureArrayTypes(a).some((t) => set.has(t)));
    }
    if (fPeriods?.length) {
      const set = new Set(fPeriods);
      list = list.filter((a) => Array.isArray(a.day_periods) && a.day_periods.some((p) => set.has(p)));
    }
    if (fStatus?.length) {
      const set = new Set(fStatus);
      list = list.filter((a) => set.has(deriveStatusFromItem(a)));
    }
    if (fStartBr || fEndBr) {
      const start = brToYMD(fStartBr) || "0000-01-01";
      const end = brToYMD(fEndBr) || "9999-12-31";
      list = list.filter((a) => {
        const aStart = (a.start_datetime || a.start_date || "0000-01-01").slice(0, 10);
        const aEnd = (a.end_datetime || a.end_date || "9999-12-31").slice(0, 10);
        return aStart <= end && aEnd >= start;
      });
    }

    list.sort((a, b) => (b.start_datetime || b.start_date || "0000-01-01").localeCompare(a.start_datetime || a.start_date || "0000-01-01"));
    return list;
  }, [actions, q, fClients, fCompanies, fTypes, fPeriods, fStatus, fStartBr, fEndBr]);

  // Novo pelo calendário
  const onNewOnDate = (ymd) => {
    resetForm();
    const hNow = new Date();
    const hh = String(hNow.getHours()).padStart(2, "0");
    const mm = String(hNow.getMinutes()).padStart(2, "0");
    setForm((f) => ({ ...f, startBr: ymdToBR(ymd), endBr: ymdToBR(ymd), startTime: `${hh}:${mm}`, endTime: `${hh}:${mm}`, status: "aguardando" }));
    setIsCreateOpen(true);
  };

  // Supervisor selector
  const [supOpen, setSupOpen] = useState(false);
  const SupervisorSelect = () => (
    <Popover open={supOpen} onOpenChange={setSupOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-between">
          <span className="truncate">{form.supervisor || "Definir supervisor"}</span>
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" sideOffset={8} className="z-[100] p-0 w-[min(92vw,520px)]">
        <Command>
          <CommandInput placeholder="Buscar pessoa..." />
          <CommandEmpty>Nenhum nome encontrado.</CommandEmpty>
          <CommandList className="max-h-[50vh] overflow-y-auto">
            <CommandGroup heading="Pessoas">
              {people.length === 0 && (
                <CommandItem onSelect={() => {}}>
                  <span className="text-xs text-muted-foreground">Sem sugestões — digite manualmente abaixo.</span>
                </CommandItem>
              )}
              {people.map((n) => (
                <CommandItem
                  key={n}
                  value={n}
                  onSelect={() => { onChange("supervisor", n); setSupOpen(false); }}
                  className="flex items-center gap-2 px-3 py-2"
                >
                  <span className="truncate">{n}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        <div className="p-2 border-t">
          <Input
            placeholder="Ou digite um nome e Enter"
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); onChange("supervisor", e.currentTarget.value.trim()); setSupOpen(false); }
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );

  // Team editor
  const TeamEditor = () => {
    const [query, setQuery] = useState("");
    const filteredPeople = people.filter(p => p.toLowerCase().includes(query.toLowerCase()) && !form.team.includes(p)).slice(0, 6);
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {form.team.map((m) => (
            <Badge key={m} variant="secondary" className="gap-1">
              {m}
              <button type="button" onClick={() => removeTeamMember(m)} className="ml-1 opacity-70 hover:opacity-100">
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          {form.team.length === 0 && <span className="text-xs text-muted-foreground">Nenhum integrante adicionado.</span>}
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Digite um nome e Enter"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addTeamMember(query); setQuery(""); }
            }}
          />
          <Button type="button" variant="outline" onClick={() => { addTeamMember(query); setQuery(""); }}>Adicionar</Button>
        </div>
        {filteredPeople.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filteredPeople.map(n => (
              <Button key={n} type="button" size="sm" variant="ghost" onClick={() => { addTeamMember(n); setQuery(""); }}>
                + {n}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Export
  const exportData = useMemo(() => filtered.map((a) => {
    const types = ensureArrayTypes(a).join(" | ");
    const periods = Array.isArray(a?.day_periods) ? a.day_periods.join(" | ") : "";
    const start = a.start_datetime ? formatDateBR(a.start_datetime) : (a.start_date ? formatDateBR(a.start_date) : "");
    const end = a.end_datetime ? formatDateBR(a.end_datetime) : (a.end_date ? formatDateBR(a.end_date) : "");
    const status = deriveStatusFromItem(a);
    return {
      cliente: a.client_name || "",
      empresa: a.company_name || "",
      tipos: types,
      periodos: periods,
      inicio: start,
      termino: end,
      quantidade_material: a.material_qty ?? "",
      status,
      supervisor: a.supervisor || "",
      equipe: Array.isArray(a.team_members) ? a.team_members.join(" | ") : "",
      observacoes: a.notes || "",
      foto_url: a.material_photo_url || ""
    };
  }), [filtered]);

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
    filtersSummary: `Filtros aplicados: ${filtersCount > 0 ?
      [
        fClients.length > 0 ? `Clientes: ${fClients.join(', ')}` : '',
        fCompanies.length > 0 ? `Empresas: ${fCompanies.join(', ')}` : '',
        fTypes.length > 0 ? `Tipos: ${fTypes.join(', ')}` : '',
        fPeriods.length > 0 ? `Períodos: ${fPeriods.join(', ')}` : '',
        fStatus.length > 0 ? `Status: ${fStatus.join(', ')}` : '',
        (fStartBr || fEndBr) ? `Período: ${fStartBr || '...'} - ${fEndBr || '...'}` : '',
      ].filter(Boolean).join(' | ') : 'Nenhum filtro aplicado'
    }`,
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-3 md:px-6 py-4 md:py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">Ações</h1>
      </div>

      {/* Troca de visualização */}
      <div className="mb-3 flex items-center gap-2">
        <div className="inline-flex rounded-md border p-1">
          <Button size="sm" variant={view === "month" ? "default" : "ghost"} onClick={() => setView("month")}>Mês</Button>
          <Button size="sm" variant={view === "week" ? "default" : "ghost"} onClick={() => setView("week")}>Semana</Button>
          <Button size="sm" variant={view === "agenda" ? "default" : "ghost"} onClick={() => setView("agenda")}>Agenda</Button>
        </div>
      </div>

      {view === "month" && (
        <CalendarMonth
          actions={filtered}
          cursor={cursor}
          setCursor={setCursor}
          onNewOnDate={onNewOnDate}
          onOpenEdit={openEdit}
          onMoveAction={onMoveAction}
        />
      )}
      {view === "week" && (
        <CalendarWeek
          actions={filtered}
          cursor={startOfWeekMon(cursor)}
          setCursor={setCursor}
          onNewOnDate={onNewOnDate}
          onOpenEdit={openEdit}
          onMoveAction={onMoveAction}
        />
      )}
      {view === "agenda" && (
        <AgendaList
          actions={filtered}
          cursor={cursor}
          setCursor={setCursor}
          onOpenEdit={openEdit}
        />
      )}

      <Card className="mt-6">
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
                    onWheel={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
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
                    </div>

                    {/* Datas */}
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

            {/* Criar ação */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="size-4" />
                  <span className="whitespace-nowrap">Nova Ação</span>
                </Button>
              </DialogTrigger>

              <DialogContent className="w-full max-w-xl max-h-[85vh] overflow-y-auto p-0">
                <div className="px-5 pt-5 pb-3 border-b">
                  <DialogHeader>
                    <DialogTitle className="text-base">Criar ação</DialogTitle>
                    <DialogDescription className="text-xs">Preencha os campos abaixo.</DialogDescription>
                  </DialogHeader>
                </div>

                <div className="px-5 py-4">
                  <form className="space-y-4" onSubmit={handleCreate}>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="client_name">Cliente</Label>
                        <Input id="client_name" value={form.client_name} onChange={(e) => onChange("client_name", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="company_name">Empresa</Label>
                        <Input id="company_name" value={form.company_name} onChange={(e) => onChange("company_name", e.target.value)} />
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <Label>Tipos (serviços)</Label>
                        <TypeSelector />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-2"><CalendarIcon className="size-4" /> Início (Data)</Label>
                        <Input placeholder="DD/MM/AAAA" inputMode="numeric" value={form.startBr} onChange={onDateChange("startBr")} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Início (Hora)</Label>
                        <Input type="time" value={form.startTime} onChange={(e) => onChange("startTime", e.target.value)} />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-2"><CalendarIcon className="size-4" /> Término (Data)</Label>
                        <Input placeholder="DD/MM/AAAA" inputMode="numeric" value={form.endBr} onChange={onDateChange("endBr")} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Término (Hora)</Label>
                        <Input type="time" value={form.endTime} onChange={(e) => onChange("endTime", e.target.value)} />
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
                        <Label>Qtd. de Material</Label>
                        <Input type="number" min={0} value={form.material_qty} onChange={(e) => onChange("material_qty", e.target.value)} />
                      </div>

                      <div className="space-y-1.5">
                        <Label>Status</Label>
                        <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.status} onChange={(e) => onChange("status", e.target.value)}>
                          <option value="aguardando">Aguardando</option>
                          <option value="andamento">Andamento</option>
                          <option value="concluido">Concluída</option>
                        </select>
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <Label>Supervisor</Label>
                        <SupervisorSelect />
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <Label>Equipe</Label>
                        <TeamEditor />
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
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-6">Carregando…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-6">Nenhum registro</TableCell></TableRow>
                ) : (
                  filtered.map((a) => {
                    const types = ensureArrayTypes(a);
                    const periods = Array.isArray(a.day_periods) ? a.day_periods : [];
                    const status = deriveStatusFromItem(a);
                    const statusColor = status === "concluido" ? "default" : status === "andamento" ? "secondary" : "outline";
                    const startTxt = a.start_datetime || a.start_date || "";
                    const endTxt = a.end_datetime || a.end_date || "";

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
                        <TableCell className="text-center">{startTxt ? formatDateBR(startTxt) : "—"}</TableCell>
                        <TableCell className="text-center">{endTxt ? formatDateBR(endTxt) : "—"}</TableCell>
                        <TableCell className="text-center">{a.material_qty ?? "—"}</TableCell>
                        <TableCell className="text-center"><Badge variant={statusColor} className="capitalize">{status}</Badge></TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button size="sm" variant="outline" className="gap-2" onClick={() => openEdit(a)}><Edit className="size-4" />Editar</Button>
                            <Button size="sm" variant="destructive" className="gap-2" onClick={() => handleDelete(a.id)}><Trash2 className="size-4" />Excluir</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground mt-3">Total: <strong>{filtered.length}</strong> ação(ões)</p>
        </CardContent>
      </Card>

      {/* Editar */}
      <Dialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); if (!v) { setEditing(null); resetForm(); } }}>
        <DialogContent className="w-full max-w-xl max-h-[85vh] overflow-y-auto p-0">
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
                  <Label>Cliente</Label>
                  <Input value={form.client_name} onChange={(e) => onChange("client_name", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Empresa</Label>
                  <Input value={form.company_name} onChange={(e) => onChange("company_name", e.target.value)} />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Tipos (serviços)</Label>
                  <TypeSelector />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2"><CalendarIcon className="size-4" /> Início (Data)</Label>
                  <Input placeholder="DD/MM/AAAA" inputMode="numeric" value={form.startBr} onChange={onDateChange("startBr")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Início (Hora)</Label>
                  <Input type="time" value={form.startTime} onChange={(e) => onChange("startTime", e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2"><CalendarIcon className="size-4" /> Término (Data)</Label>
                  <Input placeholder="DD/MM/AAAA" inputMode="numeric" value={form.endBr} onChange={onDateChange("endBr")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Término (Hora)</Label>
                  <Input type="time" value={form.endTime} onChange={(e) => onChange("endTime", e.target.value)} />
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
                  <Label>Qtd. de Material</Label>
                  <Input type="number" min={0} value={form.material_qty} onChange={(e) => onChange("material_qty", e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.status} onChange={(e) => onChange("status", e.target.value)}>
                    <option value="aguardando">Aguardando</option>
                    <option value="andamento">Andamento</option>
                    <option value="concluido">Concluída</option>
                  </select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Supervisor</Label>
                  <SupervisorSelect />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Equipe</Label>
                  <TeamEditor />
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
