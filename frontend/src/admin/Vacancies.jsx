import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.jsx";
import {
  Plus,
  Pencil,
  Trash2,
  UploadCloud,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import api from "@/services/api";

// Import the new ExportMenu component
import ExportMenu from "@/components/export/ExportMenu";

/* ===================== Helpers ===================== */
const emptyForm = {
  name: "",
  phone: "",
  address: "",
  age: "",
  sex: "Outro",
  department: "Operacional",
  job_type: "CLT",
  status: "Aberta",
  salary: "",
  photos: [],
};

const BRL = (value) => {
  const num = Number(value || 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
};

const Vacancies = () => {
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Preview modal
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewList, setPreviewList] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [departmentFilter, setDepartmentFilter] = useState("todos");
  const [jobTypeFilter, setJobTypeFilter] = useState("todos");

  // Load data
  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/job-vacancies");
      const list = Array.isArray(data) ? data : [];
      // Normalize photos field
      const normalized = list.map((v) => ({
        ...v,
        _photos: Array.isArray(v.photos) ? v.photos : [],
      }));
      setVacancies(normalized);
    } catch (e) {
      console.error("Erro ao carregar vagas:", e);
      setVacancies([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Form handlers
  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setOpen(true);
  }

  function openEdit(item) {
    setForm({
      name: item.name || "",
      phone: item.phone || "",
      address: item.address || "",
      age: item.age ?? "",
      sex: item.sex || "Outro",
      department: item.department || "Operacional",
      job_type: item.job_type || "CLT",
      status: item.status || "Aberta",
      salary: item.salary ?? "",
      photos: Array.isArray(item.photos) ? [...item.photos] : [],
    });
    setEditingId(item.id);
    setOpen(true);
  }

  function onChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) return alert("Nome é obrigatório.");

    try {
      const payload = {
        ...form,
        age: form.age ? Number(form.age) : null,
        salary: form.salary ? Number(form.salary) : 0,
      };

      if (editingId) {
        await api.put(`/job-vacancies/${editingId}`, payload);
      } else {
        await api.post("/job-vacancies", payload);
      }
      setOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (e) {
      console.error("Erro ao salvar vaga:", e);
      alert("Não foi possível salvar. Tente novamente.");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Remover esta indicação?")) return;
    try {
      await api.delete(`/job-vacancies/${id}`);
      await load();
    } catch (e) {
      console.error("Erro ao remover vaga:", e);
      alert("Não foi possível remover. Tente novamente.");
    }
  }

  // Upload multiple images
  async function onImagesChange(e) {
    const files = Array.from(e.target.files || []).filter(Boolean);
    if (!files.length) return;

    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        if (!/^image\/(png|jpe?g)$/i.test(file.type)) continue;
        const fd = new FormData();
        fd.append("file", file);
        const { data } = await api.post("/upload", fd);
        const url =
          data?.url || data?.secure_url || data?.location || data?.file?.url || "";
        if (url) uploaded.push(url);
      }
      if (uploaded.length === 0) {
        alert("Nenhuma imagem válida enviada.");
        return;
      }
      setForm((f) => ({ ...f, photos: [...(f.photos || []), ...uploaded] }));
      e.target.value = "";
    } catch (err) {
      console.error("Erro no upload de imagens:", err);
      alert("Falha ao enviar imagens. Código: " + (err?.response?.status || "desconhecido"));
    } finally {
      setUploading(false);
    }
  }

  function removePhotoAt(idx) {
    setForm((f) => {
      const next = [...(f.photos || [])];
      next.splice(idx, 1);
      return { ...f, photos: next };
    });
  }

  function openPreview(list, idx = 0) {
    setPreviewList(list || []);
    setPreviewIndex(idx);
    setPreviewOpen(true);
  }

  function prevImage() {
    setPreviewIndex((i) => (i - 1 + previewList.length) % previewList.length);
  }

  function nextImage() {
    setPreviewIndex((i) => (i + 1) % previewList.length);
  }

  // Filtered data
  const filtered = useMemo(() => {
    let list = [...vacancies];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((v) =>
        [v.name, v.phone, v.address, v.department, v.job_type]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(q))
      );
    }

    // Status filter
    if (statusFilter !== "todos") {
      list = list.filter((v) => v.status === statusFilter);
    }

    // Department filter
    if (departmentFilter !== "todos") {
      list = list.filter((v) => v.department === departmentFilter);
    }

    // Job type filter
    if (jobTypeFilter !== "todos") {
      list = list.filter((v) => v.job_type === jobTypeFilter);
    }

    return list;
  }, [vacancies, search, statusFilter, departmentFilter, jobTypeFilter]);

  // Prepare data for export
  const exportData = useMemo(() => {
    return filtered.map((v) => {
      const photos = Array.isArray(v._photos) ? v._photos.join(" | ") : "";
      return {
        nome: v.name || "",
        telefone: v.phone || "",
        endereco: v.address || "",
        idade: v.age ?? "",
        sexo: v.sex || "",
        departamento: v.department || "",
        tipo_cargo: v.job_type || "",
        salario: Number(v.salary || 0),
        status: v.status || "",
        fotos_urls: photos,
      };
    });
  }, [filtered]);

  const exportColumns = [
    { key: 'nome', header: 'Nome' },
    { key: 'telefone', header: 'Telefone' },
    { key: 'endereco', header: 'Endereço' },
    { key: 'idade', header: 'Idade' },
    { key: 'sexo', header: 'Sexo' },
    { key: 'departamento', header: 'Departamento' },
    { key: 'tipo_cargo', header: 'Tipo (Cargo)' },
    { key: 'salario', header: 'Salário' },
    { key: 'status', header: 'Status' },
    { key: 'fotos_urls', header: 'Fotos (URLs)' },
  ];

  const pdfOptions = {
    title: 'Relatório de Vagas',
    orientation: 'l', // landscape for more columns
    filtersSummary: `Filtros aplicados: ${
      [
        search ? `Busca: "${search}"` : '',
        statusFilter !== 'todos' ? `Status: ${statusFilter}` : '',
        departmentFilter !== 'todos' ? `Departamento: ${departmentFilter}` : '',
        jobTypeFilter !== 'todos' ? `Tipo: ${jobTypeFilter}` : '',
      ].filter(Boolean).join(' | ') || 'Nenhum filtro aplicado'
    }`,
    columnStyles: {
      0: { cellWidth: 40 }, // Nome
      1: { cellWidth: 35 }, // Telefone
      2: { cellWidth: 50 }, // Endereço
      3: { cellWidth: 20 }, // Idade
      4: { cellWidth: 25 }, // Sexo
      5: { cellWidth: 35 }, // Departamento
      6: { cellWidth: 35 }, // Tipo
      7: { cellWidth: 30 }, // Salário
      8: { cellWidth: 30 }, // Status
      9: { cellWidth: 60 }, // Fotos URLs
    }
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-3 md:px-6 py-4 md:py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">Vagas</h1>
      </div>

      {/* Filters Card */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg md:text-xl font-semibold">Filtros e Ações</CardTitle>
              <CardDescription>Filtre e exporte os dados das vagas</CardDescription>
            </div>
            <div className="ml-auto">
              <ExportMenu
                data={exportData}
                columns={exportColumns}
                filename="vagas"
                pdfOptions={pdfOptions}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3">
            {/* Search */}
            <div className="relative flex-1 w-full md:w-[320px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar vagas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <div className="w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-56 md:w-64 max-w-full">
                  <SelectValue placeholder="Filtrar por status" className="truncate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="Aberta">Aberta</SelectItem>
                  <SelectItem value="Em Processo">Em Processo</SelectItem>
                  <SelectItem value="Fechada">Fechada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Department Filter */}
            <div className="w-full sm:w-auto">
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-56 md:w-64 max-w-full">
                  <SelectValue placeholder="Filtrar por departamento" className="truncate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os departamentos</SelectItem>
                  <SelectItem value="Comercial">Comercial</SelectItem>
                  <SelectItem value="Operacional">Operacional</SelectItem>
                  <SelectItem value="Administrativo">Administrativo</SelectItem>
                  <SelectItem value="Técnico">Técnico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Job Type Filter */}
            <div className="w-full sm:w-auto">
              <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
                <SelectTrigger className="w-56 md:w-64 max-w-full">
                  <SelectValue placeholder="Filtrar por tipo" className="truncate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="CLT">CLT</SelectItem>
                  <SelectItem value="PJ">PJ</SelectItem>
                  <SelectItem value="Freelancer">Freelancer</SelectItem>
                  <SelectItem value="Estágio">Estágio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("todos");
                setDepartmentFilter("todos");
                setJobTypeFilter("todos");
              }}
            >
              Limpar Filtros
            </Button>

            {/* Create Button */}
            <Button size="sm" className="gap-2" onClick={openCreate}>
              <Plus className="size-4" />
              Nova Indicação
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl font-semibold">Lista de Vagas</CardTitle>
          <CardDescription>Gerencie as indicações de candidatos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="min-w-full table-auto text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 px-3 text-center">Nome</th>
                  <th className="py-2 px-3 text-center">Telefone</th>
                  <th className="py-2 px-3 text-center">Endereço</th>
                  <th className="py-2 px-3 text-center">Idade</th>
                  <th className="py-2 px-3 text-center">Sexo</th>
                  <th className="py-2 px-3 text-center">Departamento</th>
                  <th className="py-2 px-3 text-center">Tipo (Cargo)</th>
                  <th className="py-2 px-3 text-center">Salário</th>
                  <th className="py-2 px-3 text-center">Fotos</th>
                  <th className="py-2 px-3 text-center">Status</th>
                  <th className="py-2 px-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="py-6 text-center text-muted-foreground">
                      Carregando...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-6 text-center text-muted-foreground">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  filtered.map((v) => {
                    const photos = Array.isArray(v._photos) ? v._photos : [];
                    return (
                      <tr key={v.id} className="border-b last:border-0">
                        <td className="py-3 px-3 text-center font-medium">{v.name}</td>
                        <td className="py-3 px-3 text-center">{v.phone}</td>
                        <td className="py-3 px-3 text-center">{v.address}</td>
                        <td className="py-3 px-3 text-center">{v.age ?? "—"}</td>
                        <td className="py-3 px-3 text-center">{v.sex}</td>
                        <td className="py-3 px-3 text-center">
                          <Badge variant="secondary">{v.department}</Badge>
                        </td>
                        <td className="py-3 px-3 text-center">{v.job_type}</td>
                        <td className="py-3 px-3 text-center">{BRL(v.salary)}</td>

                        {/* Photos */}
                        <td className="py-3 px-3 text-center">
                          {photos.length > 0 ? (
                            <div className="inline-flex items-center gap-1">
                              {photos.slice(0, 3).map((src, idx) => (
                                <button
                                  key={src}
                                  type="button"
                                  onClick={() => openPreview(photos, idx)}
                                  title="Ver imagem"
                                  className="w-10 h-10 rounded-md overflow-hidden border"
                                >
                                  <img
                                    src={src}
                                    alt="foto"
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                </button>
                              ))}
                              {photos.length > 3 && (
                                <Badge
                                  variant="outline"
                                  className="cursor-pointer"
                                  onClick={() => openPreview(photos, 3)}
                                >
                                  +{photos.length - 3}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <Badge
                            className={
                              (v.status || "").toLowerCase() === "aberta"
                                ? "bg-emerald-600"
                                : (v.status || "").toLowerCase() === "fechada"
                                ? "bg-zinc-600"
                                : "bg-amber-600"
                            }
                          >
                            {v.status || "—"}
                          </Badge>
                        </td>

                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="flex justify-center gap-2">
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => openEdit(v)}>
                              <Pencil className="size-4" />
                              Editar
                            </Button>
                            <Button variant="destructive" size="sm" className="gap-2" onClick={() => handleDelete(v.id)}>
                              <Trash2 className="size-4" />
                              Excluir
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Total: <strong>{filtered.length}</strong> vaga(s)
          </p>
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Vaga" : "Nova Indicação"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Atualize as informações da vaga." : "Preencha os dados para criar uma nova indicação."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => onChange("name", e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => onChange("phone", e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => onChange("address", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="age">Idade</Label>
                <Input
                  id="age"
                  type="number"
                  min="0"
                  max="120"
                  value={form.age}
                  onChange={(e) => onChange("age", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="sex">Sexo</Label>
                <Select value={form.sex} onValueChange={(value) => onChange("sex", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Feminino">Feminino</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="department">Departamento</Label>
                <Select value={form.department} onValueChange={(value) => onChange("department", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Comercial">Comercial</SelectItem>
                    <SelectItem value="Operacional">Operacional</SelectItem>
                    <SelectItem value="Administrativo">Administrativo</SelectItem>
                    <SelectItem value="Técnico">Técnico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="job_type">Tipo (Cargo)</Label>
                <Select value={form.job_type} onValueChange={(value) => onChange("job_type", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLT">CLT</SelectItem>
                    <SelectItem value="PJ">PJ</SelectItem>
                    <SelectItem value="Freelancer">Freelancer</SelectItem>
                    <SelectItem value="Estágio">Estágio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="salary">Salário (R$)</Label>
                <Input
                  id="salary"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.salary}
                  onChange={(e) => onChange("salary", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(value) => onChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aberta">Aberta</SelectItem>
                    <SelectItem value="Em Processo">Em Processo</SelectItem>
                    <SelectItem value="Fechada">Fechada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Photos Upload */}
              <div className="md:col-span-2">
                <Label>Fotos</Label>
                <div className="flex items-center gap-3 mt-2">
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={onImagesChange}
                    disabled={uploading}
                  />
                  <Button type="button" variant="outline" disabled className="gap-2">
                    <UploadCloud className="size-4" />
                    {uploading ? "Enviando..." : "Upload"}
                  </Button>
                </div>

                {/* Photo Preview */}
                {form.photos && form.photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {form.photos.map((url, idx) => (
                      <div key={idx} className="relative">
                        <img
                          src={url}
                          alt={`Foto ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded border"
                        />
                        <button
                          type="button"
                          onClick={() => removePhotoAt(idx)}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm">
                {editingId ? "Atualizar" : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Visualizar Fotos</DialogTitle>
          </DialogHeader>
          
          {previewList.length > 0 && (
            <div className="relative">
              <img
                src={previewList[previewIndex]}
                alt={`Foto ${previewIndex + 1}`}
                className="w-full max-h-[70vh] object-contain rounded"
              />
              
              {previewList.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute left-2 top-1/2 -translate-y-1/2"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={nextImage}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                  
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                    {previewIndex + 1} / {previewList.length}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Vacancies;

