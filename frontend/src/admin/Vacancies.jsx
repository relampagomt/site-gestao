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
  Search,
  Upload as UploadIcon,
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

function normalizeStr(s = "") {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// CSV Parser simples com suporte a aspas ("," como separador)
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(cur);
        cur = "";
      } else if (c === "\n") {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = "";
      } else if (c === "\r") {
        // ignora CR
      } else {
        cur += c;
      }
    }
  }
  row.push(cur);
  rows.push(row);

  // remove linhas completamente vazias no final
  while (rows.length && rows[rows.length - 1].every((x) => x === "")) {
    rows.pop();
  }
  return rows;
}

function autoMapColumns(headers = []) {
  const norm = headers.map((h) => normalizeStr(h));
  const findOne = (cands) => {
    for (const c of cands) {
      const idx = norm.findIndex((h) => h.includes(normalizeStr(c)));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  return {
    name: findOne(["nome", "name", "candidato", "candidata"]),
    phone: findOne(["telefone", "celular", "whatsapp", "phone"]),
    address: findOne(["endereco", "endereço", "address"]),
    age: findOne(["idade", "age"]),
    sex: findOne(["sexo", "genero", "gênero", "gender"]),
    department: findOne(["departamento", "area", "setor", "área", "setor"]),
    job_type: findOne(["tipo (cargo)", "tipo", "cargo", "funcao", "função", "job type", "tipo de contrato"]),
    salary: findOne(["salario", "salário", "pretensao", "pretensão", "remuneracao", "remuneração"]),
    photos: findOne(["fotos", "fotos (urls)", "imagens", "imagens (urls)", "anexos", "upload", "photos", "arquivos"]),
  };
}

function parseSalaryBR(str) {
  if (str == null) return 0;
  let s = String(str).trim();
  if (!s) return 0;
  const cleaned = s.replace(/[^\d,.\-]/g, "");
  if (/,(\d{2})$/.test(cleaned)) {
    return Number(cleaned.replace(/\./g, "").replace(",", "."));
  }
  return parseFloat(cleaned.replace(/,/g, "")) || 0;
}

function parsePhotos(val) {
  if (!val) return [];
  const text = String(val);
  const links = text.match(/https?:\/\/\S+/g);
  if (links && links.length) return links.map((s) => s.replace(/[),;]+$/, ""));
  return text
    .split(/[,;|]+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s));
}

function normalizeSex(val) {
  const v = normalizeStr(val);
  if (v.startsWith("masc")) return "Masculino";
  if (v.startsWith("fem")) return "Feminino";
  return "Outro";
}

