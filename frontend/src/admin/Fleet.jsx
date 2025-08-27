// frontend/src/admin/Fleet.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";
import VehiclesManager from "@/components/fleet/VehiclesManager.jsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";

const BRL = (n) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const INT_BR = (n) => new Intl.NumberFormat("pt-BR").format(Number(n || 0));
const FUEL_OPTIONS = ["Gasolina", "Etanol", "Diesel", "Gás", "Aditivado"];

/* ------------ Datas (BR <-> ISO) + máscara ------------ */
const maskDateBR = (s) => {
  const d = String(s || "").replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
};
const toISO = (s) => {
  const str = String(s || "").trim();
  if (!str) return "";
  if (str.length >= 10 && str[2] === "/" && str[5] === "/") {
    const [dd, mm, yy] = str.slice(0, 10).split("/");
    return `${yy}-${mm}-${dd}`;
  }
  if (/^\d{8}$/.test(str)) {
    const dd = str.slice(0, 2), mm = str.slice(2, 4), yy = str.slice(4, 8);
    return `${yy}-${mm}-${dd}`;
  }
  return str.slice(0, 10);
};
const fmtBRDate = (iso) => {
  if (!iso) return "";
  const s = String(iso);
  if (s.length >= 10 && s[4] === "-" && s[7] === "-") {
    const [yy, mm, dd] = s.slice(0, 10).split("-");
    return `${dd}/${mm}/${yy}`;
  }
  if (s.length === 8 && /^\d{8}$/.test(s))
    return `${s.slice(0, 2)}/${s.slice(2, 4)}/${s.slice(4, 8)}`;
  if (s.length >= 10 && s[2] === "/" && s[5] === "/") return s.slice(0, 10);
  return s;
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

/* ------------ Odômetro (máscara de milhar) ------------ */
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

/* ------------ Hook GET simples ------------ */
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
  useEffect(() => {
    reload();
  }, [path]);
  return { data, loading, err, reload, setData };
};

