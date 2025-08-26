// frontend/src/admin/Fleet.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { toISO, toBR } from "@/utils/dateBR";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogTrigger
} from "@/components/ui/dialog.jsx";

const BRL = (n)=> (Number(n||0)).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

const useLoad = (url) => {
  const [data,setData]=useState([]);
  const reload=async()=>{ const r=await api.get(url); setData(r.data||[]); };
  useEffect(()=>{ reload(); },[url]);
  return {data,reload};
};

// helpers ---------------------------------------------------
const parseNum = (v)=> {
  if(v==null||v==="") return 0;
  const s=String(v).replace(/\./g,'').replace(',','.');
  const n=Number(s);
  return Number.isFinite(n)?n:0;
};

// dd/mm/aa -> dd/mm/20aa
const normalizeDateAA = (s) => {
  const m = String(s||"").match(/^(\d{2})[^\d]?(\d{2})[^\d]?(\d{2})$/);
  if(m) return `${m[1]}/${m[2]}/20${m[3]}`;
  return s;
};

// mascara de data em tempo real -> dd/mm/aa
const maskDateAA = (raw) => {
  const digits = String(raw||"").replace(/\D/g,"").slice(0,6);
  const p1 = digits.slice(0,2);
  const p2 = digits.slice(2,4);
  const p3 = digits.slice(4,6);
  if(digits.length <= 2) return p1;
  if(digits.length <= 4) return `${p1}/${p2}`;
  return `${p1}/${p2}/${p3}`;
};

