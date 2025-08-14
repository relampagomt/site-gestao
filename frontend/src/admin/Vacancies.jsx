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
import { Plus, Pencil, Trash2, UploadCloud, FileText } from "lucide-react";
import api from "@/services/api";

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
  documents_url: "", // novo: URL do PDF/PNG/JPG
};

export default function Vacancies() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // modal
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");

  // filtros
  const [statusFilter, setStatusFilter] = useState("todos");
  const [departmentFilter, setDepartmentFilter] = useState("todos");
  const [jobTypeFilter, setJobTypeFilter] = useState("todos");

  // upload documentos
  const [uploadingDoc, setUploadingDoc] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setLoading(true);
      const { data } = await api.get("/job-vacancies");
      setItems(Array.isArray(data) ? data : []);
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
      documents_url: v.documents_url || v.document_url || v.documentsUrl || "", // compat
    });
    setOpen(true);
  }

  async function handleSubmit(e) {
    e?.preventDefault?.();
    if (!form.name?.trim()) return alert("Informe o nome.");
    if (!form.phone?.trim()) return alert("Informe o telefone.");

    const payload = {
      ...form,
      age: form.age ? Number(form.age) : null,
      salary: form.salary ? Number(form.salary) : null,
      documents_url: form.documents_url || "",
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

  // upload do campo "Documentos" (PDF/PNG/JPG)
  async function onDocumentFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    try {
      const fd = new FormData();
      fd.append("file", file); // backend espera "file"
      const { data } = await api.post("/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = data?.url || data?.secure_url || data?.location || "";
      if (!url) throw new Error("URL não retornada.");
      setForm((f) => ({ ...f, documents_url: url }));
    } catch (err) {
      console.error("Erro no upload de documentos:", err);
      alert("Falha ao enviar documentos. Tente novamente.");
    } finally {
      setUploadingDoc(false);
    }
  }

  const isPdf = (url) => /\.pdf(\?|$)/i.test(String(url || ""));

  return (
    <div className="admin-page-container admin-space-y-6">
      <div className="admin-page-header">
        <h2 className="admin-page-title">Vagas</h2>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="admin-card">
          <CardHeader className="admin-card-header pb-2">
            <CardTitle className="admin-card-title text-sm font-medium">Total de Vagas</CardTitle>
            <CardDescription className="admin-card-description">Registros cadastrados</CardDescription>
          </CardHeader>
          <CardContent className="admin-card-content">
            <div className="text-2xl font-bold">{loading ? "—" : total}</div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader className="admin-card-header pb-2">
            <CardTitle className="admin-card-title text-sm font-medium">Vagas Abertas</CardTitle>
            <CardDescription className="admin-card-description">Disponíveis</CardDescription>
          </CardHeader>
          <CardContent className="admin-card-content">
            <div className="text-2xl font-bold">{loading ? "—" : openCount}</div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader className="admin-card-header pb-2">
            <CardTitle className="admin-card-title text-sm font-medium">Em Processo</CardTitle>
            <CardDescription className="admin-card-description">Triagem/Contato</CardDescription>
          </CardHeader>
          <CardContent className="admin-card-content">
            <div className="text-2xl font-bold">
              {loading ? "—" : items.filter((v) => (v.status || "").toLowerCase() === "em processo").length}
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader className="admin-card-header pb-2">
            <CardTitle className="admin-card-title text-sm font-medium">Fechadas</CardTitle>
            <CardDescription className="admin-card-description">Encerradas</CardDescription>
          </CardHeader>
          <CardContent className="admin-card-content">
            <div className="text-2xl font-bold">
              {loading ? "—" : items.filter((v) => (v.status || "").toLowerCase() === "fechada").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca e Filtros */}
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

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
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
                  <th className="py-2 px-3 text-center">Documentos</th>{/* novo */}
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
                {filtered.map((v) => (
                  <tr key={v.id} className="border-b last:border-0">
                    <td className="py-3 px-3">{v.name}</td>
                    <td className="py-3 px-3">{v.phone}</td>
                    <td className="py-3 px-3">{v.address}</td>
                    <td className="py-3 px-3">{v.age ?? "—"}</td>
                    <td className="py-3 px-3">{v.sex}</td>
                    <td className="py-3 px-3">
                      <Badge variant="secondary">{v.department}</Badge>
                    </td>
                    <td className="py-3 px-3">{v.job_type}</td>
                    <td className="py-3 px-3">
                      {v.salary ? `R$ ${Number(v.salary).toLocaleString()}` : "—"}
                    </td>

                    {/* Documentos */}
                    <td className="py-3 px-3">
                      {v.documents_url ? (
                        isPdf(v.documents_url) ? (
                          <a
                            href={v.documents_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 underline text-blue-600"
                            title="Abrir PDF"
                          >
                            <FileText className="h-4 w-4" /> PDF
                          </a>
                        ) : (
                          <a
                            href={v.documents_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir imagem"
                            className="inline-block"
                          >
                            <img
                              src={v.documents_url}
                              alt="documento"
                              className="h-10 w-10 object-cover rounded border"
                              loading="lazy"
                            />
                          </a>
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>

                    <td className="py-3 px-3">
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

                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <Button variant="outline" size="icon" className="mr-2" onClick={() => openEdit(v)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDelete(v.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
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

              {/* Documentos (PDF/PNG/JPG) */}
              <div className="space-y-2">
                <Label>Documentos (PDF/PNG/JPG)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept="application/pdf,image/png,image/jpeg"
                    onChange={onDocumentFileChange}
                  />
                  <Button type="button" variant="outline" disabled className="gap-2">
                    <UploadCloud className="h-4 w-4" />
                    {uploadingDoc ? "Enviando..." : "Upload"}
                  </Button>
                </div>

                {form.documents_url && (
                  <div className="mt-2">
                    {isPdf(form.documents_url) ? (
                      <a
                        href={form.documents_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 underline text-blue-600"
                        title="Abrir PDF"
                      >
                        <FileText className="h-4 w-4" /> Ver PDF enviado
                      </a>
                    ) : (
                      <a
                        href={form.documents_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir imagem"
                        className="inline-block"
                      >
                        <img
                          src={form.documents_url}
                          alt="documento"
                          className="h-20 w-20 object-cover rounded border"
                        />
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{editingId ? "Salvar" : "Criar"}</Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
