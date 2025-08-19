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

import ExportMenu from "@/components/export/ExportMenu";
import { formatDateBR, brToYMD, ymdToBR, normalizeHM, composeLocalISO } from "@/utils/dates.js";

/* ========= Tipos ========= */
const ACTION_OPTIONS = [
  { group: "Serviços de Panfletagem e Distribuição", items: ["PAP (Porta a Porta)", "Arrastão", "Semáforos", "Ponto fixo", "Distribuição em eventos", "Carro de Som", "Entrega personalizada"] },
  { group: "Serviços de Ações Promocionais e Interação", items: ["Distribuição de Amostras (Sampling)", "Degustação", "Demonstração", "Blitz promocional", "Captação de cadastros", "Distribuição de Brindes"] },
  { group: "Serviços Complementares", items: ["Criação e design", "Confecção e produção", "Impressão", "Logística (Coleta e Entrega)", "Planejamento estratégico", "Relatório e monitoramento"] },
];

/* ========= Helpers sem timezone ========= */
const extractYMDStrict = (v) => {
  if (!v) return "";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (m) return m[1];
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return brToYMD(s);
  return "";
};
const extractHMStrict = (v) => {
  if (!v) return "";
  const s = String(v);
  if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
  const m = s.match(/T(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : "";
};

const toYMD = (dt) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
const toLocalDateFromYMD = (ymd) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd || "")) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (dt, n) => { const d = new Date(dt); d.setDate(d.getDate() + n); return d; };
const startOfMonth = (dt) => new Date(dt.getFullYear(), dt.getMonth(), 1);
const endOfMonth   = (dt) => new Date(dt.getFullYear(), dt.getMonth() + 1, 0);
const startOfWeekMon = (dt) => { const d = new Date(dt); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); d.setHours(0,0,0,0); return d; };
const endOfWeekMon   = (dt) => addDays(startOfWeekMon(dt), 6);
const monthTitlePtBR = (dt) => dt.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
const WEEKDAYS_PT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const ensureArrayTypes = (item) => {
  if (Array.isArray(item?.types)) return item.types;
  if (typeof item?.type === "string" && item.type.trim()) return item.type.split(",").map((s)=>s.trim()).filter(Boolean);
  return [];
};
const periodOptions = ["Manhã", "Tarde", "Noite"];
const deriveStatusFromItem = (item) => item?.status ? item.status : (item?.active === false ? "concluido" : "aguardando");
const activeFromStatus = (status) => status !== "concluido";
const statusChipClass = (s) =>
  s === "andamento" ? "bg-blue-100 text-blue-800 border-blue-300"
  : s === "concluido" ? "bg-green-100 text-green-800 border-green-300"
  : "bg-amber-100 text-amber-800 border-amber-300";

const pickYMD = (obj) => {
  const s = extractYMDStrict(obj?.start_date) || extractYMDStrict(obj?.start_datetime);
  const e = extractYMDStrict(obj?.end_date)   || extractYMDStrict(obj?.end_datetime) || s;
  return { sYMD: s, eYMD: e };
};