// KM com milhar: 12345 -> 12.345
const maskKM = (raw) => {
  const digits = String(raw||"").replace(/\D/g,"");
  if(!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// valor BRL simples (formata no blur)
const formatValorOnBlur = (v) => {
  const n = parseNum(v);
  if(!n) return "";
  return n.toLocaleString("pt-BR",{minimumFractionDigits:2, maximumFractionDigits:2});
};
// ----------------------------------------------------------

export default function Fleet(){
  const vehicles=useLoad("/api/fleet/vehicles");
  const drivers=useLoad("/api/fleet/drivers");
  const fuels=useLoad("/api/fleet/fuel-logs");

  // modal
  const [open,setOpen]=useState(false);

  // form (ajustes solicitados)
  const [fuel,setFuel]=useState({
    carro:"",              // texto livre (Carro)
    motorista:"",          // texto livre (Motorista)
    placa:"",
    data:"",               // dd/mm/aa (mascara)
    km:"",                 // com . de milhar
    litros:"",
    valor:"",              // único campo de valor
    combustivel:"Gasolina",
    posto:"",
    nota_fiscal:"",
    // se quiser mapear para ids depois, deixe vazios:
    vehicle_id:"", driver_id:""
  });

  // filtros
  const [flt,setFlt]=useState({q:"", combustivel:"", placa:"", posto:"", de:"", ate:""});

  const filtered = useMemo(()=>{
    const deISO = flt.de ? toISO(normalizeDateAA(flt.de)) : null;
    const ateISO = flt.ate ? toISO(normalizeDateAA(flt.ate)) : null;
    return (fuels.data||[]).filter(row=>{
      if(flt.combustivel && row.combustivel!==flt.combustivel) return false;
      if(flt.placa && !String(row.placa||"").toLowerCase().includes(flt.placa.toLowerCase())) return false;
      if(flt.posto && !String(row.posto||"").toLowerCase().includes(flt.posto.toLowerCase())) return false;
      if(flt.q){
        const hay = `${row.placa||""} ${row.posto||""} ${row.nota_fiscal||""} ${row.carro||""} ${row.motorista||""}`.toLowerCase();
        if(!hay.includes(flt.q.toLowerCase())) return false;
      }
      if(deISO && row.data < deISO) return false;
      if(ateISO && row.data > ateISO) return false;
      return true;
    });
  },[fuels.data, flt]);

  const resetForm = ()=> setFuel({
    carro:"", motorista:"", placa:"", data:"",
    km:"", litros:"", valor:"", combustivel:"Gasolina",
    posto:"", nota_fiscal:"", vehicle_id:"", driver_id:""
  });

  const submitFuel = async () => {
    await api.post("/api/fleet/fuel-logs",{
      // envia também os campos livres (se o backend aceitar, ótimo; senão, ignore no server)
      carro: fuel.carro,
      motorista: fuel.motorista,
      vehicle_id: fuel.vehicle_id || null,
      driver_id: fuel.driver_id || null,
      placa: fuel.placa,
      data: toISO(normalizeDateAA(fuel.data)),
      km: parseNum(fuel.km),
      litros: parseNum(fuel.litros),
      valor: parseNum(fuel.valor),
      combustivel: fuel.combustivel,
      posto: fuel.posto,
      nota_fiscal: fuel.nota_fiscal,
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

              {/* FORM */}
              <div className="grid gap-3 md:grid-cols-12">
                {/* Carro (texto com sugestões) */}
                <div className="md:col-span-6">
                  <Input
                    autoComplete="off"
                    list="dl-carros"
                    placeholder="Carro..."
                    value={fuel.carro}
                    onChange={e=>setFuel(s=>({...s,carro:e.target.value}))}
                  />
                  <datalist id="dl-carros">
                    {vehicles.data.map(v=>(
                      <option key={v.id} value={`${v.placa} - ${v.modelo} (${v.marca||""})`} />
                    ))}
                  </datalist>
                </div>

                {/* Motorista (texto com sugestões) */}
                <div className="md:col-span-6">
                  <Input
                    autoComplete="off"
                    list="dl-motoristas"
                    placeholder="Motorista..."
                    value={fuel.motorista}
                    onChange={e=>setFuel(s=>({...s,motorista:e.target.value}))}
                  />
                  <datalist id="dl-motoristas">
                    {drivers.data.map(d=>(
                      <option key={d.id} value={d.nome} />
                    ))}
                  </datalist>
                </div>

                <Input className="md:col-span-3" autoComplete="off" placeholder="Placa"
                  value={fuel.placa} onChange={e=>setFuel(s=>({...s,placa:e.target.value}))}/>

                {/* Data com máscara dd/mm/aa */}
                <Input className="md:col-span-3" autoComplete="off" placeholder="dd/mm/aa"
                  value={fuel.data}
                  onChange={e=>setFuel(s=>({...s,data: maskDateAA(e.target.value)}))}
                  maxLength={8}
                />

                {/* KM com milhar */}
                <Input className="md:col-span-2" autoComplete="off" placeholder="KM"
                  value={fuel.km}
                  onChange={e=>setFuel(s=>({...s,km: maskKM(e.target.value)}))}
                />

                <Input className="md:col-span-2" autoComplete="off" placeholder="Litros"
                  value={fuel.litros} onChange={e=>setFuel(s=>({...s,litros:e.target.value}))}/>

                {/* Valor (único) */}
                <Input className="md:col-span-2" autoComplete="off" placeholder="Valor"
                  value={fuel.valor}
                  onChange={e=>setFuel(s=>({...s,valor:e.target.value}))}
                  onBlur={e=>setFuel(s=>({...s,valor: formatValorOnBlur(e.target.value)}))}
                />

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
          <Input className="md:col-span-4" placeholder="Buscar (placa / posto / NF / carro / motorista)"
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
          <Input className="md:col-span-1" placeholder="De (dd/mm/aa)"
            value={flt.de} onChange={e=>setFlt(s=>({...s,de: maskDateAA(e.target.value)}))} maxLength={8}/>
          <Input className="md:col-span-1" placeholder="Até (dd/mm/aa)"
            value={flt.ate} onChange={e=>setFlt(s=>({...s,ate: maskDateAA(e.target.value)}))} maxLength={8}/>
        </div>

        {/* Tabela */}
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Carro</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>KM</TableHead>
                <TableHead>Litros</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Comb.</TableHead>
                <TableHead>Posto</TableHead>
                <TableHead>NF-e</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(f=>(
                <TableRow key={f.id}>
                  <TableCell>{toBR(f.data)}</TableCell>
                  <TableCell>{f.carro || "-"}</TableCell>
                  <TableCell>{f.motorista || "-"}</TableCell>
                  <TableCell>{f.placa}</TableCell>
                  <TableCell>{(Number(f.km)||0).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{f.litros}</TableCell>
                  <TableCell>{BRL(f.valor ?? f.valor_total)}</TableCell>
                  <TableCell>{f.combustivel}</TableCell>
                  <TableCell>{f.posto}</TableCell>
                  <TableCell>{f.nota_fiscal}</TableCell>
                </TableRow>
              ))}
              {filtered.length===0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground">Sem resultados.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
