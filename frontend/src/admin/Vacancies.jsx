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
import { Plus, Pencil, Trash2 } from "lucide-react";
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
    if (!window.confirm("Remover esta indicação?")) return;
    try {
      await api.delete(`/job-vacancies/${id}`);
      await load();
    } catch (e) {
      console.error("Erro ao remover vaga:", e);
      alert("Não foi possível remover. Tente novamente.");
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Vagas</h2>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Nova Indicação</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Vagas</CardTitle>
            <CardDescription>Registros cadastrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "—" : total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Vagas Abertas</CardTitle>
            <CardDescription>Disponíveis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "—" : openCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Em Processo</CardTitle>
            <CardDescription>Triagem/Contato</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "—" : items.filter((v) => (v.status || "").toLowerCase() === "em processo").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Fechadas</CardTitle>
            <CardDescription>Encerradas</CardDescription>
          </CardHeader>
          <CardContent>
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

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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

              <Button variant="outline" onClick={() => { setSearch(''); setStatusFilter('todos'); setDepartmentFilter('todos'); setJobTypeFilter('todos'); }}>
                Limpar Filtros
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
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-4">Nome</th>
                  <th className="py-2 pr-4">Telefone</th>
                  <th className="py-2 pr-4">Endereço</th>
                  <th className="py-2 pr-4">Idade</th>
                  <th className="py-2 pr-4">Sexo</th>
                  <th className="py-2 pr-4">Departamento</th>
                  <th className="py-2 pr-4">Tipo (Cargo)</th>
                  <th className="py-2 pr-4">Salário</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-6 text-center text-muted-foreground">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                )}
                {filtered.map((v) => (
                  <tr key={v.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">{v.name}</td>
                    <td className="py-3 pr-4">{v.phone}</td>
                    <td className="py-3 pr-4">{v.address}</td>
                    <td className="py-3 pr-4">{v.age ?? "—"}</td>
                    <td className="py-3 pr-4">{v.sex}</td>
                    <td className="py-3 pr-4">
                      <Badge variant="secondary">{v.department}</Badge>
                    </td>
                    <td className="py-3 pr-4">{v.job_type}</td>
                    <td className="py-3 pr-4">
                      {v.salary ? `R$ ${Number(v.salary).toLocaleString()}` : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge
                        className={
                          (v.status || "").toLowerCase() === "aberta"
                            ? "bg-emerald-600"
                            : (v.status || "").toLowerCase() === "fechada"