/* ===================== Component ===================== */
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

  // ===== IMPORT (CSV upload) states =====
  const [importOpen, setImportOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvError, setCsvError] = useState("");
  const [importHeaders, setImportHeaders] = useState([]);
  const [importRows, setImportRows] = useState([]); // sem header
  const [columnMap, setColumnMap] = useState({
    name: -1, phone: -1, address: -1, age: -1, sex: -1,
    department: -1, job_type: -1, salary: -1, photos: -1,
  });
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Load data
  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/job-vacancies");
      const list = Array.isArray(data) ? data : [];
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

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((v) =>
        [v.name, v.phone, v.address, v.department, v.job_type]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(q))
      );
    }

    if (statusFilter !== "todos") {
      list = list.filter((v) => v.status === statusFilter);
    }

    if (departmentFilter !== "todos") {
      list = list.filter((v) => v.department === departmentFilter);
    }

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
    orientation: 'l',
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

  /** ===================== Import CSV (upload local) ===================== **/
  function resetImport() {
    setCsvFile(null);
    setCsvError("");
    setImportHeaders([]);
    setImportRows([]);
    setColumnMap({
      name: -1, phone: -1, address: -1, age: -1, sex: -1,
      department: -1, job_type: -1, salary: -1, photos: -1,
    });
    setImportProgress(0);
    setImporting(false);
  }

  function onCsvFileChange(e) {
    const f = e.target.files?.[0] || null;
    setCsvFile(f);
    setCsvError("");
    setImportHeaders([]);
    setImportRows([]);
  }

  function loadCsvPreview() {
    setCsvError("");
    setImportHeaders([]);
    setImportRows([]);

    if (!csvFile) {
      setCsvError("Selecione um arquivo .csv primeiro.");
      return;
    }
    if (!/\.csv$/i.test(csvFile.name)) {
      setCsvError("Arquivo inválido. Envie um .csv exportado do Google Forms/Sheets.");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setCsvError("Falha ao ler o arquivo. Tente novamente.");
    reader.onload = () => {
      try {
        const text = typeof reader.result === "string" ? reader.result : new TextDecoder("utf-8").decode(reader.result);
        const rows = parseCsv(text);
        if (!rows.length) throw new Error("CSV vazio ou ilegível.");

        const headers = rows[0];
        const dataRows = rows.slice(1).filter((r) => r.some((c) => String(c || "").trim() !== ""));

        setImportHeaders(headers);
        setImportRows(dataRows);

        const guess = autoMapColumns(headers);
        setColumnMap(guess);

        if (guess.name === -1) {
          setCsvError("Mapeie pelo menos a coluna 'Nome' para prosseguir.");
        }
      } catch (err) {
        console.error(err);
        setCsvError(err?.message || "Não foi possível interpretar o CSV.");
      }
    };
    reader.readAsText(csvFile, "utf-8");
  }

  function setMap(field, idx) {
    setColumnMap((m) => ({ ...m, [field]: Number(idx) }));
  }

  function canImport() {
    return importHeaders.length > 0 && columnMap.name !== -1;
  }

  async function doImport() {
    if (!canImport()) return;
    setImporting(true);
    setImportProgress(0);
    let ok = 0;
    let fail = 0;

    for (let i = 0; i < importRows.length; i++) {
      const r = importRows[i];
      const v = (idx) => (idx >= 0 && idx < r.length ? r[idx] : "");

      const payload = {
        name: (v(columnMap.name) || "").toString().trim(),
        phone: (v(columnMap.phone) || "").toString().trim(),
        address: (v(columnMap.address) || "").toString().trim(),
        age: (() => {
          const a = v(columnMap.age);
          const n = parseInt(String(a).replace(/[^\d-]/g, ""), 10);
          return Number.isFinite(n) ? n : null;
        })(),
        sex: columnMap.sex !== -1 ? normalizeSex(v(columnMap.sex)) : "Outro",
        department: (v(columnMap.department) || "Operacional").toString().trim() || "Operacional",
        job_type: (v(columnMap.job_type) || "CLT").toString().trim() || "CLT",
        status: "Aberta",
        salary: (() => {
          const s = v(columnMap.salary);
          return columnMap.salary !== -1 ? parseSalaryBR(s) : 0;
        })(),
        photos: (() => {
          const p = v(columnMap.photos);
          return columnMap.photos !== -1 ? parsePhotos(p) : [];
        })(),
      };

      try {
        if (!payload.name) throw new Error("Nome vazio");
        await api.post("/job-vacancies", payload);
        ok++;
      } catch (e) {
        console.error("Falha import linha", i, e);
        fail++;
      } finally {
        setImportProgress(i + 1);
      }
    }

    setImporting(false);
    alert(`Importação finalizada. Sucesso: ${ok} | Falhas: ${fail}`);
    setImportOpen(false);
    resetImport();
    await load();
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-3 md:px-6 py-4 md:py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">Vagas</h1>
      </div>

      {/* Filters Card */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg md:text-xl font-semibold">Filtros e Ações</CardTitle>
              <CardDescription>Filtre, exporte e importe dados das vagas</CardDescription>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => { resetImport(); setImportOpen(true); }}
                title="Importar respostas via upload de CSV"
              >
                <UploadIcon className="size-4" />
                Importar CSV
              </Button>

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
                <SelectTrigger className="w-56 md:w-56 max-w-full">
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
                <SelectTrigger className="w-48 md:w-56 max-w-full">
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
                <SelectTrigger className="w-48 md:w-56 max-w-full">
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
                                  key={src + idx}
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

      {/* Import CSV Modal */}
      <Dialog open={importOpen} onOpenChange={(o) => { setImportOpen(o); if (!o) resetImport(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar CSV (Google Forms/Sheets)</DialogTitle>
            <DialogDescription>
              Faça upload do arquivo <strong>.csv</strong> exportado do Google Forms/Sheets.
              <br />
              Dica (Sheets): Arquivo → Fazer download → <em>Valores separados por vírgulas (.csv)</em>.
            </DialogDescription>
          </DialogHeader>

          {/* File input */}
          <div className="space-y-2">
            <Label htmlFor="csvFile">Arquivo CSV</Label>
            <Input
              id="csvFile"
              type="file"
              accept=".csv,text/csv"
              onChange={onCsvFileChange}
            />
            <div className="flex gap-2 items-center">
              <Button type="button" variant="outline" onClick={loadCsvPreview} className="gap-2">
                <UploadIcon className="size-4" />
                Carregar & Visualizar
              </Button>
              {importHeaders.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  Linhas detectadas: {importRows.length}
                </span>
              )}
            </div>
            {!!csvError && <p className="text-sm text-red-600">{csvError}</p>}
          </div>

          {/* Mapping */}
          {importHeaders.length > 0 && (
            <div className="mt-4 space-y-4">
              <h3 className="text-base font-semibold">Mapeamento de Colunas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  ["Nome *", "name"],
                  ["Telefone", "phone"],
                  ["Endereço", "address"],
                  ["Idade", "age"],
                  ["Sexo", "sex"],
                  ["Departamento", "department"],
                  ["Tipo (Cargo)", "job_type"],
                  ["Salário", "salary"],
                  ["Fotos (URLs)", "photos"],
                ].map(([label, key]) => (
                  <div key={key}>
                    <Label>{label}</Label>
                    <Select value={String(columnMap[key])} onValueChange={(v) => setMap(key, v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a coluna" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="-1">— Ignorar —</SelectItem>
                        {importHeaders.map((h, idx) => (
                          <SelectItem key={idx} value={String(idx)}>
                            {String(h || `Coluna ${idx + 1}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Preview table */}
              <div>
                <h4 className="text-sm font-medium mb-2">Pré-visualização (primeiras 5 linhas)</h4>
                <div className="overflow-x-auto rounded border">
                  <table className="min-w-full table-auto text-xs">
                    <thead>
                      <tr>
                        {importHeaders.map((h, i) => (
                          <th key={i} className="px-2 py-1 border-b text-left">{h || `Coluna ${i + 1}`}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.slice(0, 5).map((r, ri) => (
                        <tr key={ri} className="border-b last:border-0">
                          {importHeaders.map((_, ci) => (
                            <td key={ci} className="px-2 py-1">{r[ci]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Import actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-muted-foreground">
                  {importing
                    ? `Importando ${importProgress}/${importRows.length}...`
                    : "Confirme o mapeamento e clique em Importar"}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setImportOpen(false); resetImport(); }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={doImport}
                    disabled={!canImport() || importing}
                  >
                    {importing ? `Importando ${importProgress}/${importRows.length}...` : `Importar ${importRows.length} linha(s)`}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Vacancies;
