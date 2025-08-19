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
  UploadCloud, Filter as FilterIcon, ChevronLeft, ChevronRight, PlusCircle
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

/* Datas */
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

/* ===================== Time/Date utils (corrigindo timezone e hora) ===================== */
// sempre tratar "data pura" local (sem UTC)
const toLocalDateFromYMD = (ymd) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ymd || ""))) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d); // local midnight
};
// normaliza HH:MM (ex.: "0730" -> "07:30")
const normalizeHHMM = (s) => {
  const digits = String(s || "").replace(/\D/g, "").slice(0, 4);
  if (digits.length === 0) return "";
  let hh = digits.slice(0, 2);
  let mm = digits.slice(2, 4);
  if (hh.length === 1) hh = `0${hh}`;
  if (mm.length === 1) mm = `0${mm}`;
  if (!mm) mm = "00";
  // limites
  const hNum = Math.min(23, Math.max(0, parseInt(hh || "0", 10)));
  const mNum = Math.min(59, Math.max(0, parseInt(mm || "0", 10)));
  return `${String(hNum).padStart(2, "0")}:${String(mNum).padStart(2, "0")}`;
};
// compõe datetime local SEM timezone (evita deslocamentos)
const composeISO = (dateBr, timeHHMM) => {
  const ymd = brToYMD(dateBr);
  if (!ymd) return null;
  const hhmm = normalizeHHMM(timeHHMM || "");
  const t = /^\d{2}:\d{2}$/.test(hhmm) ? `${hhmm}:00` : "00:00:00";
  return `${ymd}T${t}`; // sem Z
};
// extrai YMD a partir de strings que podem vir com datetime
const pickYMD = (obj) => {
  const s =
    obj?.start_date ||
    (obj?.start_datetime ? String(obj.start_datetime).slice(0, 10) : "") ||
    "";
  const e =
    obj?.end_date ||
    (obj?.end_datetime ? String(obj.end_datetime).slice(0, 10) : s) ||
    s;
  return { sYMD: s, eYMD: e };
};
// dia atual para string YMD
const toYMD = (dt) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
    dt.getDate()
  ).padStart(2, "0")}`;
const addDays = (dt, n) => {
  const d = new Date(dt);
  d.setDate(d.getDate() + n);
  return d;
};
const startOfMonth = (dt) => new Date(dt.getFullYear(), dt.getMonth(), 1);
const endOfMonth = (dt) => new Date(dt.getFullYear(), dt.getMonth() + 1, 0);
const startOfWeekMon = (dt) => {
  const d = new Date(dt);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};
const endOfWeekMon = (dt) => addDays(startOfWeekMon(dt), 6);
const monthTitlePtBR = (dt) =>
  dt.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
const WEEKDAYS_PT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const statusChipClass = (s) =>
  s === "andamento"
    ? "bg-blue-100 text-blue-800 border-blue-300"
    : s === "concluido"
    ? "bg-green-100 text-green-800 border-green-300"
    : "bg-amber-100 text-amber-800 border-amber-300";

/* ========= TypeSelector ========= */
const TypeSelector = ({ value = [], onChange }) => {
  const [open, setOpen] = React.useState(false);
  const selected = Array.isArray(value) ? value : [];

  const toggle = (t) => {
    const exists = selected.includes(t);
    const next = exists ? selected.filter((x) => x !== t) : [...selected, t];
    onChange(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="inline-flex flex-wrap gap-2">
            {selected.length === 0 ? (
              "Selecionar tipos"
            ) : (
              <>
                {selected.slice(0, 2).map((t) => (
                  <Badge key={t} variant="secondary" className="mr-1">
                    {t}
                  </Badge>
                ))}
                {selected.length > 2 && (
                  <Badge variant="outline">+{selected.length - 2}</Badge>
                )}
              </>
            )}
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
            {selected.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => onChange([])}>
                Limpar
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {ACTION_OPTIONS.map((group) => (
              <div key={group.group}>
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  {group.group}
                </p>
                <div className="space-y-2">
                  {group.items.map((opt) => {
                    const isSelected = selected.includes(opt);
                    return (
                      <label
                        key={opt}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggle(opt)}
                        />
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

/* ========= Célula (calendário) ========= */
function DayCell({
  dateObj,
  inMonth,
  isToday,
  events,
  onNewOnDate,
  onOpenEdit,
  onMoveAction,
}) {
  const key = toYMD(dateObj);
  const maxVisible = 3;
  const onDragOver = (e) => e.preventDefault();
  const onDrop = (e) => {
    e.preventDefault();
    try {
      const { action, sYMD, eYMD } = JSON.parse(
        e.dataTransfer.getData("text/plain")
      );
      if (!action?.id || !sYMD || !eYMD) return;
      // duração em dias (inclusivo)
      const start = toLocalDateFromYMD(sYMD);
      const end = toLocalDateFromYMD(eYMD);
      const days =
        Math.round(
          (toLocalDateFromYMD(eYMD) - toLocalDateFromYMD(sYMD)) / 86400000
        ) + 1;
      const newStart = key;
      const newEnd = toYMD(addDays(dateObj, days - 1));
      onMoveAction(action, newStart, newEnd);
    } catch {}
  };
  return (
    <div
      className={`bg-card min-h-[112px] sm:min-h-[130px] p-1.5 sm:p-2 flex flex-col ${
        inMonth ? "" : "opacity-50"
      }`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={() => onNewOnDate(key)}
          className={`text-xs rounded px-1 ${
            isToday ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-accent"
          }`}
        >
          {dateObj.getDate()}
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onNewOnDate(key)}
          title="Nova ação"
        >
          <PlusCircle className="size-3.5" />
        </Button>
      </div>
      <div className="flex-1 space-y-1 overflow-hidden">
        {events.slice(0, maxVisible).map((a) => {
          const st = deriveStatusFromItem(a);
          const sup = a.supervisor ? ` • Sup: ${a.supervisor}` : "";
          // arrasta/move por data pura (YMD)
          const { sYMD, eYMD } = pickYMD(a);
          const onDragStart = (e) => {
            e.dataTransfer.setData(
              "text/plain",
              JSON.stringify({ action: a, sYMD, eYMD })
            );
            e.dataTransfer.effectAllowed = "move";
          };
          return (
            <button
              key={`${a.id}-${key}`}
              onClick={() => onOpenEdit(a)}
              draggable
              onDragStart={onDragStart}
              className={`w-full text-left text-[10px] sm:text-xs border rounded px-1.5 py-1 ${statusChipClass(
                st
              )} hover:brightness-95 cursor-grab active:cursor-grabbing`}
              title={a.client_name || a.company_name || "Ação"}
            >
              <span className="truncate">
                {(a.client_name || a.company_name || "Ação") + sup}
              </span>
            </button>
          );
        })}
        {events.length > maxVisible && (
          <div className="text-[10px] sm:text-xs text-muted-foreground">
            +{events.length - maxVisible} mais…
          </div>
        )}
      </div>
    </div>
  );
}

/* ========= Visões ========= */
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

  // agrupa usando APENAS as datas puras (YMD) -> evita timezone
  const daysMap = useMemo(() => {
    const map = new Map();
    for (let d = new Date(gridStart); d <= gridEnd; d = addDays(d, 1)) {
      map.set(toYMD(d), []);
    }
    for (const a of actions) {
      const { sYMD, eYMD } = pickYMD(a);
      if (!sYMD || !eYMD) continue;
      let cur = toLocalDateFromYMD(sYMD);
      const last = toLocalDateFromYMD(eYMD);
      if (!cur || !last) continue;
      while (cur <= last) {
        const k = toYMD(cur);
        if (map.has(k)) map.get(k).push(a);
        cur = addDays(cur, 1);
      }
    }
    const order = { andamento: 0, aguardando: 1, concluido: 2 };
    for (const [k, list] of map.entries()) {
      list.sort(
        (a, b) =>
          (order[deriveStatusFromItem(a)] ?? 3) -
          (order[deriveStatusFromItem(b)] ?? 3)
      );
    }
    return map;
  }, [actions, cursor]);

  const weeks = [];
  for (let d = new Date(gridStart); d <= gridEnd; d = addDays(d, 7)) {
    weeks.push([0, 1, 2, 3, 4, 5, 6].map((i) => addDays(d, i)));
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg md:text-xl font-semibold">
              Calendário
            </CardTitle>
            <CardDescription>Visualização mensal das ações</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCursor(startOfMonth(new Date()))}
            >
              Hoje
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCursor(addDays(startOfMonth(cursor), -1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCursor(addDays(endOfMonth(cursor), 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {monthTitlePtBR(cursor)}
        </div>
        <div className="grid grid-cols-7 text-xs font-medium text-muted-foreground mt-1">
          {WEEKDAYS_PT.map((d) => (
            <div key={d} className="px-2 py-1">
              {d}
            </div>
          ))}
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
          <div className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-amber-200 border border-amber-300" />{" "}
            Aguardando
          </div>
          <div className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-blue-200 border border-blue-300" />{" "}
            Andamento
          </div>
          <div className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-green-200 border border-green-300" />{" "}
            Concluída
          </div>
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
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(weekStart, i));
  const groups = useMemo(() => {
    const map = new Map(days.map((d) => [toYMD(d), []]));
    for (const a of actions) {
      const { sYMD, eYMD } = pickYMD(a);
      if (!sYMD || !eYMD) continue;
      const s = toLocalDateFromYMD(sYMD);
      const e = toLocalDateFromYMD(eYMD);
      for (const d of days) if (s <= d && d <= e) map.get(toYMD(d)).push(a);
    }
    const order = { andamento: 0, aguardando: 1, concluido: 2 };
    for (const [k, list] of map.entries()) {
      list.sort(
        (a, b) =>
          (order[deriveStatusFromItem(a)] ?? 3) -
          (order[deriveStatusFromItem(b)] ?? 3)
      );
    }
    return map;
  }, [actions, cursor]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg md:text-xl font-semibold">
              Semana
            </CardTitle>
            <CardDescription>
              {ymdToBR(toYMD(weekStart))} – {ymdToBR(toYMD(addDays(weekStart, 6)))}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
              Hoje
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCursor(addDays(weekStart, -1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCursor(addDays(weekStart, 7))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-[1px] bg-border rounded-lg overflow-hidden">
          {days.map((d) => {
            const key = toYMD(d),
              isToday = key === toYMD(new Date());
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
      const { sYMD, eYMD } = pickYMD(a);
      if (!sYMD || !eYMD) continue;
      const s = toLocalDateFromYMD(sYMD);
      const e = toLocalDateFromYMD(eYMD);
      if (e < monthStart || s > monthEnd) continue;
      list.push(a);
    }
    list.sort((a, b) =>
      (a.start_date || a.start_datetime || "").localeCompare(
        b.start_date || b.start_datetime || ""
      )
    );
    return list;
  }, [actions, cursor]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg md:text-xl font-semibold">
              Agenda
            </CardTitle>
            <CardDescription>{monthTitlePtBR(cursor)}</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCursor(addDays(startOfMonth(cursor), -1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCursor(addDays(endOfMonth(cursor), 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Nenhuma ação no período.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((a) => {
              const st = deriveStatusFromItem(a);
              const start = a.start_datetime || a.start_date || "";
              const end = a.end_datetime || a.end_date || "";
              const sup = a.supervisor ? ` • Sup: ${a.supervisor}` : "";
              return (
                <button
                  key={a.id}
                  onClick={() => onOpenEdit(a)}
                  className={`w-full text-left border rounded px-3 py-2 ${statusChipClass(
                    st
                  )} hover:brightness-95`}
                >
                  <div className="text-sm font-medium truncate">
                    {(a.client_name || a.company_name || "Ação") + sup}
                  </div>
                  <div className="text-xs opacity-80 truncate">
                    {start ? formatDateBR(start) : ""}
                    {end ? " → " + formatDateBR(end) : ""}
                  </div>
                  <div className="text-[11px] opacity-70 truncate">
                    {ensureArrayTypes(a).join(" • ") || "—"}
                  </div>
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

  // sugestões (staff/users — se falhar, ignora)
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
      } catch {
        setPeople([]);
      }
    })();
  }, []);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // Form state
  const [form, setForm] = useState({
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
    supervisor: "",
    team: [],
    startTime: "",
    endTime: "",
  });

  const [uploadingMaterial, setUploadingMaterial] = useState(false);

  // Filter states
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fClients, setFClients] = useState([]);
  const [fCompanies, setFCompanies] = useState([]);
  const [fTypes, setFTypes] = useState([]);
  const [fPeriods, setFPeriods] = useState([]);
  const [fStatus, setFStatus] = useState([]);
  const [fStartBr, setFStartBr] = useState("");
  const [fEndBr, setFEndBr] = useState("");

  // View (calendário)
  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  // Load actions
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

  useEffect(() => {
    loadActions();
  }, []);

  // Form handlers
  const onChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };
  const onTimeChange = (field) => (e) => {
    onChange(field, normalizeHHMM(e.target.value));
  };

  const resetForm = () => {
    setForm({
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
      supervisor: "",
      team: [],
      startTime: "",
      endTime: "",
    });
  };

  const onDateChange = (field) => (e) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
    if (v.length >= 6) v = v.slice(0, 5) + "/" + v.slice(5, 9);
    onChange(field, v);
  };

  const toggleType = (type) => {
    setForm((prev) => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type],
    }));
  };

  const togglePeriod = (period) => {
    setForm((prev) => ({
      ...prev,
      day_periods: prev.day_periods.includes(period)
        ? prev.day_periods.filter((p) => p !== period)
        : [...prev.day_periods, period],
    }));
  };

  const addTeamMember = (name) => {
    const n = String(name || "").trim();
    if (!n) return;
    setForm((f) => ({ ...f, team: f.team.includes(n) ? f.team : [...f.team, n] }));
  };
  const removeTeamMember = (name) =>
    setForm((f) => ({ ...f, team: f.team.filter((x) => x !== name) }));

  // Upload handler
  const uploadFile = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
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
      console.error("Erro no upload do material:", err);
      alert("Erro ao enviar a imagem. Tente novamente.");
    } finally {
      setUploadingMaterial(false);
    }
  };

  // CRUD operations
  const handleCreate = async (e) => {
    e.preventDefault();
    const startISO = brToYMD(form.startBr);
    const endISO = brToYMD(form.endBr);
    const startDT = composeISO(form.startBr, form.startTime);
    const endDT = composeISO(form.endBr, form.endTime);

    if (form.types.length === 0) return alert("Selecione ao menos um tipo de ação.");
    if (startDT && endDT && new Date(startDT) > new Date(endDT))
      return alert("Data de término não pode ser anterior à data de início.");

    try {
      const payload = {
        client_name: form.client_name,
        company_name: form.company_name,
        types: form.types,
        type: form.types.join(", "),
        start_date: startISO || null, // YMD puro
        end_date: endISO || null,     // YMD puro
        start_datetime: startDT || null, // HH:MM opcional (sem Z)
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
      await api.post("/actions", payload);
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
    const { sYMD, eYMD } = pickYMD(item);

    // tenta extrair HH:MM da string datetime (se vier)
    const hhmm = (dt) => {
      const m = String(dt || "").match(/T(\d{2}):(\d{2})/);
      return m ? `${m[1]}:${m[2]}` : "";
    };

    setForm({
      client_name: item.client_name || "",
      company_name: item.company_name || "",
      types: ensureArrayTypes(item),
      startBr: ymdToBR(sYMD) || "",
      endBr: ymdToBR(eYMD) || "",
      startTime: hhmm(item.start_datetime),
      endTime: hhmm(item.end_datetime),
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

    const startISO = brToYMD(form.startBr);
    const endISO = brToYMD(form.endBr);
    const startDT = composeISO(form.startBr, form.startTime);
    const endDT = composeISO(form.endBr, form.endTime);

    if (form.types.length === 0) return alert("Selecione ao menos um tipo de ação.");
    if (startDT && endDT && new Date(startDT) > new Date(endDT))
      return alert("Data de término não pode ser anterior à data de início.");

    try {
      const payload = {
        client_name: form.client_name,
        company_name: form.company_name,
        types: form.types,
        type: form.types.join(", "),
        start_date: startISO || null,
        end_date: endISO || null,
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

  // mover (drag & drop no calendário) — usa datas puras
  const handleMoveAction = async (action, startYMD, endYMD) => {
    try {
      await api.put(`/actions/${action.id}`, {
        ...action,
        start_date: startYMD,
        end_date: endYMD,
        // preserva HH:MM se já existe (ou põe default)
        start_datetime: action.start_datetime || `${startYMD}T00:00:00`,
        end_datetime: action.end_datetime || `${endYMD}T23:59:59`,
      });
      await loadActions();
    } catch (e) {
      alert("Não foi possível mover a ação.");
    }
  };

  // Filter helpers
  const uniqueClients = useMemo(() => {
    const set = new Set();
    actions.forEach((a) => {
      const v = (a.client_name || "").trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort();
  }, [actions]);

  const uniqueCompanies = useMemo(() => {
    const set = new Set();
    actions.forEach((a) => {
      const v = (a.company_name || "").trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort();
  }, [actions]);

  const toggleFilter = (setter, value) => {
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const onFilterDateChange = (setter) => (e) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
    if (v.length >= 6) v = v.slice(0, 5) + "/" + v.slice(5, 9);
    setter(v);
  };

  const clearFilters = () => {
    setFClients([]);
    setFCompanies([]);
    setFTypes([]);
    setFPeriods([]);
    setFStatus([]);
    setFStartBr("");
    setFEndBr("");
  };

  const filtersCount =
    (fClients.length ? 1 : 0) +
    (fCompanies.length ? 1 : 0) +
    (fTypes.length ? 1 : 0) +
    (fPeriods.length ? 1 : 0) +
    (fStatus.length ? 1 : 0) +
    (fStartBr || fEndBr ? 1 : 0);

  // Filtered data (lista/tabela)
  const filtered = useMemo(() => {
    let list = Array.isArray(actions) ? [...actions] : [];

    // Search query
    const k = q.trim().toLowerCase();
    if (k) {
      list = list.filter((a) => {
        const types = ensureArrayTypes(a).join(" ");
        const periods = Array.isArray(a.day_periods)
          ? a.day_periods.join(" ")
          : "";
        return [a.client_name, a.company_name, types, periods, a.notes, a.supervisor]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(k));
      });
    }

    // Advanced filters
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
      list = list.filter(
        (a) => Array.isArray(a.day_periods) && a.day_periods.some((p) => set.has(p))
      );
    }
    if (fStatus.length > 0) {
      const set = new Set(fStatus);
      list = list.filter((a) => set.has(deriveStatusFromItem(a)));
    }
    if (fStartBr || fEndBr) {
      const start = brToYMD(fStartBr) || "0000-01-01";
      const end = brToYMD(fEndBr) || "9999-12-31";
      list = list.filter((a) => {
        const { sYMD, eYMD } = pickYMD(a);
        const aStart = sYMD || "0000-01-01";
        const aEnd = eYMD || "9999-12-31";
        return aStart <= end && aEnd >= start;
      });
    }

    // Sort by start date desc
    list.sort((a, b) => {
      const aDate = pickYMD(a).sYMD || "0000-01-01";
      const bDate = pickYMD(b).sYMD || "0000-01-01";
      return bDate.localeCompare(aDate);
    });

    return list;
  }, [actions, q, fClients, fCompanies, fTypes, fPeriods, fStatus, fStartBr, fEndBr]);

  // Export
  const exportData = useMemo(() => {
    return filtered.map((a) => {
      const types = ensureArrayTypes(a).join(" | ");
      const periods = Array.isArray(a?.day_periods) ? a.day_periods.join(" | ") : "";
      const start = pickYMD(a).sYMD ? formatDateBR(pickYMD(a).sYMD) : "";
      const end = pickYMD(a).eYMD ? formatDateBR(pickYMD(a).eYMD) : "";
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
        supervisor: a.supervisor || "",
        equipe: Array.isArray(a.team_members) ? a.team_members.join(" | ") : "",
        observacoes: a.notes || "",
        foto_url: a.material_photo_url || ""
      };
    });
  }, [filtered]);

  const exportColumns = [
    { key: "cliente", header: "Cliente" },
    { key: "empresa", header: "Empresa" },
    { key: "tipos", header: "Tipos" },
    { key: "periodos", header: "Períodos" },
    { key: "inicio", header: "Início" },
    { key: "termino", header: "Término" },
    { key: "quantidade_material", header: "Qtd. Material" },
    { key: "status", header: "Status" },
    { key: "supervisor", header: "Supervisor" },
    { key: "equipe", header: "Equipe" },
    { key: "observacoes", header: "Observações" },
    { key: "foto_url", header: "Foto (URL)" },
  ];

  const pdfOptions = {
    title: "Relatório de Ações",
    orientation: "l",
    filtersSummary: `Filtros aplicados: ${
      (
        (fClients.length ? `Clientes: ${fClients.join(", ")}` : "") +
        " " +
        (fCompanies.length ? `Empresas: ${fCompanies.join(", ")}` : "") +
        " " +
        (fTypes.length ? `Tipos: ${fTypes.join(", ")}` : "") +
        " " +
        (fPeriods.length ? `Períodos: ${fPeriods.join(", ")}` : "") +
        " " +
        (fStatus.length ? `Status: ${fStatus.join(", ")}` : "") +
        " " +
        (fStartBr || fEndBr
          ? `Período: ${fStartBr || "..."} - ${fEndBr || "..."}`
          : "")
      ).trim() || "Nenhum filtro aplicado"
    }`,
  };

  // UI helpers (nova ação no dia X via calendário)
  const newOnDate = (ymd) => {
    setIsCreateOpen(true);
    setForm((f) => ({
      ...f,
      startBr: ymdToBR(ymd),
      endBr: ymdToBR(ymd),
      startTime: "08:00",
      endTime: "18:00",
    }));
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-3 md:px-6 py-4 md:py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">Ações</h1>
      </div>

      {/* CALENDÁRIO: alternador de visão */}
      <div className="mb-4 flex items-center gap-2">
        <div className="inline-flex border rounded-lg overflow-hidden">
          <button
            className={`px-3 py-1.5 text-sm ${
              view === "month" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            }`}
            onClick={() => setView("month")}
          >
            Mês
          </button>
          <button
            className={`px-3 py-1.5 text-sm ${
              view === "week" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            }`}
            onClick={() => setView("week")}
          >
            Semana
          </button>
          <button
            className={`px-3 py-1.5 text-sm ${
              view === "agenda" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            }`}
            onClick={() => setView("agenda")}
          >
            Agenda
          </button>
        </div>
      </div>

      {view === "month" && (
        <CalendarMonth
          actions={actions}
          cursor={cursor}
          setCursor={setCursor}
          onNewOnDate={newOnDate}
          onOpenEdit={openEdit}
          onMoveAction={handleMoveAction}
        />
      )}
      {view === "week" && (
        <CalendarWeek
          actions={actions}
          cursor={cursor}
          setCursor={setCursor}
          onNewOnDate={newOnDate}
          onOpenEdit={openEdit}
          onMoveAction={handleMoveAction}
        />
      )}
      {view === "agenda" && (
        <AgendaList
          actions={actions}
          cursor={cursor}
          setCursor={setCursor}
          onOpenEdit={openEdit}
        />
      )}

      {/* LISTA / TABELA */}
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg md:text-xl font-semibold">Registros</CardTitle>
              <CardDescription>Lista de ações cadastradas</CardDescription>
            </div>
            <div className="ml-auto">
              <ExportMenu
                data={exportData}
                columns={exportColumns}
                filename="acoes"
                pdfOptions={pdfOptions}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3">
            <div className="relative flex-1 w-full md:w-[320px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar ações..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            {/* Filters */}
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

            {/* Create Action */}
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
                        <Label htmlFor="client_name">Nome do cliente</Label>
                        <Input id="client_name" value={form.client_name} onChange={(e) => onChange("client_name", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="company_name">Nome da empresa</Label>
                        <Input id="company_name" value={form.company_name} onChange={(e) => onChange("company_name", e.target.value)} />
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <Label>Tipo(s) de ação</Label>
                        <TypeSelector
                          value={form.types}
                          onChange={(arr) => onChange("types", arr)}
                        />
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
                        <Label className="flex items-center gap-2"><CalendarIcon className="size-4" /> Início</Label>
                        <div className="flex gap-2">
                          <Input placeholder="DD/MM/AAAA" inputMode="numeric" value={form.startBr} onChange={onDateChange("startBr")} />
                          <Input placeholder="HH:MM" inputMode="numeric" value={form.startTime} onChange={onTimeChange("startTime")} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-2"><CalendarIcon className="size-4" /> Término</Label>
                        <div className="flex gap-2">
                          <Input placeholder="DD/MM/AAAA" inputMode="numeric" value={form.endBr} onChange={onDateChange("endBr")} />
                          <Input placeholder="HH:MM" inputMode="numeric" value={form.endTime} onChange={onTimeChange("endTime")} />
                        </div>
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

                      {/* Supervisor & Equipe */}
                      <div className="space-y-1.5">
                        <Label>Supervisor</Label>
                        <Input placeholder="Nome do supervisor" value={form.supervisor} onChange={(e) => onChange("supervisor", e.target.value)} list="__people__" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Adicionar integrante da equipe</Label>
                        <div className="flex gap-2">
                          <Input id="__team_input" placeholder="Nome" list="__people__" />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const el = document.getElementById("__team_input");
                              addTeamMember(el?.value || "");
                              if (el) el.value = "";
                            }}
                          >
                            Adicionar
                          </Button>
                        </div>
                        <datalist id="__people__">
                          {people.map((p) => (
                            <option key={p} value={p} />
                          ))}
                        </datalist>
                        {form.team.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {form.team.map((n) => (
                              <Badge key={n} variant="secondary" className="gap-1">
                                {n}
                                <button type="button" onClick={() => removeTeamMember(n)} className="ml-1 opacity-70 hover:opacity-100">
                                  <X className="size-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="material_qty">Quantidade de material</Label>
                        <Input id="material_qty" type="number" min={0} value={form.material_qty} onChange={(e) => onChange("material_qty", e.target.value)} />
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
                        <Label htmlFor="notes">Observações</Label>
                        <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => onChange("notes", e.target.value)} />
                      </div>

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
                          <option value="concluido">Concluído</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" size="sm">
                        Salvar
                      </Button>
                    </div>
                  </form>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Table */}
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
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-6">
                      Carregando…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-6">
                      Nenhum registro
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((a) => {
                    const types = ensureArrayTypes(a);
                    const periods = Array.isArray(a.day_periods) ? a.day_periods : [];
                    const status = deriveStatusFromItem(a);
                    const statusColor =
                      status === "concluido"
                        ? "default"
                        : status === "andamento"
                        ? "secondary"
                        : "outline";

                    return (
                      <TableRow key={a.id}>
                        <TableCell className="text-center font-medium">{a.client_name || "—"}</TableCell>
                        <TableCell className="text-center">{a.company_name || "—"}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {types.slice(0, 2).map((t) => (
                              <Badge key={t} variant="secondary" className="text-xs">
                                {t}
                              </Badge>
                            ))}
                            {types.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{types.length - 2}
                              </Badge>
                            )}
                            {types.length === 0 && <span className="text-muted-foreground">—</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {periods.map((p) => (
                              <Badge key={p} variant="outline" className="text-xs">
                                {p}
                              </Badge>
                            ))}
                            {periods.length === 0 && <span className="text-muted-foreground">—</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {pickYMD(a).sYMD ? formatDateBR(pickYMD(a).sYMD) : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {pickYMD(a).eYMD ? formatDateBR(pickYMD(a).eYMD) : "—"}
                        </TableCell>
                        <TableCell className="text-center">{a.material_qty ?? "—"}</TableCell>
                        <TableCell className="text-center">{a.supervisor || "—"}</TableCell>
                        <TableCell className="text-center">
                          {Array.isArray(a.team_members) && a.team_members.length > 0 ? (
                            <div className="flex flex-wrap gap-1 justify-center">
                              {a.team_members.map((n) => (
                                <Badge key={n} variant="outline" className="text-xs">
                                  {n}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={statusColor} className="capitalize">
                            {status}
                          </Badge>
                        </TableCell>
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
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Total: <strong>{filtered.length}</strong> ação(ões)
          </p>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog
        open={isEditOpen}
        onOpenChange={(v) => {
          setIsEditOpen(v);
          if (!v) {
            setEditing(null);
            resetForm();
          }
        }}
      >
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
                  <TypeSelector value={form.types} onChange={(arr) => onChange("types", arr)} />
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
                  <Label className="flex items-center gap-2"><CalendarIcon className="size-4" /> Início</Label>
                  <div className="flex gap-2">
                    <Input placeholder="DD/MM/AAAA" inputMode="numeric" value={form.startBr} onChange={onDateChange("startBr")} />
                    <Input placeholder="HH:MM" inputMode="numeric" value={form.startTime} onChange={onTimeChange("startTime")} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2"><CalendarIcon className="size-4" /> Término</Label>
                  <div className="flex gap-2">
                    <Input placeholder="DD/MM/AAAA" inputMode="numeric" value={form.endBr} onChange={onDateChange("endBr")} />
                    <Input placeholder="HH:MM" inputMode="numeric" value={form.endTime} onChange={onTimeChange("endTime")} />
                  </div>
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

                {/* Supervisor & Equipe */}
                <div className="space-y-1.5">
                  <Label>Supervisor</Label>
                  <Input placeholder="Nome do supervisor" value={form.supervisor} onChange={(e) => onChange("supervisor", e.target.value)} list="__people__" />
                </div>
                <div className="space-y-1.5">
                  <Label>Equipe</Label>
                  <div className="flex gap-2">
                    <Input id="__team_input_edit" placeholder="Nome" list="__people__" />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const el = document.getElementById("__team_input_edit");
                        addTeamMember(el?.value || "");
                        if (el) el.value = "";
                      }}
                    >
                      Adicionar
                    </Button>
                  </div>
                  {form.team.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {form.team.map((n) => (
                        <Badge key={n} variant="secondary" className="gap-1">
                          {n}
                          <button type="button" onClick={() => removeTeamMember(n)} className="ml-1 opacity-70 hover:opacity-100">
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
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
                    <option value="concluido">Concluído</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm">
                  Atualizar
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Actions;
