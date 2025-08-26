// frontend/src/admin/Fleet.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { toISO, toBR } from "@/utils/dateBR";
import { Badge } from "@/components/ui/badge.jsx";

const BRL = (n)=> (Number(n||0)).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

const useLoad = (url) => {
  const [data,setData]=useState([]);
  const reload=async()=>{ const r=await api.get(url); setData(r.data||[]); };
  useEffect(()=>{reload()},[url]);
  return {data,reload};
};

export default function Fleet(){
  const vehicles=useLoad("/api/fleet/vehicles");
  const drivers=useLoad("/api/fleet/drivers");
  const asg=useLoad("/api/fleet/assignments");
  const fuels=useLoad("/api/fleet/fuel-logs");
  const kms=useLoad("/api/fleet/km-logs");
  const clean=useLoad("/api/fleet/cleanings");
  const photos=useLoad("/api/fleet/photos");
  const occ=useLoad("/api/fleet/occurrences");

  const [veh,setVeh]=useState({placa:"",modelo:"",marca:"",ano:""});
  const [drv,setDrv]=useState({nome:"",documento:""});
  const [vinc,setVinc]=useState({vehicle_id:"",driver_id:"",placa:"",inicio:"",fim:"",observacao:""});

  // -------- Abastecimentos (form + rascunhos) --------
  const [fuel,setFuel]=useState({vehicle_id:"",driver_id:"",placa:"",data:"",km:"",litros:"",valor_unit:"",valor_total:"",combustivel:"Gasolina",posto:"",nota_fiscal:""});
  const [fuelDrafts,setFuelDrafts]=useState([]); // <<< TABELA DE CONTROLE (rascunhos)

  const [kmf,setKmf]=useState({vehicle_id:"",placa:"",data:"",km:"",tipo:"leitura",origem:"",destino:"",observacao:""});
  const [clf,setClf]=useState({vehicle_id:"",placa:"",data:"",tipo:"Lavagem Completa",valor:"",local:"",observacao:""});
  const [phf,setPhf]=useState({vehicle_id:"",placa:"",data:"",tipo:"Interior",url:"",observacao:""});
  const [ocf,setOcf]=useState({vehicle_id:"",placa:"",data:"",tipo:"Multa",descricao:"",valor_estimado:"",responsavel:""});

  const post = async (url, body, reloads=[]) => {
    const r = await api.post(url, body);
    reloads.forEach(fn=>fn());
    return r?.data;
  };

  const parseNum = (v)=> {
    if(v==null||v==="") return 0;
    const s=String(v).replace(/\./g,'').replace(',','.');
    const n=Number(s);
    return Number.isFinite(n)?n:0;
  };

  // auto-calcular total do abastecimento enquanto digita
  useEffect(()=>{
    const l=parseNum(fuel.litros), u=parseNum(fuel.valor_unit);
    if(l && u){
      setFuel(s=>({...s, valor_total: (l*u).toLocaleString("pt-BR",{minimumFractionDigits:2, maximumFractionDigits:2})}));
    }
  },[fuel.litros, fuel.valor_unit]);

  const InputGrid = ({children, cols="md:grid-cols-6"}) => <div className={`grid gap-3 ${cols}`}>{children}</div>;

  // -------- Helpers da Tabela de Rascunhos (Abastecimentos) --------
  const addFuelDraft = () => {
    // valida mínimos úteis para controle
    if(!fuel.data || !fuel.placa || !fuel.litros || !fuel.valor_unit){
      alert("Preencha pelo menos Data, Placa, Litros e Valor Unit.");
      return;
    }
    // cria item normalizado, mas sem enviar
    const item = {
      ...fuel,
      data: fuel.data, // manter dd/mm/aaaa no rascunho para você conferir visualmente
      km: fuel.km,
      litros: fuel.litros,
      valor_unit: fuel.valor_unit,
      valor_total: fuel.valor_total,
    };
    setFuelDrafts(list=>[...list, {...item, _id: crypto.randomUUID()}]);
    setFuel({vehicle_id:"",driver_id:"",placa:"",data:"",km:"",litros:"",valor_unit:"",valor_total:"",combustivel:"Gasolina",posto:"",nota_fiscal:""});
  };

  const removeFuelDraft = (_id) => {
    setFuelDrafts(list => list.filter(x=>x._id!==_id));
  };

  const sendOneFuelDraft = async (draft) => {
    await post("/api/fleet/fuel-logs", {
      ...draft,
      data: toISO(draft.data),
      km: parseNum(draft.km),
      litros: parseNum(draft.litros),
      valor_unit: parseNum(draft.valor_unit),
      valor_total: parseNum(draft.valor_total),
    }, [fuels.reload]);
    removeFuelDraft(draft._id);
  };

  const sendAllFuelDrafts = async () => {
    for(const d of fuelDrafts){
      await sendOneFuelDraft(d);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Frota</CardTitle></CardHeader>
      <CardContent>
        {/* Tabs não-controladas para não perder foco nos inputs */}
        <Tabs defaultValue="abastecimentos">
          <TabsList className="flex flex-wrap gap-2">
            {["veiculos","motoristas","vinculos","abastecimentos","km","limpeza","fotos","ocorrencias","dashboard"].map(t=>
              <TabsTrigger key={t} value={t} className="capitalize">{t}</TabsTrigger>
            )}
          </TabsList>

          {/* Veículos */}
          <TabsContent value="veiculos">
            <InputGrid>
              <Input autoComplete="off" placeholder="Placa" value={veh.placa} onChange={e=>setVeh(s=>({...s,placa:e.target.value}))}/>
              <Input autoComplete="off" placeholder="Modelo" value={veh.modelo} onChange={e=>setVeh(s=>({...s,modelo:e.target.value}))}/>
              <Input autoComplete="off" placeholder="Marca" value={veh.marca} onChange={e=>setVeh(s=>({...s,marca:e.target.value}))}/>
              <Input autoComplete="off" placeholder="Ano" value={veh.ano} onChange={e=>setVeh(s=>({...s,ano:e.target.value}))}/>
              <Button type="button" onClick={()=>post("/api/fleet/vehicles",veh,[vehicles.reload]).then(()=>setVeh({placa:"",modelo:"",marca:"",ano:""}))}>Salvar</Button>
            </InputGrid>
            <div className="mt-4 overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Placa</TableHead><TableHead>Modelo</TableHead><TableHead>Marca</TableHead><TableHead>Ano</TableHead></TableRow></TableHeader>
                <TableBody>{vehicles.data.map(v=><TableRow key={v.id}><TableCell>{v.placa}</TableCell><TableCell>{v.modelo}</TableCell><TableCell>{v.marca}</TableCell><TableCell>{v.ano}</TableCell></TableRow>)}</TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Motoristas */}
          <TabsContent value="motoristas">
            <InputGrid cols="md:grid-cols-4">
              <Input autoComplete="off" placeholder="Nome" value={drv.nome} onChange={e=>setDrv(s=>({...s,nome:e.target.value}))}/>
              <Input autoComplete="off" placeholder="Documento" value={drv.documento} onChange={e=>setDrv(s=>({...s,documento:e.target.value}))}/>
              <div />
              <Button type="button" onClick={()=>post("/api/fleet/drivers",drv,[drivers.reload]).then(()=>setDrv({nome:"",documento:""}))}>Salvar</Button>
            </InputGrid>
            <div className="mt-4 overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Documento</TableHead></TableRow></TableHeader>
                <TableBody>{drivers.data.map(d=><TableRow key={d.id}><TableCell>{d.nome}</TableCell><TableCell>{d.documento}</TableCell></TableRow>)}</TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Vínculos */}
          <TabsContent value="vinculos">
            <InputGrid cols="md:grid-cols-7">
              <select className="border rounded-xl px-3 py-2" value={vinc.vehicle_id} onChange={e=>setVinc(s=>({...s,vehicle_id:e.target.value}))}>
                <option value="">Veículo...</option>{vehicles.data.map(v=><option key={v.id} value={v.id}>{v.placa} - {v.modelo}</option>)}
              </select>
              <select className="border rounded-xl px-3 py-2" value={vinc.driver_id} onChange={e=>setVinc(s=>({...s,driver_id:e.target.value}))}>
                <option value="">Motorista...</option>{drivers.data.map(d=><option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
              <Input autoComplete="off" placeholder="Placa (texto livre)" value={vinc.placa} onChange={e=>setVinc(s=>({...s,placa:e.target.value}))}/>
              <Input autoComplete="off" placeholder="dd/mm/aaaa" value={vinc.inicio} onChange={e=>setVinc(s=>({...s,inicio:e.target.value}))}/>
              <Input autoComplete="off" placeholder="dd/mm/aaaa" value={vinc.fim} onChange={e=>setVinc(s=>({...s,fim:e.target.value}))}/>
              <Input autoComplete="off" placeholder="Observação" value={vinc.observacao} onChange={e=>setVinc(s=>({...s,observacao:e.target.value}))}/>
              <Button type="button" onClick={()=>post("/api/fleet/assignments",{...vinc, inicio: toISO(vinc.inicio), fim: vinc.fim?toISO(vinc.fim):null},[asg.reload]).then(()=>setVinc({vehicle_id:"",driver_id:"",placa:"",inicio:"",fim:"",observacao:""}))}>Salvar</Button>
            </InputGrid>
            <div className="mt-4 overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Veículo</TableHead><TableHead>Motorista</TableHead><TableHead>Placa</TableHead><TableHead>Início</TableHead><TableHead>Fim</TableHead></TableRow></TableHeader>
                <TableBody>{asg.data.map(a=><TableRow key={a.id}><TableCell>{a.vehicle_id}</TableCell><TableCell>{a.driver_id}</TableCell><TableCell>{a.placa}</TableCell><TableCell>{toBR(a.inicio||a["início"])}</TableCell><TableCell>{a.fim?toBR(a.fim):"-"}</TableCell></TableRow>)}</TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Abastecimentos (com rascunhos de controle) */}
          <TabsContent value="abastecimentos">
            <InputGrid cols="md:grid-cols-11">
              <select className="border rounded-xl px-3 py-2" value={fuel.vehicle_id} onChange={e=>setFuel(s=>({...s,vehicle_id:e.target.value}))}>
                <option value="">Veículo...</option>{vehicles.data.map(v=><option key={v.id} value={v.id}>{v.placa} - {v.modelo}</option>)}
              </select>
              <select className="border rounded-xl px-3 py-2" value={fuel.driver_id} onChange={e=>setFuel(s=>({...s,driver_id:e.target.value}))}>
                <option value="">Motorista...</option>{drivers.data.map(d=><option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
              <Input autoComplete="off" placeholder="Placa" value={fuel.placa} onChange={e=>setFuel(s=>({...s,placa:e.target.value}))}/>
              <Input autoComplete="off" placeholder="dd/mm/aaaa" value={fuel.data} onChange={e=>setFuel(s=>({...s,data:e.target.value}))}/>
              <Input autoComplete="off" placeholder="KM" value={fuel.km} onChange={e=>setFuel(s=>({...s,km:e.target.value}))}/>
              <Input autoComplete="off" placeholder="Litros" value={fuel.litros} onChange={e=>setFuel(s=>({...s,litros:e.target.value}))}/>
              <Input autoComplete="off" placeholder="Valor Unit." value={fuel.valor_unit} onChange={e=>setFuel(s=>({...s,valor_unit:e.target.value}))}/>
              <Input autoComplete="off" placeholder="Valor Total" value={fuel.valor_total} onChange={e=>setFuel(s=>({...s,valor_total:e.target.value}))}/>
              <select className="border rounded-xl px-3 py-2" value={fuel.combustivel} onChange={e=>setFuel(s=>({...s,combustivel:e.target.value}))}>
                <option>Gasolina</option><option>Etanol</option><option>Diesel</option>
              </select>
              <Input autoComplete="off" placeholder="Posto" value={fuel.posto} onChange={e=>setFuel(s=>({...s,posto:e.target.value}))}/>
              <Input autoComplete="off" placeholder="NF-e" value={fuel.nota_fiscal} onChange={e=>setFuel(s=>({...s,nota_fiscal:e.target.value}))}/>
              {/* Botões: adicionar à lista (controle) e salvar direto */}
              <div className="flex items-center gap-2">
                <Button type="button" onClick={addFuelDraft}>Adicionar à lista</Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={()=>
                    post("/api/fleet/fuel-logs",{
                      ...fuel,
                      data: toISO(fuel.data),
                      km: parseNum(fuel.km),
                      litros: parseNum(fuel.litros),
                      valor_unit: parseNum(fuel.valor_unit),
                      valor_total: parseNum(fuel.valor_total),
                    },[fuels.reload]).then(()=>setFuel({vehicle_id:"",driver_id:"",placa:"",data:"",km:"",litros:"",valor_unit:"",valor_total:"",combustivel:"Gasolina",posto:"",nota_fiscal:""}))
                  }
                >
                  Salvar direto
                </Button>
              </div>
            </InputGrid>

            {/* Tabela de RASCUNHOS para controle */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">Rascunhos de Abastecimentos</div>
                <div className="flex gap-2">
                  <Button type="button" onClick={sendAllFuelDrafts} disabled={!fuelDrafts.length}>Enviar todos</Button>
                </div>
              </div>
              <div className="overflow-auto border rounded-xl">
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
                      <TableHead className="w-[160px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fuelDrafts.length===0 ? (
                      <TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground">Nenhum rascunho adicionado.</TableCell></TableRow>
                    ) : fuelDrafts.map(item=>(
                      <TableRow key={item._id}>
                        <TableCell>{item.data}</TableCell>
                        <TableCell>{item.placa}</TableCell>
                        <TableCell>{item.km}</TableCell>
                        <TableCell>{item.litros}</TableCell>
                        <TableCell>{item.valor_unit}</TableCell>
                        <TableCell>{item.valor_total}</TableCell>
                        <TableCell>{item.combustivel}</TableCell>
                        <TableCell>{item.posto}</TableCell>
                        <TableCell>{item.nota_fiscal}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button type="button" onClick={()=>sendOneFuelDraft(item)}>Enviar</Button>
                            <Button type="button" variant="destructive" onClick={()=>removeFuelDraft(item._id)}>Remover</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Tabela oficial (já existente) */}
            <div className="mt-8 overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Placa</TableHead><TableHead>KM</TableHead><TableHead>Litros</TableHead><TableHead>Comb.</TableHead><TableHead>Posto</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
                <TableBody>{fuels.data.map(f=><TableRow key={f.id}><TableCell>{toBR(f.data)}</TableCell><TableCell>{f.placa}</TableCell><TableCell>{f.km}</TableCell><TableCell>{f.litros}</TableCell><TableCell>{f.combustivel}</TableCell><TableCell>{f.posto}</TableCell><TableCell>{BRL(f.valor_total)}</TableCell></TableRow>)}</TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* KM */}
          <TabsContent value="km">
            <InputGrid cols="md:grid-cols-8">
              <Input autoComplete="off" placeholder="ID Veículo" value={kmf.vehicle_id} onChange={e=>setKmf(s=>({...s,vehicle_id:e.target.value}))}/>
              <Input autoComplete="off" placeholder="Placa" value={kmf.placa} onChange={e=>setKmf(s=>({...s,placa:e.target.value}))}/>
              <Input autoComplete="off" placeholder="dd/mm/aaaa" value={kmf.data} onChange={e=>setKmf(s=>({...s,data:e.target.value}))}/>
              <Input autoComplete="off" placeholder="KM" value={kmf.km} onChange={e=>setKmf(s=>({...s,km:e.target.value}))}/>
              <select className="border rounded-xl px-3 py-2" value={kmf.tipo} onChange={e=>setKmf(s=>({...s,tipo:e.target.value}))}>
                <option value="leitura">Leitura</option><option value="trajeto">Trajeto</option>
              </select>
              <Input autoComplete="off" placeholder="Origem" value={kmf.origem} onChange={e=>setKmf(s=>({...s,origem:e.target.value}))}/>
              <Input autoComplete="off" placeholder="Destino" value={kmf.destino} onChange={e=>setKmf(s=>({...s,destino:e.target.value}))}/>
              <Input autoComplete="off" placeholder="Observação" value={kmf.observacao} onChange={e=>setKmf(s=>({...s,observacao:e.target.value}))}/>
              <Button type="button" onClick={()=>post("/api/fleet/km-logs",{...kmf, data: toISO(kmf.data), km: parseNum(kmf.km)},[kms.reload]).then(()=>setKmf({vehicle_id:"",placa:"",data:"",km:"",tipo:"leitura",origem:"",destino:"",observacao:""}))}>Salvar</Button>
            </InputGrid>
            <div className="mt-4 overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Placa</TableHead><TableHead>Tipo</TableHead><TableHead>KM</TableHead><TableHead>Origem→Destino</TableHead></TableRow></TableHeader>
                <TableBody>{kms.data.map(k=><TableRow key={k.id}><TableCell>{toBR(k.data)}</TableCell><TableCell>{k.placa}</TableCell><TableCell>{k.tipo}</TableCell><TableCell>{k.km}</TableCell><TableCell>{k.origem} → {k.destino}</TableCell></TableRow>)}</TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Limpeza */}
          <TabsContent value="limpeza">
            <InputGrid cols="md:grid-cols-7">
              <Input autoComplete="off" placeholder="ID Veículo" value={clf.vehicle_id} onChange={e=>setClf(s=>({...s,vehicle_id:e.target.value}))}/>
              <Input autoComplete="off" placeholder="Placa" value={clf.placa} onChange={e=>setClf(s=>({...s,placa:e.target.value}))}/>
              <Input autoComplete="off" placeholder="dd/mm/aaaa" value={clf.data} onChange={e=>setClf(s=>({...s,data:e.target.value}))}/>
              <select className="border rounded-xl px-3 py-2" value={clf.tipo} onChange={e=>setClf(s=>({...s,tipo:e.target.value}))}>
                <option>Lavagem Completa</option><option>Interna</option><option>Externa</option><option>Higienização</option>
              </select>
              <Input autoComplete="off" placeholder="Valor" value={clf.valor} onChange={e=>setClf(s=>({...s,valor:e.target.value}))}/>
              <Input autoComplete="off" placeholder="Local" value={clf.local} onChange={e=>setClf(s=>({...s,local:e.target.value}))}/>
              <Input autoComplete="off" placeholder="Observação" value={clf.observacao} onChange={e=>setClf(s=>({...s,observacao:e.target.value}))}/>
              <Button type="button" onClick={()=>post("/api/fleet/cleanings",{...clf, data: toISO(clf.data), valor: parseNum(clf.valor)},[clean.reload]).then(()=>setClf({vehicle_id:"",placa:"",data:"",tipo:"Lavagem Completa",valor:"",local:"",observacao:""}))}>Salvar</Button>
            </InputGrid>
            <div className="mt-4 overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Placa</TableHead><TableHead>Tipo</TableHead><TableHead>Valor</TableHead><TableHead>Local</TableHead></TableRow></TableHeader>
                <TableBody>{clean.data.map(c=><TableRow key={c.id}><TableCell>{toBR(c.data)}</TableCell><TableCell>{c.placa}</TableCell><TableCell>{c.tipo}</TableCell><TableCell>{BRL(c.valor)}</TableCell><TableCell>{c.local}</TableCell></TableRow>)}</TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Fotos */}
          <TabsContent value="fotos">
            <InputGrid cols="md:grid-cols-7">
              <Input autoComplete="off" placeholder="ID Veículo" value={phf.vehicle_id} onChange={e=>setPhf(s=>({...s,vehicle_id:e.target.value}))}/>
              <Input autoComplete="off" placeholder="Placa" value={phf.placa} onChange={e=>setPhf(s=>({...s,placa:e.target.value}))}/>
              <Input autoComplete="off" placeholder="dd/mm/aaaa" value={phf.data} onChange={e=>setPhf(s=>({...s,data:e.target.value}))}/>
              <select className="border rounded-xl px-3 py-2" value={phf.tipo} onChange={e=>setPhf(s=>({...s,tipo:e.target.value}))}>
                <option>Interior</option><option>Exterior</option>
              </select>
              <Input autoComplete="off" placeholder="URL da foto (Blob)" value={phf.url} onChange={e=>setPhf(s=>({...s,url:e.target.value}))}/>
              <Input autoComplete="off" placeholder="Observação" value={phf.observacao} onChange={e=>setPhf(s=>({...s,observacao:e.target.value}))}/>
              <Button type="button" onClick={()=>post("/api/fleet/photos",{...phf, data: toISO(phf.data)},[photos.reload]).then(()=>setPhf({vehicle_id:"",placa:"",data:"",tipo:"Interior",url:"",observacao:""}))}>Salvar</Button>
            </InputGrid>
            <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {photos.data.map(p=>(
                <a key={p.id} href={p.url} target="_blank" className="border rounded-xl overflow-hidden">
                  <img src={p.url} alt={`${p.tipo} ${p.placa}`} className="w-full h-40 object-cover"/>
                  <div className="p-2 text-xs">{toBR(p.data)} • {p.tipo} • {p.placa}</div>
                </a>
              ))}
            </div>
          </TabsContent>

          {/* Ocorrências */}
          <TabsContent value="ocorrencias">
            <InputGrid cols="md:grid-cols-7">
              <Input autoComplete="off" placeholder="ID Veículo" value={ocf.vehicle_id} onChange={e=>setOcf(s=>({...s,vehicle_id:e.target.value}))}/>
              <Input autoComplete="off" placeholder="Placa" value={ocf.placa} onChange={e=>setOcf(s=>({...s,placa:e.target.value}))}/>
              <Input autoComplete="off" placeholder="dd/mm/aaaa" value={ocf.data} onChange={e=>setOcf(s=>({...s,data:e.target.value}))}/>
              <select className="border rounded-xl px-3 py-2" value={ocf.tipo} onChange={e=>setOcf(s=>({...s,tipo:e.target.value}))}>
                <option>Multa</option><option>Furo de Pneu</option><option>Batida</option><option>Quebra</option><option>Outro</option>
              </select>
              <Input autoComplete="off" placeholder="Valor Estimado" value={ocf.valor_estimado} onChange={e=>setOcf(s=>({...s,valor_estimado:e.target.value}))}/>
              <Input autoComplete="off" placeholder="Responsável" value={ocf.responsavel} onChange={e=>setOcf(s=>({...s,responsavel:e.target.value}))}/>
              <Input autoComplete="off" placeholder="Descrição" value={ocf.descricao} onChange={e=>setOcf(s=>({...s,descricao:e.target.value}))}/>
              <Button type="button" onClick={()=>post("/api/fleet/occurrences",{...ocf, data: toISO(ocf.data), valor_estimado: parseNum(ocf.valor_estimado)},[occ.reload]).then(()=>setOcf({vehicle_id:"",placa:"",data:"",tipo:"Multa",descricao:"",valor_estimado:"",responsavel:""}))}>Salvar</Button>
            </InputGrid>
            <div className="mt-4 overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Placa</TableHead><TableHead>Tipo</TableHead><TableHead>Valor</TableHead><TableHead>Resp.</TableHead><TableHead>Descrição</TableHead></TableRow></TableHeader>
                <TableBody>{occ.data.map(o=><TableRow key={o.id}><TableCell>{toBR(o.data)}</TableCell><TableCell>{o.placa}</TableCell><TableCell>{o.tipo}</TableCell><TableCell>{BRL(o.valor_estimado)}</TableCell><TableCell>{o.responsavel}</TableCell><TableCell>{o.descricao}</TableCell></TableRow>)}</TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Dashboard */}
          <TabsContent value="dashboard">
            <FleetKPI/>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function FleetKPI(){
  const [kpi,setKpi]=useState(null);
  useEffect(()=>{(async()=>{ const r=await api.get("/api/fleet/dashboard"); setKpi(r.data?.kpis||null); })()},[]);
  if(!kpi) return <div className="text-sm text-muted-foreground">Carregando...</div>;
  const Item=({label,value})=>(
    <div className="p-3 rounded-xl border">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
  return (
    <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-3">
      <Item label="Gasto Combustível" value={(kpi.gasto_combustivel||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}/>
      <Item label="Litros" value={kpi.litros}/>
      <Item label="Abastecimentos" value={kpi.abastecimentos}/>
      <Item label="Ocorrências" value={kpi.ocorrencias}/>
      <Item label="Limpezas" value={kpi.limpezas}/>
      <Item label="KM Trajetos" value={kpi.km_total_trajetos}/>
    </div>
  );
}
