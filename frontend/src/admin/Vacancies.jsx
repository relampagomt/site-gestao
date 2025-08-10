import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog.jsx";
import { Loader2, Plus, Search, Trash2, Pencil, UserPlus, Briefcase } from "lucide-react";
import api from "@/services/api";

const emptyVacancy = {
  title: "",
  department: "",
  location: "",
  type: "CLT",
  salary: "",
  status: "Aberta", // Aberta | Em Processo | Fechada
  candidates: [],
  candidates_count: 0,
};

export default function Vacancies() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vacancies, setVacancies] = useState([]); // <- sem mock
  const [search, setSearch] = useState("");

  // dialogs
  const [openEdit, setOpenEdit] = useState(false);
  const [openCandidate, setOpenCandidate] = useState(false);

  const [current, setCurrent] = useState(emptyVacancy); // vaga em edição
  const [editingId, setEditingId] = useState(null);

  const [candidate, setCandidate] = useState({ name: "", phone: "", email: "" });
  const [candidateVacancy, setCandidateVacancy] = useState(null);

  useEffect(() => {
    fetchVacancies();
  }, []);

  async function fetchVacancies() {
    try {
      setLoading(true);
      const { data } = await api.get("/job-vacancies");
      // normaliza defensivamente
      const normalized = (data || []).map((v) => ({
        ...v,
        candidates: Array.isArray(v.candidates) ? v.candidates : [],
        candidates_count:
          typeof v.candidates_count === "number" ? v.candidates_count : (Array.isArray(v.candidates) ? v.candidates.length : 0),
      }));
      setVacancies(normalized);
    } catch (e) {
      console.error("Erro ao carregar vagas:", e);
      setVacancies([]); // não repõe mock
    } finally {
      setLoading(false);
    }
  }

  function startCreate() {
    setEditingId(null);
    setCurrent(emptyVacancy);
    setOpenEdit(true);
  }

  function startEdit(vac) {
    setEditingId(vac.id);
    setCurrent({
      ...emptyVacancy,
      ...vac,
      salary: String(vac.salary ?? ""),
    });
    setOpenEdit(true);
  }

  async function saveVacancy(e) {
    e?.preventDefault?.();
    setSaving(true);
    try {
      const payload = {
        ...current,
        salary: current.salary ? Number(current.salary) : 0,
      };
      if (editingId) {
        await api.put(`/job-vacancies/${editingId}`, payload);
      } else {
        await api.post("/job-vacancies", payload);
      }
      await fetchVacancies();
      setOpenEdit(false);
    } catch (e) {
      console.error("Erro ao salvar vaga:", e);
    } finally {
      setSaving(false);
    }
  }

  async function removeVacancy(id) {
    if (!confirm("Tem certeza que deseja excluir esta vaga?")) return;
    try {
      await api.delete(`/job-vacancies/${id}`);
      await fetchVacancies();
    } catch (e) {
      console.error("Erro ao excluir vaga:", e);
    }
  }

  // --------- Candidatos ----------
  function startAddCandidate(vac) {
    setCandidate({ name: "", phone: "", email: "" });
    setCandidateVacancy(vac);
    setOpenCandidate(true);
  }

  async function saveCandidate(e) {
    e?.preventDefault?.();
    if (!candidateVacancy) return;
    setSaving(true);
    try {
      const updated = {
        candidates: [...(candidateVacancy.candidates || []), { ...candidate, created_at: new Date().toISOString() }],
        candidates_count: (candidateVacancy.candidates_count || 0) + 1,
      };
      await api.put(`/job-vacancies/${candidateVacancy.id}`, updated);
      await fetchVacancies();
      setOpenCandidate(false);
    } catch (e) {
      console.error("Erro ao adicionar candidato:", e);
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return vacancies;
    return vacancies.filter((v) =>
      [v.title, v.department, v.location, v.type, v.status]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(s)),
    );
  }, [search, vacancies]);

  const totals = useMemo(() => {
    const total = vacancies.length;
    const open = vacancies.filter((v) => v.status === "Aberta").length;
    const processing = vacancies.filter((v) => v.status === "Em Processo").length;
    const candidatesSum = vacancies.reduce((acc, v) => acc + (v.candidates_count || 0), 0);
    return { total, open, processing, candidatesSum };
  }, [vacancies]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Vagas</h2>
        <Button onClick={startCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Vaga
        </Button>
      </div>

      {/* Cards resumidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Total de Vagas" value={loading ? "-" : totals.total} icon={<Briefcase className="h-4 w-4" />} />
        <SummaryCard title="Vagas Abertas" value={loading ? "-" : totals.open} />
        <SummaryCard title="Total Candidatos" value={loading ? "-" : totals.candidatesSum} />
        <SummaryCard title="Em Processo" value={loading ? "-" : totals.processing} />
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar vagas por título, departamento ou localização..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Vagas</CardTitle>
          <CardDescription>Gerencie todas as vagas de emprego da empresa</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">Nenhuma vaga encontrada</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-3 pr-2">Título</th>
                    <th className="py-3 pr-2">Departamento</th>
                    <th className="py-3 pr-2">Localização</th>
                    <th className="py-3 pr-2">Tipo</th>
                    <th className="py-3 pr-2">Salário</th>
                    <th className="py-3 pr-2">Candidatos</th>
                    <th className="py-3 pr-2">Status</th>
                    <th className="py-3 pr-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v) => (
                    <tr key={v.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-2 font-medium">{v.title}</td>
                      <td className="py-3 pr-2">
                        {v.department ? <Badge variant="outline">{v.department}</Badge> : "-"}
                      </td>
                      <td className="py-3 pr-2">{v.location || "-"}</td>
                      <td className="py-3 pr-2">{v.type || "-"}</td>
                      <td className="py-3 pr-2">{v.salary ? `R$ ${Number(v.salary).toLocaleString()}` : "-"}</td>
                      <td className="py-3 pr-2">{v.candidates_count || 0}</td>
                      <td className="py-3 pr-2">
                        {v.status === "Aberta" && <Badge className="bg-green-600 hover:bg-green-600">Aberta</Badge>}
                        {v.status === "Em Processo" && <Badge variant="secondary">Em Processo</Badge>}
                        {v.status === "Fechada" && <Badge variant="outline">Fechada</Badge>}
                      </td>
                      <td className="py-3 pr-2">
                        <div className="flex gap-2">
                          <Button size="icon" variant="secondary" onClick={() => startEdit(v)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="destructive" onClick={() => removeVacancy(v.id)} title="Excluir">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" onClick={() => startAddCandidate(v)} title="Adicionar candidato">
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog criar/editar vaga */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Vaga" : "Nova Vaga"}</DialogTitle>
            <DialogDescription>Preencha os campos abaixo e salve.</DialogDescription>
          </DialogHeader>

          <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={saveVacancy}>
            <div className="sm:col-span-2">
              <Label>Título</Label>
              <Input value={current.title} onChange={(e) => setCurrent({ ...current, title: e.target.value })} required />
            </div>

            <div>
              <Label>Departamento</Label>
              <Input value={current.department} onChange={(e) => setCurrent({ ...current, department: e.target.value })} />
            </div>

            <div>
              <Label>Localização</Label>
              <Input value={current.location} onChange={(e) => setCurrent({ ...current, location: e.target.value })} />
            </div>

            <div>
              <Label>Tipo</Label>
              <Input value={current.type} onChange={(e) => setCurrent({ ...current, type: e.target.value })} />
            </div>

            <div>
              <Label>Salário (R$)</Label>
              <Input
                type="number"
                min="0"
                step="100"
                value={current.salary}
                onChange={(e) => setCurrent({ ...current, salary: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <Label>Status</Label>
              <Input value={current.status} onChange={(e) => setCurrent({ ...current, status: e.target.value })} />
            </div>

            <DialogFooter className="sm:col-span-2 mt-2">
              <Button type="button" variant="ghost" onClick={() => setOpenEdit(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog adicionar candidato */}
      <Dialog open={openCandidate} onOpenChange={setOpenCandidate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Candidato</DialogTitle>
            <DialogDescription>Informe os dados do candidato para esta vaga.</DialogDescription>
          </DialogHeader>

          <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={saveCandidate}>
            <div className="sm:col-span-2">
              <Label>Nome</Label>
              <Input value={candidate.name} onChange={(e) => setCandidate({ ...candidate, name: e.target.value })} required />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={candidate.phone} onChange={(e) => setCandidate({ ...candidate, phone: e.target.value })} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={candidate.email} onChange={(e) => setCandidate({ ...candidate, email: e.target.value })} />
            </div>

            <DialogFooter className="sm:col-span-2 mt-2">
              <Button type="button" variant="ghost" onClick={() => setOpenCandidate(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar candidato
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ title, value, icon }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
