// frontend/src/admin/Clients.jsx
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
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Checkbox } from "@/components/ui/checkbox.jsx";
import { Separator } from "@/components/ui/separator.jsx";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronsUpDown,
  Check,
  X,
  Filter as FilterIcon,
  FileDown,           // CSV
  FileSpreadsheet,    // Excel
  FileText            // PDF
} from "lucide-react";

import PaginationBar from "@/components/pagination/PaginationBar.jsx";

/* ============================================================================
   TELEFONE BR (+55) — normalização e máscara com celular/fixo
============================================================================ */
function normalizePhoneBR(input) {
  let digits = String(input || "").replace(/\D/g, "");

  digits = digits.replace(/^0+/, "");
  if (digits.startsWith("55")) digits = digits.slice(2);

  const ddd = digits.slice(0, 2);
  let localRaw = digits.slice(2);

  const looksLikeFixed = (nums) => nums.length >= 8 && /^[2-5]/.test(nums);

  if (localRaw.length >= 10) {
    localRaw = localRaw[0] === "9" ? localRaw.slice(0, 9) : localRaw.slice(0, 8);
  } else if (localRaw.length === 9) {
    localRaw = localRaw[0] === "9" ? localRaw : localRaw.slice(0, 8);
  } else if (localRaw.length === 8) {
    if (!looksLikeFixed(localRaw) && /^[7-9]/.test(localRaw)) {
      localRaw = "9" + localRaw;
    }
  } else if (localRaw.length > 0 && localRaw.length < 8) {
    if (/^[7-9]/.test(localRaw) && localRaw[0] !== "9") {
      localRaw = "9" + localRaw;
    }
  }

  const local = localRaw;
  const e164 = `+55${ddd}${local}`;

  let display = "+55";
  if (ddd) display += `(${ddd})`;
  if (local) display += `${local}`;

  return { e164, display, ddd, local };
}

function formatPhoneDisplay(v) {
  const { display } = normalizePhoneBR(v);
  return display || "";
}

