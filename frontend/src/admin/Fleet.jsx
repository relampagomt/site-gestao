// frontend/src/admin/Fleet.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import api from "@/services/api";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog.jsx";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Filter as FilterIcon, Plus, Search, Edit, Trash2 } from "lucide-react";
import VehiclesManager from "@/components/fleet/VehiclesManager.jsx";

// Export
import ExportMenu from "@/components/export/ExportMenu";

/* ================= Helpers ================= */

const BRL = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const INT_BR = (n) => new Intl.NumberFormat("pt-BR").format(Number(n || 0));

const isYMD = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
const isDMY = (s) => /^\d{2}\/\d{2}\/\d{4}$/.test(String(s || ""));
const toYMD = (value) => {
  if (!value) return "";
  const s = String(value).trim();
  if (isYMD(s.slice(0, 10))) return s.slice(0, 10);
  if (isDMY(s)) {
    const [d, m, y] = s.split("/");
    return `${y}-${m}-${d}`;
  }
  const d = new Date(s);
  if (isNaN(d)) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const ymdToBR = (ymd) => {
  if (!ymd || !isYMD(ymd)) return "";
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
};

const maskDateBR = (s) => {
  const d = String(s || "").replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
};
function InputDateBR({ value, onChange, placeholder = "dd/mm/aaaa", ...props }) {
  return (
    <Input
      inputMode="numeric"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(maskDateBR(e.target.value))}
      {...props}
    />
  );
}
const maskThousandsBR = (s) => {
  const digits = String(s || "").replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("pt-BR");
};
const toInt = (s) => Number(String(s || "").replace(/\D/g, "")) || 0;

function InputOdometerBR({ value, onChange, placeholder = "Ex.: 56.000", ...props }) {
  return (
    <Input
      inputMode="numeric"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(maskThousandsBR(e.target.value))}
      {...props}
    />
  );
}

const FUEL_OPTIONS = ["Gasolina", "Etanol", "Diesel", "Gás", "Aditivado"];

/* ================= Hooks ================= */

