// frontend/src/admin/Clients.jsx
import React, { useEffect, useMemo, useState } from "react";
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

/* =======================================================
   SEGMENTOS (com export para reuso se quiser)
======================================================= */
export const SEGMENTOS = [
  // AGRICULTURA, PECUÁRIA E PESCA
  "Agricultura","Pecuária","Pesca e Aquicultura","Floricultura","Silvicultura e Reflorestamento","Produção de Café",
  "Cultivo de Soja","Cultivo de Milho","Cultivo de Cana-de-Açúcar","Cultivo de Hortaliças","Fruticultura","Apicultura (Mel e derivados)",
  "Avicultura","Suinocultura","Bovinocultura de Corte","Bovinocultura de Leite","Pesqueiros e Pesque-Pagues",
  // INDÚSTRIA E PRODUÇÃO
  "Indústria Alimentícia","Indústria de Bebidas","Indústria Têxtil","Indústria de Calçados","Indústria de Embalagens","Indústria Química",
  "Indústria Farmacêutica","Indústria de Cosméticos","Indústria de Plásticos","Indústria de Papel e Celulose","Indústria Automotiva",
  "Indústria Metalúrgica","Indústria Moveleira","Construção Civil","Pré-moldados","Fábricas de Tijolos e Blocos","Fábricas de Cimento",
  "Serralherias","Marcenarias","Mineração e Extração","Indústria de Vidros","Indústria de Cerâmica",
  // COMÉRCIO VAREJISTA E ATACADISTA
  "Supermercados e Hipermercados","Atacados e Distribuidores","Mercearias e Minimercados","Lojas de Roupas e Acessórios",
  "Lojas de Calçados","Lojas de Eletrodomésticos","Lojas de Eletrônicos","Lojas de Móveis e Decoração","Material de Construção",
  "Lojas de Informática","Lojas de Telefonia e Acessórios","Lojas de Brinquedos","Livrarias e Papelarias","Joalherias e Óticas",
  "Comércio de Veículos","Revendas de Motos","Revendas de Caminhões","Concessionárias Náuticas","Postos de Combustível",
  "Oficinas Mecânicas","Autopeças","Loja de Pneus","Peixarias","Açougues","Sacolões e Hortifrutis",
  // SERVIÇOS
  "Agências de Publicidade e Marketing","Consultoria Empresarial","Assessoria Contábil","Escritórios de Advocacia","Serviços de Engenharia",
  "Serviços de Arquitetura","Serviços de TI e Software","Manutenção e Reparos","Serviços de Limpeza","Serviços de Segurança",
  "Serviços de Transporte","Logística e Armazenagem","Aluguel de Equipamentos","Coworking","Serviços de Tradução","Despachantes",
  "Serviços de Impressão e Gráficas","Produção de Vídeos","Fotografia Profissional","Organização de Eventos","Buffets e Catering",
  "Locação de Espaços para Eventos",
  // SAÚDE E BEM-ESTAR
  "Hospitais","Clínicas Médicas","Consultórios Odontológicos","Laboratórios de Análises Clínicas","Farmácias e Drogarias","Estúdios de Pilates",
  "Estúdios de Yoga","Academias de Ginástica","Crossfit","Clínicas de Estética","Clínicas de Emagrecimento","Clínicas de Cirurgia Plástica",
  "Clínicas de Terapias Naturais","Clínicas Veterinárias","Pet Shops","Hospitais Veterinários",
  // EDUCAÇÃO E CULTURA
  "Escolas de Ensino Fundamental","Escolas de Ensino Médio","Faculdades","Universidades","Cursos Técnicos","Cursos Profissionalizantes",
  "Cursos de Idiomas","Escolas de Música","Escolas de Dança","Escolas de Artes","Treinamentos Corporativos","Bibliotecas","Museus",
  "Centros Culturais",
  // ALIMENTAÇÃO E GASTRONOMIA
  "Restaurantes","Lanchonetes","Bares e Pubs","Padarias","Cafeterias","Food Trucks","Buffets","Churrascarias","Pizzarias","Docerias",
  "Confeitarias","Sorveterias","Hamburguerias","Self-Service",
  // TURISMO, LAZER E ENTRETENIMENTO
  "Hotéis","Pousadas","Resorts","Agências de Viagem","Casas de Show","Cinemas","Teatros","Parques","Clubes","Parques Aquáticos",
  "Eventos e Feiras","Casas Noturnas","Jogos e E-Sports","Centros de Convenções",
  // MODA E BELEZA
  "Salões de Beleza","Barbearias","Clínicas de Depilação","Lojas de Cosméticos","Estúdios de Maquiagem","Ateliês de Moda","Costureiras","Alfaiates",
  // OUTROS
  "ONGs","Associações","Cooperativas","Órgãos Públicos","Instituições Financeiras","Bancos","Cooperativas de Crédito","Seguradoras",
  "Corretoras de Seguros","Imobiliárias","Correios","Startups","Freelancers","Influenciadores Digitais","Profissionais Autônomos","Serviços Religiosos"
];

