// frontend/src/admin/Vacancies.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "@/services/api";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
// ▼ Volta o seletor como era antes
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select.jsx";

import { Plus, Search, Edit, Trash2 } from "lucide-react";

const statusOptions = ["Aberta", "Em avaliação", "Fechada"];

const Vacancies = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  // modal (create/edit)
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create");
  const [saving, setSaving] = useState(false);

  // dialog excluir
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);

  const emptyForm = {
    id: null,
    indication_name: "",
    role: "",
    client: "",
    contact: "",
    notes: "",
    status: "Aberta",
  };
  const [form, setForm] = useState(emptyForm);

  async function fetchRows() {
    setLoading(true);
    try {
      const { data } = await api.get("/vacancies");
      setRows(Array.isArray(data) ? data : data?.items ?? []);
    } catch (e) {
      console.error("Erro ao carregar vagas/indicações:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRows();
  }, []);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function openCreate() {
    setMode("create");
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(row) {
    setMode("edit");
    setForm({
      id: row.id ?? row._id ?? row.uuid ?? null,
      indication_name: row.indication_name ?? row.name ?? "",
      role: row.role ?? row.position ?? "",
      client: row.client ?? row.company ?? "",
      contact: row.contact ?? row.phone ?? row.email ?? "",
      notes: row.notes ?? "",
      status: row.status ?? "Aberta",
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
        indication_name: form.indication_name,
        role: form.role,
        client: form.client,
        contact: form.contact,
        notes: form.notes || "",
        status: form.status || "Aberta",
      };

      if (mode === "create") {
        await api.post("/vacancies", payload);
      } else {
        const id = form.id;
        if (!id) throw new Error("ID do registro não encontrado para edição.");
        await api.put(`/vacancies/${id}`, payload);
      }

      setOpen(false);
      setForm(emptyForm);
      fetchRows();
    } catch (err) {
      console.error("Erro ao salvar indicação/vaga:", err);
      alert("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!rowToDelete) return;
    setDeleting(true);
    try {
      const id = rowToDelete.id ?? rowToDelete._id ?? rowToDelete.uuid;
      if (!id) throw new Error("ID do registro não encontrado para exclusão.");
      await api.delete(`/vacancies/${id}`);
      setOpenDelete(false);
      setRowToDelete(null);
      fetchRows();
    } catch (err) {
      console.error("Erro ao excluir:", err);
      alert("Erro ao excluir.");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return rows;
    return rows.filter((r) =>
      [r.indication_name ?? r.name, r.role ?? r.position, r.client ?? r.company, r.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(k))
    );
  }, [rows, q]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">Vagas</h1>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Registros</CardTitle>
          <CardDescription>Indicações e vagas cadastradas</CardDescription>
        </CardHeader>
        <CardContent>
          {/* === Container de filtros + Botão "+ Novo Indicação" === */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Filtrar por nome, cargo, cliente, status..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="admin-btn-primary gap-2 min-h-[36px]" onClick={openCreate}>
                  <Plus className="h-5 w-5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                  <span className="whitespace-nowrap">Novo Indicação</span>
                </Button>
              </DialogTrigger>

              {/* ==== MODAL: inputs/seletores iguais ao padrão anterior ==== */}
              <DialogContent className="max-w-2xl p-0">
                <div className="max-h-[80vh] overflow-y-auto p-6">
                  <DialogHeader className="pb-2">
                    <DialogTitle>{mode === "create" ? "Nova Indicação" : "Editar Indicação"}</DialogTitle>
                    <DialogDescription>
                      {mode === "create" ? "Cadastre uma nova indicação." : "Atualize os dados da indicação."}
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={onSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <Label>Nome (indicado)</Label>
                        <Input
                          name="indication_name"
                          placeholder="Ex.: João da Silva"
                          value={form.indication_name}
                          onChange={onChange}
                          required
                        />
                      </div>

                      <div>
                        <Label>Cargo / Vaga</Label>
                        <Input
                          name="role"
                          placeholder="Ex.: Promotor"
                          value={form.role}
                          onChange={onChange}
                        />
                      </div>

                      <div>
                        <Label>Cliente</Label>
                        <Input
                          name="client"
                          placeholder="Ex.: Empresa XPTO"
                          value={form.client}
                          onChange={onChange}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label>Contato (telefone/e-mail)</Label>
                        <Input
                          name="contact"
                          placeholder="(11) 90000-0000 ou nome@empresa.com"
                          value={form.contact}
                          onChange={onChange}
                        />
                      </div>

                      <div>
                        <Label>Status</Label>
                        <Select
                          value={form.status}
                          onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um status" />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="md:col-span-2">
                        <Label>Observações</Label>
                        <Textarea
                          name="notes"
                          rows={4}
                          placeholder="Alguma observação relevante…"
                          value={form.notes}
                          onChange={onChange}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={saving}>
                        {saving ? "Salvando..." : mode === "create" ? "Salvar" : "Atualizar"}
                      </Button>
                    </div>
                  </form>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5}>Carregando…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5}>Nenhum registro</TableCell></TableRow>
                ) : (
                  filtered.map((r) => {
                    const id = r.id ?? r._id ?? r.uuid;
                    return (
                      <TableRow key={id || `${r.indication_name}-${r.role}-${r.client}`}>
                        <TableCell className="font-medium">{r.indication_name ?? r.name ?? "—"}</TableCell>
                        <TableCell>{r.role ?? r.position ?? "—"}</TableCell>
                        <TableCell>{r.client ?? r.company ?? "—"}</TableCell>
                        <TableCell>{r.status ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="gap-2" onClick={() => openEdit(r)}>
                              <Edit className="size-4" />
                              Editar
                            </Button>
                            <Button size="sm" variant="destructive" className="gap-2" onClick={() => confirmDelete(r)}>
                              <Trash2 className="size-4" />
                              Excluir
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog simples de exclusão */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir indicação?</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpenDelete(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={onDelete} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Vacancies;