/* ------------ Componente principal ------------ */
export default function FleetPage() {
  const vehicles = useList("/fleet/vehicles");
  const fuelLogs = useList("/fleet/fuel-logs");

  const [fuel, setFuel] = useState({
    placa: "",
    data: "",
    litros: "",
    preco_litro: "",
    valor_total: "",
    odometro: "",
    posto: "",
    motorista: "",
    combustivel: "Gasolina",
    nota_fiscal: "",
    observacoes: "",
  });

  useEffect(() => {
    const litros = Number(fuel.litros || 0);
    const prec = Number(fuel.preco_litro || 0);
    const tot = litros * prec || 0;
    setFuel((p) => ({ ...p, valor_total: String(tot.toFixed(2)) }));
  }, [fuel.litros, fuel.preco_litro]);

  const resetFuel = () =>
    setFuel({
      placa: "",
      data: "",
      litros: "",
      preco_litro: "",
      valor_total: "",
      odometro: "",
      posto: "",
      motorista: "",
      combustivel: "Gasolina",
      nota_fiscal: "",
      observacoes: "",
    });

  /* --------- Filtros --------- */
  const [filters, setFilters] = useState({
    placa: "",
    veiculo: "",
    motorista: "",
    combustivel: "",
    posto: "",
    preco: "",
    de: "",
    ate: "",
  });
  const activeFiltersCount = useMemo(() => {
    let c = 0;
    Object.values(filters).forEach((v) => {
      if (String(v || "").trim() !== "") c += 1;
    });
    return c;
  }, [filters]);

  const reloadWithFilters = async () => {
    const params = {};
    if (filters.placa) params.placa = filters.placa.toUpperCase();
    if (filters.veiculo) params.veiculo = filters.veiculo;
    if (filters.motorista) params.motorista = filters.motorista;
    if (filters.combustivel) params.combustivel = filters.combustivel;
    if (filters.posto) params.posto = filters.posto;
    if (filters.preco) {
      params.precoMin = filters.preco;
      params.precoMax = filters.preco;
    }
    if (filters.de) params.de = toISO(filters.de);
    if (filters.ate) params.ate = toISO(filters.ate);
    await fuelLogs.reload(params);
  };

  const clearFilters = async () => {
    setFilters({
      placa: "",
      veiculo: "",
      motorista: "",
      combustivel: "",
      posto: "",
      preco: "",
      de: "",
      ate: "",
    });
    await fuelLogs.reload({});
  };

  /* --------- Modais: Novo & Editar & Filtros --------- */
  const [newOpen, setNewOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const submitFuel = async (e) => {
    e.preventDefault();
    const payload = {
      ...fuel,
      data: toISO(fuel.data),
      litros: Number(fuel.litros || 0),
      preco_litro: Number(fuel.preco_litro || 0),
      valor_total: Number(fuel.valor_total || 0),
      odometro: toInt(fuel.odometro),
    };
    await api.post("/fleet/fuel-logs", payload);
    resetFuel();
    setNewOpen(false);
    await reloadWithFilters();
  };

  const delFuel = async (row) => {
    if (!confirm("Excluir este abastecimento?")) return;
    await api.delete(`/fleet/fuel-logs/${row.id}`);
    await reloadWithFilters();
  };

  /* --------- Mapa placa -> modelo --------- */
  const modelByPlaca = useMemo(() => {
    const map = {};
    (vehicles.data || []).forEach((v) => {
      map[(v.placa || "").toUpperCase()] = v.modelo || v.marca || "";
    });
    return map;
  }, [vehicles.data]);

  /* --------- Edição (modal) --------- */
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const openEdit = (row) => {
    setEditing({
      ...row,
      data: fmtBRDate(row.data),
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

  const saveEdit = async () => {
    if (!editing) return;
    const payload = {
      placa: editing.placa,
      carro: editing.carro,
      motorista: editing.motorista,
      data: toISO(editing.data),
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
    setEditOpen(false);
    setEditing(null);
    await reloadWithFilters();
  };

  /* --------- UI --------- */
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Frota – Abastecimentos</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setFilterOpen(true)}>
            {activeFiltersCount > 0 ? `Filtros (${activeFiltersCount})` : "Mostrar filtros"}
          </Button>
          <Button onClick={() => setNewOpen(true)}>Novo Abastecimento</Button>
        </div>
      </div>

      {/* REGISTROS */}
      <Card>
        <CardHeader>
          <CardTitle>Registros</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          {fuelLogs.loading ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : (
            <Table className="min-w-full text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Litros</TableHead>
                  <TableHead>Preço/L</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Odômetro</TableHead>
                  <TableHead>Posto</TableHead>
                  <TableHead>Motorista</TableHead>
                  <TableHead>Combustível</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(fuelLogs.data || []).map((f) => (
                  <tr key={f.id} className="border-t">
                    <TableCell>{fmtBRDate(f.data)}</TableCell>
                    <TableCell>{f.placa}</TableCell>
                    <TableCell>
                      {f.carro || modelByPlaca[(f.placa || "").toUpperCase()] || ""}
                    </TableCell>
                    <TableCell>{Number(f.litros || 0)}</TableCell>
                    <TableCell>{BRL(f.preco_litro)}</TableCell>
                    <TableCell className="font-medium">{BRL(f.valor_total)}</TableCell>
                    <TableCell>{INT_BR(f.odometro)}</TableCell>
                    <TableCell>{f.posto}</TableCell>
                    <TableCell>{f.motorista}</TableCell>
                    <TableCell>{f.combustivel}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => openEdit(f)}>
                          Editar
                        </Button>
                        <Button variant="destructive" onClick={() => delFuel(f)}>
                          Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </tr>
                ))}
                {(fuelLogs.data || []).length === 0 && (
                  <tr>
                    <TableCell colSpan={11} className="text-sm text-muted-foreground">
                      Sem registros.
                    </TableCell>
                  </tr>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* MODAL: NOVO ABASTECIMENTO (LARGO) */}
      <Dialog
        open={newOpen}
        onOpenChange={(o) => {
          setNewOpen(o);
          if (!o) resetFuel();
        }}
      >
        <DialogContent className="w-[95vw] max-w-[1280px] sm:p-8">
          <DialogHeader>
            <DialogTitle>Novo Abastecimento</DialogTitle>
          </DialogHeader>

          <form onSubmit={submitFuel} className="grid md:grid-cols-12 gap-4">
            {/* Veículo + Cadastrar */}
            <div className="md:col-span-4 flex items-end gap-3">
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <span className="text-xs text-muted-foreground">Veículo</span>
                <select
                  value={fuel.placa}
                  onChange={(e) => setFuel((p) => ({ ...p, placa: e.target.value }))}
                  className="border rounded px-3 h-11"
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
                onCreated={(v) => {
                  vehicles.reload();
                  setFuel((p) => ({ ...p, placa: v.placa }));
                }}
                onUpdated={() => vehicles.reload()}
                onDeleted={() => vehicles.reload()}
              />
            </div>

            <div className="md:col-span-2 flex flex-col gap-1 min-w-0">
              <span className="text-xs text-muted-foreground">Data</span>
              <InputDateBR
                value={fuel.data}
                onChange={(val) => setFuel((p) => ({ ...p, data: val }))}
                className="h-11"
              />
            </div>

            <div className="md:col-span-2 flex flex-col gap-1 min-w-0">
              <span className="text-xs text-muted-foreground">Litros</span>
              <Input
                placeholder="Litros"
                value={fuel.litros}
                onChange={(e) => setFuel((p) => ({ ...p, litros: e.target.value }))}
                className="h-11"
              />
            </div>

            <div className="md:col-span-2 flex flex-col gap-1 min-w-0">
              <span className="text-xs text-muted-foreground">Preço/Litro</span>
              <Input
                placeholder="Preço/Litro"
                value={fuel.preco_litro}
                onChange={(e) => setFuel((p) => ({ ...p, preco_litro: e.target.value }))}
                className="h-11"
              />
            </div>

            <div className="md:col-span-2 flex flex-col gap-1 min-w-0">
              <span className="text-xs text-muted-foreground">Combustível</span>
              <select
                className="border rounded px-3 h-11"
                value={fuel.combustivel}
                onChange={(e) => setFuel((p) => ({ ...p, combustivel: e.target.value }))}
              >
                {FUEL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3 flex flex-col gap-1 min-w-0">
              <span className="text-xs text-muted-foreground">Odômetro</span>
              <InputOdometerBR
                value={fuel.odometro}
                onChange={(val) => setFuel((p) => ({ ...p, odometro: val }))}
                className="h-11"
              />
            </div>

            <div className="md:col-span-3 flex flex-col gap-1 min-w-0">
              <span className="text-xs text-muted-foreground">Posto</span>
              <Input
                placeholder="Posto"
                value={fuel.posto}
                onChange={(e) => setFuel((p) => ({ ...p, posto: e.target.value }))}
                className="h-11"
              />
            </div>

            <div className="md:col-span-3 flex flex-col gap-1 min-w-0">
              <span className="text-xs text-muted-foreground">Motorista</span>
              <Input
                placeholder="Motorista"
                value={fuel.motorista}
                onChange={(e) => setFuel((p) => ({ ...p, motorista: e.target.value }))}
                className="h-11"
              />
            </div>

            <div className="md:col-span-3 flex flex-col gap-1 min-w-0">
              <span className="text-xs text-muted-foreground">Nota fiscal</span>
              <Input
                placeholder="Nota fiscal"
                value={fuel.nota_fiscal}
                onChange={(e) => setFuel((p) => ({ ...p, nota_fiscal: e.target.value }))}
                className="h-11"
              />
            </div>

            <div className="md:col-span-12 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Observações</span>
              <Input
                placeholder="Observações"
                value={fuel.observacoes}
                onChange={(e) => setFuel((p) => ({ ...p, observacoes: e.target.value }))}
              />
            </div>

            <div className="md:col-span-12 flex items-center justify-between pt-1">
              <div className="font-semibold">Total: {BRL(fuel.valor_total)}</div>
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    resetFuel();
                    setNewOpen(false);
                  }}
                  className="px-6"
                >
                  Cancelar
                </Button>
                <Button type="submit" className="px-6">Adicionar</Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: FILTROS AVANÇADOS (LARGO) */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="w-[95vw] max-w-[1280px] sm:p-8">
          <DialogHeader>
            <DialogTitle>Filtros</DialogTitle>
          </DialogHeader>

          <div className="grid md:grid-cols-12 gap-4">
            {/* 1ª linha: 2 | 2 | 3 | 3 | 2 */}
            <div className="md:col-span-2 flex flex-col gap-1 min-w-0">
              <span className="text-xs text-muted-foreground">Placa</span>
              <Input
                placeholder="Placa"
                value={filters.placa}
                onChange={(e) => setFilters((f) => ({ ...f, placa: e.target.value }))}
                className="h-11"
              />
            </div>

            <div className="md:col-span-2 flex flex-col gap-1 min-w-0">
              <span className="text-xs text-muted-foreground">Veículo</span>
              <Input
                placeholder="Veículo"
                value={filters.veiculo}
                onChange={(e) => setFilters((f) => ({ ...f, veiculo: e.target.value }))}
                className="h-11"
              />
            </div>

            <div className="md:col-span-3 flex flex-col gap-1 min-w-0">
              <span className="text-xs text-muted-foreground">Motorista</span>
              <Input
                placeholder="Motorista"
                value={filters.motorista}
                onChange={(e) => setFilters((f) => ({ ...f, motorista: e.target.value }))}
                className="h-11"
              />
            </div>

            <div className="md:col-span-3 flex flex-col gap-1 min-w-0">
              <span className="text-xs text-muted-foreground">Combustível</span>
              <select
                className="border rounded px-3 h-11"
                value={filters.combustivel}
                onChange={(e) => setFilters((f) => ({ ...f, combustivel: e.target.value }))}
              >
                <option value="">Todos</option>
                {FUEL_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex flex-col gap-1 min-w-0">
              <span className="text-xs text-muted-foreground">Posto</span>
              <Input
                placeholder="Posto"
                value={filters.posto}
                onChange={(e) => setFilters((f) => ({ ...f, posto: e.target.value }))}
                className="h-11"
              />
            </div>

            {/* 2ª linha */}
            <div className="md:col-span-2 flex flex-col gap-1 min-w-0">
              <span className="text-xs text-muted-foreground">Preço</span>
              <Input
                type="number"
                step="0.01"
                placeholder="Preço"
                value={filters.preco}
                onChange={(e) => setFilters((f) => ({ ...f, preco: e.target.value }))}
                className="h-11"
              />
            </div>

            <div className="md:col-span-2 flex flex-col gap-1 min-w-0">
              <span className="text-xs text-muted-foreground">De</span>
              <InputDateBR
                value={filters.de}
                onChange={(val) => setFilters((f) => ({ ...f, de: val }))}
                className="h-11"
              />
            </div>

            <div className="md:col-span-2 flex flex-col gap-1 min-w-0">
              <span className="text-xs text-muted-foreground">Até</span>
              <InputDateBR
                value={filters.ate}
                onChange={(val) => setFilters((f) => ({ ...f, ate: val }))}
                className="h-11"
              />
            </div>

            <div className="md:col-span-12 flex items-center gap-2 pt-1">
              <Button
                type="button"
                onClick={async () => {
                  await reloadWithFilters();
                  setFilterOpen(false);
                }}
                className="px-6"
              >
                Aplicar
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  await clearFilters();
                  setFilterOpen(false);
                }}
                className="px-6"
              >
                Limpar filtros
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE EDIÇÃO (mantido espaçoso) */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[95vw] max-w-[1200px] sm:p-8">
          <DialogHeader>
            <DialogTitle>Editar Abastecimento</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="grid md:grid-cols-12 gap-4">
              <div className="md:col-span-4 flex flex-col gap-1 min-w-0">
                <span className="text-xs text-muted-foreground">Placa</span>
                <select
                  className="border rounded px-3 h-11"
                  value={editing.placa}
                  onChange={(e) => setEditing((p) => ({ ...p, placa: e.target.value }))}
                >
                  {(vehicles.data || [])
                    .filter((v) => v.ativo !== false)
                    .map((v) => (
                      <option key={v.id} value={v.placa}>
                        {v.placa} — {v.modelo || v.marca}
                      </option>
                    ))}
                </select>
              </div>

              <div className="md:col-span-2 flex flex-col gap-1 min-w-0">
                <span className="text-xs text-muted-foreground">Data</span>
                <InputDateBR
                  className="h-11"
                  value={editing.data}
                  onChange={(val) => setEditing((p) => ({ ...p, data: val }))}
                />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1 min-w-0">
                <span className="text-xs text-muted-foreground">Litros</span>
                <Input
                  className="h-11"
                  value={editing.litros}
                  onChange={(e) => setEditing((p) => ({ ...p, litros: e.target.value }))}
                />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1 min-w-0">
                <span className="text-xs text-muted-foreground">Preço/Litro</span>
                <Input
                  className="h-11"
                  value={editing.preco_litro}
                  onChange={(e) =>
                    setEditing((p) => ({ ...p, preco_litro: e.target.value }))
                  }
                />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1 min-w-0">
                <span className="text-xs text-muted-foreground">Combustível</span>
                <select
                  className="border rounded px-3 h-11"
                  value={editing.combustivel}
                  onChange={(e) =>
                    setEditing((p) => ({ ...p, combustivel: e.target.value }))
                  }
                >
                  {FUEL_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3 flex flex-col gap-1 min-w-0">
                <span className="text-xs text-muted-foreground">Posto</span>
                <Input
                  className="h-11"
                  value={editing.posto || ""}
                  onChange={(e) => setEditing((p) => ({ ...p, posto: e.target.value }))}
                />
              </div>

              <div className="md:col-span-3 flex flex-col gap-1 min-w-0">
                <span className="text-xs text-muted-foreground">Motorista</span>
                <Input
                  className="h-11"
                  value={editing.motorista || ""}
                  onChange={(e) =>
                    setEditing((p) => ({ ...p, motorista: e.target.value }))
                  }
                />
              </div>

              <div className="md:col-span-3 flex flex-col gap-1 min-w-0">
                <span className="text-xs text-muted-foreground">Odômetro</span>
                <InputOdometerBR
                  className="h-11"
                  value={editing.odometro || ""}
                  onChange={(val) => setEditing((p) => ({ ...p, odometro: val }))}
                />
              </div>

              <div className="md:col-span-3 flex flex-col gap-1 min-w-0">
                <span className="text-xs text-muted-foreground">Nota fiscal</span>
                <Input
                  className="h-11"
                  value={editing.nota_fiscal || ""}
                  onChange={(e) =>
                    setEditing((p) => ({ ...p, nota_fiscal: e.target.value }))
                  }
                />
              </div>

              <div className="md:col-span-12 flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Observações</span>
                <Input
                  value={editing.observacoes || ""}
                  onChange={(e) =>
                    setEditing((p) => ({ ...p, observacoes: e.target.value }))
                  }
                />
              </div>

              <div className="md:col-span-12 flex items-center justify-between pt-1">
                <div className="text-sm text-muted-foreground">
                  Total: <span className="font-medium">{BRL(editing.valor_total)}</span>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="secondary" onClick={() => setEditOpen(false)} className="px-6">
                    Cancelar
                  </Button>
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