/* ========= TypeSelector ========= */
const TypeSelector = ({ value = [], onChange }) => {
  const [open, setOpen] = React.useState(false);
  const selected = Array.isArray(value) ? value : [];
  const toggle = (t) => onChange(selected.includes(t) ? selected.filter(x=>x!==t) : [...selected, t]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="inline-flex flex-wrap gap-2">
            {selected.length === 0 ? "Selecionar tipos" : (
              <>
                {selected.slice(0, 2).map((t) => <Badge key={t} variant="secondary" className="mr-1">{t}</Badge>)}
                {selected.length > 2 && <Badge variant="outline">+{selected.length - 2}</Badge>}
              </>
            )}
          </span>
          <Layers className="size-4 opacity-70" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" side="bottom" sideOffset={8} className="p-0 w-[min(92vw,420px)] max-h-[70vh] overflow-hidden">
        <div className="px-3 py-3 max-h-[60vh] overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
             onWheel={(e)=>e.stopPropagation()} onTouchMove={(e)=>e.stopPropagation()}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Tipos de ação</span>
            {selected.length > 0 && <Button size="sm" variant="ghost" onClick={()=>onChange([])}>Limpar</Button>}
          </div>
          <div className="space-y-3">
            {ACTION_OPTIONS.map((group) => (
              <div key={group.group}>
                <p className="text-xs font-semibold text-muted-foreground mb-2">{group.group}</p>
                <div className="space-y-2">
                  {group.items.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={selected.includes(opt)} onCheckedChange={()=>toggle(opt)} />
                      <span>{opt}</span>
                    </label>
                  ))}
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

/* ========= DayCell ========= */
function DayCell({ dateObj, inMonth, isToday, events, onNewOnDate, onOpenEdit, onMoveAction }) {
  const key = toYMD(dateObj);
  const maxVisible = 3;

  const onDragOver = (e) => e.preventDefault();
  const onDrop = (e) => {
    e.preventDefault();
    try {
      const { action, sYMD, eYMD } = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (!action?.id || !sYMD || !eYMD) return;
      const start = toLocalDateFromYMD(sYMD);
      const end   = toLocalDateFromYMD(eYMD);
      const days  = Math.round((end - start) / 86400000) + 1; // inclusivo
      const newStart = key;
      const newEnd   = toYMD(addDays(dateObj, days - 1));
      onMoveAction(action, newStart, newEnd);
    } catch {}
  };

  return (
    <div className={`bg-card min-h-[112px] sm:min-h-[130px] p-1.5 sm:p-2 flex flex-col ${inMonth ? "" : "opacity-50"}`}
         onDragOver={onDragOver} onDrop={onDrop}>
      <div className="flex items-center justify-between mb-1">
        <button onClick={()=>onNewOnDate(key)} className={`text-xs rounded px-1 ${isToday ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-accent"}`}>
          {dateObj.getDate()}
        </button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={()=>onNewOnDate(key)} title="Nova ação">
          <PlusCircle className="size-3.5" />
        </Button>
      </div>

      <div className="flex-1 space-y-1 overflow-hidden">
        {events.slice(0, maxVisible).map((a) => {
          const st = deriveStatusFromItem(a);
          const sup = a.supervisor ? ` • Sup: ${a.supervisor}` : "";
          const { sYMD, eYMD } = pickYMD(a);
          const onDragStart = (e) => {
            e.dataTransfer.setData("text/plain", JSON.stringify({ action: a, sYMD, eYMD }));
            e.dataTransfer.effectAllowed = "move";
          };
          return (
            <button key={`${a.id}-${key}`} onClick={()=>onOpenEdit(a)} draggable onDragStart={onDragStart}
                    className={`w-full text-left text-[10px] sm:text-xs border rounded px-1.5 py-1 ${statusChipClass(st)} hover:brightness-95 cursor-grab active:cursor-grabbing`}>
              <span className="truncate">{(a.client_name || a.company_name || "Ação") + sup}</span>
            </button>
          );
        })}
        {events.length > maxVisible && (
          <div className="text-[10px] sm:text-xs text-muted-foreground">+{events.length - maxVisible} mais…</div>
        )}
      </div>
    </div>
  );
}

/* ========= Views ========= */
const CalendarMonth = ({ actions, cursor, setCursor, onNewOnDate, onOpenEdit, onMoveAction }) => {
  const gridStart = startOfWeekMon(startOfMonth(cursor));
  const gridEnd   = endOfWeekMon(endOfMonth(cursor));

  const daysMap = useMemo(() => {
    const map = new Map();
    for (let d = new Date(gridStart); d <= gridEnd; d = addDays(d, 1)) map.set(toYMD(d), []);
    for (const a of actions) {
      const { sYMD, eYMD } = pickYMD(a);
      if (!sYMD || !eYMD) continue;
      let cur = toLocalDateFromYMD(sYMD);
      const end = toLocalDateFromYMD(eYMD);
      while (cur && end && cur <= end) {
        const k = toYMD(cur);
        if (map.has(k)) map.get(k).push(a);
        cur = addDays(cur, 1);
      }
    }
    const order = { andamento: 0, aguardando: 1, concluido: 2 };
    for (const [k, list] of map.entries()) list.sort((a,b)=>(order[deriveStatusFromItem(a)]??3)-(order[deriveStatusFromItem(b)]??3));
    return map;
  }, [actions, cursor]);

  const weeks = [];
  for (let d = new Date(gridStart); d <= gridEnd; d = addDays(d, 7)) weeks.push([0,1,2,3,4,5,6].map((i)=>addDays(d,i)));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg md:text-xl font-semibold">Calendário</CardTitle>
            <CardDescription>Visualização mensal das ações</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={()=>setCursor(startOfMonth(new Date()))}>Hoje</Button>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={()=>setCursor(addDays(startOfMonth(cursor), -1))}><ChevronLeft className="size-4" /></Button>
              <Button variant="outline" size="icon" onClick={()=>setCursor(addDays(endOfMonth(cursor), 1))}><ChevronRight className="size-4" /></Button>
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
                <DayCell key={`${wi}-${key}`} dateObj={day} inMonth={inMonth} isToday={isToday}
                         events={events} onNewOnDate={onNewOnDate} onOpenEdit={onOpenEdit} onMoveAction={onMoveAction}/>
              );
            })
          )}
        </div>

        <div className="flex flex-wrap gap-3 mt-3 text-xs">
          <div className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded bg-amber-200 border border-amber-300"/> Aguardando</div>
          <div className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded bg-blue-200  border border-blue-300"/> Andamento</div>
          <div className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded bg-green-200 border border-green-300"/> Concluída</div>
        </div>
      </CardContent>
    </Card>
  );
};

