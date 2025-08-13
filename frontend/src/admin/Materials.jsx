// frontend/src/admin/Materials.jsx
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
import { Plus, Search, Edit, Trash2, UploadCloud, X } from "lucide-react";
import api from "@/services/api";
import ImagePreview from "@/components/ImagePreview.jsx";

/* ================= helpers (Cuiabá) ================= */
const TZ = "America/Cuiaba";
const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
const isYMD = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));

// Converte QUALQUER data (string/Date) para 'YYYY-MM-DD' no fuso de Cuiabá
function toCuiabaYMD(value) {
  if (!value) return "";
  const s = String(value);
  const base = s.slice(0, 10);
  if (isYMD(base)) return base; // já é somente data estável

  // Tem hora/Z? Normaliza para 'YYYY-MM-DD' em America/Cuiaba
  const d = new Date(s);
  if (isNaN(d)) return "";
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // 'en-CA' -> YYYY-MM-DD diretamente na maioria dos ambientes
  const formatted = fmt.format(d);
  if (isYMD(formatted)) return formatted;

  // Fallback: monta pelos parts
  const parts = fmt.formatToParts(d);
  const year = parts.find(p => p.type === "year")?.value || "0000";
  const month = parts.find(p => p.type === "month")?.value || "01";
  const day = parts.find(p => p.type === "day")?.value || "01";
  return `${year}-${month}-${day}`;
}

