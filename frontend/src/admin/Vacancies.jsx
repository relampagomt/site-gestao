// frontend/src/admin/Vacancies.jsx
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
  // Ícones de exportação
  FileDown,
  FileSpreadsheet,
  FileJson,
  ClipboardCopy,
  FileText,
} from "lucide-react";
import api from "@/services/api";

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
  photos: [], // array de URLs de imagens
};

const BRL = (n) =>
  n === null || n === undefined || n === ""
    ? "—"
    : Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// checagem simples por extensão
const isImageUrl = (url) => /\.(png|jpe?g)(\?|#|$)/i.test(String(url || ""));

// normaliza para um array de fotos a partir do item vindo da API
function getPhotosFromItem(v) {
  const a =
    v?.photos ||
    v?.images ||
    v?.photos_urls ||
    v?.images_urls ||
    v?.pictures ||
    null;

  if (Array.isArray(a) && a.length) {
    return a.filter(Boolean).filter(isImageUrl);
  }

  if (isImageUrl(v?.documents_url || v?.document_url || v?.documentsUrl)) {
    return [v.documents_url || v.document_url || v.documentsUrl].filter(Boolean);
  }

  return [];
}

export default function Vacancies() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // modal create/edit
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");

  // filtros
  const [statusFilter, setStatusFilter] = useState("todos");
  const [departmentFilter, setDepartmentFilter] = useState("todos");
  const [jobTypeFilter, setJobTypeFilter] = useState("todos");

  // upload
  const [uploading, setUploading] = useState(false);

  // preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewList, setPreviewList] = useState([]); // array de URLs
  const [previewIndex, setPreviewIndex] = useState(0);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const { data } = await api.get("/job-vacancies");
      const arr = Array.isArray(data) ? data : [];
      setItems(
        arr.map((v) => ({
          ...v,
          _photos: getPhotosFromItem(v),
        }))
      );
    } catch (e) {
      console.error("Erro ao carregar vagas:", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    let result = items;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((v) =>
        [
          v?.name,
          v?.phone,
          v?.address,
          v?.department,
          v?.job_type,
          v?.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    if (statusFilter !== "todos") result = result.filter((v) => v.status === statusFilter);
    if (departmentFilter !== "todos") result = result.filter((v) => v.department === departmentFilter);
    if (jobTypeFilter !== "todos") result = result.filter((v) => v.job_type === jobTypeFilter);
    return result;
  }, [items, search, statusFilter, departmentFilter, jobTypeFilter]);

  const total = items.length;
  const openCount = items.filter((v) => (v?.status || "").toLowerCase() === "aberta").length;
  const processCount = items.filter((v) => (v?.status || "").toLowerCase() === "em processo").length;
  const closedCount = items.filter((v) => (v?.status || "").toLowerCase() === "fechada").length;

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(v) {
    setEditingId(v.id);
    setForm({
      name: v.name || "",
      phone: v.phone || "",
      address: v.address || "",
      age: v.age?.toString?.() || "",
      sex: v.sex || "Outro",
      department: v.department || "Operacional",
      job_type: v.job_type || "CLT",
      status: v.status || "Aberta",
      salary: v.salary?.toString?.() || "",
      photos: getPhotosFromItem(v),
    });
    setOpen(true);
  }

  async function handleSubmit(e) {
    e?.preventDefault?.();
    if (!form.name?.trim()) return alert("Informe o nome.");
    if (!form.phone?.trim()) return alert("Informe o telefone.");
    if (uploading) return alert("Aguarde concluir o upload das imagens.");

    const payload = {
      ...form,
      age: form.age ? Number(form.age) : null,
      salary: form.salary ? Number(form.salary) : null,
      photos: Array.isArray(form.photos) ? form.photos : [],
      documents_url: Array.isArray(form.photos) && form.photos[0] ? form.photos[0] : "",
    };

    try {
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
    if (!confirm("Remover esta indicação?")) return;
    try {
      await api.delete(`/job-vacancies/${id}`);
      await load();
    } catch (e) {
      console.error("Erro ao remover vaga:", e);
      alert("Não foi possível remover. Tente novamente.");
    }
  }

  // upload múltiplo de imagens
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

  /* ===================== EXPORTS ===================== */
  const headers = [
    "Nome",
    "Telefone",
    "Endereço",
    "Idade",
    "Sexo",
    "Departamento",
    "Tipo (Cargo)",
    "Salário",
    "Status",
    "Fotos (URLs)"
  ];

  const toRow = (v) => {
    const photos = Array.isArray(v._photos) ? v._photos.join(" | ") : "";
    return [
      v.name || "",
      v.phone || "",
      v.address || "",
      v.age ?? "",
      v.sex || "",
      v.department || "",
      v.job_type || "",
      Number(v.salary || 0), // número cru p/ planilha
      v.status || "",
      photos,
    ];
  };

  const csvEscape = (val) => {
    const s = String(val ?? "");
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const buildCSV = (rows) => {
    // ; como separador (compat BR) + BOM p/ Excel reconhecer UTF-8
    const data = [headers, ...rows].map((r) => r.map(csvEscape).join(";")).join("\n");
    return "\uFEFF" + data;
  };

  const downloadFile = (name, content, mime) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (!filtered.length) return alert("Não há dados para exportar.");
    const rows = filtered.map(toRow);
    const csv = buildCSV(rows);
    downloadFile("vagas.csv", csv, "text/csv;charset=utf-8;");
  };

  const handleCopyCSV = async () => {
    if (!filtered.length) return alert("Não há dados para copiar.");
    try {
      const rows = filtered.map(toRow);
      const csv = buildCSV(rows);
      await navigator.clipboard.writeText(csv);
      alert("CSV copiado para a área de transferência.");
    } catch {
      alert("Não foi possível copiar. Tente exportar como arquivo CSV.");
    }
  };

  const handleExportJSON = () => {
    if (!filtered.length) return alert("Não há dados para exportar.");
    const json = JSON.stringify(filtered, null, 2);
    downloadFile("vagas.json", json, "application/json;charset=utf-8;");
  };

  const handleExportPDF = async () => {
    if (!filtered.length) {
      alert("Não há dados para exportar.");
      return;
    }
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

      // Cabeçalho
      const title = "Relatório de Vagas";
      const subtitle = new Date().toLocaleString("pt-BR");
      doc.setFontSize(14);
      doc.text(title, 40, 32);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${subtitle}`, 40, 48);

      const rows = filtered.map((v) => {
        const r = toRow(v);
        // Formata salário no PDF como moeda BRL para leitura
        r[7] = BRL(r[7]);
        return r;
      });

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 64,
        styles: { fontSize: 9, cellPadding: 4, overflow: "linebreak", valign: "middle" },
        headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], halign: "center" },
        columnStyles: {
          0: { cellWidth: 120 }, // Nome
          1: { cellWidth: 100 }, // Telefone
          2: { cellWidth: 150 }, // Endereço
          3: { cellWidth: 50 },  // Idade
          4: { cellWidth: 70 },  // Sexo
          5: { cellWidth: 110 }, // Departamento
          6: { cellWidth: 110 }, // Tipo (Cargo)
          7: { cellWidth: 90 },  // Salário
          8: { cellWidth: 90 },  // Status
          9: { cellWidth: 180 }, // Fotos (URLs)
        },
        margin: { top: 32, right: 24, bottom: 90, left: 24 },
        didDrawPage: (data) => {
          const pageCount = doc.getNumberOfPages();
          const str = `Página ${data.pageNumber} de ${pageCount}`;
          doc.setFontSize(9);
          doc.text(
            str,
            doc.internal.pageSize.getWidth() - 24 - doc.getTextWidth(str),
            doc.internal.pageSize.getHeight() - 14
          );
        },
      });

      // Resumo no rodapé (totais)
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const blockW = 360;
      const x = pageW - blockW - 24;
      const y = pageH - 70;

      doc.setFontSize(10);
      doc.text("Resumo do conjunto filtrado", x, y);
      doc.setFontSize(12);
      doc.text(`Total de vagas: ${total}`, x, y + 18);
      doc.text(`Abertas: ${openCount}`, x, y + 36);
      doc.text(`Em Processo: ${processCount}`, x, y + 54);
      doc.text(`Fechadas: ${closedCount}`, x, y + 72);

      doc.save("vagas.pdf");
    } catch (err) {
      console.error("Falha ao exportar PDF:", err);
      alert("Não foi possível gerar o PDF (verifique jspdf e jspdf-autotable).");
    }
  };

  /* ===================== RENDER ===================== */
  return (
    <div className="admin-page-container admin-space-y-6">
      <div className="admin-page-header">
        <h2 className="admin-page-title">Vagas</h2>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="md:p-0">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium">Total de Vagas</CardTitle>
            <CardDescription className="text-[11px]">Registros cadastrados</CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-semibold leading-tight">{loading ? "—" : total}</div>
          </CardContent>
        </Card>

        <Card className="md:p-0">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium">Vagas Abertas</CardTitle>
            <CardDescription className="text-[11px]">Disponíveis</CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-semibold leading-tight">{loading ? "—" : openCount}</div>
          </CardContent>
        </Card>

        <Card className="md:p-0">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium">Em Processo</CardTitle>
            <CardDescription className="text-[11px]">Triagem/Contato</CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-semibold leading-tight">
              {loading ? "—" : processCount}
            </div>
          </CardContent>
        </Card>

        <Card className="md:p-0">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium">Fechadas</CardTitle>
            <CardDescription className="text-[11px]">Encerradas</CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl font-semibold leading-tight">
              {loading ? "—" : closedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca / Filtros / Ações */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="w-full">
              <Input
                placeholder="Buscar por nome, telefone, endereço, etc…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="Aberta">Aberta</SelectItem>
                  <SelectItem value="Em Processo">Em Processo</SelectItem>
                  <SelectItem value="Fechada">Fechada</SelectItem>
                </SelectContent>
              </Select>

              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os departamentos</SelectItem>
                  <SelectItem value="Comercial">Comercial</SelectItem>
                  <SelectItem value="Operacional">Operacional</SelectItem>
                  <SelectItem value="Administrativo">Administrativo</SelectItem>
                  <SelectItem value="Técnico">Técnico</SelectItem>
                </SelectContent>
              </Select>

              <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="CLT">CLT</SelectItem>
                  <SelectItem value="PJ">PJ</SelectItem>
                  <SelectItem value="Freelancer">Freelancer</SelectItem>
                  <SelectItem value="Estágio">Estágio</SelectItem>
                </SelectContent>
              </Select>

              {/* Limpar filtros */}
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("todos");
                  setDepartmentFilter("todos");
                  setJobTypeFilter("todos");
                }}
              >
                Limpar Filtros
              </Button>

              {/* Exportar */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <FileDown className="size-4" />
                    Exportar
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" side="bottom" sideOffset={8} className="w-56 p-2">
                  <div className="flex flex-col gap-1">
                    <Button variant="ghost" className="justify-start gap-2" onClick={handleExportCSV}>
                      <FileSpreadsheet className="size-4" /> Exportar CSV (planilha)
                    </Button>
                    <Button variant="ghost" className="justify-start gap-2" onClick={handleCopyCSV}>
                      <ClipboardCopy className="size-4" /> Copiar CSV
                    </Button>
                    <Button variant="ghost" className="justify-start gap-2" onClick={handleExportJSON}>
                      <FileJson className="size-4" /> Exportar JSON
                    </Button>
                    <Button variant="ghost" className="justify-start gap-2" onClick={handleExportPDF}>
                      <FileText className="size-4" /> Exportar PDF
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Nova indicação */}
              <Button onClick={openCreate} className="admin-btn-primary">
                <Plus className="mr-2 h-4 w-4" /> Nova Indicação
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Lista de Vagas</CardTitle>
          <CardDescription>Gerencie as indicações de candidatos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
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
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-6 text-center text-muted-foreground">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                )}
                {filtered.map((v) => {
                  const photos = Array.isArray(v._photos) ? v._photos : [];
                  return (
                    <tr key={v.id} className="border-b last:border-0">
                      <td className="py-3 px-3 text-center">{v.name}</td>
                      <td className="py-3 px-3 text-center">{v.phone}</td>
                      <td className="py-3 px-3 text-center">{v.address}</td>
                      <td className="py-3 px-3 text-center">{v.age ?? "—"}</td>
                      <td className="py-3 px-3 text-center">{v.sex}</td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant="secondary">{v.department}</Badge>
                      </td>
                      <td className="py-3 px-3 text-center">{v.job_type}</td>
                      <td className="py-3 px-3 text-center">{BRL(v.salary)}</td>

                      {/* Fotos */}
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
                        <Button variant="outline" size="icon" className="mr-2" onClick={() => openEdit(v)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDelete(v.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Create/Edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[720px] p-0">
          <div className="max-h-[80vh] overflow-y-auto p-6">
            <DialogHeader className="pb-2">
              <DialogTitle>{editingId ? "Editar Indicação" : "Nova Indicação"}</DialogTitle>
              <DialogDescription>Preencha os dados do candidato à vaga.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  placeholder="Nome completo"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    placeholder="(99) 9 9999-9999"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Idade</Label>
                  <Input
                    type="number"
                    min={14}
                    placeholder="Ex.: 22"
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Endereço Residencial</Label>
                <Input
                  placeholder="Rua / Bairro / Cidade"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sexo</Label>
                  <Select
                    value={form.sex}
                    onValueChange={(v) => setForm({ ...form, sex: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Feminino">Feminino</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Select
                    value={form.department}
                    onValueChange={(v) => setForm({ ...form, department: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Operacional">Operacional</SelectItem>
                      <SelectItem value="Comercial">Comercial</SelectItem>
                      <SelectItem value="Administrativo">Administrativo</SelectItem>
                      <SelectItem value="Prestação de Serviços">Prestação de Serviços</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo (Cargo)</Label>
                  <Select
                    value={form.job_type}
                    onValueChange={(v) => setForm({ ...form, job_type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLT">CLT</SelectItem>
                      <SelectItem value="PJ">PJ</SelectItem>
                      <SelectItem value="Freelancer">Freelancer</SelectItem>
                      <SelectItem value="Diarista">Diarista</SelectItem>
                      <SelectItem value="Estágio">Estágio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aberta">Aberta</SelectItem>
                      <SelectItem value="Em Processo">Em Processo</SelectItem>
                      <SelectItem value="Fechada">Fechada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>
                  Salário{" "}
                  <span className="text-muted-foreground text-xs">
                    (Obs.: Freelancer/Diarista = valor por diária)
                  </span>
                </Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Ex.: 2200"
                  value={form.salary}
                  onChange={(e) => setForm({ ...form, salary: e.target.value })}
                />
              </div>

              {/* Upload de imagens (múltiplas) */}
              <div className="space-y-2">
                <Label>Fotos do candidato (PNG/JPG)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg"
                    multiple
                    onChange={onImagesChange}
                  />
                  <Button type="button" variant="outline" disabled className="gap-2">
                    <UploadCloud className="h-4 w-4" />
                    {uploading ? "Enviando..." : "Upload"}
                  </Button>
                </div>

                {Array.isArray(form.photos) && form.photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.photos.map((src, idx) => (
                      <div key={src} className="relative inline-block">
                        <button
                          type="button"
                          className="w-16 h-16 rounded-md overflow-hidden border"
                          title="Ver imagem"
                          onClick={() => openPreview(form.photos, idx)}
                        >
                          <img src={src} alt={`foto-${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                        <button
                          type="button"
                          title="Remover"
                          onClick={() => removePhotoAt(idx)}
                          className="absolute -top-2 -right-2 bg-white border rounded-full p-1 shadow"
                        >
                          <X className="h-3.5 w-3.5 text-red-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={uploading}>
                  {editingId ? "Salvar" : "Criar"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de visualização de imagens */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Fotos do candidato</DialogTitle>
            <DialogDescription>Visualização das imagens anexadas.</DialogDescription>
          </DialogHeader>

          {previewList.length > 0 ? (
            <div className="space-y-3">
              <div className="relative border rounded-md overflow-hidden">
                <img
                  src={previewList[previewIndex]}
                  alt="visualização"
                  className="w-full h-auto object-contain max-h-[60vh]"
                />
                {previewList.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 border shadow"
                      title="Anterior"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 border shadow"
                      title="Próxima"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>

              {previewList.length > 1 && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {previewList.map((src, i) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setPreviewIndex(i)}
                      className={`w-14 h-14 rounded-md overflow-hidden border ${i === previewIndex ? "ring-2 ring-blue-500" : ""}`}
                      title={`Imagem ${i + 1}`}
                    >
                      <img src={src} alt={`thumb-${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Sem imagem para exibir.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