const CalendarWeek = ({ actions, cursor, setCursor, onNewOnDate, onOpenEdit, onMoveAction }) => {
  const weekStart = startOfWeekMon(cursor);
  const days = [0,1,2,3,4,5,6].map(i=>addDays(weekStart,i));

  const groups = useMemo(() => {
    const map = new Map(days.map((d)=>[toYMD(d), []]));
    for (const a of actions) {
      const { sYMD, eYMD } = pickYMD(a);
      if (!sYMD || !eYMD) continue;
      const s = toLocalDateFromYMD(sYMD);
      const e = toLocalDateFromYMD(eYMD);
      for (const d of days) if (s <= d && d <= e) map.get(toYMD(d)).push(a);
    }
    const order = { andamento: 0, aguardando: 1, concluido: 2 };
    for (const [k, list] of map.entries()) list.sort((a,b)=>(order[deriveStatusFromItem(a)]??3)-(order[deriveStatusFromItem(b)]??3));
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
            <Button variant="outline" size="sm" onClick={()=>setCursor(new Date())}>Hoje</Button>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={()=>setCursor(addDays(weekStart,-1))}><ChevronLeft className="size-4"/></Button>
              <Button variant="outline" size="icon" onClick={()=>setCursor(addDays(weekStart,7))}><ChevronRight className="size-4"/></Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-[1px] bg-border rounded-lg overflow-hidden">
          {days.map((d) => {
            const key = toYMD(d);
            return (
              <DayCell key={key} dateObj={d} inMonth={true} isToday={key===toYMD(new Date())}
                       events={(groups.get(key)||[])} onNewOnDate={onNewOnDate} onOpenEdit={onOpenEdit} onMoveAction={onMoveAction}/>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

const AgendaList = ({ actions, cursor, setCursor, onOpenEdit }) => {
  const monthStart = startOfMonth(cursor);
  const monthEnd   = endOfMonth(cursor);

  const rows = useMemo(() => {
    const out = [];
    for (const a of actions) {
      const { sYMD, eYMD } = pickYMD(a);
      if (!sYMD || !eYMD) continue;
      const s = toLocalDateFromYMD(sYMD);
      const e = toLocalDateFromYMD(eYMD);
      if (e < monthStart || s > monthEnd) continue;
      out.push(a);
    }
    out.sort((a,b)=> (pickYMD(a).sYMD || "0000-01-01").localeCompare(pickYMD(b).sYMD || "0000-01-01"));
    return out;
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
            <Button variant="outline" size="icon" onClick={()=>setCursor(addDays(startOfMonth(cursor), -1))}><ChevronLeft className="size-4"/></Button>
            <Button variant="outline" size="icon" onClick={()=>setCursor(addDays(endOfMonth(cursor), 1))}><ChevronRight className="size-4"/></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhuma ação no período.</div>
        ) : (
          <div className="space-y-2">
            {rows.map((a) => {
              const st   = deriveStatusFromItem(a);
              const sup  = a.supervisor ? ` • Sup: ${a.supervisor}` : "";
              const { sYMD, eYMD } = pickYMD(a);
              return (
                <button key={a.id} onClick={()=>onOpenEdit(a)}
                        className={`w-full text-left border rounded px-3 py-2 ${statusChipClass(st)} hover:brightness-95`}>
                  <div className="text-sm font-medium truncate">{(a.client_name || a.company_name || "Ação") + sup}</div>
                  <div className="text-xs opacity-80 truncate">
                    {sYMD ? formatDateBR(sYMD) : ""}{eYMD ? " → " + formatDateBR(eYMD) : ""}
                  </div>
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

  const [people, setPeople] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const [s1, s2] = await Promise.all([
          api.get("/staff").catch(() => ({ data: [] })),
          api.get("/users").catch(() => ({ data: [] })),
        ]);
        const names = new Set();
        [...(s1.data||[]), ...(s2.data||[])].forEach(p=>{
          const n = p?.name || p?.full_name || p?.username || p?.email || "";
          if (n) names.add(String(n));
        });
        setPeople(Array.from(names).sort());
      } catch { setPeople([]); }
    })();
  }, []);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    client_name: "", company_name: "", types: [],
    startBr: "", endBr: "", startTime: "", endTime: "",
    day_periods: [], material_qty: "", material_photo_url: "",
    notes: "", status: "aguardando", supervisor: "", team: []
  });

  const [uploadingMaterial, setUploadingMaterial] = useState(false);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fClients, setFClients] = useState([]);
  const [fCompanies, setFCompanies] = useState([]);
  const [fTypes, setFTypes] = useState([]);
  const [fPeriods, setFPeriods] = useState([]);
  const [fStatus, setFStatus] = useState([]);
  const [fStartBr, setFStartBr] = useState("");
  const [fEndBr, setFEndBr] = useState("");

  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(()=>startOfMonth(new Date()));

  const loadActions = async () => {
    setLoading(true);
    try {
      const res = await api.get("/actions");
      setActions(Array.isArray(res.data) ? res.data : []);
    } catch {
      setActions([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(()=>{ loadActions(); }, []);

  const onChange = (field, value) => setForm((f)=>({ ...f, [field]: value }));
  const onDateChange = (field) => (e) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
    if (v.length >= 6) v = v.slice(0, 5) + "/" + v.slice(5, 9);
    onChange(field, v);
  };
  const onTimeChange = (field) => (e) => {
    onChange(field, normalizeHM(e.target.value));
  };

  const toggleType   = (t) => onChange("types", form.types.includes(t) ? form.types.filter(x=>x!==t) : [...form.types, t]);
  const togglePeriod = (p) => onChange("day_periods", form.day_periods.includes(p) ? form.day_periods.filter(x=>x!==p) : [...form.day_periods, p]);
  const addTeamMember = (name) => {
    const n = String(name||"").trim(); if (!n) return;
    onChange("team", form.team.includes(n) ? form.team : [...form.team, n]);
  };
  const removeTeamMember = (name) => onChange("team", form.team.filter(x=>x!==name));
  const resetForm = () => setForm({
    client_name:"", company_name:"", types:[],
    startBr:"", endBr:"", startTime:"", endTime:"",
    day_periods:[], material_qty:"", material_photo_url:"",
    notes:"", status:"aguardando", supervisor:"", team:[]
  });

  const uploadFile = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/upload", formData, { headers:{ "Content-Type":"multipart/form-data" }});
      return res.data?.url || null;
    } catch { return null; }
  };
  const onMaterialChange = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingMaterial(true);
    try {
      const url = await uploadFile(file);
      if (!url) throw new Error();
      onChange("material_photo_url", url);
    } catch {
      alert("Erro ao enviar a imagem.");
    } finally {
      setUploadingMaterial(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const sYMD = brToYMD(form.startBr);
    const eYMD = brToYMD(form.endBr);
    const sHM  = normalizeHM(form.startTime) || "00:00";
    const eHM  = normalizeHM(form.endTime)   || "00:00";
    const sDT  = composeLocalISO(form.startBr, sHM);
    const eDT  = composeLocalISO(form.endBr,   eHM);

    if (form.types.length === 0) return alert("Selecione ao menos um tipo de ação.");
    if (sYMD && eYMD) {
      if (new Date(sDT) > new Date(eDT)) return alert("Data/hora de término não pode ser anterior ao início.");
    }

    try {
      const payload = {
        client_name: form.client_name,
        company_name: form.company_name,
        types: form.types, type: form.types.join(", "),
        start_date: sYMD || null, end_date: eYMD || null,
        start_time: sHM, end_time: eHM,
        start_datetime: sDT, end_datetime: eDT,
        day_periods: form.day_periods,
        material_qty: Number(form.material_qty || 0),
        material_photo_url: form.material_photo_url || "",
        notes: form.notes || "",
        status: form.status, active: activeFromStatus(form.status),
        supervisor: form.supervisor || "", team_members: form.team || [],
      };
      await api.post("/actions", payload);
      await loadActions();
      setIsCreateOpen(false); resetForm();
    } catch {
      alert("Erro ao criar ação.");
    }
  };

  const openEdit = (item) => {
    setEditing(item);
    const { sYMD, eYMD } = pickYMD(item);
    setForm({
      client_name: item.client_name || "", company_name: item.company_name || "",
      types: ensureArrayTypes(item),
      startBr: ymdToBR(sYMD) || "", endBr: ymdToBR(eYMD) || "",
      startTime: item.start_time || extractHMStrict(item.start_datetime) || "",
      endTime:   item.end_time   || extractHMStrict(item.end_datetime)   || "",
      day_periods: Array.isArray(item.day_periods) ? item.day_periods : [],
      material_qty: item.material_qty ?? "", material_photo_url: item.material_photo_url || "",
      notes: item.notes || "", status: deriveStatusFromItem(item),
      supervisor: item.supervisor || "", team: Array.isArray(item.team_members) ? item.team_members : [],
    });
    setIsEditOpen(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editing) return;
    const sYMD = brToYMD(form.startBr);
    const eYMD = brToYMD(form.endBr);
    const sHM  = normalizeHM(form.startTime) || "00:00";
    const eHM  = normalizeHM(form.endTime)   || "00:00";
    const sDT  = composeLocalISO(form.startBr, sHM);
    const eDT  = composeLocalISO(form.endBr,   eHM);

    if (form.types.length === 0) return alert("Selecione ao menos um tipo de ação.");
    if (sYMD && eYMD && new Date(sDT) > new Date(eDT)) return alert("Data/hora de término não pode ser anterior ao início.");

    try {
      const payload = {
        client_name: form.client_name, company_name: form.company_name,
        types: form.types, type: form.types.join(", "),
        start_date: sYMD || null, end_date: eYMD || null,
        start_time: sHM, end_time: eHM,
        start_datetime: sDT, end_datetime: eDT,
        day_periods: form.day_periods, material_qty: Number(form.material_qty || 0),
        material_photo_url: form.material_photo_url || "", notes: form.notes || "",
        status: form.status, active: activeFromStatus(form.status),
        supervisor: form.supervisor || "", team_members: form.team || [],
      };
      await api.put(`/actions/${editing.id}`, payload);
      await loadActions();
      setIsEditOpen(false); setEditing(null); resetForm();
    } catch {
      alert("Erro ao atualizar ação.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir esta ação?")) return;
    try {
      await api.delete(`/actions/${id}`);
      await loadActions();
    } catch {
      alert("Erro ao excluir ação.");
    }
  };

  const handleMoveAction = async (action, startYMD, endYMD) => {
    try {
      const sHM = action.start_time || extractHMStrict(action.start_datetime) || "00:00";
      const eHM = action.end_time   || extractHMStrict(action.end_datetime)   || "23:59";
      await api.put(`/actions/${action.id}`, {
        ...action,
        start_date: startYMD, end_date: endYMD,
        start_time: sHM, end_time: eHM,
        start_datetime: `${startYMD}T${sHM}:00`,
        end_datetime:   `${endYMD}T${eHM}:00`,
      });
      await loadActions();
    } catch { alert("Não foi possível mover a ação."); }
  };

  // Filtros
  const uniqueClients = useMemo(() => {
    const set = new Set();
    actions.forEach((a)=>{ const v=(a.client_name||"").trim(); if(v) set.add(v); });
    return Array.from(set).sort();
  }, [actions]);
  const uniqueCompanies = useMemo(() => {
    const set = new Set();
    actions.forEach((a)=>{ const v=(a.company_name||"").trim(); if(v) set.add(v); });
    return Array.from(set).sort();
  }, [actions]);
  const toggleFilter = (setter, value) => setter(prev=>prev.includes(value) ? prev.filter(v=>v!==value) : [...prev, value]);
  const onFilterDateChange = (setter) => (e) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
    if (v.length >= 6) v = v.slice(0, 5) + "/" + v.slice(5, 9);
    setter(v);
  };
  const clearFilters = () => { setFClients([]); setFCompanies([]); setFTypes([]); setFPeriods([]); setFStatus([]); setFStartBr(""); setFEndBr(""); };
  const filtersCount =
    (fClients.length?1:0)+(fCompanies.length?1:0)+(fTypes.length?1:0)+(fPeriods.length?1:0)+(fStatus.length?1:0)+((fStartBr||fEndBr)?1:0);

  const filtered = useMemo(() => {
    let list = Array.isArray(actions) ? [...actions] : [];
    const k = q.trim().toLowerCase();
    if (k) {
      list = list.filter((a) => {
        const types = ensureArrayTypes(a).join(" ");
        const periods = Array.isArray(a.day_periods) ? a.day_periods.join(" ") : "";
        return [a.client_name, a.company_name, types, periods, a.notes, a.supervisor].filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(k));
      });
    }
    if (fClients.length>0)   list = list.filter((a)=> new Set(fClients).has((a.client_name||"").trim()));
    if (fCompanies.length>0) list = list.filter((a)=> new Set(fCompanies).has((a.company_name||"").trim()));
    if (fTypes.length>0)     list = list.filter((a)=> ensureArrayTypes(a).some((t)=> new Set(fTypes).has(t)));
    if (fPeriods.length>0)   list = list.filter((a)=> Array.isArray(a.day_periods) && a.day_periods.some((p)=> new Set(fPeriods).has(p)));
    if (fStatus.length>0)    list = list.filter((a)=> new Set(fStatus).has(deriveStatusFromItem(a)));
    if (fStartBr || fEndBr) {
      const start = brToYMD(fStartBr) || "0000-01-01";
      const end   = brToYMD(fEndBr)   || "9999-12-31";
      list = list.filter((a) => {
        const { sYMD, eYMD } = pickYMD(a);
        const aStart = sYMD || "0000-01-01";
        const aEnd   = eYMD || "9999-12-31";
        return aStart <= end && aEnd >= start;
      });
    }
    list.sort((a,b)=> (pickYMD(b).sYMD || "0000-01-01").localeCompare(pickYMD(a).sYMD || "0000-01-01"));
    return list;
  }, [actions, q, fClients, fCompanies, fTypes, fPeriods, fStatus, fStartBr, fEndBr]);

  const exportData = useMemo(() => {
    return filtered.map((a) => {
      const types   = ensureArrayTypes(a).join(" | ");
      const periods = Array.isArray(a?.day_periods) ? a.day_periods.join(" | ") : "";
      const { sYMD, eYMD } = pickYMD(a);
      const status  = deriveStatusFromItem(a);
      return {
        cliente: a.client_name || "", empresa: a.company_name || "",
        tipos: types, periodos: periods,
        inicio: sYMD ? formatDateBR(sYMD) : "", termino: eYMD ? formatDateBR(eYMD) : "",
        quantidade_material: a.material_qty ?? "", status,
        supervisor: a.supervisor || "", equipe: Array.isArray(a.team_members) ? a.team_members.join(" | ") : "",
        observacoes: a.notes || "", foto_url: a.material_photo_url || ""
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

  const newOnDate = (ymd) => {
    setIsCreateOpen(true);
    setForm((f)=>({ ...f, startBr: ymdToBR(ymd), endBr: ymdToBR(ymd), startTime: "08:00", endTime: "18:00" }));
  };

  const pdfOptions = { title: "Relatório de Ações", orientation: "l" };

  return (
    <div className="max-w-screen-2xl mx-auto px-3 md:px-6 py-4 md:py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">Ações</h1>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div className="inline-flex border rounded-lg overflow-hidden">
          <button className={`px-3 py-1.5 text-sm ${view==="month" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`} onClick={()=>setView("month")}>Mês</button>
          <button className={`px-3 py-1.5 text-sm ${view==="week"  ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`} onClick={()=>setView("week")}>Semana</button>
          <button className={`px-3 py-1.5 text-sm ${view==="agenda"? "bg-primary text-primary-foreground" : "hover:bg-accent"}`} onClick={()=>setView("agenda")}>Agenda</button>
        </div>
      </div>

      {view==="month" && <CalendarMonth actions={actions} cursor={cursor} setCursor={setCursor} onNewOnDate={newOnDate} onOpenEdit={openEdit} onMoveAction={handleMoveAction} />}
      {view==="week"  && <CalendarWeek  actions={actions} cursor={cursor} setCursor={setCursor} onNewOnDate={newOnDate} onOpenEdit={openEdit} onMoveAction={handleMoveAction} />}
      {view==="agenda"&& <AgendaList    actions={actions} cursor={cursor} setCursor={setCursor} onOpenEdit={openEdit} />}

      {/* Registros */}
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
              <Input className="pl-9" placeholder="Buscar ações..." value={q} onChange={(e)=>setQ(e.target.value)} />
            </div>

            {/* Filtros */}
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <FilterIcon className="size-4" />
                  Filtros
                  {(fClients.length||fCompanies.length||fTypes.length||fPeriods.length||fStatus.length||fStartBr||fEndBr) ? <Badge variant="secondary">{filtersCount}</Badge> : null}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" side="bottom" sideOffset={8} collisionPadding={12} className="w-[min(92vw,620px)] p-0">
                <div className="flex flex-col max-h-[calc(100vh-120px)]">
                  <div className="px-4 py-3 border-b">
                    <p className="text-sm font-medium">Filtrar ações</p>
                    <p className="text-xs text-muted-foreground">Refine os resultados com seletores.</p>
                  </div>

                  <div className="p-4 grid md:grid-cols-2 gap-4 flex-1 overflow-y-auto pr-2 overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
                       onWheel={(e)=>e.stopPropagation()} onTouchMove={(e)=>e.stopPropagation()}>
                    {/* Clientes */}
                    <div className="space-y-2">
                      <Label>Clientes</Label>
                      <div className="max-h-[32vh] overflow-y-auto pr-1">
                        {uniqueClients.map((c)=>(
                          <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={fClients.includes(c)} onCheckedChange={()=>toggleFilter(setFClients,c)} />
                            <span className="truncate">{c}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Empresas */}
                    <div className="space-y-2">
                      <Label>Empresas</Label>
                      <div className="max-h-[32vh] overflow-y-auto pr-1">
                        {uniqueCompanies.map((c)=>(
                          <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={fCompanies.includes(c)} onCheckedChange={()=>toggleFilter(setFCompanies,c)} />
                            <span className="truncate">{c}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <div className="space-y-2">
                        {["aguardando","andamento","concluido"].map((s)=>(
                          <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={fStatus.includes(s)} onCheckedChange={()=>toggleFilter(setFStatus,s)} />
                            <span className="capitalize">{s}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Períodos */}
                    <div className="space-y-2">
                      <Label>Períodos do dia</Label>
                      <div className="space-y-2">
                        {periodOptions.map((p)=>(
                          <label key={p} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={fPeriods.includes(p)} onCheckedChange={()=>toggleFilter(setFPeriods,p)} />
                            <span>{p}</span>
                          </label>
                        ))}
                      </div>
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
                    <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar filtros</Button>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={()=>setFiltersOpen(false)}>Fechar</Button>
                      <Button size="sm" onClick={()=>setFiltersOpen(false)}>Aplicar</Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Nova Ação */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2"><Plus className="size-4" /><span className="whitespace-nowrap">Nova Ação</span></Button>
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
                        <Input id="client_name" value={form.client_name} onChange={(e)=>onChange("client_name", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="company_name">Nome da empresa</Label>
                        <Input id="company_name" value={form.company_name} onChange={(e)=>onChange("company_name", e.target.value)} />
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <Label>Tipo(s) de ação</Label>
                        <TypeSelector value={form.types} onChange={(arr)=>onChange("types", arr)} />
                        {form.types.length>0 && (
                          <div className="flex flex-wrap gap-2">
                            {form.types.map((t)=>(
                              <Badge key={t} variant="secondary" className="gap-1">
                                {t}
                                <button type="button" onClick={()=>toggleType(t)} className="ml-1 opacity-70 hover:opacity-100"><X className="size-3" /></button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-2"><CalendarIcon className="size-4" /> Início</Label>
                        <div className="flex gap-2 w-full">
                          <Input placeholder="DD/MM/AAAA" inputMode="numeric" value={form.startBr} onChange={onDateChange("startBr")} className="flex-1" />
                          <Input type="time" step="60" value={form.startTime} onChange={onTimeChange("startTime")} className="w-[120px]" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-2"><CalendarIcon className="size-4" /> Término</Label>
                        <div className="flex gap-2 w-full">
                          <Input placeholder="DD/MM/AAAA" inputMode="numeric" value={form.endBr} onChange={onDateChange("endBr")} className="flex-1" />
                          <Input type="time" step="60" value={form.endTime} onChange={onTimeChange("endTime")} className="w-[120px]" />
                        </div>
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <Label>Períodos do dia</Label>
                        <div className="flex flex-wrap gap-4">
                          {periodOptions.map((p)=>(
                            <label key={p} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox checked={form.day_periods.includes(p)} onCheckedChange={()=>togglePeriod(p)} />
                              <span className="text-sm">{p}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Supervisor / Equipe */}
                      <div className="space-y-1.5">
                        <Label>Supervisor</Label>
                        <Input placeholder="Nome do supervisor" value={form.supervisor} onChange={(e)=>onChange("supervisor", e.target.value)} list="__people__" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Adicionar integrante da equipe</Label>
                        <div className="flex gap-2">
                          <Input id="__team_input" placeholder="Nome" list="__people__" />
                          <Button type="button" variant="outline" onClick={()=>{
                            const el = document.getElementById("__team_input");
                            addTeamMember(el?.value||""); if (el) el.value="";
                          }}>Adicionar</Button>
                        </div>
                        <datalist id="__people__">{people.map((p)=><option key={p} value={p} />)}</datalist>
                        {form.team.length>0 && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {form.team.map((n)=>(
                              <Badge key={n} variant="secondary" className="gap-1">
                                {n}
                                <button type="button" onClick={()=>removeTeamMember(n)} className="ml-1 opacity-70 hover:opacity-100"><X className="size-3" /></button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="material_qty">Quantidade de material</Label>
                        <Input id="material_qty" type="number" min={0} value={form.material_qty} onChange={(e)=>onChange("material_qty", e.target.value)} />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Amostra do material (imagem)</Label>
                        <div className="flex items-center gap-3">
                          <Input type="file" accept="image/*" onChange={onMaterialChange} />
                          <Button type="button" variant="outline" disabled className="gap-2"><UploadCloud className="size-4" />{uploadingMaterial?"Enviando...":"Upload"}</Button>
                        </div>
                        {form.material_photo_url && (
                          <div className="relative inline-flex items-center gap-2 mt-2">
                            <ImagePreview src={form.material_photo_url} alt="Amostra do material" size={96} />
                            <button type="button" onClick={()=>onChange("material_photo_url","")} className="bg-white border rounded-full p-1 shadow" title="Remover">
                              <X className="size-4 text-red-600" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <Label htmlFor="notes">Observações</Label>
                        <Textarea id="notes" rows={3} value={form.notes} onChange={(e)=>onChange("notes", e.target.value)} />
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <Label htmlFor="status">Status</Label>
                        <select id="status" className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                                value={form.status} onChange={(e)=>onChange("status", e.target.value)}>
                          <option value="aguardando">Aguardando</option>
                          <option value="andamento">Andamento</option>
                          <option value="concluido">Concluído</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" size="sm" onClick={()=>setIsCreateOpen(false)}>Cancelar</Button>
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
                ) : (
                  filtered.map((a) => {
                    const types   = ensureArrayTypes(a);
                    const periods = Array.isArray(a.day_periods) ? a.day_periods : [];
                    const status  = deriveStatusFromItem(a);
                    const statusColor = status==="concluido" ? "default" : status==="andamento" ? "secondary" : "outline";
                    const { sYMD, eYMD } = pickYMD(a);
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="text-center font-medium">{a.client_name || "—"}</TableCell>
                        <TableCell className="text-center">{a.company_name || "—"}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {types.slice(0,2).map((t)=><Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                            {types.length>2 && <Badge variant="outline" className="text-xs">+{types.length-2}</Badge>}
                            {types.length===0 && <span className="text-muted-foreground">—</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {periods.map((p)=><Badge key={p} variant="outline" className="text-xs">{p}</Badge>)}
                            {periods.length===0 && <span className="text-muted-foreground">—</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{sYMD ? formatDateBR(sYMD) : "—"}</TableCell>
                        <TableCell className="text-center">{eYMD ? formatDateBR(eYMD) : "—"}</TableCell>
                        <TableCell className="text-center">{a.material_qty ?? "—"}</TableCell>
                        <TableCell className="text-center">{a.supervisor || "—"}</TableCell>
                        <TableCell className="text-center">
                          {Array.isArray(a.team_members)&&a.team_members.length>0 ? (
                            <div className="flex flex-wrap gap-1 justify-center">
                              {a.team_members.map((n)=><Badge key={n} variant="outline" className="text-xs">{n}</Badge>)}
                            </div>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-center"><Badge variant={statusColor} className="capitalize">{status}</Badge></TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button size="sm" variant="outline" className="gap-2" onClick={()=>openEdit(a)}><Edit className="size-4" /> Editar</Button>
                            <Button size="sm" variant="destructive" className="gap-2" onClick={()=>handleDelete(a.id)}><Trash2 className="size-4" /> Excluir</Button>
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

      {/* Editar */}
      <Dialog open={isEditOpen} onOpenChange={(v)=>{ setIsEditOpen(v); if(!v){ setEditing(null); resetForm(); }}}>
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
                  <Input value={form.client_name} onChange={(e)=>onChange("client_name", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Nome da empresa</Label>
                  <Input value={form.company_name} onChange={(e)=>onChange("company_name", e.target.value)} />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Tipo(s) de ação</Label>
                  <TypeSelector value={form.types} onChange={(arr)=>onChange("types", arr)} />
                  {form.types.length>0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {form.types.map((t)=>(
                        <Badge key={t} variant="secondary" className="gap-1">
                          {t}
                          <button type="button" onClick={()=>toggleType(t)} className="ml-1 opacity-70 hover:opacity-100"><X className="size-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2"><CalendarIcon className="size-4" /> Início</Label>
                  <div className="flex gap-2 w-full">
                    <Input placeholder="DD/MM/AAAA" inputMode="numeric" value={form.startBr} onChange={onDateChange("startBr")} className="flex-1" />
                    <Input type="time" step="60" value={form.startTime} onChange={onTimeChange("startTime")} className="w-[120px]" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2"><CalendarIcon className="size-4" /> Término</Label>
                  <div className="flex gap-2 w-full">
                    <Input placeholder="DD/MM/AAAA" inputMode="numeric" value={form.endBr} onChange={onDateChange("endBr")} className="flex-1" />
                    <Input type="time" step="60" value={form.endTime} onChange={onTimeChange("endTime")} className="w-[120px]" />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Períodos do dia</Label>
                  <div className="flex flex-wrap gap-4">
                    {periodOptions.map((p)=>(
                      <label key={p} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={form.day_periods.includes(p)} onCheckedChange={()=>onChange("day_periods", form.day_periods.includes(p) ? form.day_periods.filter(x=>x!==p) : [...form.day_periods, p])} />
                        <span className="text-sm">{p}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Supervisor / Equipe */}
                <div className="space-y-1.5">
                  <Label>Supervisor</Label>
                  <Input placeholder="Nome do supervisor" value={form.supervisor} onChange={(e)=>onChange("supervisor", e.target.value)} list="__people__" />
                </div>
                <div className="space-y-1.5">
                  <Label>Equipe</Label>
                  <div className="flex gap-2">
                    <Input id="__team_input_edit" placeholder="Nome" list="__people__" />
                    <Button type="button" variant="outline" onClick={()=>{
                      const el=document.getElementById("__team_input_edit");
                      addTeamMember(el?.value||""); if(el) el.value="";
                    }}>Adicionar</Button>
                  </div>
                  {form.team.length>0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {form.team.map((n)=>(
                        <Badge key={n} variant="secondary" className="gap-1">
                          {n}
                          <button type="button" onClick={()=>removeTeamMember(n)} className="ml-1 opacity-70 hover:opacity-100"><X className="size-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Quantidade de material</Label>
                  <Input type="number" min={0} value={form.material_qty} onChange={(e)=>onChange("material_qty", e.target.value)} />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Amostra do material (imagem)</Label>
                  <div className="flex items-center gap-3">
                    <Input type="file" accept="image/*" onChange={onMaterialChange} />
                    <Button type="button" variant="outline" disabled className="gap-2">
                      <UploadCloud className="size-4" />{uploadingMaterial?"Enviando...":"Upload"}
                    </Button>
                  </div>
                  {form.material_photo_url && (
                    <div className="relative inline-flex items-center gap-2 mt-2">
                      <ImagePreview src={form.material_photo_url} alt="Amostra do material" size={96} />
                      <button type="button" onClick={()=>onChange("material_photo_url","")} className="bg-white border rounded-full p-1 shadow" title="Remover">
                        <X className="size-4 text-red-600" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Observações</Label>
                  <Textarea rows={3} value={form.notes} onChange={(e)=>onChange("notes", e.target.value)} />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Status</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                          value={form.status} onChange={(e)=>onChange("status", e.target.value)}>
                    <option value="aguardando">Aguardando</option>
                    <option value="andamento">Andamento</option>
                    <option value="concluido">Concluído</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={()=>setIsEditOpen(false)}>Cancelar</Button>
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
