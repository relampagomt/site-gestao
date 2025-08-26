// frontend/src/admin/Fleet.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import VehiclesManager from "@/components/fleet/VehiclesManager.jsx";

const BRL = (n)=> Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

const useList = (path) => {
  const [data,setData] = useState([]);
  const [loading,setLoading] = useState(false);
  const [err,setErr] = useState("");
  const reload = async () => {
    setLoading(true); setErr("");
    try { const {data} = await api.get(path); setData(data || []); }
    catch(e){ setErr("Falha ao carregar."); }
    finally{ setLoading(false); }
  };
  useEffect(()=>{ reload(); }, [path]);
  return { data, loading, err, reload };
};

export default function FleetPage() {
  // listas
  const vehicles   = useList("/fleet/vehicles");
  const fuelLogs   = useList("/fleet/fuel-logs");

  // form de abastecimento
  const [fuel, setFuel] = useState({
    placa:"", data:"", litros:"", preco_litro:"", valor_total:"",
    odometro:"", posto:"", motorista:"", combustivel:"Gasolina",
    nota_fiscal:"", observacoes:""
  });

  // quando informar litros/preço recalcule o total
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

  const submitFuel = async(e)=>{
    e.preventDefault();
    const payload = {
      ...fuel,
      litros: Number(fuel.litros || 0),
      preco_litro: Number(fuel.preco_litro || 0),
      valor_total: Number(fuel.valor_total || 0),
      odometro: Number(fuel.odometro || 0),
    };
    await api.post("/fleet/fuel-logs", payload);
    resetFuel();
    fuelLogs.reload();
  };

  const delFuel = async (row) => {
    if(!confirm("Excluir este abastecimento?")) return;
    await api.delete(`/fleet/fuel-logs/${row.id}`);
    fuelLogs.reload();
  };

  const filtered = useMemo(()=> fuelLogs.data, [fuelLogs.data]);

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

            <Input placeholder="Data (YYYY-MM-DD)" value={fuel.data}
                   onChange={(e)=>setFuel(p=>({...p, data:e.target.value}))} />
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
            <Input placeholder="Combustível" value={fuel.combustivel}
                   onChange={(e)=>setFuel(p=>({...p, combustivel:e.target.value}))} />
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
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(f=>(
                  <tr key={f.id} className="border-t">
                    <TableCell>{f.data}</TableCell>
                    <TableCell>{f.placa}</TableCell>
                    <TableCell>{f.carro}</TableCell>
                    <TableCell>{Number(f.litros||0)}</TableCell>
                    <TableCell>{BRL(f.preco_litro)}</TableCell>
                    <TableCell className="font-medium">{BRL(f.valor_total)}</TableCell>
                    <TableCell>{f.odometro}</TableCell>
                    <TableCell>{f.posto}</TableCell>
                    <TableCell>{f.motorista}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="destructive" onClick={()=>delFuel(f)}>Excluir</Button>
                    </TableCell>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><TableCell colSpan={10} className="text-sm text-muted-foreground">Sem registros.</TableCell></tr>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
