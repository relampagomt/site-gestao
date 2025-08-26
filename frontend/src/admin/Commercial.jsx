// frontend/src/admin/Commercial.jsx
import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";

/**
 * IMPORTANTE:
 * - O axios `api` já tem baseURL `/api`. Portanto use caminhos RELATIVOS `/commercial/...`.
 */

const useLoad=(path)=>{
  const [data,setData]=useState([]);
  const reload=async()=>{ const {data}=await api.get(path); setData(data||[]); };
  useEffect(()=>{ reload(); },[path]);
  return {data,reload};
};

export default function Commercial(){
  const [tab,setTab] = useState("records");

  const clients = useLoad("/commercial/clients");
  const records = useLoad("/commercial/records");
  const orders  = useLoad("/commercial/orders");

  const [recForm, setRecForm] = useState({ name:"", company:"", phone:"", stage:"Novo", value:"", source:"", notes:"" });
  const [ordForm, setOrdForm] = useState({ cliente:"", titulo:"", descricao:"", status:"Aberta", data:"", itens:[], valor_total:"" });

  const [recEditId, setRecEditId] = useState(null);
  const [ordEditId, setOrdEditId] = useState(null);

  const onRec=(e)=>{ const {name,value}=e.target; setRecForm(p=>({...p,[name]:value})); };
  const onOrd=(e)=>{ const {name,value}=e.target; setOrdForm(p=>({...p,[name]:value})); };

  const submitRecord=async(e)=>{
    e.preventDefault();
    const method = recEditId ? "put" : "post";
    const url    = recEditId ? `/commercial/records/${recEditId}` : `/commercial/records`;
    await api[method](url, recForm);
    setRecForm({ name:"", company:"", phone:"", stage:"Novo", value:"", source:"", notes:"" });
    setRecEditId(null);
    records.reload();
  };

  const addItem=()=>{
    const descricao = prompt("Descrição do item:");
    if(!descricao) return;
    const quantidade = Number(prompt("Quantidade:") || "1");
    const valor_unit = Number((prompt("Valor unitário:") || "0").replace(",", "."));
    setOrdForm(p=>({...p, itens:[...(p.itens||[]), {descricao, quantidade:isNaN(quantidade)?1:quantidade, valor_unit:isNaN(valor_unit)?0:valor_unit}]}));
  };
  const rmItem=(idx)=> setOrdForm(p=>({...p, itens: p.itens.filter((_,i)=>i!==idx)}));
  const total = (ordForm.itens||[]).reduce((acc,i)=> acc + Number(i.quantidade||0)*Number(i.valor_unit||0), 0).toFixed(2);

  useEffect(()=>{ setOrdForm(p=>({...p, valor_total: total})); }, [JSON.stringify(ordForm.itens)]);

  const submitOrder=async(e)=>{
    e.preventDefault();
    const method = ordEditId ? "put" : "post";
    const url    = ordEditId ? `/commercial/orders/${ordEditId}` : `/commercial/orders`;
    await api[method](url, ordForm);
    setOrdForm({ cliente:"", titulo:"", descricao:"", status:"Aberta", data:"", itens:[], valor_total:"" });
    setOrdEditId(null);
    orders.reload();
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Comercial</h1>

      <div className="flex gap-2 mb-4">
        <Button onClick={()=>setTab("records")} variant={tab==="records"?"default":"secondary"}>Registros</Button>
        <Button onClick={()=>setTab("orders")} variant={tab==="orders"?"default":"secondary"}>Ordens</Button>
      </div>

      {tab==="records" ? (
        <section className="grid md:grid-cols-4 gap-3">
          <Card className="md:col-span-1">
            <CardHeader><CardTitle>Novo Registro</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={submitRecord} className="grid gap-2">
                <Input name="name" value={recForm.name} onChange={onRec} placeholder="Nome" required />
                <Input name="company" value={recForm.company} onChange={onRec} placeholder="Empresa" />
                <Input name="phone" value={recForm.phone} onChange={onRec} placeholder="Telefone" />
                <select name="stage" value={recForm.stage} onChange={onRec} className="border rounded px-3 py-2">
                  <option>Novo</option>
                  <option>Contato</option>
                  <option>Proposta</option>
                  <option>Fechado</option>
                  <option>Perdido</option>
                </select>
                <Input name="value" value={recForm.value} onChange={onRec} placeholder="Valor (opcional)" />
                <Input name="source" value={recForm.source} onChange={onRec} placeholder="Origem" />
                <Textarea name="notes" value={recForm.notes} onChange={onRec} placeholder="Notas" />
                <Button type="submit">{recEditId? "Salvar":"Adicionar"}</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="md:col-span-3">
            <CardHeader><CardTitle>Registros</CardTitle></CardHeader>
            <CardContent className="overflow-auto">
              <Table className="min-w-full text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Estágio</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(records.data||[]).map(r=>(
                    <tr key={r.id} className="border-t">
                      <TableCell>{r.name}</TableCell>
                      <TableCell>{r.company}</TableCell>
                      <TableCell>{r.phone}</TableCell>
                      <TableCell>{r.stage}</TableCell>
                      <TableCell>{r.value}</TableCell>
                      <TableCell>{r.source}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="secondary" onClick={()=>{ setRecEditId(r.id); setRecForm({ name:r.name||"", company:r.company||"", phone:r.phone||"", stage:r.stage||"Novo", value:r.value||"", source:r.source||"", notes:r.notes||"" }); }} className="mr-2">Editar</Button>
                        <Button variant="destructive" onClick={async()=>{ await api.delete(`/commercial/records/${r.id}`); records.reload(); }}>Excluir</Button>
                      </TableCell>
                    </tr>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      ) : (
        <section className="grid md:grid-cols-4 gap-3">
          <Card className="md:col-span-1">
            <CardHeader><CardTitle>Nova Ordem</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={submitOrder} className="grid gap-2">
                <Input name="cliente" value={ordForm.cliente} onChange={onOrd} placeholder="Cliente" required />
                <Input name="titulo" value={ordForm.titulo} onChange={onOrd} placeholder="Título" />
                <Input name="data" value={ordForm.data} onChange={onOrd} placeholder="Data (YYYY-MM-DD)" />
                <select name="status" value={ordForm.status} onChange={onOrd} className="border rounded px-3 py-2">
                  <option>Aberta</option>
                  <option>Em Andamento</option>
                  <option>Concluída</option>
                  <option>Cancelada</option>
                </select>
                <Textarea name="descricao" value={ordForm.descricao} onChange={onOrd} placeholder="Descrição" />
                <div className="border rounded p-2">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium">Itens</div>
                    <Button type="button" onClick={addItem}>+ Item</Button>
                  </div>
                  {(ordForm.itens||[]).map((i,idx)=>(
                    <div key={idx} className="flex items-center justify-between text-sm border rounded p-1 mb-1">
                      <div>{i.descricao} — {i.quantidade} × R${Number(i.valor_unit||0).toFixed(2)}</div>
                      <Button type="button" variant="destructive" onClick={()=>rmItem(idx)}>x</Button>
                    </div>
                  ))}
                </div>
                <div className="text-right font-semibold">Total: R$ {Number(ordForm.valor_total||0).toFixed(2)}</div>
                <Button type="submit">{ordEditId? "Salvar":"Adicionar"}</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="md:col-span-3">
            <CardHeader><CardTitle>Ordens</CardTitle></CardHeader>
            <CardContent className="overflow-auto">
              <Table className="min-w-full text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(orders.data||[]).map(o=>(
                    <tr key={o.id} className="border-t">
                      <TableCell>{o.data}</TableCell>
                      <TableCell>{o.cliente}</TableCell>
                      <TableCell>{o.titulo}</TableCell>
                      <TableCell>{o.status}</TableCell>
                      <TableCell>R$ {Number(o.valor_total||0).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="secondary" onClick={()=>{ setOrdEditId(o.id); setOrdForm({ cliente:o.cliente||"", titulo:o.titulo||"", descricao:o.descricao||"", status:o.status||"Aberta", data:o.data||"", itens:o.itens||[], valor_total:o.valor_total||"" }); }} className="mr-2">Editar</Button>
                        <Button variant="destructive" onClick={async()=>{ await api.delete(`/commercial/orders/${o.id}`); orders.reload(); }}>Excluir</Button>
                      </TableCell>
                    </tr>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