const useList = (path) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const reload = async (params = null) => {
    setLoading(true);
    setErr("");
    try {
      const { data } = await api.get(path, { params: params || {} });
      setData(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr("Falha ao carregar.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, [path]);
  return { data, loading, err, reload, setData };
};

/* ================= Componente ================= */

export default function FleetPage() {
  const vehicles = useList("/fleet/vehicles");
  const fuelLogs = useList("/fleet/fuel-logs");

  // Novo
  const [newOpen, setNewOpen] = useState(false);
  const [fuel, setFuel] = useState({
    placa: "", data: "", litros: "", preco_litro: "", valor_total: "",
    odometro: "", posto: "", motorista: "", combustivel: "Gasolina",
    nota_fiscal: "", observacoes: "",
  });
  useEffect(() => {
    const litros = Number(fuel.litros || 0);
    const prec = Number(fuel.preco_litro || 0);
    setFuel((p) => ({ ...p, valor_total: String((litros * prec || 0).toFixed(2)) }));
  }, [fuel.litros, fuel.preco_litro]);
  const resetFuel = () => setFuel({
    placa: "", data: "", litros: "", preco_litro: "", valor_total: "",
    odometro: "", posto: "", motorista: "", combustivel: "Gasolina",
    nota_fiscal: "", observacoes: "",
  });

  // Edição
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const openEdit = (row) => {
    setEditing({
      ...row,
      _ymd: toYMD(row.data),
      data: ymdToBR(toYMD(row.data)),
      odometro: row.odometro ? INT_BR(row.odometro) : "",
      litros: String(row.litros ?? ""),
      preco_litro: String(row.preco_litro ?? ""),
      valor_total: String(row.valor_total ?? ""),
      placa: row.placa || "",
      combustivel: row.combustivel || "Gasolina",
    });
    setEditOpen(true);
  };
  useEffect(() => {
    if (!editing) return;
    const litros = Number(editing.litros || 0);
    const preco = Number(editing.preco_litro || 0);
    const tot = (litros * preco || 0).toFixed(2);
    setEditing((p) => (p ? { ...p, valor_total: String(tot) } : p));
  }, [editing?.litros, editing?.preco_litro]);

  // Busca/filtros topo + filtros avançados (mantidos e reorganizados)
  const [q, setQ] = useState("");
  const [month, setMonth] = useState(""); // YYYY-MM
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    placa: "", veiculo: "", motorista: "", combustivel: "", posto: "",
    preco: "", de: "", ate: "",
  });
  const activeFiltersCount = useMemo(() => {
    let c = 0;
    Object.values(filters).forEach((v) => { if (String(v || "").trim() !== "") c += 1; });
    if (month) c += 1;
    return c;
  }, [filters, month]);

  // Paginação
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Mapa placa -> modelo
  const modelByPlaca = useMemo(() => {
    const map = {};
    (vehicles.data || []).forEach((v) => {
      map[(v.placa || "").toUpperCase()] = v.modelo || v.marca || "";
    });
    return map;
  }, [vehicles.data]);

  // Normalização + filtros locais
  const normalized = useMemo(() => {
    return (Array.isArray(fuelLogs.data) ? fuelLogs.data : []).map((f) => ({
      ...f,
      _ymd: toYMD(f.data),
      _modelo: f.carro || modelByPlaca[(f.placa || "").toUpperCase()] || "",
    }));
  }, [fuelLogs.data, modelByPlaca]);

  const filtered = useMemo(() => {
    let list = [...normalized];

    // atalho: mês
    if (month) list = list.filter((r) => (r._ymd || "").slice(0, 7) === month);

    // busca livre
    const k = q.trim().toLowerCase();
    if (k) {
      list = list.filter((r) =>
        [r.placa, r._modelo, r.motorista, r.posto, r.combustivel]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(k))
      );
    }

    // filtros avançados (iguais aos que você já tinha)
    if (filters.placa) list = list.filter((r) => (r.placa || "").toUpperCase().includes(filters.placa.toUpperCase()));
    if (filters.veiculo) list = list.filter((r) => (r._modelo || "").toLowerCase().includes(filters.veiculo.toLowerCase()));
    if (filters.motorista) list = list.filter((r) => (r.motorista || "").toLowerCase().includes(filters.motorista.toLowerCase()));
    if (filters.combustivel) list = list.filter((r) => String(r.combustivel || "") === filters.combustivel);
    if (filters.posto) list = list.filter((r) => (r.posto || "").toLowerCase().includes(filters.posto.toLowerCase()));
    if (filters.preco) {
      const p = Number(filters.preco);
      list = list.filter((r) => Number(r.preco_litro || 0) === p);
    }
    if (filters.de || filters.ate) {
      const de = filters.de ? toYMD(filters.de) : "0000-01-01";
      const ate = filters.ate ? toYMD(filters.ate) : "9999-12-31";
      list = list.filter((r) => (r._ymd || "") >= de && (r._ymd || "") <= ate);
    }

    // ordenado por data desc
    list.sort((a, b) => (b._ymd || "").localeCompare(a._ymd || ""));
    return list;
  }, [normalized, q, month, filters]);

  // KPIs
  const kpiCount = filtered.length;
  const kpiLitros = useMemo(() => filtered.reduce((s, r) => s + Number(r.litros || 0), 0), [filtered]);
  const kpiTotal = useMemo(() => filtered.reduce((s, r) => s + Number(r.valor_total || 0), 0), [filtered]);

  // Página
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);
  const goPrev = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const goNext = useCallback(() => setPage((p) => Math.min(totalPages, p + 1)), [totalPages]);

  // Ações
  const reloadWithFilters = async () => {
    const params = {};
    if (filters.placa) params.placa = filters.placa.toUpperCase();
    if (filters.veiculo) params.veiculo = filters.veiculo;
    if (filters.motorista) params.motorista = filters.motorista;
    if (filters.combustivel) params.combustivel = filters.combustivel;
    if (filters.posto) params.posto = filters.posto;
    if (filters.preco) { params.precoMin = filters.preco; params.precoMax = filters.preco; }
    if (filters.de) params.de = toYMD(filters.de);
    if (filters.ate) params.ate = toYMD(filters.ate);
    await fuelLogs.reload(params);
  };
  const clearFilters = async () => {
    setFilters({ placa: "", veiculo: "", motorista: "", combustivel: "", posto: "", preco: "", de: "", ate: "" });
    setMonth("");
    await fuelLogs.reload({});
  };

  const submitFuel = async (e) => {
    e.preventDefault();
    const payload = {
      ...fuel,
      data: toYMD(fuel.data),
      litros: Number(fuel.litros || 0),
      preco_litro: Number(fuel.preco_litro || 0),
      valor_total: Number(fuel.valor_total || 0),
      odometro: toInt(fuel.odometro),
    };
    await api.post("/fleet/fuel-logs", payload);
    resetFuel(); setNewOpen(false); await reloadWithFilters();
  };
  const delFuel = async (row) => {
    if (!confirm("Excluir este abastecimento?")) return;
    await api.delete(`/fleet/fuel-logs/${row.id}`);
    await reloadWithFilters();
  };
  const saveEdit = async () => {
    if (!editing) return;
    const payload = {
      placa: editing.placa,
      carro: editing.carro,
      motorista: editing.motorista,
      data: toYMD(editing.data),
      litros: Number(editing.litros || 0),
      preco_litro: Number(editing.preco_litro || 0),
      valor_total: Number(editing.valor_total || 0),
      odometro: toInt(editing.odometro),
      posto: editing.posto,
      nota_fiscal: editing.nota_fiscal,
      observacoes: editing.observacoes,
      combustivel: editing.combustivel || "Gasolina",
    };
    await api.put(`/fleet/fuel-logs/${editing.id}`, payload);
    setEditOpen(false); setEditing(null); await reloadWithFilters();
  };

  // Export (com base na página atual)
  const exportData = useMemo(() => {
    return pageItems.map((r) => ({
      "Data": ymdToBR(r._ymd),
      "Placa": r.placa,
      "Veículo": r._modelo,
      "Litros": Number(r.litros || 0),
      "Preço/L": Number(r.preco_litro || 0),
      "Total": Number(r.valor_total || 0),
      "Odômetro": Number(r.odometro || 0),
      "Posto": r.posto || "",
      "Motorista": r.motorista || "",
      "Combustível": r.combustivel || "",
      "NF": r.nota_fiscal || "",
      "Obs": r.observacoes || "",
    }));
  }, [pageItems]);

  /* ================= UI ================= */
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-xl">Frota – Abastecimentos</CardTitle>
              <CardDescription>Controle e análise de abastecimentos</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => setNewOpen(true)}>
                <Plus className="mr-2 size-4" />
                Novo Abastecimento
              </Button>

              <ExportMenu
                data={exportData}
                fileBaseName={`abastecimentos_${month || "filtrado"}`}
                buttonProps={{ variant: "outline", size: "sm" }}
              />

              <Button
                variant={activeFiltersCount ? "secondary" : "outline"}
                size="sm"
                onClick={() => setFilterOpen(true)}
              >
                <FilterIcon className="mr-2 size-4" />
                Filtros {activeFiltersCount ? <Badge variant="secondary" className="ml-2">{activeFiltersCount}</Badge> : null}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Linha de busca e mês */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative md:w-1/2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por placa, veículo, motorista, posto..."
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
                className="w-[180px]"
              />
              {month ? (
                <Button variant="ghost" size="sm" onClick={() => setMonth("")}>Limpar mês</Button>
              ) : null}
            </div>

            <div className="flex-1 md:text-right">
              <Button variant="ghost" size="sm" onClick={async () => { await clearFilters(); }}>Limpar todos</Button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Registros</p>
              <p className="text-2xl font-bold leading-tight">{INT_BR(kpiCount)}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Litros (somatório)</p>
              <p className="text-2xl font-bold leading-tight">{INT_BR(kpiLitros)}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Valor total</p>
              <p className="text-2xl font-bold leading-tight">{BRL(kpiTotal)}</p>
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table className="[text-align:_center] [&_th]:!text-center [&_td]:!text-center [&_th]:!align-middle [&_td]:!align-middle">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs md:text-sm">Data</TableHead>
                  <TableHead className="text-xs md:text-sm">Placa</TableHead>
                  <TableHead className="text-xs md:text-sm">Veículo</TableHead>
                  <TableHead className="text-xs md:text-sm">Litros</TableHead>
                  <TableHead className="text-xs md:text-sm">Preço/L</TableHead>
                  <TableHead className="text-xs md:text-sm">Total</TableHead>
                  <TableHead className="text-xs md:text-sm">Odômetro</TableHead>
                  <TableHead className="text-xs md:text-sm">Posto</TableHead>
                  <TableHead className="text-xs md:text-sm">Motorista</TableHead>
                  <TableHead className="text-xs md:text-sm">Combustível</TableHead>
                  <TableHead className="text-xs md:text-sm w-[160px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fuelLogs.loading ? (
                  <TableRow><TableCell colSpan={11} className="py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : pageItems.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="py-10 text-muted-foreground">Sem registros.</TableCell></TableRow>
                ) : (
                  pageItems.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>{ymdToBR(f._ymd)}</TableCell>
                      <TableCell>{f.placa}</TableCell>
                      <TableCell>{f._modelo}</TableCell>
                      <TableCell>{Number(f.litros || 0)}</TableCell>
                      <TableCell>{BRL(f.preco_litro)}</TableCell>
                      <TableCell className="font-medium">{BRL(f.valor_total)}</TableCell>
                      <TableCell>{INT_BR(f.odometro)}</TableCell>
                      <TableCell>{f.posto}</TableCell>
                      <TableCell>{f.motorista}</TableCell>
                      <TableCell>{f.combustivel}</TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-2">
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => openEdit(f)}>
                            <Edit className="size-4" /> Editar
                          </Button>
                          <Button variant="destructive" size="sm" className="gap-2" onClick={() => delFuel(f)}>
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
              Exibindo <b>{pageItems.length}</b> de <b>{filtered.length}</b> — Valor total exibido: <b>{BRL(kpiTotal)}</b>
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

      {/* MODAL: NOVO ABASTECIMENTO (padrão reduzido) */}
      <Dialog open={newOpen} onOpenChange={(o) => { setNewOpen(o); if (!o) resetFuel(); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Novo Abastecimento</DialogTitle>
          </DialogHeader>

          <form onSubmit={submitFuel} className="grid md:grid-cols-12 gap-4">
            {/* Veículo + Cadastrar */}
            <div className="md:col-span-6 flex items-end gap-3">
              <div className="flex-1 flex flex-col gap-1">
                <Label className="text-xs">Veículo</Label>
                <select
                  value={fuel.placa}
                  onChange={(e) => setFuel((p) => ({ ...p, placa: e.target.value }))}
                  className="border rounded px-3 h-11 w-full"
                  required
                >
                  <option value="">Selecione o veículo</option>
                  {(vehicles.data || [])
                    .filter((v) => v.ativo !== false)
                    .map((v) => (
                      <option key={v.id} value={v.placa}>
                        {v.placa} — {v.modelo || v.marca}
                      </option>
                    ))}
                </select>
              </div>

              <VehiclesManager
                trigger={<Button type="button" variant="secondary" className="h-11 px-5">Cadastrar</Button>}
                onCreated={(v) => { vehicles.reload(); setFuel((p) => ({ ...p, placa: v.placa })); }}
                onUpdated={() => vehicles.reload()}
                onDeleted={() => vehicles.reload()}
              />
            </div>

            <div className="md:col-span-3">
              <Label className="text-xs">Data</Label>
              <InputDateBR value={fuel.data} onChange={(val) => setFuel((p) => ({ ...p, data: val }))} className="h-11 w-full" />
            </div>

            <div className="md:col-span-3">
              <Label className="text-xs">Combustível</Label>
              <select className="border rounded px-3 h-11 w-full" value={fuel.combustivel} onChange={(e) => setFuel((p) => ({ ...p, combustivel: e.target.value }))}>
                {FUEL_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            <div className="md:col-span-3">
              <Label className="text-xs">Litros</Label>
              <Input value={fuel.litros} onChange={(e) => setFuel((p) => ({ ...p, litros: e.target.value }))} className="h-11 w-full" />
            </div>

            <div className="md:col-span-3">
              <Label className="text-xs">Preço/Litro</Label>
              <Input value={fuel.preco_litro} onChange={(e) => setFuel((p) => ({ ...p, preco_litro: e.target.value }))} className="h-11 w-full" />
            </div>

            <div className="md:col-span-3">
              <Label className="text-xs">Odômetro</Label>
              <InputOdometerBR value={fuel.odometro} onChange={(val) => setFuel((p) => ({ ...p, odometro: val }))} className="h-11 w-full" />
            </div>

            <div className="md:col-span-3">
              <Label className="text-xs">Posto</Label>
              <Input value={fuel.posto} onChange={(e) => setFuel((p) => ({ ...p, posto: e.target.value }))} className="h-11 w-full" />
            </div>

            <div className="md:col-span-6">
              <Label className="text-xs">Motorista</Label>
              <Input value={fuel.motorista} onChange={(e) => setFuel((p) => ({ ...p, motorista: e.target.value }))} className="h-11 w-full" />
            </div>

            <div className="md:col-span-12">
              <Label className="text-xs">Nota fiscal</Label>
              <Input value={fuel.nota_fiscal} onChange={(e) => setFuel((p) => ({ ...p, nota_fiscal: e.target.value }))} className="h-11 w-full" />
            </div>

            <div className="md:col-span-12">
              <Label className="text-xs">Observações</Label>
              <Input value={fuel.observacoes} onChange={(e) => setFuel((p) => ({ ...p, observacoes: e.target.value }))} className="w-full" />
            </div>

            <div className="md:col-span-12 flex items-center justify-between pt-1">
              <div className="font-semibold">Total: {BRL(fuel.valor_total)}</div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="secondary" onClick={() => { resetFuel(); setNewOpen(false); }} className="px-6">Cancelar</Button>
                <Button type="submit" className="px-6">Adicionar</Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: FILTROS (mesma aparência do padrão) */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Filtros</DialogTitle>
          </DialogHeader>

          <div className="grid md:grid-cols-12 gap-4">
            <div className="md:col-span-3">
              <Label className="text-xs">Placa</Label>
              <Input value={filters.placa} onChange={(e) => setFilters((f) => ({ ...f, placa: e.target.value }))} className="h-11 w-full" />
            </div>

            <div className="md:col-span-3">
              <Label className="text-xs">Veículo</Label>
              <Input value={filters.veiculo} onChange={(e) => setFilters((f) => ({ ...f, veiculo: e.target.value }))} className="h-11 w-full" />
            </div>

            <div className="md:col-span-3">
              <Label className="text-xs">Motorista</Label>
              <Input value={filters.motorista} onChange={(e) => setFilters((f) => ({ ...f, motorista: e.target.value }))} className="h-11 w-full" />
            </div>

            <div className="md:col-span-3">
              <Label className="text-xs">Combustível</Label>
              <select className="border rounded px-3 h-11 w-full" value={filters.combustivel} onChange={(e) => setFilters((f) => ({ ...f, combustivel: e.target.value }))}>
                <option value="">Todos</option>
                {FUEL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div className="md:col-span-3">
              <Label className="text-xs">Posto</Label>
              <Input value={filters.posto} onChange={(e) => setFilters((f) => ({ ...f, posto: e.target.value }))} className="h-11 w-full" />
            </div>

            <div className="md:col-span-3">
              <Label className="text-xs">Preço</Label>
              <Input type="number" step="0.01" value={filters.preco} onChange={(e) => setFilters((f) => ({ ...f, preco: e.target.value }))} className="h-11 w-full" />
            </div>

            <div className="md:col-span-3">
              <Label className="text-xs">De</Label>
              <InputDateBR value={filters.de} onChange={(val) => setFilters((f) => ({ ...f, de: val }))} className="h-11 w-full" />
            </div>

            <div className="md:col-span-3">
              <Label className="text-xs">Até</Label>
              <InputDateBR value={filters.ate} onChange={(val) => setFilters((f) => ({ ...f, ate: val }))} className="h-11 w-full" />
            </div>

            <div className="md:col-span-12 flex items-center gap-2 pt-1">
              <Button type="button" onClick={async () => { await reloadWithFilters(); setFilterOpen(false); }} className="px-6">Aplicar</Button>
              <Button type="button" variant="secondary" onClick={async () => { await clearFilters(); setFilterOpen(false); }} className="px-6">Limpar filtros</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE EDIÇÃO */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar Abastecimento</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="grid md:grid-cols-12 gap-4">
              <div className="md:col-span-4">
                <Label className="text-xs">Placa</Label>
                <select className="border rounded px-3 h-11 w-full" value={editing.placa} onChange={(e) => setEditing((p) => ({ ...p, placa: e.target.value }))}>
                  {(vehicles.data || [])
                    .filter((v) => v.ativo !== false)
                    .map((v) => (
                      <option key={v.id} value={v.placa}>
                        {v.placa} — {v.modelo || v.marca}
                      </option>
                    ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <Label className="text-xs">Data</Label>
                <InputDateBR className="h-11 w-full" value={editing.data} onChange={(val) => setEditing((p) => ({ ...p, data: val }))} />
              </div>

              <div className="md:col-span-2">
                <Label className="text-xs">Litros</Label>
                <Input className="h-11 w-full" value={editing.litros} onChange={(e) => setEditing((p) => ({ ...p, litros: e.target.value }))} />
              </div>

              <div className="md:col-span-2">
                <Label className="text-xs">Preço/Litro</Label>
                <Input className="h-11 w-full" value={editing.preco_litro} onChange={(e) => setEditing((p) => ({ ...p, preco_litro: e.target.value }))} />
              </div>

              <div className="md:col-span-2">
                <Label className="text-xs">Combustível</Label>
                <select className="border rounded px-3 h-11 w-full" value={editing.combustivel} onChange={(e) => setEditing((p) => ({ ...p, combustivel: e.target.value }))}>
                  {FUEL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div className="md:col-span-4">
                <Label className="text-xs">Posto</Label>
                <Input className="h-11 w-full" value={editing.posto || ""} onChange={(e) => setEditing((p) => ({ ...p, posto: e.target.value }))} />
              </div>

              <div className="md:col-span-4">
                <Label className="text-xs">Motorista</Label>
                <Input className="h-11 w-full" value={editing.motorista || ""} onChange={(e) => setEditing((p) => ({ ...p, motorista: e.target.value }))} />
              </div>

              <div className="md:col-span-4">
                <Label className="text-xs">Odômetro</Label>
                <InputOdometerBR className="h-11 w-full" value={editing.odometro || ""} onChange={(val) => setEditing((p) => ({ ...p, odometro: val }))} />
              </div>

              <div className="md:col-span-12">
                <Label className="text-xs">Nota fiscal</Label>
                <Input className="h-11 w-full" value={editing.nota_fiscal || ""} onChange={(e) => setEditing((p) => ({ ...p, nota_fiscal: e.target.value }))} />
              </div>

              <div className="md:col-span-12">
                <Label className="text-xs">Observações</Label>
                <Input value={editing.observacoes || ""} onChange={(e) => setEditing((p) => ({ ...p, observacoes: e.target.value }))} className="w-full" />
              </div>

              <div className="md:col-span-12 flex items-center justify-between pt-1">
                <div className="text-sm text-muted-foreground">
                  Total: <span className="font-medium">{BRL(editing.valor_total)}</span>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="secondary" onClick={() => setEditOpen(false)} className="px-6">Cancelar</Button>
                  <Button onClick={saveEdit} className="px-6">Salvar</Button>
                </DialogFooter>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
