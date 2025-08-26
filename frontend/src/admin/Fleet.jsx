// frontend/src/admin/Fleet.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { toISO, toBR } from "@/utils/dateBR";
// se tiver no projeto:
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog.jsx";
// (se não tiver Dialog no projeto, substitua por qualquer modal que usem)

// Helpers
const BRL = (n)=> (Number(n||0)).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

const useLoad = (url) => {
  const [data,setData]=useState([]);
  const reload=async()=>{ const r=await api.get(url); setData(r.data||[]); };
  useEffect(()=>{ reload(); },[url]);
  return {data,reload};
};

const parseNum = (v)=> {
  if(v==null||v==="") return 0;
  const s=String(v).replace(/\./g,'').replace(',','.');
  const n=Number(s);
  return Number.isFinite(n)?n:0;
};

export default function Fleet(){
  // fontes de dados
  const vehicles=useLoad("/api/fleet/vehicles");
  const drivers=useLoad("/api/fleet/drivers");
  const fuels=useLoad("/api/fleet/fuel-logs");

  // modal state
  const [open,setOpen]=useState(false);

  // form de lançamento (abastecimento)
  const [fuel,setFuel]=useState({
    vehicle_id:"", driver_id:"", placa:"", data:"",
    km:"", litros:"", valor_unit:"", valor_total:"",
    combustivel:"Gasolina", posto:"", nota_fiscal:""
  });

  // auto total
  useEffect(()=>{
    const l=parseNum(fuel.litros), u=parseNum(fuel.valor_unit);
    if(l && u){
      setFuel(s=>({...s, valor_total:(l*u).toLocaleString("pt-BR",{minimumFractionDigits:2, maximumFractionDigits:2})}));
    }
  },[fuel.litros,fuel.valor_unit]);

  // filtros da tabela
  const [flt,setFlt]=useState({q:"", combustivel:"", placa:"", posto:"", de:"", ate:""});

  const filtered = useMemo(()=>{
    const deISO = flt.de ? toISO(flt.de) : null;
    const ateISO = flt.ate ? toISO(flt.ate) : null;
    return (fuels.data||[]).filter(row=>{
      if(flt.combustivel && row.combustivel!==flt.combustivel) return false;
      if(flt.placa && !String(row.placa||"").toLowerCase().includes(flt.placa.toLowerCase())) return false;
      if(flt.posto && !String(row.posto||"").toLowerCase().includes(flt.posto.toLowerCase())) return false;
      if(flt.q){
        const hay = `${row.placa||""} ${row.posto||""} ${row.nota_fiscal||""}`.toLowerCase();
        if(!hay.includes(flt.q.toLowerCase())) return false;
      }
      if(deISO && row.data < deISO) return false;
      if(ateISO && row.data > ateISO) return false;
      return true;
    });
  },[fuels.data, flt]);

  const resetForm = ()=> setFuel({
    vehicle_id:"", driver_id:"", placa:"", data:"",
    km:"", litros:"", valor_unit:"", valor_total:"",
    combustivel:"Gasolina", posto:"", nota_fiscal:""
  });

  const submitFuel = async () => {
    await api.post("/api/fleet/fuel-logs",{
      ...fuel,
      data: toISO(fuel.data),
      km: parseNum(fuel.km),
      litros: parseNum(fuel.litros),
      valor_unit: parseNum(fuel.valor_unit),
      valor_total: parseNum(fuel.valor_total),
    });
    resetForm();
    setOpen(false);
    fuels.reload();
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Frota • Abastecimentos</CardTitle>
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button type="button">Lançar abastecimento</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Novo abastecimento</DialogTitle>
                <DialogDescription>Preencha os dados e clique em Salvar.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 md:grid-cols-12">
                <select className="md:col-span-6 border rounded-xl px-3 py-2"
                  value={fuel.vehicle_id}
                  onChange={e=>setFuel(s=>({...s,vehicle_id:e.target.value}))}>
                  <option value="">Veículo...</option>
                  {vehicles.data.map(v=><option key={v.id} value={v.id}>{v.placa} - {v.modelo}</option>)}
                </select>

                <select className="md:col-span-6 border rounded-xl px-3 py-2"
                  value={fuel.driver_id}
                  onChange={e=>setFuel(s=>({...s,driver_id:e.target.value}))}>
                  <option value="">Motorista...</option>
                  {drivers.data.map(d=><option key={d.id} value={d.id}>{d.nome}</option>)}
                </select>

                <Input className="md:col-span-3" autoComplete="off" placeholder="Placa"
                  value={fuel.placa} onChange={e=>setFuel(s=>({...s,placa:e.target.value}))}/>
                <Input className="md:col-span-3" autoComplete="off" placeholder="dd/mm/aaaa"
                  value={fuel.data} onChange={e=>setFuel(s=>({...s,data:e.target.value}))}/>
                <Input className="md:col-span-2" autoComplete="off" placeholder="KM"
                  value={fuel.km} onChange={e=>setFuel(s=>({...s,km:e.target.value}))}/>
                <Input className="md:col-span-2" autoComplete="off" placeholder="Litros"
                  value={fuel.litros} onChange={e=>setFuel(s=>({...s,litros:e.target.value}))}/>
                <Input className="md:col-span-2" autoComplete="off" placeholder="V. Unit."
                  value={fuel.valor_unit} onChange={e=>setFuel(s=>({...s,valor_unit:e.target.value}))}/>
                <Input className="md:col-span-2" autoComplete="off" placeholder="V. Total"
                  value={fuel.valor_total} onChange={e=>setFuel(s=>({...s,valor_total:e.target.value}))}/>

                <select className="md:col-span-3 border rounded-xl px-3 py-2"
                  value={fuel.combustivel}
                  onChange={e=>setFuel(s=>({...s,combustivel:e.target.value}))}>
                  <option>Gasolina</option><option>Etanol</option><option>Diesel</option>
                </select>

                <Input className="md:col-span-6" autoComplete="off" placeholder="Posto"
                  value={fuel.posto} onChange={e=>setFuel(s=>({...s,posto:e.target.value}))}/>
                <Input className="md:col-span-3" autoComplete="off" placeholder="NF-e"
                  value={fuel.nota_fiscal} onChange={e=>setFuel(s=>({...s,nota_fiscal:e.target.value}))}/>
              </div>

              <DialogFooter className="mt-2">
                <Button type="button" variant="secondary" onClick={()=>{ resetForm(); setOpen(false); }}>Cancelar</Button>
                <Button type="button" onClick={submitFuel}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button type="button" variant="secondary" onClick={fuels.reload}>Atualizar</Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Filtros */}
        <div className="grid gap-3 md:grid-cols-12 mb-4">
          <Input className="md:col-span-4" placeholder="Buscar (placa / posto / NF)"
            value={flt.q} onChange={e=>setFlt(s=>({...s,q:e.target.value}))}/>
          <Input className="md:col-span-2" placeholder="Placa"
            value={flt.placa} onChange={e=>setFlt(s=>({...s,placa:e.target.value}))}/>
          <Input className="md:col-span-2" placeholder="Posto"
            value={flt.posto} onChange={e=>setFlt(s=>({...s,posto:e.target.value}))}/>
          <select className="md:col-span-2 border rounded-xl px-3 py-2"
            value={flt.combustivel} onChange={e=>setFlt(s=>({...s,combustivel:e.target.value}))}>
            <option value="">Combustível</option>
            <option>Gasolina</option><option>Etanol</option><option>Diesel</option>
          </select>
          <Input className="md:col-span-1" placeholder="De (dd/mm/aaaa)"
            value={flt.de} onChange={e=>setFlt(s=>({...s,de:e.target.value}))}/>
          <Input className="md:col-span-1" placeholder="Até (dd/mm/aaaa)"
            value={flt.ate} onChange={e=>setFlt(s=>({...s,ate:e.target.value}))}/>
        </div>

        {/* Tabela */}
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>KM</TableHead>
                <TableHead>Litros</TableHead>
                <TableHead>V.Unit</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Comb.</TableHead>
                <TableHead>Posto</TableHead>
                <TableHead>NF-e</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(f=>(
                <TableRow key={f.id}>
                  <TableCell>{toBR(f.data)}</TableCell>
                  <TableCell>{f.placa}</TableCell>
                  <TableCell>{f.km}</TableCell>
                  <TableCell>{f.litros}</TableCell>
                  <TableCell>{BRL(f.valor_unit)}</TableCell>
                  <TableCell>{BRL(f.valor_total)}</TableCell>
                  <TableCell>{f.combustivel}</TableCell>
                  <TableCell>{f.posto}</TableCell>
                  <TableCell>{f.nota_fiscal}</TableCell>
                </TableRow>
              ))}
              {filtered.length===0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground">Sem resultados.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