/* ====== SEGMENTOS AGRUPADOS (expandido) ================================== */
export const SEGMENTOS_GRUPOS = [
  {
    group: "Tecnologia e Informática",
    options: [
      { value: "Desenvolvimento de Software", desc: "Programador, Dev Web, Eng. Software" },
      { value: "Segurança da Informação", desc: "Analista/Eng. Segurança, Hacker Ético" },
      { value: "Ciência de Dados", desc: "Cientista/Analista de Dados, Eng. ML" },
      { value: "Infraestrutura e Redes", desc: "Adm. Sistemas, Eng. Redes, Suporte" },
      { value: "Design Digital", desc: "UX/UI, Web, Jogos" },
      { value: "Suporte e Help Desk", desc: "Atendimento técnico, Field" },
      { value: "Consultoria em TI", desc: "Implantação, Governança, RPA" },
      { value: "E-commerce & Marketplaces", desc: "Lojas virtuais, Marketplaces" },
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
      { value: "Odontologia", desc: "Dentista, Clínica Odontológica" },
      { value: "Oftalmologia", desc: "Oftalmo, Exames" },
      { value: "Laboratório de Análises", desc: "Exames, Coleta" },
      { value: "Clínicas Populares", desc: "Multiespecialidades" },
      { value: "Clínica Veterinária", desc: "Consultas, Cirurgias, Exames" },
      { value: "Farmácia e Drogaria", desc: "Medicamentos, Manipulação" },
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
      { value: "Manutenção Industrial", desc: "PCM, Caldeiraria, Solda" },
      { value: "Energias Renováveis", desc: "Solar, Eólica, Projetos" },
    ],
  },

  {
    group: "Comunicação e Marketing",
    options: [
      { value: "Jornalismo", desc: "Repórter, Editor, Assessor" },
      { value: "Publicidade e Propaganda", desc: "Redator, Direção de Arte, Conteúdo" },
      { value: "Marketing Digital", desc: "SEO/SEM, Social, Analista" },
      { value: "Relações Públicas", desc: "RP, Assessoria" },
      { value: "Gráfica e Comunicação Visual", desc: "Impressão, Plotagem, Sinalização" },
      { value: "Produtora de Vídeo/Áudio", desc: "Filmagem, Podcast, Estúdio" },
      { value: "Fotografia", desc: "Estúdio, Ensaios, Still" },
      { value: "Eventos e Locação", desc: "Som, Luz, Palco, Estruturas" },
    ],
  },

  {
    group: "Negócios e Finanças",
    options: [
      { value: "Administração", desc: "Administrador, GP" },
      { value: "Contabilidade e Finanças", desc: "Contador, Analista, Auditor, Economista" },
      { value: "Recursos Humanos", desc: "Analista de RH, Recrutador, GPessoas" },
      { value: "Vendas e Comércio", desc: "Gerente de Vendas, Consultor, Vendedor" },
      { value: "Corretora de Seguros", desc: "Auto, Vida, Saúde, Empresarial" },
      { value: "Correspondente Bancário", desc: "Crédito, Consignado, Empréstimos" },
      { value: "Franquias", desc: "Expansão, Gestão de Franqueados" },
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
      { value: "Escolas e Colégios", desc: "Educação Básica, Técnica" },
      { value: "Idiomas", desc: "Cursos, Intercâmbio" },
      { value: "Cursos Profissionalizantes", desc: "TI, Saúde, Indústria" },
      { value: "Autoescola", desc: "CNH, Reciclagem" },
      { value: "Esporte e Lazer", desc: "Clubes, Academias, Estúdios" },
    ],
  },

  {
    group: "Direito e Segurança",
    options: [
      { value: "Direito", desc: "Advogado, Juiz, Promotor" },
      { value: "Segurança Pública", desc: "Policial, Bombeiro, Agente Penitenciário" },
      { value: "Segurança Privada", desc: "Vigilante, Consultor" },
      { value: "Perícia", desc: "Perito Criminal/Judicial" },
      { value: "Compliance e LGPD", desc: "Proteção de Dados, Governança" },
      { value: "Defesa Civil", desc: "Proteção e resposta a desastres" },
    ],
  },

  {
    group: "Serviços e Social",
    options: [
      { value: "Hotelaria e Turismo", desc: "Hotel, Guia, Viagens" },
      { value: "Gastronomia", desc: "Chef, Confeiteiro, Bartender" },
      { value: "Beleza e Estética", desc: "Cabeleireiro, Esteticista, Maquiador" },
      { value: "Serviço Social", desc: "Assistente Social, Sociólogo" },
      { value: "Lavanderia", desc: "Lavagem, Secagem, Passadoria" },
      { value: "Costura e Ajustes", desc: "Conserto de roupas, Sob medida" },
      { value: "Chaveiro", desc: "Cópias, Aberturas, Troca de fechaduras" },
      { value: "Limpeza e Facilities", desc: "Residencial, Comercial, Pós-obra" },
      { value: "Jardinagem e Paisagismo", desc: "Manutenção, Projetos" },
      { value: "Dedetização e Sanitização", desc: "Pragas urbanas, Sanitização" },
      { value: "Mudanças e Carretos", desc: "Local, Interestadual" },
      { value: "Assistência Técnica", desc: "Eletro, Informática, Celular" },
      { value: "Coworking e Escritórios", desc: "Salas privativas, Compartilhadas" },
      { value: "Igrejas e Comunidades", desc: "Templos, Entidades religiosas" },
      { value: "ONGs e Terceiro Setor", desc: "Associações, Fundações" },
    ],
  },

  {
    group: "Comércio Varejista",
    options: [
      { value: "Supermercado e Mercearia", desc: "Supermercado, Mini-mercado, Atacado" },
      { value: "Padaria e Confeitaria", desc: "Padaria, Doceria, Bolos" },
      { value: "Açougue", desc: "Carnes, Frios" },
      { value: "Hortifruti", desc: "Frutas, Verduras, Legumes" },
      { value: "Ótica", desc: "Óculos, Lentes, Consultoria" },
      { value: "Loja de Roupas e Acessórios", desc: "Moda, Boutique, Lingerie" },
      { value: "Calçados", desc: "Sapataria, Sneakers" },
      { value: "Joalheria e Relojoaria", desc: "Semi-joias, Relógios" },
      { value: "Móveis e Decoração", desc: "Planejados, Colchões, Utilidades" },
      { value: "Eletro e Eletrônicos", desc: "TV, Som, Informática" },
      { value: "Livraria e Papelaria", desc: "Livros, Materiais escolares" },
      { value: "Floricultura", desc: "Flores, Presentes" },
      { value: "Loja de Utilidades", desc: "Variedades, 1,99" },
      { value: "Pet Shop", desc: "Rações, Acessórios, Banho e Tosa" },
    ],
  },

  {
    group: "Alimentação e Bebidas (Foodservice)",
    options: [
      { value: "Restaurante", desc: "À la carte, Self-service" },
      { value: "Pizzaria", desc: "Forno a lenha, Delivery" },
      { value: "Lanchonete", desc: "Sanduíches, Pastéis" },
      { value: "Hamburgueria", desc: "Artesanal, Smash" },
      { value: "Churrascaria", desc: "Rodízio, Espetos" },
      { value: "Cafeteria", desc: "Café, Brunch" },
      { value: "Sorveteria e Açaíteria", desc: "Gelatos, Açaí, Milk-shake" },
      { value: "Food Truck", desc: "Eventos, Itinerante" },
      { value: "Cozinha Industrial e Marmitaria", desc: "Corporativo, PF" },
      { value: "Delivery/Cozinha Fantasma", desc: "Somente entrega" },
      { value: "Bares e Pubs", desc: "Drinks, Petiscos, Música" },
    ],
  },

  {
    group: "Automotivo",
    options: [
      { value: "Oficina Mecânica", desc: "Mecânica leve/pesada" },
      { value: "Autoelétrica", desc: "Partida, Alternador, Injeção" },
      { value: "Funilaria e Pintura", desc: "Estética, Reparos" },
      { value: "Autopeças e Acessórios", desc: "Peças, Som, Película" },
      { value: "Lava Jato e Estética", desc: "Lavagem, Vitrificação" },
      { value: "Borracharia", desc: "Pneus, Alinhamento" },
      { value: "Concessionária/Revenda", desc: "Novos, Seminovos" },
      { value: "Motocicletas - Oficina e Peças", desc: "Motos, Acessórios" },
      { value: "Guincho e Socorro", desc: "24h, Reboque" },
    ],
  },

  {
    group: "Construção, Imobiliário e Manutenção",
    options: [
      { value: "Materiais de Construção", desc: "Cimento, Ferramentas" },
      { value: "Loja de Tintas", desc: "Tintas, Acessórios" },
      { value: "Vidraçaria", desc: "Box, Espelhos, Temperado" },
      { value: "Serralheria", desc: "Esquadrias, Portões" },
      { value: "Marcenaria", desc: "Móveis sob medida" },
      { value: "Marmoraria", desc: "Granito, Quartzo" },
      { value: "Elétrica e Hidráulica", desc: "Materiais e serviços" },
      { value: "Ar Condicionado e Refrigeração", desc: "Instalação, PMOC" },
      { value: "Imobiliária e Condomínios", desc: "Vendas, Locação, Gestão" },
      { value: "Paisagismo e Irrigação", desc: "Projetos, Manutenção" },
      { value: "Energia Solar", desc: "Projetos, Instalação" },
    ],
  },

  {
    group: "Transporte e Logística",
    options: [
      { value: "Transporte de Cargas", desc: "Rodoviário, Fracionado" },
      { value: "Entregas Rápidas/Courier", desc: "Express, Same-day" },
      { value: "Motoboy", desc: "Delivery urbano" },
      { value: "Fretamento e Turismo", desc: "Ônibus, Vans" },
      { value: "Transporte Escolar", desc: "Escolar, Universitário" },
      { value: "Logística e Armazenagem", desc: "CDs, 3PL" },
      { value: "Locação de Veículos", desc: "Curto e longo prazo" },
    ],
  },

  {
    group: "Agro, Campo e Insumos",
    options: [
      { value: "Agropecuária", desc: "Fazendas, Cooperativas" },
      { value: "Casa Agropecuária", desc: "Rações, Insumos" },
      { value: "Sementes e Defensivos", desc: "Distribuidores, Revendas" },
      { value: "Madeireira", desc: "Madeiras, Compensados" },
      { value: "Veterinária Rural", desc: "Bovinos, Equinos" },
      { value: "Frigorífico/Entreposto", desc: "Abate, Processamento" },
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

/* ====== Combobox multi — COMPACTO + MODO LIVRE (FIX SCROLL) =============== */
function SegmentosSelect({ value = [], onChange, onCreate }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const baseOptions = useMemo(
    () => SEGMENTOS_GRUPOS.flatMap(g => g.options.map(o => o.value)),
    []
  );

  const allSelectedLower = useMemo(
    () => new Set(value.map(v => v.toLowerCase())),
    [value]
  );

  const existsInBase  = (label) => baseOptions.some(v => v.toLowerCase() === label.toLowerCase());
  const existsInValue = (label) => allSelectedLower.has(label.toLowerCase());

  const toggle = (label) => {
    const exists = value.includes(label);
    const next = exists ? value.filter((s) => s !== label) : [...value, label];
    onChange(next);
  };

  const addCustom = (label) => {
    const clean = label.trim();
    if (!clean) return;
    if (!existsInValue(clean)) onChange([...value, clean]);
    onCreate?.(clean);
    setQuery("");
    setOpen(true);
  };

  const shouldSuggestCreate = useMemo(() => {
    const t = query.trim();
    if (!t) return false;
    return !existsInBase(t) && !existsInValue(t);
  }, [query, baseOptions, value]);

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
        collisionPadding={32}
        className="p-0 z-[70] w-[min(92vw,320px)] sm:w-[360px] bg-background"
      >
        {/* SCROLLER: captura no *capture* para vencer o bloqueio do Dialog */}
        <div
          className="max-h-[45vh] overflow-y-auto overscroll-contain pb-2"
          style={{
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y",
            overscrollBehavior: "contain",
          }}
          onWheelCapture={(e) => e.stopPropagation()}
          onTouchMoveCapture={(e) => e.stopPropagation()}
          onScrollCapture={(e) => e.stopPropagation()}
        >
          <Command className="text-[13px] leading-tight">
            <div className="sticky top-0 z-10 bg-background">
              <CommandInput
                placeholder="Buscar ou digitar novo segmento…"
                value={query}
                onValueChange={setQuery}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && shouldSuggestCreate) {
                    e.preventDefault();
                    addCustom(query);
                  }
                }}
              />
            </div>

            <CommandList className="max-h-none">
              {shouldSuggestCreate && (
                <CommandGroup heading={<span className="text-[11px] font-semibold text-muted-foreground">Ações</span>}>
                  <CommandItem
                    value={`__create:${query}`}
                    className="flex items-center gap-2 py-2 px-2"
                    onSelect={() => addCustom(query)}
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar “{query.trim()}” como novo segmento
                  </CommandItem>
                </CommandGroup>
              )}

              {SEGMENTOS_GRUPOS.map((grp) => (
                <CommandGroup
                  key={grp.group}
                  heading={<span className="text-[11px] font-semibold text-muted-foreground">{grp.group}</span>}
                  className="px-1 py-1"
                >
                  {grp.options.map((opt) => {
                    const checked = value.includes(opt.value);
                    const searchable = `${opt.value} ${opt.desc || ""}`;
                    return (
                      <CommandItem
                        key={`${grp.group}-${opt.value}`}
                        value={searchable}
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
                          {opt.desc && (
                            <div className="text-[11px] text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                              {opt.desc}
                            </div>
                          )}
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

  // segmentos extras digitados na sessão (aparecem nos filtros imediatamente)
  const [extraSegments, setExtraSegments] = useState([]);

  const baseSegmentSet = useMemo(() => new Set(SEGMENTOS), []);

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
    if (name === "phone") {
      const { display } = normalizePhoneBR(value);
      setForm((f) => ({ ...f, phone: display }));
      return;
    }
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
      phone: formatPhoneDisplay(row.phone ?? ""),
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
      const { e164 } = normalizePhoneBR(form.phone);

      const payload = {
        name: form.name,
        company: form.company || "",
        company_name: form.company || "",
        segments: form.segments,
        segment: form.segments.join(", "),
        email: form.email,
        phone: e164,
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

  /* ===================== FILTROS ===================== */
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fCompanies, setFCompanies] = useState([]);     // múltipla
  const [fSegments, setFSegments] = useState([]);      // múltipla
  const [fHasEmail, setFHasEmail] = useState("");      // '', 'sim', 'nao'
  const [fHasPhone, setFHasPhone] = useState("");      // '', 'sim', 'nao'

  const uniqueCompanies = useMemo(() => {
    const s = new Set();
    clients.forEach((c) => {
      const v = (c.company ?? c.company_name ?? c.companyName ?? "").trim();
      if (v) s.add(v);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [clients]);

  const customSegmentsFromData = useMemo(() => {
    const s = new Set();
    clients.forEach((c) => {
      ensureArraySegments(c).forEach((seg) => {
        const label = String(seg).trim();
        if (label && !baseSegmentSet.has(label)) s.add(label);
      });
    });
    extraSegments.forEach((seg) => {
      const label = String(seg).trim();
      if (label && !baseSegmentSet.has(label)) s.add(label);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [clients, extraSegments, baseSegmentSet]);

  const toggle = (setter, value) =>
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  const clearFilters = () => {
    setFCompanies([]);
    setFSegments([]);
    setFHasEmail("");
    setFHasPhone("");
  };

  const filtersCount =
    (fCompanies.length ? 1 : 0) +
    (fSegments.length ? 1 : 0) +
    (fHasEmail ? 1 : 0) +
    (fHasPhone ? 1 : 0);

  /* --------- Lista filtrada --------- */
  const filtered = useMemo(() => {
    let list = Array.isArray(clients) ? [...clients] : [];

    const k = q.trim().toLowerCase();
    if (k) {
      list = list.filter((c) => {
        const segs = ensureArraySegments(c).join(" ");
        return [c.name, c.company, c.company_name, c.email, c.phone, segs]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(k));
      });
    }

    if (fCompanies.length > 0) {
      const set = new Set(fCompanies);
      list = list.filter((c) => set.has((c.company ?? c.company_name ?? c.companyName ?? "").trim()));
    }

    if (fSegments.length > 0) {
      const set = new Set(fSegments);
      list = list.filter((c) => ensureArraySegments(c).some((s) => set.has(s)));
    }

    if (fHasEmail) {
      const want = fHasEmail === "sim";
      list = list.filter((c) => Boolean((c.email || "").trim()) === want);
    }

    if (fHasPhone) {
      const want = fHasPhone === "sim";
      list = list.filter((c) => Boolean((c.phone || "").trim()) === want);
    }

    return list;
  }, [clients, q, fCompanies, fSegments, fHasEmail, fHasPhone]);

  /* ===================== EXPORTAÇÕES ===================== */
  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const nowStamp = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
  };

  const tableRows = useMemo(() => {
    return filtered.map((c) => {
      const name = c.name || "";
      const company = c.company ?? c.company_name ?? c.companyName ?? "";
      const segs = ensureArraySegments(c);
      const email = c.email || "";
      const phone = formatPhoneDisplay(c.phone || "");
      return {
        Nome: name,
        Empresa: company,
        Segmentos: segs.join(" | "),
        "E-mail": email,
        Telefone: phone,
      };
    });
  }, [filtered]);

  const exportCSV = () => {
    const headers = ["Nome", "Empresa", "Segmentos", "E-mail", "Telefone"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      headers.join(";"),
      ...tableRows.map((r) => headers.map((h) => esc(r[h])).join(";")),
    ];
    const csv = "\uFEFF" + lines.join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `clientes_${nowStamp()}.csv`);
  };

  const exportExcel = () => {
    const headers = ["Nome", "Empresa", "Segmentos", "E-mail", "Telefone"];
    const htmlEscape = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const rowsHtml = tableRows
      .map((r) => `<tr>${headers.map((h) => `<td>${htmlEscape(r[h])}</td>`).join("")}</tr>`)
      .join("");
    const tableHtml = `
      <table border="1" cellspacing="0" cellpadding="4">
        <thead><tr>${headers.map((h) => `<th>${htmlEscape(h)}</th>`).join("")}</tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    `;
    const doc = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8"><title>Clientes</title></head>
        <body>${tableHtml}</body>
      </html>
    `;
    downloadBlob(
      new Blob([doc], { type: "application/vnd.ms-excel;charset=utf-8;" }),
      `clientes_${nowStamp()}.xls`
    );
  };

  const exportPDF = () => {
    const headers = ["Nome", "Empresa", "Segmentos", "E-mail", "Telefone"];
    const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const bodyRows = tableRows
      .map((r) => `<tr>${headers.map((h) => `<td>${esc(r[h])}</td>`).join("")}</tr>`)
      .join("");
    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8"/>
        <title>Clientes</title>
        <style>
          * { box-sizing: border-box; }
          body { font: 12px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; color: #111; margin: 24px; }
          h1 { font-size: 18px; margin: 0 0 12px; }
          table { width: 100%; border-collapse: collapse; }
          thead th { text-align: left; background: #f4f4f5; }
          th, td { border: 1px solid #e5e7eb; padding: 8px 10px; vertical-align: top; }
          @media print {
            @page { margin: 16mm; size: A4 portrait; }
            a { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>Clientes</h1>
        <table>
          <thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
        <script>window.onload = () => { setTimeout(() => { window.print(); }, 200); };</script>
      </body>
      </html>
    `;
    const w = window.open("", "_blank");
    if (!w) {
      alert("Permita pop-ups para exportar em PDF.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  // paginação
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  /* ===================== UI ===================== */

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
          {/* Filtros + botões */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 mb-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="+55(DD)Número"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            {/* ====== FILTROS AVANÇADOS (scroll seguro) ====== */}
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 w-full sm:w-auto">
                  <FilterIcon className="size-4" />
                  Filtros
                  {filtersCount > 0 && <Badge variant="secondary">{filtersCount}</Badge>}
                </Button>
              </PopoverTrigger>

              <PopoverContent
                align="end"
                side="bottom"
                sideOffset={8}
                collisionPadding={12}
                className="w-[min(92vw,620px)] p-0"
              >
                <div className="flex flex-col max-h-[calc(100vh-120px)]">
                  <div className="px-4 py-3 border-b">
                    <p className="text-sm font-medium">Filtrar clientes</p>
                    <p className="text-xs text-muted-foreground">Refine os resultados com seletores.</p>
                  </div>

                  {/* BODY (usa capture pra não travar no Dialog) */}
                  <div
                    className="p-4 grid md:grid-cols-2 gap-4 flex-1 overflow-y-auto pr-2 overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
                    onWheelCapture={(e) => e.stopPropagation()}
                    onTouchMoveCapture={(e) => e.stopPropagation()}
                    onScrollCapture={(e) => e.stopPropagation()}
                  >
                    {/* Empresas */}
                    <div className="space-y-2">
                      <Label>Empresas</Label>
                      <div className="max-h-[32vh] overflow-y-auto pr-1">
                        {uniqueCompanies.length === 0 ? (
                          <p className="text-xs text-muted-foreground">—</p>
                        ) : uniqueCompanies.map((comp) => (
                          <label key={comp} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox checked={fCompanies.includes(comp)} onCheckedChange={() => toggle(setFCompanies, comp)} />
                            <span className="truncate">{comp}</span>
                          </label>
                        ))}
                      </div>
                      {fCompanies.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {fCompanies.map((c) => (
                            <Badge key={c} variant="secondary" className="gap-1">
                              {c}
                              <button type="button" onClick={() => toggle(setFCompanies, c)} className="ml-1 opacity-70 hover:opacity-100">
                                <X className="size-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Segmentos (agrupados + personalizados) */}
                    <div className="space-y-2 md:col-span-1">
                      <Label>Segmentos</Label>
                      <div
                        className="grid sm:grid-cols-1 gap-2 max-h-[48vh] overflow-y-auto pr-1"
                      >
                        {SEGMENTOS_GRUPOS.map((grp) => (
                          <div key={grp.group}>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">{grp.group}</p>
                            <div className="space-y-1.5">
                              {grp.options.map((opt) => (
                                <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                                  <Checkbox checked={fSegments.includes(opt.value)} onCheckedChange={() => toggle(setFSegments, opt.value)} />
                                  <span className="truncate">{opt.value}</span>
                                </label>
                              ))}
                            </div>
                            <Separator className="my-3" />
                          </div>
                        ))}

                        {customSegmentsFromData.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Personalizados</p>
                            <div className="space-y-1.5">
                              {customSegmentsFromData.map((opt) => (
                                <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                                  <Checkbox checked={fSegments.includes(opt)} onCheckedChange={() => toggle(setFSegments, opt)} />
                                  <span className="truncate">{opt}</span>
                                </label>
                              ))}
                            </div>
                            <Separator className="my-3" />
                          </div>
                        )}
                      </div>

                      {fSegments.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {fSegments.map((s) => (
                            <Badge key={s} variant="secondary" className="gap-1">
                              {s}
                              <button type="button" onClick={() => toggle(setFSegments, s)} className="ml-1 opacity-70 hover:opacity-100">
                                <X className="size-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* E-mail / Telefone */}
                    <div className="space-y-2">
                      <Label>E-mail</Label>
                      <select
                        className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                        value={fHasEmail}
                        onChange={(e) => setFHasEmail(e.target.value)}
                      >
                        <option value="">Todos</option>
                        <option value="sim">Com e-mail</option>
                        <option value="nao">Sem e-mail</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <select
                        className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                        value={fHasPhone}
                        onChange={(e) => setFHasPhone(e.target.value)}
                      >
                        <option value="">Todos</option>
                        <option value="sim">Com telefone</option>
                        <option value="nao">Sem telefone</option>
                      </select>
                    </div>
                  </div>

                  <div className="px-4 py-3 border-t flex justify-between">
                    <Button variant="ghost" onClick={clearFilters}>Limpar filtros</Button>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setFiltersOpen(false)}>Fechar</Button>
                      <Button onClick={() => setFiltersOpen(false)}>Aplicar</Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Exportações */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportCSV} className="gap-2">
                <FileDown className="size-4" /> CSV
              </Button>
              <Button variant="outline" onClick={exportExcel} className="gap-2">
                <FileSpreadsheet className="size-4" /> Excel
              </Button>
              <Button variant="outline" onClick={exportPDF} className="gap-2">
                <FileText className="size-4" /> PDF
              </Button>
            </div>

            {/* Novo Cliente */}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="admin-btn-primary gap-2 min-h-[36px]" onClick={openCreate}>
                  <Plus className="h-5 w-5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                  <span className="whitespace-nowrap">Novo Cliente</span>
                </Button>
              </DialogTrigger>

              {/* Modal estreito, centralizado e com rolagem segura */}
              <DialogContent className="p-0 sm:max-w-[560px] md:max-w-[600px]">
                <div
                  className="max-h-[80vh] overflow-y-auto p-6"
                  onWheelCapture={(e) => e.stopPropagation()}
                  onTouchMoveCapture={(e) => e.stopPropagation()}
                  onScrollCapture={(e) => e.stopPropagation()}
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
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
                          onCreate={(label) => {
                            setExtraSegments((prev) =>
                              prev.includes(label) ? prev : [...prev, label]
                            );
                          }}
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
                        <Input
                          name="phone"
                          inputMode="numeric"
                          placeholder="+55(DD)Número"
                          value={form.phone}
                          onChange={onChange}
                        />
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
                ) : pageItems.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-6">Nenhum registro</TableCell></TableRow>
                ) : (
                  pageItems.map((c) => {
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
                        <TableCell className="text-center">
                          {c.phone ? formatPhoneDisplay(c.phone) : "—"}
                        </TableCell>
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

          {/* Paginação */}
          <PaginationBar
            page={page}
            totalPages={totalPages}
            pageCount={pageItems.length}
            totalCount={filtered.length}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="mt-4 sm:mt-6"
          />
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
