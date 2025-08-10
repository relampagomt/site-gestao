import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger } from "@/components/ui/sheet.jsx";
import { Plus, Edit2, Trash2 } from "lucide-react";
import api from "@/services/api";

const DEPARTMENTS = [
  "Operacional",
  "Comercial",
  "Administrativo",
  "Prestação de Serviços",
  "Outros",
];

const JOB_TYPES = ["CLT", "PJ", "Freelancer", "Diarista", "Temporário"];
const STATUSES = ["Aberta", "Em Processo", "Fechada"];
const SEXES = ["Masculino", "Feminino", "Outro"];

const emptyForm = {
  id: null,
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
  const [openSheet, setOpenSheet] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const { data } = await api.get("/job-vacancies");
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Erro ao listar vagas", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function edit(row) {
    setForm({
      id: row.id,
      name: row.name || "",
      phone: row.phone || "",
      address: row.address || "",
      age: row.age ?? "",
      sex: row.sex || "Outro",
      department: row.department || "Operacional",
      job_type: row.job_type || "CLT",
      status: row.status || "Aberta",
      salary: row.salary ?? "",
    });
    setOpenSheet(true);
  }

  function resetForm() {
    setForm(emptyForm);
  }

  async function save() {
    const payload = {
      ...form,
      age: form.age ? Number(form.age) : null,
      salary: form.salary === "" ? 0 : Number(form.salary),
    };

    try {
      if (form.id) {
        await api.put(`/job-vacancies/${form.id}`, payload);
      } else {
        await api.post("/job-vacancies", payload);
      }
      setOpenSheet(false);
      resetForm();
      await load();
    } catch (e) {
      console.error("Erro ao salvar vaga", e);
      alert("Não foi possível salvar. Veja o console para detalhes.");
    }
  }

  async function remove(id) {
    if (!confirm("Remover este registro?")) return;
    try {
      await api.delete(`/job-vacancies/${id}`);
      await load();
    } catch (e) {
      console.error("Erro ao remover vaga", e);
      alert("Não foi possível remover.");
    }
  }

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    if (!t) return items;
    return items.filter((i) =>
      [
        i.name,
        i.phone,
        i.address,
        i.department,
        i.job_type,
        i.status,
        String(i.salary ?? ""),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [items, query]);

  const total = items.length;
  const abertas = items.filter((i) => i.status === "Aberta").length;
  const emProcesso = items.filter((i) => i.status === "Em Processo").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Vagas</h2>
        <Sheet open={openSheet} onOpenChange={(o) => (o ? setOpenSheet(true) : (setOpenSheet(false), resetForm()))}>
          <SheetTrigger asChild>
            <Button onClick={() => setOpenSheet(true)} className="gap-2">
              <Plus className="size-4" /> Nova Indicação
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{form.id ? "Editar Indicação" : "Nova Indicação"}</SheetTitle>
              <p className="text-sm text-muted-foreground">
                Preencha os dados do candidato à vaga.
              </p>
            </SheetHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <div className="sm:col-span-2">
                <label className="text-sm">Nome</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <label className="text-sm">Telefone</label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(65) 9 9999-9999"
                />
              </div>

              <div>
                <label className="text-sm">Idade</label>
                <Input
                  type="number"
                  min={14}
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  placeholder="Ex.: 22"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm">Endereço Residencial</label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Rua / Bairro / Cidade"
                />
              </div>

              <div>
                <label className="text-sm">Sexo</label>
                <Select value={form.sex} onValueChange={(v) => setForm({ ...form, sex: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEXES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm">Departamento</label>
                <Select
                  value={form.department}
                  onValueChange={(v) => setForm({ ...form, department: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm">Tipo (Cargo)</label>
                <Select
                  value={form.job_type}
                  onValueChange={(v) => setForm({ ...form, job_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm">Status</label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm">
                  Salário{" "}
                  <span className="text-xs text-muted-foreground">
                    (Obs.: Freelancer/Diarista = valor por diária)
                  </span>
                </label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.salary}
                  onChange={(e) => setForm({ ...form, salary: e.target.value })}
                  placeholder="Ex.: 2200"
                />
              </div>
            </div>

            <SheetFooter className="mt-6">
              <div className="flex gap-2 w-full justify-end">
                <Button variant="secondary" onClick={() => (setOpenSheet(false), resetForm())}>
                  Cancelar
                </Button>
                <Button onClick={save}>Salvar</Button>
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total de Vagas</CardTitle>
            <CardDescription>Registros cadastrados</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Vagas Abertas</CardTitle>
            <CardDescription>Disponíveis</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{abertas}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Em Processo</CardTitle>
            <CardDescription>Em andamento</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{emProcesso}</CardContent>
        </Card>
      </div>

      {/* Filtro */}
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nome, telefone, endereço, etc..."
        className="max-w-2xl"
      />

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lista de Vagas</CardTitle>
          <CardDescription>Gerencie as indicações de candidatos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-4">Nome</th>
                  <th className="py-2 pr-4">Telefone</th>
                  <th className="py-2 pr-4">Endereço</th>
                  <th className="py-2 pr-4">Idade</th>
                  <th className="py-2 pr-4">Sexo</th>
                  <th className="py-2 pr-4">Departamento</th>
                  <th className="py-2 pr-4">Tipo</th>
                  <th className="py-2 pr-4">Salário</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4 text-right">Ações</th>
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

                {filtered.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="py-3 pr-4 font-medium">{row.name}</td>
                    <td className="py-3 pr-4">{row.phone}</td>
                    <td className="py-3 pr-4 max-w-[280px] truncate">{row.address}</td>
                    <td className="py-3 pr-4">{row.age ?? "-"}</td>
                    <td className="py-3 pr-4">{row.sex}</td>
                    <td className="py-3 pr-4">
                      <Badge variant="secondary">{row.department}</Badge>
                    </td>
                    <td className="py-3 pr-4">{row.job_type}</td>
                    <td className="py-3 pr-4">
                      {Number(row.salary || 0).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge
                        className={
                          row.status === "Aberta"
                            ? "bg-emerald-100 text-emerald-800"
                            : row.status === "Em Processo"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-200 text-slate-800"
                        }
                      >
                        {row.status}
                      </Badge>
                    </td>
                    <td className="py-3 pr-0">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="icon" variant="secondary" onClick={() => edit(row)}>
                          <Edit2 className="size-4" />
                        </Button>
                        <Button size="icon" variant="destructive" onClick={() => remove(row.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
