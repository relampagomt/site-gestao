// frontend/src/admin/Finance.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "@/services/api";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Checkbox } from "@/components/ui/checkbox.jsx";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.jsx";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList
} from "@/components/ui/command.jsx";

import {
  Plus, Search, Edit, Trash2, Wallet, Layers, Check, X
} from "lucide-react";

import {
  ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
  BarChart, Bar, PieChart, Pie, Cell
} from "recharts";

/* ==================== Datas (pt-BR) ==================== */
const TZ = "America/Cuiaba";
const isYMD = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
const isDMY = (s) => /^\d{2}\/\d{2}\/\d{4}$/.test(String(s || ""));
function ymdToBR(ymd) {
  const s = String(ymd || "").slice(0, 10);
  if (!isYMD(s)) return "";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}
function brToYMD(br) {
  if (!isDMY(br)) return "";
  const [d, m, y] = br.split("/");
  return `${y}-${m}-${d}`;
}
function maskBR(v) {
  const d = String(v || "").replace(/\D/g, "").slice(0, 8);
  const p1 = d.slice(0, 2);
  const p2 = d.slice(2, 4);
  const p3 = d.slice(4, 8);
  return [p1, p2, p3].filter(Boolean).join("/");
}
function toYMDInCuiaba(value) {
  if (!value) return "";
  const s = String(value).trim();
  if (isYMD(s.slice(0, 10))) return s.slice(0, 10);
  if (isDMY(s)) { const [d, m, y] = s.split("/"); return `${y}-${m}-${d}`; }
  const d = new Date(s);
  if (isNaN(d)) return "";
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = fmt.formatToParts(d);
  const y = parts.find(p => p.type === "year")?.value || "0000";
  const m = parts.find(p => p.type === "month")?.value || "01";
  const dd = parts.find(p => p.type === "day")?.value || "01";
  return `${y}-${m}-${dd}`;
}
const fmtBRL = (n) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n || 0));

/* ==================== Helpers de mês (p/ gráficos) ==================== */
function monthKey(d) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  return `${y}-${m}`;
}
function monthLabelPT(d) {
  return d
    .toLocaleString("pt-BR", { month: "short" })
    .replace(".", "")
    .replace(/^\w/, (c) => c.toUpperCase());
}
function lastNMonths(n = 6) {
  const out = [];
  const base = new Date();
  base.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setMonth(d.getMonth() - i);
    out.push(d);
  }
  return out;
}

/* ==================== Constantes ==================== */
const TYPE_OPTIONS = [
  { value: "entrada", label: "Entrada (Receita)" },
  { value: "saida", label: "Saída (Custo/Despesa)" },
  { value: "despesa", label: "Despesa" },
];

const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente" },
  { value: "pago", label: "Pago" },
  { value: "cancelado", label: "Cancelado" },
];

const CATEGORY_SUGGESTIONS = [
  "Receita de Ação",
  "Pagamento do Cliente",
  "Impressão / Produção",
  "Logística / Transporte",
  "Equipe / Mão de Obra",
  "Material / Insumos",
  "Taxas e Impostos",
  "Outros"
];

const COLORS = ["#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#2563eb", "#7c3aed", "#0ea5e9", "#14b8a6"];

