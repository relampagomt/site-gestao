// frontend/src/components/fleet/VehiclesManager.jsx
import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";

const emptyVeh = { placa: "", modelo: "", marca: "", ano: "", ativo: true };

export default function VehiclesManager({ onCreated, onUpdated, onDeleted, trigger }) {
  const [open, setOpen] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(emptyVeh);
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    const { data } = await api.get("/fleet/vehicles");
    setVehicles(Array.isArray(data) ? data : []);
  };

  useEffect(() => { if (open) load(); }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (editingId) {
      const { data } = await api.put(`/fleet/vehicles/${editingId}`, form);
      onUpdated?.(data);
    } else {
      const { data } = await api.post("/fleet/vehicles", form);
      onCreated?.(data);
    }
    setForm(emptyVeh);
    setEditingId(null);
    await load();
  };

  const edit = (v) => {
    setEditingId(v.id);
    setForm({
      placa: v.placa || "",
      modelo: v.modelo || "",
      marca: v.marca || "",
      ano: v.ano || "",
      ativo: v.ativo !== false,
    });
  };

  const del = async (v) => {
    if (!confirm(`Excluir o veículo ${v.placa}?`)) return;
    await api.delete(`/fleet/vehicles/${v.id}`);
    onDeleted?.(v);
    await load();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button type="button" variant="secondary">Gerenciar veículos</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Veículos</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="grid grid-cols-6 gap-2 mb-4">
          <Input className="col-span-2" placeholder="Placa" value={form.placa}
                 onChange={(e)=>setForm(p=>({...p, placa: e.target.value.toUpperCase()}))} required />
          <Input className="col-span-2" placeholder="Modelo" value={form.modelo}
                 onChange={(e)=>setForm(p=>({...p, modelo: e.target.value}))} />
          <Input className="col-span-1" placeholder="Marca" value={form.marca}
                 onChange={(e)=>setForm(p=>({...p, marca: e.target.value}))} />
          <Input className="col-span-1" placeholder="Ano" value={form.ano}
                 onChange={(e)=>setForm(p=>({...p, ano: e.target.value}))} />
          <div className="col-span-6 flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.ativo}
                     onChange={(e)=>setForm(p=>({...p, ativo: e.target.checked}))} />
              Ativo
            </label>
            <Button type="submit">{editingId ? "Salvar alterações" : "Adicionar veículo"}</Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={()=>{ setEditingId(null); setForm(emptyVeh); }}>
                Cancelar edição
              </Button>
            )}
          </div>
        </form>

        <div className="overflow-auto">
          <Table className="min-w-full text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Placa</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Ano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map(v=>(
                <tr key={v.id} className="border-t">
                  <TableCell>{v.placa}</TableCell>
                  <TableCell>{v.modelo}</TableCell>
                  <TableCell>{v.marca}</TableCell>
                  <TableCell>{v.ano}</TableCell>
                  <TableCell>{v.ativo !== false ? "Ativo" : "Inativo"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="secondary" className="mr-2" onClick={()=>edit(v)}>Editar</Button>
                    <Button variant="destructive" onClick={()=>del(v)}>Excluir</Button>
                  </TableCell>
                </tr>
              ))}
              {vehicles.length === 0 && (
                <tr><TableCell colSpan={6} className="text-sm text-muted-foreground">Nenhum veículo cadastrado.</TableCell></tr>
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={()=>setOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