/* Utilitário: garante array de segmentos a partir do registro */
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

/* Combobox multi-seleção com busca (Segmentos) */
function SegmentosSelect({ value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const toggle = (item) => {
    const exists = value.includes(item);
    const next = exists ? value.filter((s) => s !== item) : [...value, item];
    onChange(next);
  };

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
      <PopoverContent className="p-0 w-[420px]">
        <Command>
          <CommandInput placeholder="Buscar segmento..." />
          <CommandEmpty>Nenhum segmento encontrado.</CommandEmpty>
          <CommandList className="max-h-[280px]">
            <CommandGroup>
              {SEGMENTOS.map((seg) => {
                const checked = value.includes(seg);
                return (
                  <CommandItem
                    key={seg}
                    value={seg}
                    className="flex items-center gap-2"
                    onSelect={() => toggle(seg)}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggle(seg)} />
                    <span className="flex-1">{seg}</span>
                    {checked && <Check className="h-4 w-4 opacity-70" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

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
    segments: [],   // ← NOVO (array)
    email: "",
    phone: "",
    document: "",
    address: "",
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
      document: row.document ?? row.cnpj ?? row.cpf ?? "",
      address: row.address ?? "",
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
        segments: form.segments,                 // ← envia array
        segment: form.segments.join(", "),       // ← compatibilidade
        email: form.email,
        phone: form.phone,
        document: form.document || null,
        address: form.address || "",
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
      return [c.name, c.company, c.company_name, c.email, c.phone, c.document, segs]
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
          {/* === Container de filtros + "+ Novo Cliente" (aqui dentro) === */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por nome, empresa, segmento, e-mail, telefone..."
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

              <DialogContent className="max-w-2xl p-0">
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

                      {/* Empresa */}
                      <div className="md:col-span-2">
                        <Label>Empresa</Label>
                        <Input name="company" value={form.company} onChange={onChange} />
                      </div>

                      {/* Segmentos (combobox multi com busca) */}
                      <div className="md:col-span-2 space-y-2">
                        <Label>Segmentos</Label>
                        <SegmentosSelect
                          value={form.segments}
                          onChange={(next) => setForm((f) => ({ ...f, segments: next }))}
                        />
                        {form.segments.length > 0 && (
                          <div className="flex flex-wrap gap-2">
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
                      <div>
                        <Label>Documento (CPF/CNPJ)</Label>
                        <Input name="document" value={form.document} onChange={onChange} />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Endereço</Label>
                        <Input name="address" value={form.address} onChange={onChange} />
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

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Segmentos</TableHead>{/* ← NOVA COLUNA */}
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7}>Carregando…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7}>Nenhum registro</TableCell></TableRow>
                ) : (
                  filtered.map((c) => {
                    const id = c.id ?? c._id ?? c.uuid;
                    const company = c.company ?? c.company_name ?? c.companyName ?? "—";
                    const segs = ensureArraySegments(c);
                    return (
                      <TableRow key={id || `${c.name}-${c.email}-${c.phone}`}>
                        <TableCell className="font-medium">{c.name || "—"}</TableCell>
                        <TableCell>{company}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {segs.slice(0, 2).map((s) => (
                              <Badge key={s} variant="secondary">{s}</Badge>
                            ))}
                            {segs.length > 2 && <Badge variant="outline">+{segs.length - 2}</Badge>}
                            {segs.length === 0 && <span className="text-muted-foreground">—</span>}
                          </div>
                        </TableCell>
                        <TableCell>{c.email || "—"}</TableCell>
                        <TableCell>{c.phone || "—"}</TableCell>
                        <TableCell>{c.document || "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="gap-2" onClick={() => openEdit(c)}>
                              <Edit className="size-4" />
                              Editar
                            </Button>
                            <Button size="sm" variant="destructive" className="gap-2" onClick={() => confirmDelete(c)}>
                              <Trash2 className="size-4" />
                              Excluir
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
