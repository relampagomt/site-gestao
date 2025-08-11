// frontend/src/admin/Materials.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Badge } from "@/components/ui/badge.jsx";
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
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Calendar,
  UploadCloud,
  X,
} from "lucide-react";
import api from "@/services/api"; // axios configurado com baseURL '/api'

const Materials = () => {
  // listagem / busca
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  // modal
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // formulário
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    quantity: "",
    clientName: "",
    responsible: "",
    notes: "",
    sampleUrl: null,
    protocolUrl: null,
  });

  // estados de upload
  const [uploadingSample, setUploadingSample] = useState(false);
  const [uploadingProtocol, setUploadingProtocol] = useState(false);

  // buscar materiais
  async function fetchMaterials() {
    setLoading(true);
    try {
      const { data } = await api.get("/materials");
      setMaterials(Array.isArray(data) ? data : data?.items ?? []);
    } catch (e) {
      console.error("Erro ao carregar materials:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMaterials();
  }, []);

  // upload genérico
  async function uploadFile(file) {
    const fd = new FormData();
    fd.append("file", file); // o backend espera 'file'
    // importante: não force JSON nesse request; sobrescreva se seu axios padrão seta application/json
    const { data } = await api.post("/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data?.url;
  }

  async function onSampleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSample(true);
    try {
      const url = await uploadFile(file);
      setForm((f) => ({ ...f, sampleUrl: url }));
    } catch (err) {
      console.error("Erro no upload da amostra:", err);
      alert("Falha ao enviar a amostra. Tente novamente.");
    } finally {
      setUploadingSample(false);
    }
  }

  async function onProtocolChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingProtocol(true);
    try {
      const url = await uploadFile(file);
      setForm((f) => ({ ...f, protocolUrl: url }));
    } catch (err) {
      console.error("Erro no upload do protocolo:", err);
      alert("Falha ao enviar o protocolo. Tente novamente.");
    } finally {
      setUploadingProtocol(false);
    }
  }

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      // monte o payload conforme o backend espera
      const payload = {
        date: form.date,
        quantity: Number(form.quantity || 0),
        client_name: form.clientName,
        responsible: form.responsible,
        notes: form.notes || "",
        material_sample_url: form.sampleUrl || null,
        protocol_url: form.protocolUrl || null,
      };

      await api.post("/materials", payload);
      setOpen(false);
      // limpa form
      setForm({
        date: new Date().toISOString().slice(0, 10),
        quantity: "",
        clientName: "",
        responsible: "",
        notes: "",
        sampleUrl: null,
        protocolUrl: null,
      });
      fetchMaterials();
    } catch (err) {
      console.error("Erro ao salvar material:", err);
      alert("Erro ao salvar material.");
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return materials;
    return materials.filter((m) =>
      [m.client_name, m.responsible, String(m.quantity)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(k))
    );
  }, [materials, q]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">Materiais</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="size-4" />
              Novo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Novo Material</DialogTitle>
              <DialogDescription>Cadastre um recebimento/coleta.</DialogDescription>
            </DialogHeader>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Data</Label>
                  <Input type="date" name="date" value={form.date} onChange={onChange} required />
                </div>
                <div>
                  <Label>Quantidade</Label>
                  <Input type="number" name="quantity" placeholder="Ex.: 10000" value={form.quantity} onChange={onChange} required />
                </div>
                <div className="md:col-span-2">
                  <Label>Cliente</Label>
                  <Input name="clientName" placeholder="Nome do cliente" value={form.clientName} onChange={onChange} required />
                </div>
                <div className="md:col-span-2">
                  <Label>Responsável pela coleta/recebimento</Label>
                  <Input name="responsible" placeholder="Responsável" value={form.responsible} onChange={onChange} required />
                </div>
                <div className="md:col-span-2">
                  <Label>Observações</Label>
                  <Textarea name="notes" placeholder="Opcional" value={form.notes} onChange={onChange} />
                </div>
              </div>

              {/* Amostra do Material */}
              <div className="space-y-2">
                <Label>Amostra do Material</Label>
                <div className="flex items-center gap-3">
                  <Input type="file" accept="image/*" onChange={onSampleChange} />
                  <Button type="button" variant="outline" disabled className="gap-2">
                    <UploadCloud className="size-4" />
                    {uploadingSample ? "Enviando..." : "Upload"}
                  </Button>
                </div>
                {form.sampleUrl && (
                  <div className="relative inline-block mt-2">
                    <img src={form.sampleUrl} alt="Amostra" className="h-28 w-auto rounded border" />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, sampleUrl: null }))}
                      className="absolute -top-2 -right-2 bg-white border rounded-full p-1 shadow"
                      title="Remover"
                    >
                      <X className="size-4 text-red-600" />
                    </button>
                  </div>
                )}
              </div>

              {/* Protocolo */}
              <div className="space-y-2">
                <Label>Protocolo</Label>
                <div className="flex items-center gap-3">
                  <Input type="file" accept="image/*" onChange={onProtocolChange} />
                  <Button type="button" variant="outline" disabled className="gap-2">
                    <UploadCloud className="size-4" />
                    {uploadingProtocol ? "Enviando..." : "Upload"}
                  </Button>
                </div>
                {form.protocolUrl && (
                  <div className="relative inline-block mt-2">
                    <img src={form.protocolUrl} alt="Protocolo" className="h-28 w-auto rounded border" />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, protocolUrl: null }))}
                      className="absolute -top-2 -right-2 bg-white border rounded-full p-1 shadow"
                      title="Remover"
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
                <Button type="submit" disabled={saving || uploadingSample || uploadingProtocol}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Registros</CardTitle>
          <CardDescription>Lista de materiais cadastrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por cliente, responsável ou quantidade..."
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
                  <TableHead>Responsável</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Amostra</TableHead>
                  <TableHead>Protocolo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6}>Carregando…</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>Nenhum registro</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((m) => (
                    <TableRow key={m.id || `${m.client_name}-${m.date}`}>
                      <TableCell>{m.date?.slice(0, 10) || "-"}</TableCell>
                      <TableCell>{m.client_name || "-"}</TableCell>
                      <TableCell>{m.responsible || "-"}</TableCell>
                      <TableCell>{m.quantity ?? "-"}</TableCell>
                      <TableCell>
                        {m.material_sample_url ? (
                          <a href={m.material_sample_url} target="_blank" rel="noreferrer" className="text-primary underline">
                            Ver
                          </a>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {m.protocol_url ? (
                          <a href={m.protocol_url} target="_blank" rel="noreferrer" className="text-primary underline">
                            Ver
                          </a>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Materials;
