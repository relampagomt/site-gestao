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
    const dd = str.slice(0, 2),
      mm = str.slice(2, 4),
      yy = str.slice(4, 8);
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
  const [loading, setLoading] = useState(false); // <- caractere invisível removido
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

  /* --------- Envio --------- */
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
    await reloadWithFilters();
  };

  const delFuel = async (row) => {
    if (!confirm("Excluir este abastecimento?")) return;
    await api.delete(`/fleet/fuel-logs/${row.id}`);
    await reloadWithFilters();
  };

  const modelByPlaca = useMemo(() => {
    const map = {};
    (vehicles.data || []).forEach((v) => {
      map[(v.placa || "").toUpperCase()] = v.modelo || v.marca || "";
    });
    return map;
  }, [vehicles.data]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Frota – Abastecimentos</h1>

      {/* NOVO ABASTECIMENTO */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Novo Abastecimento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitFuel} className="grid md:grid-cols-4 gap-3">
            {/* 1ª linha */}
            <div className="flex gap-2">
              <select
                value={fuel.placa}
                onChange={(e) => setFuel((p) => ({ ...p, placa: e.target.value }))}
                className="border rounded px-3 py-2 flex-1 h-10"
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
              <VehiclesManager
                trigger={<Button type="button" variant="secondary">Cadastrar</Button>}
                onCreated={(v) => {
                  vehicles.reload();
                  setFuel((p) => ({ ...p, placa: v.placa }));
                }}
                onUpdated={() => vehicles.reload()}
                onDeleted={() => vehicles.reload()}
              />
            </div>

            <InputDateBR
              value={fuel.data}
              onChange={(val) => setFuel((p) => ({ ...p, data: val }))}
            />
            <Input
              placeholder="Litros"
              value={fuel.litros}
              onChange={(e) => setFuel((p) => ({ ...p, litros: e.target.value }))}
            />
            <Input
              placeholder="Preço/Litro"
              value={fuel.preco_litro}
              onChange={(e) => setFuel((p) => ({ ...p, preco_litro: e.target.value }))}
            />

            {/* 2ª linha */}
            {/* Combustível (ajustado: mesmo tamanho dos outros campos) */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Combustível</span>
              <select
                className="border rounded px-3 py-2 w-full h-10"
                value={fuel.combustivel}
                onChange={(e) =>
                  setFuel((p) => ({ ...p, combustivel: e.target.value }))
                }
              >
                {FUEL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Odômetro</span>
              <InputOdometerBR
                value={fuel.odometro}
                onChange={(val) => setFuel((p) => ({ ...p, odometro: val }))}
              />
            </div>

            <Input
              placeholder="Posto"
              value={fuel.posto}
              onChange={(e) => setFuel((p) => ({ ...p, posto: e.target.value }))}
            />
            <Input
              placeholder="Motorista"
              value={fuel.motorista}
              onChange={(e) => setFuel((p) => ({ ...p, motorista: e.target.value }))}
            />

            {/* 3ª linha */}
            <Input
              placeholder="Nota fiscal"
              value={fuel.nota_fiscal}
              onChange={(e) =>
                setFuel((p) => ({ ...p, nota_fiscal: e.target.value }))
              }
            />
            <Input
              className="md:col-span-3"
              placeholder="Observações"
              value={fuel.observacoes}
              onChange={(e) =>
                setFuel((p) => ({ ...p, observacoes: e.target.value }))
              }
            />

            {/* Rodapé */}
            <div className="md:col-span-4 flex items-center justify-between">
              <div className="font-semibold">Total: {BRL(fuel.valor_total)}</div>
              <div className="flex gap-2">
                <Button type="submit">Adicionar</Button>
                <Button type="button" variant="secondary" onClick={resetFuel}>
                  Limpar
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* FILTROS */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-6 gap-3">
          <Input
            placeholder="Placa"
            value={filters.placa}
            onChange={(e) => setFilters((f) => ({ ...f, placa: e.target.value }))}
          />
          <Input
            placeholder="Veículo"
            value={filters.veiculo}
            onChange={(e) => setFilters((f) => ({ ...f, veiculo: e.target.value }))}
          />
          <Input
            placeholder="Motorista"
            value={filters.motorista}
            onChange={(e) =>
              setFilters((f) => ({ ...f, motorista: e.target.value }))
            }
          />

          {/* Combustível (filtro) */}
          <select
            className="border rounded px-3 py-2 w-full"
            value={filters.combustivel}
            onChange={(e) =>
              setFilters((f) => ({ ...f, combustivel: e.target.value }))
            }
          >
            <option value="">Todos</option>
            {FUEL_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>

          <Input
            placeholder="Posto"
            value={filters.posto}
            onChange={(e) => setFilters((f) => ({ ...f, posto: e.target.value }))}
          />
          <Input
            type="number"
            step="0.01"
            placeholder="Preço"
            value={filters.preco}
            onChange={(e) => setFilters((f) => ({ ...f, preco: e.target.value }))}
          />

          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">De</span>
            <InputDateBR
              value={filters.de}
              onChange={(val) => setFilters((f) => ({ ...f, de: val }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Até</span>
            <InputDateBR
              value={filters.ate}
              onChange={(val) => setFilters((f) => ({ ...f, ate: val }))}
            />
          </div>

          <div className="md:col-span-6 flex gap-2">
            <Button type="button" onClick={reloadWithFilters}>
              Aplicar
            </Button>
            <Button type="button" variant="secondary" onClick={clearFilters}>
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

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
                  <TableHead></TableHead>
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
                      <Button variant="destructive" onClick={() => delFuel(f)}>
                        Excluir
                      </Button>
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
    </div>
  );
}
