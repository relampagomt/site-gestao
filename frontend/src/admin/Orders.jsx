// frontend/src/admin/Orders.jsx
import React from "react";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { toISO, toBR } from "@/utils/dateBR";

const BRL = (n)=> (Number(n||0)).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const parseNum=(v)=>{ if(v==null||v==="") return 0; const s=String(v).replace(/\./g,'').replace(',','.'); const n=Number(s); return Number.isFinite(n)?n:0; };

const useLoad=(url)=>{const [data,setData]=React.useState([]); const reload=async()=>{const r=await api.get(url); setData(r.data||[])}; React.useEffect(()=>{reload()},[url]); return {data,reload};};

export default function Orders(){
  const clients = useLoad("/api/commercial/clients");
  const orders  = useLoad("/api/commercial/orders");

  const [os,setOs]=React.useState({client_id:"", titulo:"Ordem de Serviço", descricao:"", data:"", itens:[]});
  const [it,setIt]=React.useState({tipo:"ação", nome:"", quantidade:"1", valor_unit:""});

  const addItem=()=>{ setOs(s=>({...s, itens:[...s.itens, {tipo: it.tipo, nome: it.nome, quantidade: parseNum(it.quantidade), valor_unit: parseNum(it.valor_unit)}]})); setIt({tipo:"ação",nome:"",quantidade:"1",valor_unit:""}); };
  const total = os.itens.reduce((acc,i)=>acc+(i.quantidade*i.valor_unit),0);

  const save = async()=>{ await api.post("/api/commercial/orders",{...os, data: toISO(os.data)}); setOs({client_id:"", titulo:"Ordem de Serviço", descricao:"", data:"", itens:[]}); orders.reload(); };

  return (
    <Card>
      <CardHeader><CardTitle>Ordens de Serviço</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-4 gap-3">
          <select className="border rounded-xl px-3 py-2" value={os.client_id} onChange={e=>setOs(s=>({...s,client_id: Number(e.target.value)}))}>
            <option value="">Cliente...</option>{clients.data.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <Input placeholder="Título" value={os.titulo} onChange={e=>setOs(s=>({...s,titulo:e.target.value}))}/>
          <Input placeholder="dd/mm/aaaa" value={os.data} onChange={e=>setOs(s=>({...s,data:e.target.value}))}/>
          <Input placeholder="Descrição" value={os.descricao} onChange={e=>setOs(s=>({...s,descricao:e.target.value}))}/>
        </div>

        <div className="bg-muted/40 rounded-xl p-3">
          <div className="grid md:grid-cols-5 gap-2">
            <select className="border rounded-xl px-3 py-2" value={it.tipo} onChange={e=>setIt(s=>({...s,tipo:e.target.value}))}><option value="ação">Ação</option><option value="material">Material</option></select>
            <Input placeholder="Nome do item" value={it.nome} onChange={e=>setIt(s=>({...s,nome:e.target.value}))}/>
            <Input placeholder="Qtd" value={it.quantidade} onChange={e=>setIt(s=>({...s,quantidade:e.target.value}))}/>
            <Input placeholder="Valor Unit." value={it.valor_unit} onChange={e=>setIt(s=>({...s,valor_unit:e.target.value}))}/>
            <Button onClick={addItem}>Adicionar</Button>
          </div>

          {os.itens.length>0 && (
            <div className="mt-3 overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Nome</TableHead><TableHead>Qtd</TableHead><TableHead>V.Unit</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
                <TableBody>{os.itens.map((i,idx)=><TableRow key={idx}><TableCell>{i.tipo}</TableCell><TableCell>{i.nome}</TableCell><TableCell>{i.quantidade}</TableCell><TableCell>{BRL(i.valor_unit)}</TableCell><TableCell>{BRL(i.quantidade*i.valor_unit)}</TableCell></TableRow>)}</TableBody>
              </Table>
            </div>
          )}

          <div className="text-right font-semibold mt-2">Total: {BRL(total)}</div>
        </div>

        <div><Button onClick={save}>Salvar OS</Button></div>

        <div className="overflow-auto">
          <Table>
            <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Cliente</TableHead><TableHead>Título</TableHead><TableHead>Data</TableHead><TableHead>Itens</TableHead><TableHead>Valor Total</TableHead></TableRow></TableHeader>
            <TableBody>
              {orders.data.map(o=><TableRow key={o.id}><TableCell>{o.id}</TableCell><TableCell>{o.client_id}</TableCell><TableCell>{o.titulo}</TableCell><TableCell>{toBR(o.data)}</TableCell><TableCell>{o.itens?.length||0}</TableCell><TableCell>{BRL(o.valor_total)}</TableCell></TableRow>)}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