/* ==================== Selector de Ação (com scroll móvel/touch) ==================== */
function ActionSelector({ actions = [], selectedId, onSelect }) {
  const selected = useMemo(() => {
    const it = actions.find(a => (a.id ?? a._id ?? a.uuid) === selectedId);
    if (!it) return null;
    const types = Array.isArray(it?.types) ? it.types : String(it?.type || "").split(",").map(s => s.trim()).filter(Boolean);
    const labelTypes = types.slice(0, 2).join(", ") + (types.length > 2 ? ` +${types.length - 2}` : "");
    return `${it.client_name || "—"}${it.company_name ? ` • ${it.company_name}` : ""}${labelTypes ? ` • ${labelTypes}` : ""}`;
  }, [actions, selectedId]);

  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          {selected ? <span className="truncate">{selected}</span> : "Vincular a uma Ação (opcional)"}
          <Layers className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="p-0 w=[min(92vw,560px)] max-h-[70vh] overflow-hidden">
        <div className="max-h-[60vh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <Command>
            <CommandInput placeholder="Buscar por cliente, empresa ou tipo..." />
            <CommandEmpty>Nenhuma ação encontrada.</CommandEmpty>
            <CommandList className="max-h-none">
              <CommandGroup>
                {actions.map((a) => {
                  const id = a.id ?? a._id ?? a.uuid;
                  const types = Array.isArray(a?.types)
                    ? a.types
                    : String(a?.type || "").split(",").map(s => s.trim()).filter(Boolean);
                  const sub = [
                    a.company_name,
                    types.slice(0, 2).join(", ") + (types.length > 2 ? ` +${types.length - 2}` : "")
                  ].filter(Boolean).join(" • ");

                  const chosen = selectedId === id;
                  return (
                    <CommandItem
                      key={id || String(Math.random())}
                      value={`${a.client_name} ${a.company_name} ${types.join(" ")}`}
                      className="flex items-center gap-2"
                      onSelect={() => { onSelect(id); setOpen(false); }}
                    >
                      <Checkbox checked={chosen} onCheckedChange={() => { onSelect(id); setOpen(false); }} />
                      <div className="flex flex-col">
                        <span className="font-medium">{a.client_name || "—"}</span>
                        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
                      </div>
                      {chosen && <Check className="ml-auto h-4 w-4 opacity-70" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ==================== Componente ==================== */
const Finance = () => {
  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // filtros
  const [q, setQ] = useState("");
  const [month, setMonth] = useState("");

  // modal
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);

  const todayYMD = toYMDInCuiaba(new Date());
  const emptyForm = {
    id: null,
    dateBr: ymdToBR(todayYMD),
    type: "entrada",
    category: "",
    description: "",
    amount: "",
    status: "pendente",
    actionId: null,
  };
  const [form, setForm] = useState(emptyForm);

  /* --------- Load --------- */
  async function loadActions() {
    try {
      const { data } = await api.get("/actions");
      const list = Array.isArray(data) ? data : (data?.actions || data?.items || []);
      setActions(list);
    } catch (err) {
      console.error("Erro ao carregar ações:", err);
    }
  }
  async function loadTransactions() {
    setLoading(true);
    try {
      const { data } = await api.get("/finance/transactions");
      setTransactions(Array.isArray(data) ? data : (data?.items || []));
    } catch (err) {
      console.error("Erro ao carregar lançamentos:", err);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadActions(); loadTransactions(); }, []);

  /* --------- Helpers --------- */
  const onChange = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const onDateBrChange = (e) => setForm((f) => ({ ...f, dateBr: maskBR(e.target.value) }));
  const openCreate = () => { setMode("create"); setForm(emptyForm); setOpen(true); };
  const openEdit = (row) => {
    setMode("edit");
    setEditing(row);
    setForm({
      id: row.id ?? row._id ?? row.uuid ?? null,
      dateBr: ymdToBR(row.date || row.date_ymd || ""),
      type: row.type || "entrada",
      category: row.category || "",
      description: row.description || "",
      amount: String(row.amount ?? ""),
      status: row.status || "pendente",
      actionId: row.action_id ?? row.actionId ?? null,
    });
    setOpen(true);
  };

  async function save(e) {
    e.preventDefault();
    const ymd = brToYMD(form.dateBr);
    if (!ymd) return alert("Informe uma data válida (DD/MM/AAAA).");
    if (!form.type) return alert("Selecione o tipo do lançamento.");
    if (!(form.amount && !Number.isNaN(Number(form.amount)))) return alert("Informe um valor numérico.");

    setSaving(true);
    try {
      const payload = {
        date: ymd,
        type: form.type,
        category: form.category || "",
        description: form.description || "",
        amount: Number(form.amount),
        status: form.status || "pendente",
        action_id: form.actionId || null,
      };

      if (mode === "create") {
        await api.post("/finance/transactions", payload);
      } else {
        const id = form.id;
        if (!id) throw new Error("ID não encontrado para edição.");
        await api.put(`/finance/transactions/${id}`, payload);
      }

      setOpen(false);
      setForm(emptyForm);
      await loadTransactions();
    } catch (err) {
      console.error("Erro ao salvar lançamento:", err);
      alert("Erro ao salvar lançamento.");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(row) {
    if (!window.confirm("Excluir este lançamento?")) return;
    try {
      const id = row.id ?? row._id ?? row.uuid;
      if (!id) throw new Error("ID não encontrado para exclusão.");
      await api.delete(`/finance/transactions/${id}`);
      await loadTransactions();
    } catch (err) {
      console.error("Erro ao excluir:", err);
      alert("Erro ao excluir lançamento.");
    }
  }

  /* --------- Filter + Totais --------- */
  const filtered = useMemo(() => {
    const list = Array.isArray(transactions) ? [...transactions] : [];
    const k = q.trim().toLowerCase();

    let out = list.map((t) => ({ ...t, _ymd: toYMDInCuiaba(t.date || t.date_ymd) }))
                  .filter((t) => t._ymd);

    if (month) out = out.filter((t) => t._ymd.slice(0, 7) === month);

    if (k) {
      out = out.filter((t) => {
        const action = actions.find(a => (a.id ?? a._id ?? a.uuid) === (t.action_id ?? t.actionId));
        const actionBlob = action ? `${action.client_name} ${action.company_name}` : "";
        return [
          t.type, t.category, t.description, String(t.amount), t.status, actionBlob
        ].filter(Boolean).some(v => String(v).toLowerCase().includes(k));
      });
    }

    // ordem desc por data
    out.sort((a, b) => b._ymd.localeCompare(a._ymd));
    return out;
  }, [transactions, actions, q, month]);

  const totals = useMemo(() => {
    let entrada = 0, saida = 0;
    for (const t of filtered) {
      if (String(t.status).toLowerCase() === "cancelado") continue;
      const val = Number(t.amount || 0);
      const tp = String(t.type || "").toLowerCase();
      if (tp === "entrada") entrada += val;
      else saida += val; // "saida" e "despesa" contam como saída
    }
    return { entrada, saida, saldo: entrada - saida };
  }, [filtered]);

  /* --------- Dados dos GRÁFICOS (baseado em `filtered`) --------- */
  const months = useMemo(() => lastNMonths(6), []);
  const monthlySeries = useMemo(() => {
    const buckets = Object.fromEntries(
      months.map((d) => [monthKey(d), { month: monthLabelPT(d), entrada: 0, saida: 0 }])
    );
    filtered.forEach((t) => {
      const key = (t._ymd || "").slice(0, 7);
      if (!buckets[key]) return;
      if (String(t.status).toLowerCase() === "cancelado") return;
      const val = Number(t.amount || 0);
      const tp = String(t.type || "").toLowerCase();
      if (tp === "entrada") buckets[key].entrada += val;
      else buckets[key].saida += val; // saída + despesa
    });
    return Object.values(buckets);
  }, [filtered, months]);

  const typePie = useMemo(() => {
    let entrada = 0, saida = 0;
    filtered.forEach((t) => {
      if (String(t.status).toLowerCase() === "cancelado") return;
      const val = Number(t.amount || 0);
      const tp = String(t.type || "").toLowerCase();
      if (tp === "entrada") entrada += val;
      else saida += val;
    });
    return [
      { name: "Entradas", value: entrada, color: COLORS[3] },
      { name: "Saídas/Despesas", value: saida, color: COLORS[0] },
    ];
  }, [filtered]);

  const statusPie = useMemo(() => {
    const counts = { pendente: 0, pago: 0, cancelado: 0 };
    filtered.forEach((t) => {
      const s = String(t.status || "").toLowerCase();
      if (s in counts) counts[s] += 1;
      else counts.pendente += 1;
    });
    return [
      { name: "Pendente", value: counts.pendente, color: COLORS[2] },
      { name: "Pago", value: counts.pago, color: COLORS[3] },
      { name: "Cancelado", value: counts.cancelado, color: COLORS[0] },
    ];
  }, [filtered]);

  const topCategories = useMemo(() => {
    // Somente saídas/despesas não canceladas
    const map = new Map();
    filtered.forEach((t) => {
      if (String(t.status).toLowerCase() === "cancelado") return;
      const tp = String(t.type || "").toLowerCase();
      if (tp === "entrada") return;
      const cat = t.category || "Outros";
      const val = Number(t.amount || 0);
      map.set(cat, (map.get(cat) || 0) + val);
    });
    const arr = Array.from(map.entries()).map(([category, total]) => ({ category, total }));
    arr.sort((a, b) => b.total - a.total);
    return arr.slice(0, 5);
  }, [filtered]);

  // >>> NOVO: Top Ações por Receita e Custo (separados)
  const topActions = useMemo(() => {
    const map = new Map();
    filtered.forEach((t) => {
      if (String(t.status).toLowerCase() === "cancelado") return;
      const actionId = t.action_id ?? t.actionId;
      if (!actionId) return; // só conta lançamentos vinculados a ação
      const val = Number(t.amount || 0);
      const tp = String(t.type || "").toLowerCase();
      const prev = map.get(actionId) || { receita: 0, custo: 0 };
      if (tp === "entrada") prev.receita += val;
      else prev.custo += val; // saída/despesa
      map.set(actionId, prev);
    });

    const arr = Array.from(map.entries()).map(([id, sums]) => {
      const a = actions.find(x => (x.id ?? x._id ?? x.uuid) === id);
      const label = a ? `${a.client_name || "—"}${a.company_name ? ` • ${a.company_name}` : ""}` : String(id);
      return { action: label, receita: sums.receita, custo: sums.custo, total: sums.receita + sums.custo };
    });

    arr.sort((a, b) => b.total - a.total);
    return arr.slice(0, 7); // Top 7
  }, [filtered, actions]);

  /* =================== RENDER =================== */
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
          <Wallet className="size-5" />
          Financeiro
        </h1>
      </div>

      {/* RESUMO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <CardDescription>Entradas - Saídas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-xl sm:text-2xl font-bold ${totals.saldo >= 0 ? "text-green-600" : "text-red-600"}`}>
              {fmtBRL(totals.saldo)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Entradas</CardTitle>
            <CardDescription>Receitas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{fmtBRL(totals.entrada)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Saídas</CardTitle>
            <CardDescription>Custos & Despesas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{fmtBRL(totals.saida)}</div>
          </CardContent>
        </Card>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        {/* Fluxo mensal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Fluxo Mensal (últimos 6 meses)</CardTitle>
            <CardDescription>Entradas x Saídas (considera filtros aplicados)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v, k) => [fmtBRL(v), k === "entrada" ? "Entradas" : "Saídas"]} />
                <Bar dataKey="entrada" fill="#16a34a" name="Entradas" />
                <Bar dataKey="saida" fill="#dc2626" name="Saídas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribuição por tipo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Distribuição por Tipo</CardTitle>
            <CardDescription>Percentual de valores (entradas x saídas/despesas)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={typePie}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={90}
                  dataKey="value"
                >
                  {typePie.map((e, i) => <Cell key={i} fill={e.color || COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [fmtBRL(v), n]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Status dos Lançamentos</CardTitle>
            <CardDescription>Distribuição por status (qtde)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={statusPie}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={90}
                  dataKey="value"
                >
                  {statusPie.map((e, i) => <Cell key={i} fill={e.color || COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top categorias de despesa */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Top 5 Despesas por Categoria</CardTitle>
            <CardDescription>Somatório de saídas/despesas por categoria</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topCategories}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(v) => [fmtBRL(v), "Total"]} />
                <Bar dataKey="total" fill="#ca8a04" name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* >>> NOVO BLOCO: Top Ações por Receita e Custo (separados) */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Top Ações por Receita e Custo</CardTitle>
            <CardDescription>Somatório por ação (valores separados)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topActions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="action" />
                <YAxis />
                <Tooltip formatter={(v, k) => [fmtBRL(v), k === "receita" ? "Receita" : "Custo/Despesa"]} />
                <Legend />
                <Bar dataKey="receita" name="Receita" fill="#16a34a" />
                <Bar dataKey="custo" name="Custo/Despesa" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* LISTA / TABELA */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Lançamentos</CardTitle>
          <CardDescription>Controle de entradas, saídas e despesas</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros + Novo */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por descrição, categoria, valor ou ação..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

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

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="admin-btn-primary gap-2 min-h-[36px]" onClick={openCreate}>
                  <Plus className="h-5 w-5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                  <span className="whitespace-nowrap">Novo Lançamento</span>
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-xl p-0">
                <div className="max-h-[80vh] overflow-y-auto p-6">
                  <DialogHeader className="pb-2">
                    <DialogTitle>{mode === "create" ? "Novo Lançamento" : "Editar Lançamento"}</DialogTitle>
                    <DialogDescription>Vincule a uma ação (opcional) para relacionar a receita/custo.</DialogDescription>
                  </DialogHeader>

                  <form onSubmit={save} className="space-y-4">
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
                        <Label>Tipo</Label>
                        <select
                          className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                          value={form.type}
                          onChange={(e) => onChange("type", e.target.value)}
                        >
                          {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <Label>Vincular Ação (opcional)</Label>
                        <ActionSelector
                          actions={actions}
                          selectedId={form.actionId}
                          onSelect={(id) => onChange("actionId", id)}
                        />
                      </div>

                      <div>
                        <Label>Valor</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={form.amount}
                          onChange={(e) => onChange("amount", e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <Label>Status</Label>
                        <select
                          className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                          value={form.status}
                          onChange={(e) => onChange("status", e.target.value)}
                        >
                          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>

                      <div>
                        <Label>Categoria</Label>
                        <Input
                          placeholder="Ex.: Impressão / Produção"
                          list="finance-categories"
                          value={form.category}
                          onChange={(e) => onChange("category", e.target.value)}
                        />
                        <datalist id="finance-categories">
                          {CATEGORY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
                        </datalist>
                      </div>

                      <div className="md:col-span-2">
                        <Label>Descrição</Label>
                        <Textarea
                          rows={3}
                          placeholder="Detalhes do lançamento"
                          value={form.description}
                          onChange={(e) => onChange("description", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={saving}>
                        {saving ? "Salvando..." : mode === "create" ? "Salvar" : "Atualizar"}
                      </Button>
                    </div>
                  </form>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Data</TableHead>
                  <TableHead className="text-center">Tipo</TableHead>
                  <TableHead className="text-center">Categoria</TableHead>
                  <TableHead className="text-center">Descrição</TableHead>
                  <TableHead className="text-center">Ação</TableHead>
                  <TableHead className="text-center">Valor</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8">Carregando…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum lançamento</TableCell></TableRow>
                ) : (
                  filtered.map((t) => {
                    const id = t.id ?? t._id ?? t.uuid;
                    const action = actions.find(a => (a.id ?? a._id ?? a.uuid) === (t.action_id ?? t.actionId));
                    const actionLabel = action
                      ? `${action.client_name || "—"}${action.company_name ? ` • ${action.company_name}` : ""}`
                      : "—";
                    const val = Number(t.amount || 0);
                    const isEntrada = String(t.type).toLowerCase() === "entrada";
                    return (
                      <TableRow key={id || `${t.date}-${t.description}-${t.amount}`}>
                        <TableCell className="text-center">{ymdToBR(toYMDInCuiaba(t.date))}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={isEntrada ? "secondary" : "outline"}>
                            {String(t.type).toLowerCase() === "entrada" ? "Entrada" : "Saída/Despesa"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{t.category || "—"}</TableCell>
                        <TableCell className="text-center">
                          {t.description ? <span className="line-clamp-2 max-w-[340px] inline-block">{t.description}</span> : "—"}
                        </TableCell>
                        <TableCell className="text-center">{actionLabel}</TableCell>
                        <TableCell className="text-center">
                          <span className={isEntrada ? "text-green-700 font-medium" : "text-red-700 font-medium"}>
                            {fmtBRL(val)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {String(t.status).toLowerCase() === "pago" && <Badge className="bg-green-600/90">Pago</Badge>}
                          {String(t.status).toLowerCase() === "pendente" && <Badge variant="secondary">Pendente</Badge>}
                          {String(t.status).toLowerCase() === "cancelado" && <Badge variant="destructive">Cancelado</Badge>}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="inline-flex gap-2">
                            <Button size="sm" variant="secondary" onClick={() => openEdit(t)} className="gap-1 min-h-[36px]">
                              <Edit className="size-4" /> Editar
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => removeRow(t)} className="gap-1 min-h-[36px]">
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
            Total de lançamentos: <strong>{filtered.length}</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Finance;
