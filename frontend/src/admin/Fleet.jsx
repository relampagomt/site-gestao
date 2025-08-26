// frontend/src/admin/Fleet.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import VehiclesManager from "@/components/fleet/VehiclesManager.jsx";

const BRL = (n)=> Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const FUEL_OPTIONS = ["Gasolina", "Etanol", "Diesel", "Gás", "Aditivado"];

/* ---------- Helpers de data (BR <-> ISO) e máscara ---------- */
const maskDateBR = (s) => {
  const digits = String(s || "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0,2)}/${digits.slice(2)}`;
  return `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`;
};
const toISO = (s) => {
  const str = String(s || "").trim();
  if (!str) return "";
  if (str.length >= 10 && str[2]==="/" && str[5]==="/") {
    const [dd,mm,yy] = str.slice(0,10).split("/");
    return `${yy}-${mm}-${dd}`;
  }
  if (/^\d{8}$/.test(str)) {
    const dd = str.slice(0,2), mm = str.slice(2,4), yy = str.slice(4,8);
    return `${yy}-${mm}-${dd}`;
  }
  return str.slice(0,10); // assume ISO
};
const fmtBRDate = (iso) => {
  if(!iso) return "";
  const s = String(iso);
  if (s.length>=10 && s[4]==="-" && s[7]==="-") {
    const [yy,mm,dd] = s.slice(0,10).split("-");
    return `${dd}/${mm}/${yy}`;
  }
  if (s.length===8 && /^\d{8}$/.test(s)) {
    return `${s.slice(0,2)}/${s.slice(2,4)}/${s.slice(4,8)}`;
  }
  if (s.length>=10 && s[2]==="/" && s[5]==="/") return s.slice(0,10);
  return s;
};

// Input de data com máscara dd/mm/aaaa
function InputDateBR({ value, onChange, placeholder="dd/mm/aaaa", ...props }) {
  return (
    <Input
      inputMode="numeric"
      placeholder={placeholder}
      value={value}
      onChange={(e)=> onChange(maskDateBR(e.target.value))}
      {...props}
    />
  );
}

/* ---------- Hook simples para GET ---------- */
const useList = (path) => {
  const [data,setData] = useState([]);
  const [loading,setLoading] = useState(false);
  const [err,setErr] = useState("");
  const reload = async (params = null) => {
    setLoading(true); setErr("");
    try {
      const { data } = await api.get(path, { params: params || {} });
      setData(Array.isArray(data) ? data : []);
    } catch(e){ setErr("Falha ao carregar."); }
    finally{ setLoading(false); }
  };
  useEffect(()=>{ reload(); }, [path]);
  return { data, loading, err, reload, setData };
};

export default function FleetPage() {
  // listas
  const vehicles = useList("/fleet/vehicles");
  const fuelLogs = useList("/fleet/fuel-logs");

  // form de abastecimento
  const [fuel, setFuel] = useState({
    placa:"", data:"", litros:"", preco_litro:"", valor_total:"",
    odometro:"", posto:"", motorista:"", combustivel:"Gasolina",
    nota_fiscal:"", observacoes:""
  });

  // calcula total
  useEffect(()=>{
    const litros = Number(fuel.litros || 0);
    const prec   = Number(fuel.preco_litro || 0);
    const tot    = (litros * prec) || 0;
    setFuel(p=>({...p, valor_total: String(tot.toFixed(2))}));
  }, [fuel.litros, fuel.preco_litro]);

  const resetFuel = ()=> setFuel({
    placa:"", data:"", litros:"", preco_litro:"", valor_total:"",
    odometro:"", posto:"", motorista:"", combustivel:"Gasolina",
    nota_fiscal:"", observacoes:""
  });

  // ---------------------- FILTROS ----------------------
  const [filters, setFilters] = useState({
    placa: "", veiculo: "", motorista: "", combustivel: "",
    posto: "", precoMin: "", precoMax: "", de: "", ate: ""
  });

  const reloadWithFilters = async () => {
    const params = {};
    if (filters.placa) params.placa = filters.placa.toUpperCase();
    if (filters.veiculo) params.veiculo = filters.veiculo;
    if (filters.motorista) params.motorista = filters.motorista;
    if (filters.combustivel) params.combustivel = filters.combustivel;
    if (filters.posto) params.posto = filters.posto;
    if (filters.precoMin) params.precoMin = filters.precoMin;
    if (filters.precoMax) params.precoMax = filters.precoMax;
    if (filters.de) params.de = toISO(filters.de);
    if (filters.ate) params.ate = toISO(filters.ate);
    await fuelLogs.reload(params);
  };

  const clearFilters = async () => {
    setFilters({ placa:"", veiculo:"", motorista:"", combustivel:"", posto:"", precoMin:"", precoMax:"", de:"", ate:"" });
    await fuelLogs.reload({});
  };

  // envio do abastecimento
  const submitFuel = async(e)=>{
    e.preventDefault();
    const payload = {
      ...fuel,
      data: toISO(fuel.data),
      litros: Number(fuel.litros || 0),
      preco_litro: Number(fuel.preco_litro || 0),
      valor_total: Number(fuel.valor_total || 0),
      odometro: Number(fuel.odometro || 0),
    };
    await api.post("/fleet/fuel-logs", payload);
    resetFuel();
    await reloadWithFilters(); // mantém filtros e atualiza tabela
  };

  const delFuel = async (row) => {
    if(!confirm("Excluir este abastecimento?")) return;
    await api.delete(`/fleet/fuel-logs/${row.id}`);
    await reloadWithFilters();
  };

  // Fallback de "veículo" (carro) quando registro não salvou o modelo
  const modelByPlaca = useMemo(()=>{
    const map = {};
    (vehicles.data || []).forEach(v=>{
      map[(v.placa || "").toUpperCase()] = v.modelo || v.marca || "";
    });
    return map;
  }, [vehicles.data]);

  const displayed = useMemo(()=>{
    return (fuelLogs.data || []).map(r=>({
      ...r,
      carro: r.carro || modelByPlaca[(r.placa||"").toUpperCase()] || "",
      data_fmt: fmtBRDate(r.data),
    }));
  }, [fuelLogs.data, modelByPlaca]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Frota – Abastecimentos</h1>

      {/* NOVO ABASTECIMENTO */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Novo Abastecimento</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submitFuel} className="grid md:grid-cols-4 gap-3">
            {/* Seletor de veículo + botão Gerenciar */}
            <div className="flex gap-2">
              <select
                value={fuel.placa}
                onChange={(e)=>setFuel(p=>({...p, placa: e.target.value}))}
                className="border rounded px-3 py-2 flex-1"
                required
              >
                <option value="">Selecione o veículo</option>
                {(vehicles.data || []).filter(v=>v.ativo !== false).map(v=>(
                  <option key={v.id} value={v.placa}>
                    {v.placa} — {v.modelo || v.marca}
                  </option>
                ))}
              </select>
              <VehiclesManager
                trigger={<Button type="button" variant="secondary">Cadastrar</Button>}
                onCreated={(v)=>{ vehicles.reload(); setFuel(p=>({...p, placa: v.placa})); }}
                onUpdated={()=>vehicles.reload()}
                onDeleted={()=>vehicles.reload()}
              />
            </div>

            {/* Data com MÁSCARA dd/mm/aaaa */}
            <InputDateBR
              value={fuel.data}
              onChange={(val)=>setFuel(p=>({...p, data: val}))}
            />

            <Input placeholder="Litros" value={fuel.litros}
                   onChange={(e)=>setFuel(p=>({...p, litros:e.target.value}))} />
            <Input placeholder="Preço/Litro" value={fuel.preco_litro}
                   onChange={(e)=>setFuel(p=>({...p, preco_litro:e.target.value}))} />

            <Input placeholder="Odômetro" value={fuel.odometro}
                   onChange={(e)=>setFuel(p=>({...p, odometro:e.target.value}))} />
            <Input placeholder="Posto" value={fuel.posto}
                   onChange={(e)=>setFuel(p=>({...p, posto:e.target.value}))} />
            <Input placeholder="Motorista" value={fuel.motorista}
                   onChange={(e)=>setFuel(p=>({...p, motorista:e.target.value}))} />

            <select
              className="border rounded px-3 py-2"
              value={fuel.combustivel}
              onChange={(e)=>setFuel(p=>({...p, combustivel:e.target.value}))}
            >
              {FUEL_OPTIONS.map(opt=> <option key={opt} value={opt}>{opt}</option>)}
            </select>

            <Input placeholder="Nota fiscal" value={fuel.nota_fiscal}
                   onChange={(e)=>setFuel(p=>({...p, nota_fiscal:e.target.value}))} />
            <Input className="md:col-span-4" placeholder="Observações" value={fuel.observacoes}
                   onChange={(e)=>setFuel(p=>({...p, observacoes:e.target.value}))} />

            <div className="md:col-span-4 flex items-center justify-between">
              <div className="font-semibold">Total: {BRL(fuel.valor_total)}</div>
              <div className="flex gap-2">
                <Button type="submit">Adicionar</Button>
                <Button type="button" variant="secondary" onClick={resetFuel}>Limpar</Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* FILTROS */}
      <Card className="mb-4">
        <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-6 gap-3">
          <Input placeholder="Placa" value={filters.placa}
                 onChange={(e)=>setFilters(f=>({...f, placa:e.target.value}))} />
          <Input placeholder="Veículo" value={filters.veiculo}
                 onChange={(e)=>setFilters(f=>({...f, veiculo:e.target.value}))} />
          <Input placeholder="Motorista" value={filters.motorista}
                 onChange={(e)=>setFilters(f=>({...f, motorista:e.target.value}))} />
          <select className="border rounded px-3 py-2" value={filters.combustivel}
                  onChange={(e)=>setFilters(f=>({...f, combustivel:e.target.value}))}>
            <option value="">Todos</option>
            {FUEL_OPTIONS.map(o=> <option key={o} value={o}>{o}</option>)}
          </select>
          <Input placeholder="Posto" value={filters.posto}
                 onChange={(e)=>setFilters(f=>({...f, posto:e.target.value}))} />
          <div className="flex gap-2">
            <Input type="number" placeholder="Preço mín." value={filters.precoMin}
                   onChange={(e)=>setFilters(f=>({...f, precoMin:e.target.value}))} />
            <Input type="number" placeholder="Preço máx." value={filters.precoMax}
                   onChange={(e)=>setFilters(f=>({...f, precoMax:e.target.value}))} />
          </div>

          {/* Legendas De / Até + inputs com MÁSCARA */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">De</span>
            <InputDateBR
              value={filters.de}
              onChange={(val)=>setFilters(f=>({...f, de: val}))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Até</span>
            <InputDateBR
              value={filters.ate}
              onChange={(val)=>setFilters(f=>({...f, ate: val}))}
            />
          </div>

          <div className="md:col-span-6 flex gap-2">
            <Button type="button" onClick={reloadWithFilters}>Aplicar</Button>
            <Button type="button" variant="secondary" onClick={clearFilters}>Limpar filtros</Button>
          </div>
        </CardContent>
      </Card>

      {/* REGISTROS */}
      <Card>
        <CardHeader><CardTitle>Registros</CardTitle></CardHeader>
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
                {displayed.map(f=>(
                  <tr key={f.id} className="border-t">
                    <TableCell>{f.data_fmt}</TableCell>
                    <TableCell>{f.placa}</TableCell>
                    <TableCell>{f.carro}</TableCell>
                    <TableCell>{Number(f.litros||0)}</TableCell>
                    <TableCell>{BRL(f.preco_litro)}</TableCell>
                    <TableCell className="font-medium">{BRL(f.valor_total)}</TableCell>
                    <TableCell>{f.odometro}</TableCell>
                    <TableCell>{f.posto}</TableCell>
                    <TableCell>{f.motorista}</TableCell>
                    <TableCell>{f.combustivel}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="destructive" onClick={()=>delFuel(f)}>Excluir</Button>
                    </TableCell>
                  </tr>
                ))}
                {displayed.length === 0 && (
                  <tr><TableCell colSpan={11} className="text-sm text-muted-foreground">Sem registros.</TableCell></tr>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
