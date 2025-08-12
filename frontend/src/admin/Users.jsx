// frontend/src/admin/Users.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog.jsx";
import { Select } from "@/components/ui/select.jsx";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import api from "@/services/api";
import ScrollableDialogContent from "@/components/ScrollableDialogContent.jsx";

const ROLES = ["admin","manager","viewer"];

export default function Users() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create");
  const [saving, setSaving] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);

  const empty = { id: null, username: "", email: "", name: "", role: "viewer", active: true, password: "" };
  const [form, setForm] = useState(empty);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/users");
      setItems(Array.isArray(data) ? data : data?.items ?? []);
    } catch (e) {
      console.error("Erro ao carregar usuários:", e);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === "checkbox" ? !!checked : value }));
  }

  function openCreate() {
    setMode("create");
    setForm(empty);
    setOpen(true);
  }
  function openEdit(row) {
    setMode("edit");
    setForm({
      id: row.id ?? row._id ?? row.uuid ?? null,
      username: row.username ?? "",
      email: row.email ?? "",
      name: row.name ?? "",
      role: row.role ?? "viewer",
      active: row.active ?? true,
      password: "",
    });
    setOpen(true);
  }
  function confirmDelete(row) {
    setRowToDelete(row);
    setOpenDelete(true);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        username: form.username,
        email: form.email,
        name: form.name,
        role: form.role,
        active: !!form.active,
        ...(form.password ? { password: form.password } : {}),
      };
      if (mode === "create") await api.post("/users", payload);
      else {
        const id = form.id;
        if (!id) throw new Error("Sem ID para edição");
        await api.put(`/users/${id}`, payload);
      }
      setOpen(false);
      setForm(empty);
      load();
    } catch (err) {
      console.error("Erro ao salvar usuário:", err);
      alert("Erro ao salvar usuário.");
    } finally { setSaving(false); }
  }

  async function onDelete() {
    if (!rowToDelete) return;
    setDeleting(true);
    try {
      const id = rowToDelete.id ?? rowToDelete._id ?? rowToDelete.uuid;
      if (!id) throw new Error("Sem ID para exclusão");
      await api.delete(`/users/${id}`);
      setOpenDelete(false);
      setRowToDelete(null);
      load();
    } catch (err) {
      console.error("Erro ao excluir:", err);
      alert("Erro ao excluir.");
    } finally { setDeleting(false); }
  }

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return items;
    return items.filter(u =>
      [u.username, u.email, u.name, u.role]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(k))
    );
  }, [items, q]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">Administração de Usuários</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreate}><Plus className="size-4" />Novo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl p-0">
            <ScrollableDialogContent>
              <DialogHeader>
                <DialogTitle>{mode === "create" ? "Novo Usuário" : "Editar Usuário"}</DialogTitle>
                <DialogDescription>Gerencie contas e papéis.</DialogDescription>
              </DialogHeader>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Username</Label>
                    <Input name="username" value={form.username} onChange={onChange} required />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" name="email" value={form.email} onChange={onChange} required />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Nome</Label>
                    <Input name="name" value={form.name} onChange={onChange} required />
                  </div>
                  <div>
                    <Label>Papel</Label>
                    <select
                      name="role"
                      value={form.role}
                      onChange={onChange}
                      className="w-full border rounded-md h-9 px-2 text-sm"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 mt-6">
                    <input type="checkbox" id="active" name="active" checked={!!form.active} onChange={onChange} />
                    <Label htmlFor="active">Ativo</Label>
                  </div>
                  <div className="md:col-span-2">
                    <Label>{mode === "create" ? "Senha" : "Nova senha (opcional)"}</Label>
                    <Input type="password" name="password" value={form.password} onChange={onChange} placeholder="••••••••" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={saving}>{saving ? "Salvando..." : (mode==="create"?"Salvar":"Atualizar")}</Button>
                </div>
              </form>
            </ScrollableDialogContent>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Usuários</CardTitle>
          <CardDescription>Gerencie contas, papéis e status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por nome, email, papel..." value={q} onChange={(e)=>setQ(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6}>Carregando…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6}>Nenhum usuário</TableCell></TableRow>
                ) : (
                  filtered.map(u => (
                    <TableRow key={u.id || u.username}>
                      <TableCell>{u.name || "—"}</TableCell>
                      <TableCell>{u.username || "—"}</TableCell>
                      <TableCell>{u.email || "—"}</TableCell>
                      <TableCell>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{u.role || "viewer"}</span>
                      </TableCell>
                      <TableCell>
                        {u.active ? (
                          <span className="text-green-700 text-xs font-medium">Ativo</span>
                        ) : (
                          <span className="text-red-700 text-xs font-medium">Inativo</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" className="gap-2" onClick={()=>openEdit(u)}>
                            <Edit className="size-4" />Editar
                          </Button>
                          <Button size="sm" variant="destructive" className="gap-2" onClick={()=>confirmDelete(u)}>
                            <Trash2 className="size-4" />Excluir
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog excluir */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir usuário?</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={()=>setOpenDelete(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={onDelete} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
