// frontend/src/admin/Fleet.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";

/**
 * IMPORTANTE:
 * - O axios `api` já tem baseURL `/api`. Portanto, aqui usamos caminhos RELATIVOS:
 *   `/fleet/...` (sem duplicar `/api`), evitando o erro 405 de `/api/api/...`.
 */

const BRL = (n)=> (Number(n||0)).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const parseNum=(v)=>{ if(v==null||v==="") return 0; const s=String(v).replace(/\./g,"").replace(",","."); const n=Number(s); return Number.isFinite(n)?n:0; };

const useLoad=(path)=>{
  const [data,setData]=useState([]);
  const reload=async()=>{ const {data} = await api.get(path); setData(data||[]); };
  useEffect(()=>{ reload(); },[path]);
  return {data, reload};
};

export default function Fleet(){
  const vehicles=useLoad("/fleet/vehicles");
  const drivers =useLoad("/fleet/drivers");
  const fuels   =useLoad("/fleet/fuel-logs");

  const [open,setOpen]=useState(false);

  const [fuel,setFuel]=useState({ vehicle_id:"", date:"", liters:"", price_per_liter:"", total:"", odometer:"", station:"", driver:"", notes:"" });
  const [editing,setEditing]=useState(null);

  const totalCalc=useMemo(()=>{
    const l=parseNum(fuel.liters); const p=parseNum(fuel.price_per_liter);
    return (l*p).toFixed(2);
  },[fuel.liters,fuel.price_per_liter]);

  const onChange=(e)=>{ const {name,value}=e.target; setFuel((f)=>({...f,[name]:value})); };

  const submit=async(e)=>{
    e.preventDefault();
    const payload={...fuel};
    if(!payload.total) payload.total = totalCalc;

    const url = editing ? `/fleet/fuel-logs/${editing.id}` : `/fleet/fuel-logs`;
    const method = editing ? "put" : "post";
    await api[method](url, payload);
    setFuel({ vehicle_id:"", date:"", liters:"", price_per_liter:"", total:"", odometer:"", station:"", driver:"", notes:"" });
    setEditing(null);
    fuels.reload();
  };

  const edit=(row)=>{ setEditing(row); setFuel({
    vehicle_id: row.vehicle_id||"",
    date: row.date||"",
    liters: String(row.liters ?? ""),
    price_per_liter: String(row.price_per_liter ?? ""),
    total: String(row.total ?? ""),
    odometer: String(row.odometer ?? ""),
    station: row.station||"",
    driver: row.driver||"",
    notes: row.notes||""
  }); };

  const del=async(row)=>{ if(!confirm("Excluir abastecimento?")) return; await api.delete(`/fleet/fuel-logs/${row.id}`); fuels.reload(); };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Frota – Abastecimentos</h1>

      <Card className="mb-4">
        <CardHeader><CardTitle>Novo Abastecimento</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid md:grid-cols-4 gap-3">
            <select name="vehicle_id" value={fuel.vehicle_id} onChange={onChange} className="border rounded px-3 py-2" required>
              <option value="">Selecione o veículo</option>
              {(vehicles.data||[]).map(v => <option key={v.id} value={v.id}>{v.placa || v.modelo || v.id}</option>)}
            </select>
            <Input name="date" value={fuel.date} onChange={onChange} placeholder="Data (YYYY-MM-DD)" required />
            <Input name="liters" value={fuel.liters} onChange={onChange} placeholder="Litros" />
            <Input name="price_per_liter" value={fuel.price_per_liter} onChange={onChange} placeholder="Preço/Litro" />
            <Input name="total" value={fuel.total || totalCalc} onChange={onChange} placeholder="Total" />
            <Input name="odometer" value={fuel.odometer} onChange={onChange} placeholder="Odômetro" />
            <Input name="station" value={fuel.station} onChange={onChange} placeholder="Posto" />
            <Input name="driver" value={fuel.driver} onChange={onChange} placeholder="Motorista" />
            <Input name="notes" value={fuel.notes} onChange={onChange} placeholder="Observações" className="md:col-span-3" />
            <Button type="submit">{editing? "Salvar" : "Adicionar"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Registros</CardTitle></CardHeader>
        <CardContent className="overflow-auto">
          <Table className="min-w-full text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Litros</TableHead>
                <TableHead>Pç/L</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Odômetro</TableHead>
                <TableHead>Posto</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(fuels.data||[]).map(row=>(
                <tr key={row.id} className="border-t">
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{row.vehicle_id}</TableCell>
                  <TableCell>{row.liters}</TableCell>
                  <TableCell>{BRL(row.price_per_liter)}</TableCell>
                  <TableCell>{BRL(row.total)}</TableCell>
                  <TableCell>{row.odometer}</TableCell>
                  <TableCell>{row.station}</TableCell>
                  <TableCell>{row.driver}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="secondary" onClick={()=>edit(row)} className="mr-2">Editar</Button>
                    <Button variant="destructive" onClick={()=>del(row)}>Excluir</Button>
                  </TableCell>
                </tr>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