// Mostra 'DD/MM/AAAA' a partir de 'YYYY-MM-DD' (sem criar Date)
function formatDateBRLocal(ymd) {
  const s = String(ymd || "").slice(0, 10);
  if (!isYMD(s)) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

/* ===================== componente ===================== */
const Materials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  // filtros (PT-BR, pequenos)
  const hoje = new Date();
  const [mes, setMes] = useState("todos");   // 0..11 ou "todos"
  const [ano, setAno] = useState("todos");   // 4 dígitos ou "todos"
  const anosDisponiveis = Array.from({ length: 8 }, (_, i) => hoje.getFullYear() - 5 + i);

  // modal (create/edit)
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create");
  const [saving, setSaving] = useState(false);

  // dialog excluir
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);

  // formulário
  const emptyForm = {
    id: null,
    date: toCuiabaYMD(new Date()), // já cai no dia correto de Cuiabá
    quantity: "",
    clientName: "",
    responsible: "",
    notes: "",
    sampleUrl: null,
    protocolUrl: null,
  };
  const [form, setForm] = useState(emptyForm);

  /* -------- carregar -------- */
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
  useEffect(() => { fetchMaterials(); }, []);

  /* -------- uploads -------- */
  async function uploadFile(file) {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await api.post("/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data?.url;
  }
  async function onSampleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingSample(true);
      const url = await uploadFile(file);
      setForm((f) => ({ ...f, sampleUrl: url }));
    } catch (err) {
      console.error("Erro no upload da amostra:", err);
      alert("Falha ao enviar a amostra. Tente novamente.");
    } finally { setUploadingSample(false); }
  }
  async function onProtocolChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingProtocol(true);
      const url = await uploadFile(file);
      setForm((f) => ({ ...f, protocolUrl: url }));
    } catch (err) {
      console.error("Erro no upload do protocolo:", err);
      alert("Falha ao enviar o protocolo. Tente novamente.");
    } finally { setUploadingProtocol(false); }
  }
  const [uploadingSample, setUploadingSample] = useState(false);
  const [uploadingProtocol, setUploadingProtocol] = useState(false);

  /* -------- form -------- */
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
      date: toCuiabaYMD(row.date), // <<< importante
      quantity: row.quantity ?? "",
      clientName: row.client_name ?? row.clientName ?? "",
      responsible: row.responsible ?? "",
      notes: row.notes ?? "",
      sampleUrl: row.material_sample_url ?? row.sampleUrl ?? null,
      protocolUrl: row.protocol_url ?? row.protocolUrl ?? null,
    });
    setOpen(true);
  }
  function confirmDelete(row) { setRowToDelete(row); setOpenDelete(true); }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        date: form.date, // mantém 'YYYY-MM-DD' puro (sem timezone)
        quantity: Number(form.quantity || 0),
        client_name: form.clientName,
        responsible: form.responsible,
        notes: form.notes || "",
        material_sample_url: form.sampleUrl || null,
        protocol_url: form.protocolUrl || null,
      };
      if (mode === "create") {
        await api.post("/materials", payload);
      } else {
        const id = form.id;
        if (!id) throw new Error("ID do registro não encontrado para edição.");
        await api.put(`/materials/${id}`, payload);
      }
      setOpen(false);
      setForm(emptyForm);
      fetchMaterials();
    } catch (err) {
      console.error("Erro ao salvar material:", err);
      alert("Erro ao salvar material.");
    } finally { setSaving(false); }
  }

  async function onDelete() {
    if (!rowToDelete) return;
    setDeleting(true);
    try {
      const id = rowToDelete.id ?? rowToDelete._id ?? rowToDelete.uuid;
      if (!id) throw new Error("ID do registro não encontrado para exclusão.");
      await api.delete(`/materials/${id}`);
      setOpenDelete(false);
      setRowToDelete(null);
      fetchMaterials();
    } catch (err) {
      console.error("Erro ao excluir material:", err);
      alert("Erro ao excluir material.");
    } finally { setDeleting(false); }
  }

  /* -------- filtro + ordenação (desc) SEM timezone -------- */
  const filtered = useMemo(() => {
    let list = Array.isArray(materials) ? [...materials] : [];

    // busca texto
    const k = q.trim().toLowerCase();
    if (k) {
      list = list.filter((m) =>
        [m.client_name, m.responsible, String(m.quantity), m.notes]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(k))
      );
    }

    // normaliza para YMD de Cuiabá e filtra Mês/Ano
    list = list
      .map((m) => ({ ...m, _ymd: toCuiabaYMD(m.date) }))
      .filter((m) => m._ymd); // remove sem data válida

    if (mes !== "todos" || ano !== "todos") {
      list = list.filter((m) => {
        const y = Number(m._ymd.slice(0, 4));
        const mm = Number(m._ymd.slice(5, 7)) - 1;
        const okMes = mes === "todos" ? true : mm === Number(mes);
        const okAno = ano === "todos" ? true : y === Number(ano);
        return okMes && okAno;
      });
    }

    // ordena por string YMD desc (funciona porque é zero-padded)
    list.sort((a, b) => b._ymd.localeCompare(a._ymd));

    return list;
  }, [materials, q, mes, ano]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">Materiais</h1>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Registros</CardTitle>
          <CardDescription>Lista de materiais cadastrados</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros + Novo */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por cliente, responsável, quantidade ou observações..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs md:text-sm">Mês</Label>
              <select
                className="border rounded-md text-sm h-9 px-2 w-[120px] bg-white"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
              >
                <option value="todos">Todos</option>
                {MESES.map((m, idx) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs md:text-sm">Ano</Label>
              <select
                className="border rounded-md text-sm h-9 px-2 w-[100px] bg-white"
                value={ano}
                onChange={(e) => setAno(e.target.value)}
              >
                <option value="todos">Todos</option>
                {anosDisponiveis.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {(mes !== "todos" || ano !== "todos") && (
              <Button variant="outline" size="sm" onClick={() => { setMes("todos"); setAno("todos"); }}>
                Limpar
              </Button>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="admin-btn-primary gap-2 min-h-[36px]" onClick={openCreate}>
                  <Plus className="h-5 w-5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                  <span className="whitespace-nowrap">Novo</span>
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-2xl p-0">
                <div className="max-h-[80vh] overflow-y-auto p-6">
                  <DialogHeader className="pb-2">
                    <DialogTitle>{mode === "create" ? "Novo Material" : "Editar Material"}</DialogTitle>
                    <DialogDescription>
                      {mode === "create" ? "Cadastre um recebimento/coleta." : "Edite as informações do material."}
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={onSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>Data</Label>
                        <Input type="date" name="date" value={form.date} onChange={onChange} required />
                      </div>
                      <div>
                        <Label>Quantidade</Label>
                        <Input
                          type="number"
                          name="quantity"
                          placeholder="Ex.: 10000"
                          value={form.quantity}
                          onChange={onChange}
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
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
                        <Label>Responsável pela coleta/recebimento</Label>
                        <Input
                          name="responsible"
                          placeholder="Responsável"
                          value={form.responsible}
                          onChange={onChange}
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Observações</Label>
                        <Textarea name="notes" placeholder="Opcional" value={form.notes} onChange={onChange} />
                      </div>
                    </div>

                    {/* Amostra */}
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
                        <div className="relative inline-flex items-center gap-2 mt-2">
                          <ImagePreview src={form.sampleUrl} alt="Amostra" size={96} />
                          <button
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, sampleUrl: null }))}
                            className="bg-white border rounded-full p-1 shadow"
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
                        <div className="relative inline-flex items-center gap-2 mt-2">
                          <ImagePreview src={form.protocolUrl} alt="Protocolo" size={96} />
                          <button
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, protocolUrl: null }))}
                            className="bg-white border rounded-full p-1 shadow"
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
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead>Amostra</TableHead>
                  <TableHead>Protocolo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8}>Carregando…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8}>Nenhum registro</TableCell></TableRow>
                ) : (
                  filtered.map((m) => {
                    const id = m.id ?? m._id ?? m.uuid;
                    const ymd = m._ymd ?? toCuiabaYMD(m.date);
                    return (
                      <TableRow key={id || `${m.client_name}-${ymd}`}>
                        <TableCell>{formatDateBRLocal(ymd)}</TableCell>
                        <TableCell>{(m.client_name ?? m.clientName) || "—"}</TableCell>
                        <TableCell>{m.responsible || "—"}</TableCell>
                        <TableCell>{m.quantity ?? "—"}</TableCell>
                        <TableCell title={m.notes || ""}>
                          {m.notes ? <span className="line-clamp-2 max-w-[320px] block">{m.notes}</span> : "—"}
                        </TableCell>
                        <TableCell>
                          {m.material_sample_url ? (
                            <ImagePreview src={m.material_sample_url} alt={`Amostra - ${m.client_name || ""}`} size={48} />
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {m.protocol_url ? (
                            <ImagePreview src={m.protocol_url} alt={`Protocolo - ${m.client_name || ""}`} size={48} />
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="gap-2" onClick={() => openEdit(m)}>
                              <Edit className="size-4" /> Editar
                            </Button>
                            <Button size="sm" variant="destructive" className="gap-2" onClick={() => confirmDelete(m)}>
                              <Trash2 className="size-4" /> Excluir
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
            <DialogTitle>Excluir material?</DialogTitle>
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

export default Materials;
