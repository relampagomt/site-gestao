import React, { useEffect, useMemo, useState, useCallback } from "react";
import api from "@/services/api";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.jsx";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Checkbox } from "@/components/ui/checkbox.jsx";
import { Plus, Search, Edit, Trash2, ChevronsUpDown, Check, X } from "lucide-react";

/* ====== SEGMENTOS AGRUPADOS (compactos) ================================== */
export const SEGMENTOS_GRUPOS = [
  {
    group: "Tecnologia e Informática",
    options: [
      { value: "Desenvolvimento de Software", desc: "Programador, Dev Web, Eng. Software" },
      { value: "Segurança da Informação", desc: "Analista/Eng. Segurança, Hacker Ético" },
      { value: "Ciência de Dados", desc: "Cientista/Analista de Dados, Eng. ML" },
      { value: "Infraestrutura e Redes", desc: "Adm. Sistemas, Eng. Redes, Suporte" },
      { value: "Design Digital", desc: "UX/UI, Web, Jogos" },
    ],
  },
  {
    group: "Saúde e Bem-Estar",
    options: [
      { value: "Medicina", desc: "Clínico, Cirurgião, Pediatra, Gineco" },
      { value: "Enfermagem", desc: "Enfermeiro, Téc. Enfermagem" },
      { value: "Terapias e Reabilitação", desc: "Fisio, TO, Fono" },
      { value: "Nutrição", desc: "Clínico, Esportivo" },
      { value: "Saúde Mental", desc: "Psicólogo, Psiquiatra, Psicanalista" },
    ],
  },
  {
    group: "Engenharia e Indústria",
    options: [
      { value: "Engenharia Civil", desc: "Eng. Civil, Arquiteto, Téc. Edificações" },
      { value: "Engenharia Mecânica", desc: "Eng. Mecânico, Manutenção" },
      { value: "Engenharia Elétrica", desc: "Eng. Eletricista, Eletrotécnico" },
      { value: "Engenharia de Produção", desc: "Eng. Produção, GP Industrial" },
      { value: "Indústria", desc: "Operador de Máquinas, Automação" },
    ],
  },
  {
    group: "Comunicação e Marketing",
    options: [
      { value: "Jornalismo", desc: "Repórter, Editor, Assessor" },
      { value: "Publicidade e Propaganda", desc: "Redator, Direção de Arte, Conteúdo" },
      { value: "Marketing Digital", desc: "SEO/SEM, Social, Analista" },
      { value: "Relações Públicas", desc: "RP, Assessoria" },
    ],
  },
  {
    group: "Negócios e Finanças",
    options: [
      { value: "Administração", desc: "Administrador, GP" },
      { value: "Contabilidade e Finanças", desc: "Contador, Analista, Auditor, Economista" },
      { value: "Recursos Humanos", desc: "Analista de RH, Recrutador, GPessoas" },
      { value: "Vendas e Comércio", desc: "Gerente de Vendas, Consultor, Vendedor" },
    ],
  },
  {
    group: "Educação e Cultura",
    options: [
      { value: "Ensino", desc: "Professor, Coord. Pedagógico, Tutor" },
      { value: "Pesquisa", desc: "Pesquisador, Cientista" },
      { value: "Artes", desc: "Artista, Músico, Ator, Diretor" },
      { value: "Museologia e História", desc: "Historiador, Curador, Museólogo" },
      { value: "Biblioteca", desc: "Bibliotecário, Arquivista" },
    ],
  },
  {
    group: "Direito e Segurança",
    options: [
      { value: "Direito", desc: "Advogado, Juiz, Promotor" },
      { value: "Segurança Pública", desc: "Policial, Bombeiro, Agente Penitenciário" },
      { value: "Segurança Privada", desc: "Vigilante, Consultor" },
      { value: "Perícia", desc: "Perito Criminal/Judicial" },
    ],
  },
  {
    group: "Serviços e Social",
    options: [
      { value: "Hotelaria e Turismo", desc: "Hotel, Guia, Viagens" },
      { value: "Gastronomia", desc: "Chef, Confeiteiro, Bartender" },
      { value: "Beleza e Estética", desc: "Cabeleireiro, Esteticista, Maquiador" },
      { value: "Serviço Social", desc: "Assistente Social, Sociólogo" },
    ],
  },
];

export const SEGMENTOS = SEGMENTOS_GRUPOS.flatMap(g => g.options.map(o => o.value));

