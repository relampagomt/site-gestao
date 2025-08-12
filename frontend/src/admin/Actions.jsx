// frontend/src/admin/Actions.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Checkbox } from "@/components/ui/checkbox.jsx";
import { Plus, Search, Edit, Trash2, UploadCloud, X } from "lucide-react";
import api from "@/services/api";
import ImagePreview from "@/components/ImagePreview.jsx";

// Definição dos serviços organizados por categoria
const SERVICES = {
  "Serviços de Panfletagem e Distribuição": [
    "PAP (Porta a Porta)",
    "Arrastão",
    "Semáforos",
    "Ponto fixo",
    "Distribuição em eventos",
    "Carro de Som",
    "Entrega personalizada"
  ],
  "Serviços de Ações Promocionais e Interação": [
    "Distribuição de Amostras (Sampling)",
    "Degustação",
    "Demonstração",
    "Blitz promocional",
    "Captação de cadastros",
    "Distribuição de Brindes"
  ],
  "Serviços Complementares": [
    "Criação e design",
    "Confecção e produção",
    "Impressão",
    "Logística (Coleta e Entrega)",
    "Planejamento estratégico",
    "Relatório e monitoramento"
  ]
};

const ActionsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create");
  const [saving, setSaving] = useState(false);

  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);

  const emptyForm = {
    id: null,
    date: new Date().toISOString().slice(0, 10),
    clientName: "",
    selectedServices: [], // Mudança: array de serviços selecionados
    notes: "",
    photoUrl: null,
  };
  const [form, setForm] = useState(emptyForm);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  async function fetchActions() {
    setLoading(true);
    try {
      const { data } = await api.get("/actions");
      setItems(Array.isArray(data) ? data : data?.items ?? []);
    } catch (e) {
      console.error("Erro ao carregar ações:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchActions();
  }, []);

  async function uploadFile(file) {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await api.post("/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data?.url;
  }

  async function onPhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadFile(file);
      setForm((f) => ({ ...f, photoUrl: url }));
    } catch (err) {
      console.error("Erro no upload da imagem:", err);
      alert("Falha ao enviar a imagem. Tente novamente.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  // Função para lidar com seleção de serviços
  function handleServiceToggle(service) {
    setForm((f) => ({
      ...f,
      selectedServices: f.selectedServices.includes(service)
        ? f.selectedServices.filter(s => s !== service)
        : [...f.selectedServices, service]
    }));
  }

  function openCreate() {
    setMode("create");
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(row) {
    setMode("edit");
    // Converter description de volta para array de serviços se necessário
    let selectedServices = [];
    if (row.description) {
      // Se description contém serviços separados por vírgula, converter para array
      selectedServices = row.description.split(',').map(s => s.trim()).filter(Boolean);
    }
    
    setForm({
      id: row.id ?? row._id ?? row.uuid ?? null,
      date: (row.date || "").slice(0, 10),
      clientName: row.client_name ?? row.clientName ?? "",
      selectedServices: selectedServices,
      notes: row.notes ?? "",
      photoUrl: row.image_url ?? row.photo_url ?? row.photoUrl ?? null,
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
        date: form.date,
        client_name: form.clientName,
        description: form.selectedServices.join(', '), // Converter array para string
        notes: form.notes || "",
        image_url: form.photoUrl || null,
      };

      if (mode === "create") {
        await api.post("/actions", payload);
      } else {
        const id = form.id;
        if (!id) throw new Error("ID do registro não encontrado para edição.");
        await api.put(`/actions/${id}`, payload);
      }

      setOpen(false);
      setForm(emptyForm);
      fetchActions();
    } catch (err) {
      console.error("Erro ao salvar ação:", err);
      alert("Erro ao salvar ação.");
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
      await api.delete(`/actions/${id}`);
      setOpenDelete(false);
      setRowToDelete(null);
      fetchActions();
    } catch (err) {
      console.error("Erro ao excluir ação:", err);
      alert("Erro ao excluir ação.");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return items;
    return items.filter((m) =>
      [(m.client_name ?? m.clientName), m.description, m.notes]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(k))
    );
  }, [items, q]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">Ações</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreate}>
              <Plus className="size-4" />
              Nova
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl p-0">
            <div className="max-h-[80vh] overflow-y-auto p-6">
              <DialogHeader className="pb-2">
                <DialogTitle>{mode === "create" ? "Nova Ação" : "Editar Ação"}</DialogTitle>
                <DialogDescription>
                  {mode === "create" ? "Cadastre uma nova ação executada." : "Edite as informações da ação."}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Data</Label>
                    <Input type="date" name="date" value={form.date} onChange={onChange} required />
                  </div>
                  <div>
                    <Label>Cliente</Label>
                    <Input
                      name="clientName"
                      placeholder="Nome do cliente"
                      value={form.clientName}
                      onChange={onChange}
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Serviços</Label>
                    <div className="border rounded-md p-4 max-h-64 overflow-y-auto space-y-4">
                      {Object.entries(SERVICES).map(([category, services]) => (
                        <div key={category} className="space-y-2">
                          <h4 className="font-medium text-sm text-gray-700">{category}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-4">
                            {services.map((service) => (
                              <div key={service} className="flex items-center space-x-2">
                                <Checkbox
                                  id={service}
                                  checked={form.selectedServices.includes(service)}
                                  onCheckedChange={() => handleServiceToggle(service)}
                                />
                                <Label htmlFor={service} className="text-sm cursor-pointer">
                                  {service}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {form.selectedServices.length > 0 && (
                      <div className="mt-2 text-sm text-gray-600">
                        Selecionados: {form.selectedServices.join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <Label>Observações</Label>
                    <Textarea name="notes" placeholder="Opcional" value={form.notes} onChange={onChange} />
                  </div>
                </div>

                {/* Imagem / Comprovante */}
                <div className="space-y-2">
                  <Label>Imagem / Comprovante</Label>
                  <div className="flex items-center gap-3">
                    <Input type="file" accept="image/*" onChange={onPhotoChange} />
                    <Button type="button" variant="outline" disabled className="gap-2">
                      <UploadCloud className="size-4" />
                      {uploadingPhoto ? "Enviando..." : "Upload"}
                    </Button>
                  </div>
                  {form.photoUrl && (
                    <div className="relative inline-flex items-center gap-2 mt-2">
                      <ImagePreview src={form.photoUrl} alt="Comprovante" size={96} />
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, photoUrl: null }))}
                        className="bg-white border rounded-full p-1 shadow"
                        title="Remover imagem"
                      >
                        <X className="size-4 text-red-600" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving || uploadingPhoto || form.selectedServices.length === 0}>
                    {saving ? "Salvando..." : mode === "create" ? "Salvar" : "Atualizar"}
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Registros</CardTitle>
          <CardDescription>Lista de ações executadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por cliente, descrição ou observações..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Serviços</TableHead>
                  <TableHead>Imagem</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5}>Carregando…</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>Nenhum registro</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((m) => {
                    const id = m.id ?? m._id ?? m.uuid;
                    const photo = m.image_url ?? m.photo_url ?? m.photoUrl;

                    return (
                      <TableRow key={id || `${(m.client_name ?? m.clientName) || "x"}-${m.date}`}>
                        <TableCell>{m.date?.slice(0, 10) || "—"}</TableCell>
                        <TableCell>{(m.client_name ?? m.clientName) || "—"}</TableCell>
                        <TableCell className="max-w-[420px]">
                          <span className="line-clamp-2">{m.description || "—"}</span>
                        </TableCell>
                        <TableCell>
                          {photo ? (
                            <ImagePreview
                              src={photo}
                              alt={`Comprovante - ${(m.client_name ?? m.clientName) || ""}`}
                              size={48}
                            />
                          ) : (
                            "—"
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="gap-2" onClick={() => openEdit(m)}>
                              <Edit className="size-4" />
                              Editar
                            </Button>
                            <Button size="sm" variant="destructive" className="gap-2" onClick={() => confirmDelete(m)}>
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

      {/* Dialog de exclusão */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir ação?</DialogTitle>
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

export default ActionsPage;