const ensureArraySegments = (row) => {
  if (Array.isArray(row?.segments)) return row.segments;
  if (typeof row?.segment === "string" && row.segment.trim()) {
    return row.segment.split(",").map(s => s.trim()).filter(Boolean);
  }
  if (typeof row?.segmentos === "string" && row.segmentos.trim()) {
    return row.segmentos.split(",").map(s => s.trim()).filter(Boolean);
  }
  return [];
};

/* ====== Combobox multi — COMPACTO e com scroll garantido =================== */
function SegmentosSelect({ value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const toggle = (label) => {
    const exists = value.includes(label);
    const next = exists ? value.filter((s) => s !== label) : [...value, label];
    onChange(next);
  };

  // evita que o scroll "vaze" para o Dialog
  const stopScrollProp = useCallback((e) => e.stopPropagation(), []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          {value.length === 0 ? "Selecionar segmentos" : (
            <span className="truncate">
              {value.slice(0, 2).join(", ")}{value.length > 2 ? ` +${value.length - 2}` : ""}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        collisionPadding={24}
        className="p-0 z-[70] w-[min(92vw,320px)] sm:w-[360px] bg-background"
      >
        {/* SCROLLER: mais compacto e com gesto funcionando */}
        <div
          className="max-h-[50vh] overflow-y-auto overscroll-contain pb-2"
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
          onWheel={stopScrollProp}
          onTouchMove={stopScrollProp}
        >
          <Command className="text-[13px] leading-tight">
            <div className="sticky top-0 z-10 bg-background">
              <CommandInput placeholder="Buscar segmento..." />
            </div>

            <CommandEmpty className="py-2">Nenhum segmento encontrado.</CommandEmpty>

            <CommandList className="max-h-none">
              {SEGMENTOS_GRUPOS.map((grp) => (
                <CommandGroup
                  key={grp.group}
                  heading={<span className="text-[11px] font-semibold text-muted-foreground">{grp.group}</span>}
                  className="px-1 py-1"
                >
                  {grp.options.map((opt) => {
                    const checked = value.includes(opt.value);
                    return (
                      <CommandItem
                        key={`${grp.group}-${opt.value}`}
                        value={`${opt.value} ${opt.desc}`}
                        className="flex items-start gap-2 py-1 px-2"
                        onSelect={() => toggle(opt.value)}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggle(opt.value)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{opt.value}</div>
                          <div className="text-[11px] text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                            {opt.desc}
                          </div>
                        </div>
                        {checked && <Check className="h-4 w-4 opacity-70" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
              <div className="h-1" />
            </CommandList>
          </Command>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ====== Página ============================================================= */
const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  // modal (create/edit)
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create");
  const [saving, setSaving] = useState(false);

  // dialog excluir
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);

  const emptyForm = {
    id: null,
    name: "",
    company: "",
    segments: [],
    email: "",
    phone: "",
    notes: "",
  };
  const [form, setForm] = useState(emptyForm);

  async function fetchClients() {
    setLoading(true);
    try {
      const { data } = await api.get("/clients");
      setClients(Array.isArray(data) ? data : data?.items ?? []);
    } catch (e) {
      console.error("Erro ao carregar clientes:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClients();
  }, []);

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
      name: row.name ?? "",
      company: row.company ?? row.company_name ?? row.companyName ?? "",
      segments: ensureArraySegments(row),
      email: row.email ?? "",
      phone: row.phone ?? "",
      notes: row.notes ?? "",
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
        name: form.name,
        company: form.company || "",
        company_name: form.company || "",
        segments: form.segments,
        segment: form.segments.join(", "),
        email: form.email,
        phone: form.phone,
        notes: form.notes || "",
      };

      if (mode === "create") {
        await api.post("/clients", payload);
      } else {
        const id = form.id;
        if (!id) throw new Error("ID do registro não encontrado para edição.");
        await api.put(`/clients/${id}`, payload);
      }

      setOpen(false);
      setForm(emptyForm);
      fetchClients();
    } catch (err) {
      console.error("Erro ao salvar cliente:", err);
      alert("Erro ao salvar cliente.");
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
      await api.delete(`/clients/${id}`);
      setOpenDelete(false);
      setRowToDelete(null);
      fetchClients();
    } catch (err) {
      console.error("Erro ao excluir cliente:", err);
      alert("Erro ao excluir cliente.");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return clients;
    return clients.filter((c) => {
      const segs = ensureArraySegments(c).join(" ");
      return [c.name, c.company, c.company_name, c.email, c.phone, segs]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(k));
    });
  }, [clients, q]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">Clientes</h1>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Registros</CardTitle>
          <CardDescription>Lista de clientes cadastrados</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros + botão "+ Novo Cliente" */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por nome, empresa, segmento, e-mail ou telefone..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="admin-btn-primary gap-2 min-h-[36px]" onClick={openCreate}>
                  <Plus className="h-5 w-5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                  <span className="whitespace-nowrap">Novo Cliente</span>
                </Button>
              </DialogTrigger>

              {/* Modal mais estreito e centralizado */}
              <DialogContent className="p-0 sm:max-w-[560px] md:max-w-[600px]">
                <div className="max-h-[80vh] overflow-y-auto p-6">
                  <DialogHeader className="pb-2">
                    <DialogTitle>{mode === "create" ? "Novo Cliente" : "Editar Cliente"}</DialogTitle>
                    <DialogDescription>
                      {mode === "create" ? "Cadastre um novo cliente." : "Atualize os dados do cliente."}
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={onSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                        <Label>Nome</Label>
                        <Input name="name" value={form.name} onChange={onChange} required />
                      </div>

                      <div className="md:col-span-2">
                        <Label>Empresa</Label>
                        <Input name="company" value={form.company} onChange={onChange} />
                      </div>

                      {/* Segmentos */}
                      <div className="md:col-span-2 space-y-2">
                        <Label>Segmentos</Label>
                        <SegmentosSelect
                          value={form.segments}
                          onChange={(next) => setForm((f) => ({ ...f, segments: next }))}
                        />
                        {form.segments.length > 0 && (
                          <div className="flex flex-wrap gap-2 justify-start">
                            {form.segments.map((s) => (
                              <Badge key={s} variant="secondary" className="gap-1">
                                {s}
                                <button
                                  type="button"
                                  className="ml-1 opacity-70 hover:opacity-100"
                                  onClick={() =>
                                    setForm((f) => ({ ...f, segments: f.segments.filter((x) => x !== s) }))
                                  }
                                  title="Remover"
                                >
                                  <X className="size-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label>E-mail</Label>
                        <Input type="email" name="email" value={form.email} onChange={onChange} />
                      </div>
                      <div>
                        <Label>Telefone</Label>
                        <Input name="phone" value={form.phone} onChange={onChange} />
                      </div>

                      <div className="md:col-span-2">
                        <Label>Observações</Label>
                        <Textarea name="notes" value={form.notes} onChange={onChange} />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={saving}>
                        {saving ? "Salvando..." : mode === "create" ? "Salvar" : "Atualizar"}
                      </Button>
                    </div>
                  </form>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Tabela centralizada (títulos + dados) */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Nome</TableHead>
                  <TableHead className="text-center">Empresa</TableHead>
                  <TableHead className="text-center">Segmentos</TableHead>
                  <TableHead className="text-center">E-mail</TableHead>
                  <TableHead className="text-center">Telefone</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-6">Carregando…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-6">Nenhum registro</TableCell></TableRow>
                ) : (
                  filtered.map((c) => {
                    const id = c.id ?? c._id ?? c.uuid;
                    const company = c.company ?? c.company_name ?? c.companyName ?? "—";
                    const segs = ensureArraySegments(c);
                    return (
                      <TableRow key={id || `${c.name}-${c.email}-${c.phone}`}>
                        <TableCell className="text-center font-medium">{c.name || "—"}</TableCell>
                        <TableCell className="text-center">{company}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {segs.slice(0, 2).map((s) => (
                              <Badge key={s} variant="secondary">{s}</Badge>
                            ))}
                            {segs.length > 2 && <Badge variant="outline">+{segs.length - 2}</Badge>}
                            {segs.length === 0 && <span className="text-muted-foreground">—</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{c.email || "—"}</TableCell>
                        <TableCell className="text-center">{c.phone || "—"}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button size="sm" variant="outline" className="gap-2" onClick={() => openEdit(c)}>
                              <Edit className="size-4" /> Editar
                            </Button>
                            <Button size="sm" variant="destructive" className="gap-2" onClick={() => confirmDelete(c)}>
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

      {/* Dialog de exclusão */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir cliente?</DialogTitle>
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

export default Clients;
