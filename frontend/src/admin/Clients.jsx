// frontend/src/admin/Clients.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import api from "@/services/api";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.jsx";
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
} from "lucide-react";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import ExportMenu from "@/components/export/ExportMenu";

/* ---------------- Utils ---------------- */
const fmtInt = new Intl.NumberFormat("pt-BR");
const PIE_COLORS = [
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#64748b",
];

/* ---------------- Telefone ---------------- */
const normalizePhoneBR = (input) => {
  if (!input) return "";
  const digits = String(input).replace(/\D/g, "");
  let clean = digits.startsWith("55") ? digits.slice(2) : digits;
  if (clean.length === 11 && clean[2] === "9") return `+55${clean}`;
  if (clean.length === 10) return `+55${clean}`;
  return input;
};
const formatPhoneDisplay = (phone) => {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) {
    const clean = digits.slice(2);
    const ddd = clean.slice(0, 2);
    const number = clean.slice(2);
    if (number.length === 9 && number[0] === "9") {
      return `+55 (${ddd}) ${number.slice(0, 5)}-${number.slice(5)}`;
    } else if (number.length === 8) {
      return `+55 (${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`;
    }
  }
  return phone;
};

/* ---------------- Segmentos ---------------- */
const SEGMENTOS_GRUPOS = [
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
      { value: "SaaS", desc: "Software como serviço, produto digital" },
      { value: "Startups", desc: "Empreendimentos inovadores, aceleração" },
      { value: "Fintech", desc: "Pagamentos, crédito, meios de pagamento" },
      { value: "Healthtech", desc: "Tecnologia para saúde" },
      { value: "Edtech", desc: "Tecnologia para educação" },
      { value: "Agtech", desc: "Tecnologia para agronegócio" },
      { value: "Govtech", desc: "Tecnologia para setor público" },
      { value: "IoT e Automação", desc: "Internet das Coisas, sensores, automação" },
      { value: "Robótica", desc: "Robôs, automação avançada" },
      { value: "Cloud & DevOps", desc: "Nuvem, CI/CD, SRE, observabilidade" },
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
      { value: "Estética Avançada", desc: "Procedimentos estéticos, harmonização" },
      { value: "Fonoaudiologia", desc: "Voz, audição, linguagem" },
      { value: "Fisioterapia Desportiva", desc: "Reabilitação de atletas" },
      { value: "Home Care", desc: "Atendimento domiciliar" },
      { value: "Clínica de Vacinação", desc: "Imunização, campanhas" },
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
      { value: "Têxtil e Confecção", desc: "Fiações, malharias, vestuário" },
      { value: "Plástico e Borracha", desc: "Transformadores, injeção" },
      { value: "Química e Petroquímica", desc: "Tintas, resinas, petroquímica" },
      { value: "Papel e Celulose", desc: "Fábricas, conversão" },
      { value: "Mineração", desc: "Extração, beneficiamento" },
      { value: "Petróleo e Gás", desc: "Upstream, downstream, distribuição" },
      { value: "Cerâmica e Pisos", desc: "Revestimentos, louças" },
      { value: "Metalurgia e Siderurgia", desc: "Fundição, aços, ligas" },
      { value: "Moveleiro Industrial", desc: "Linha seriada, usinagem" },
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
      { value: "Assessoria de Imprensa", desc: "Press kit, media training" },
      { value: "Influencer Marketing", desc: "Creators, parcerias" },
      { value: "Branding e Naming", desc: "Posicionamento, identidade" },
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
      { value: "Atacado e Distribuição", desc: "Cash & carry, distribuidoras" },
      { value: "Consultoria Empresarial", desc: "Estratégia, processos, finanças" },
      { value: "BPO e Terceirização", desc: "Backoffice, folha, fiscal" },
      { value: "Cartórios e Notariais", desc: "Registro civil, títulos" },
      { value: "Cobrança e Recuperação", desc: "Cobrança extrajudicial, crédito" },
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
      { value: "Pré-vestibular e Reforço", desc: "Cursinhos, ENEM" },
      { value: "Escolas de Música e Dança", desc: "Conservatórios, estúdios" },
      { value: "Produção Cultural", desc: "Editais, projetos, captação" },
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
      { value: "Cartórios e Registros", desc: "Notas, registro de imóveis" },
      { value: "Detran e Trânsito", desc: "Órgãos, despachantes" },
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
      { value: "Barbearia", desc: "Cortes, grooming masculino" },
      { value: "Perfumaria e Cosméticos", desc: "Varejo de beleza" },
      { value: "Coaching e Mentoria", desc: "Desenvolvimento pessoal e negócios" },
      { value: "Tradução e Interpretação", desc: "Traduções técnicas, simultânea" },
      { value: "Agência de Empregos", desc: "RH, recrutamento, temporários" },
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
      { value: "Distribuidora de Bebidas", desc: "Atacado, B2B, eventos" },
      { value: "Shopping e Quiosques", desc: "Lojas de shopping, quiosques" },
      { value: "Perfumaria", desc: "Fragrâncias e cosméticos" },
      { value: "Papelaria Especializada", desc: "Materiais artísticos e técnicos" },
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
      { value: "Padaria Artesanal", desc: "Fermentação natural, pâtisserie" },
      { value: "Doceria Especializada", desc: "Bolos artísticos, brigadeiria" },
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
      { value: "Vistoria e Laudos", desc: "Vistorias cautelar e transferência" },
      { value: "Carros por Assinatura", desc: "Locadoras, mobilidade" },
      { value: "Estética Automotiva Premium", desc: "Detailing, PPF, vitrificação" },
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
      { value: "Arquitetura e Urbanismo", desc: "Projetos, interiores" },
      { value: "Condomínios e Síndicos", desc: "Gestão condominial" },
      { value: "Automação Residencial", desc: "Casa inteligente, CFTV" },
      { value: "Gesso e Drywall", desc: "Forros, divisórias" },
      { value: "Topografia e Georreferenciamento", desc: "Levantamentos, GPS" },
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
      { value: "Portos e Navegação", desc: "Cabotagem, terminais" },
      { value: "Aeroportos e Aviação", desc: "Aviação executiva, hangares" },
      { value: "Ferrovias", desc: "Transporte ferroviário" },
      { value: "Frio e Refrigeração Logística", desc: "Cadeia fria" },
      { value: "Fulfillment e Cross-docking", desc: "Operações e e-commerce" },
    ],
  },
  {
    group: "Telecomunicações e Mídia",
    options: [
      { value: "Telecomunicações", desc: "Operadoras, telefonia, fibra" },
      { value: "Provedor de Internet (ISP)", desc: "Banda larga, WISP" },
      { value: "Call Center e Contact Center", desc: "Atendimento, SAC, suporte" },
      { value: "Streaming e Conteúdo", desc: "Plataformas OTT, produção" },
      { value: "Radiodifusão", desc: "TV, rádio" },
    ],
  },
  {
    group: "Energia, Saneamento e Meio Ambiente",
    options: [
      { value: "Saneamento Básico", desc: "Água e esgoto" },
      { value: "Gestão de Resíduos", desc: "Coleta, reciclagem" },
      { value: "Tratamento de Água", desc: "ETA/ETEs, filtros" },
      { value: "Eficiência Energética", desc: "Projetos, ESCO" },
      { value: "ESG e Sustentabilidade", desc: "Ambiental, social e governança" },
    ],
  },
];

const SEGMENTOS = SEGMENTOS_GRUPOS.flatMap((g) => g.options.map((o) => o.value));

const ensureArraySegments = (client) => {
  if (Array.isArray(client?.segments)) return client.segments;
  if (typeof client?.segment === "string" && client.segment.trim()) {
    return client.segment.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (typeof client?.segmentos === "string" && client.segmentos.trim()) {
    return client.segmentos.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (typeof client?.segments === "string" && client.segments.trim()) {
    return client.segments.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

/* ---------------- Combobox Segmentos (com fix de scroll em Dialog) ---------------- */
function SegmentosSelect({ value = [], onChange, onCreate }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerWrapRef = useRef(null);
  const [portalContainer, setPortalContainer] = useState(null);
  useLayoutEffect(() => {
    const el = triggerWrapRef.current?.closest?.("[data-radix-dialog-content]");
    if (el) setPortalContainer(el);
  }, []);

  const baseOptions = useMemo(
    () => SEGMENTOS_GRUPOS.flatMap((g) => g.options.map((o) => o.value)),
    []
  );
  const allSelectedLower = useMemo(
    () => new Set(value.map((v) => v.toLowerCase())),
    [value]
  );
  const existsInBase = (label) =>
    baseOptions.some((v) => v.toLowerCase() === label.toLowerCase());
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
        <div ref={triggerWrapRef}>
          <Button variant="outline" role="combobox" className="w-full justify-between">
            {value.length === 0 ? (
              "Selecionar segmentos"
            ) : (
              <span className="truncate">
                {value.slice(0, 2).join(", ")}
                {value.length > 2 ? ` +${value.length - 2}` : ""}
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </div>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        collisionPadding={32}
        className="p-0 z-[70] w-[min(92vw,320px)] sm:w-[360px] bg-background"
        container={portalContainer || undefined}
        onWheelCapture={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <div className="max-h-[45vh] overflow-y-auto overscroll-contain pb-2 touch-pan-y [-webkit-overflow-scrolling:touch]">
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
                          className="mt-0.5 h-3 w-3"
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

/* ---------------- Página ---------------- */
const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create");
  const [form, setForm] = useState({
    id: null,
    name: "",
    company: "",
    email: "",
    phone: "",
    segments: [],
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const [openDelete, setOpenDelete] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [extraSegments, setExtraSegments] = useState([]);
  const baseSegmentSet = useMemo(() => new Set(SEGMENTOS), []);

  // Paginação (15 por página)
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/clients");
      setClients(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Erro ao buscar clientes:", err);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "phone" ? normalizePhoneBR(value) : value,
    }));
  };

  const openCreate = () => {
    setMode("create");
    setForm({
      id: null,
      name: "",
      company: "",
      email: "",
      phone: "",
      segments: [],
      notes: "",
    });
    setOpen(true);
  };
  const openEdit = (client) => {
    setMode("edit");
    setForm({
      id: client.id ?? client._id ?? client.uuid ?? null,
      name: client.name || "",
      company:
        client.company || client.company_name || client.companyName || "",
      email: client.email || "",
      phone: client.phone || "",
      segments: ensureArraySegments(client),
      notes: client.notes || "",
    });
    setOpen(true);
  };

  const confirmDelete = (client) => {
    setRowToDelete(client);
    setOpenDelete(true);
  };

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        company: form.company,
        email: form.email,
        phone: form.phone,
        segments: form.segments,
        notes: form.notes,
      };
      if (mode === "create") {
        await api.post("/clients", payload);
      } else {
        const id = form.id;
        if (!id) throw new Error("ID do registro não encontrado para edição.");
        await api.put(`/clients/${id}`, payload);
      }
      setOpen(false);
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

  /* ---------------- Filtros ---------------- */
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fCompanies, setFCompanies] = useState([]);
  const [fSegments, setFSegments] = useState([]);
  const [fHasEmail, setFHasEmail] = useState("");
  const [fHasPhone, setFHasPhone] = useState("");
  const [fSegmentsQuery, setFSegmentsQuery] = useState("");

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
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );

  const clearFilters = () => {
    setFCompanies([]);
    setFSegments([]);
    setFHasEmail("");
    setFHasPhone("");
    setFSegmentsQuery("");
  };

  const filtersCount =
    (fCompanies.length ? 1 : 0) +
    (fSegments.length ? 1 : 0) +
    (fHasEmail ? 1 : 0) +
    (fHasPhone ? 1 : 0);

  const shownSegmentValues = useMemo(() => {
    const q = fSegmentsQuery.trim().toLowerCase();
    const base = [];
    SEGMENTOS_GRUPOS.forEach((grp) => {
      grp.options.forEach((opt) => {
        if (
          !q ||
          opt.value.toLowerCase().includes(q) ||
          (opt.desc && opt.desc.toLowerCase().includes(q))
        ) {
          base.push(opt.value);
        }
      });
    });
    const custom = customSegmentsFromData.filter(
      (s) => !q || s.toLowerCase().includes(q)
    );
    return Array.from(new Set([...base, ...custom]));
  }, [fSegmentsQuery, customSegmentsFromData]);

  const allShownAlreadySelected = useMemo(
    () =>
      shownSegmentValues.length > 0 &&
      shownSegmentValues.every((v) => fSegments.includes(v)),
    [shownSegmentValues, fSegments]
  );

  const selectShownSegments = () => {
    if (shownSegmentValues.length === 0) return;
    setFSegments((prev) =>
      Array.from(new Set([...prev, ...shownSegmentValues]))
    );
  };

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
      list = list.filter((c) =>
        set.has((c.company ?? c.company_name ?? c.companyName ?? "").trim())
      );
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

  /* ---------------- Indicadores ---------------- */
  const totalClientesGeral = clients.length;
  const totalExibidos = filtered.length;

  const topSegments = useMemo(() => {
    const counts = new Map();
    filtered.forEach((c) => {
      new Set(ensureArraySegments(c)).forEach((seg) => {
        if (!seg) return;
        counts.set(seg, (counts.get(seg) || 0) + 1);
      });
    });
    const arr = Array.from(counts.entries()).map(([segment, count]) => ({
      segment,
      count,
      pct: totalExibidos > 0 ? (count / totalExibidos) * 100 : 0,
    }));
    arr.sort((a, b) => b.count - a.count || a.segment.localeCompare(b.segment, "pt-BR"));
    return arr.slice(0, 10);
  }, [filtered, totalExibidos]);

  // Dados para o gráfico (usa "count"; % é calculado no tooltip/label)
  const pieData = useMemo(
    () => topSegments.map(({ segment, count }) => ({ name: segment, value: count })),
    [topSegments]
  );

  /* ---------------- Paginação ---------------- */
  const totalPages = Math.max(1, Math.ceil(totalExibidos / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  /* ---------------- Export ---------------- */
  const exportData = useMemo(() => {
    return filtered.map((c) => ({
      name: c.name || "",
      company: c.company ?? c.company_name ?? c.companyName ?? "",
      segments: ensureArraySegments(c).join(" | "),
      email: c.email || "",
      phone: formatPhoneDisplay(c.phone || ""),
    }));
  }, [filtered]);

  const exportColumns = [
    { key: "name", header: "Nome" },
    { key: "company", header: "Empresa" },
    { key: "segments", header: "Segmentos" },
    { key: "email", header: "E-mail" },
    { key: "phone", header: "Telefone" },
  ];

  const pdfOptions = {
    title: "Relatório de Clientes",
    orientation: "p",
    filtersSummary: `Filtros aplicados: ${
      filtersCount > 0
        ? [
            fCompanies.length > 0 ? `Empresas: ${fCompanies.join(", ")}` : "",
            fSegments.length > 0 ? `Segmentos: ${fSegments.join(", ")}` : "",
            fHasEmail
              ? `E-mail: ${fHasEmail === "sim" ? "Com e-mail" : "Sem e-mail"}`
              : "",
            fHasPhone
              ? `Telefone: ${fHasPhone === "sim" ? "Com telefone" : "Sem telefone"}`
              : "",
          ]
            .filter(Boolean)
            .join(" | ")
        : "Nenhum filtro aplicado"
    }`,
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 35 },
      2: { cellWidth: 45 },
      3: { cellWidth: 35 },
      4: { cellWidth: 30 },
    },
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="max-w-screen-2xl mx-auto px-3 md:px-6 py-4 md:py-6">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl md:text-2xl font-semibold">Clientes</h1>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base md:text-lg font-semibold">Registros</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Lista de clientes cadastrados
              </CardDescription>
            </div>
            <div className="ml-auto">
              <ExportMenu
                data={exportData}
                columns={exportColumns}
                filename="clientes"
                pdfOptions={pdfOptions}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Busca + Filtros + Novo */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3">
            <div className="relative flex-1 w-full md:w-[320px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9 h-9"
                placeholder="Buscar clientes..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 h-9">
                  <FilterIcon className="size-4" />
                  Filtros
                  {filtersCount > 0 && (
                    <Badge variant="secondary" className="text-[11px]">
                      {filtersCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>

              <PopoverContent
                align="end"
                side="bottom"
                sideOffset={8}
                collisionPadding={12}
                className="w-[min(96vw,860px)] p-0 overflow-hidden"
                style={{ height: "min(72vh, 600px)" }}
              >
                <div className="grid h-full grid-rows-[auto,1fr,auto] text-[12px] leading-tight">
                  <div className="px-3 py-2 border-b flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-medium">Filtrar clientes</p>
                      <p className="text-[11px] text-muted-foreground">
                        Refine os resultados com seletores.
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-[12px]"
                      onClick={clearFilters}
                      title="Limpar todos os filtros"
                    >
                      Limpar
                    </Button>
                  </div>

                  <div className="p-3 grid md:grid-cols-2 gap-3 overflow-y-auto pr-2 overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]">
                    {/* Empresas */}
                    <div className="space-y-1.5">
                      <Label className="text-[12px]">Empresas</Label>
                      <div className="max-h-[40vh] overflow-y-auto pr-1">
                        {uniqueCompanies.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground">—</p>
                        ) : (
                          uniqueCompanies.map((comp) => (
                            <label
                              key={comp}
                              className="flex items-center gap-1.5 text-[12px] cursor-pointer"
                            >
                              <Checkbox
                                checked={fCompanies.includes(comp)}
                                onCheckedChange={() => toggle(setFCompanies, comp)}
                                className="h-3 w-3"
                              />
                              <span className="truncate">{comp}</span>
                            </label>
                          ))
                        )}
                      </div>

                      {fCompanies.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {fCompanies.map((c) => (
                            <Badge
                              key={c}
                              variant="secondary"
                              className="gap-1 py-0.5 text-[11px]"
                            >
                              {c}
                              <button
                                type="button"
                                onClick={() => toggle(setFCompanies, c)}
                                className="ml-1 opacity-70 hover:opacity-100"
                              >
                                <X className="size-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Segmentos (filtros) */}
                    <div className="space-y-1.5">
                      <Label className="flex items-center justify-between text-[12px]">
                        <span>Segmentos</span>
                      </Label>

                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                          <Input
                            className="pl-7 h-8 text-[12px]"
                            placeholder="Buscar segmento nos filtros..."
                            value={fSegmentsQuery}
                            onChange={(e) => setFSegmentsQuery(e.target.value)}
                          />
                        </div>
                        <Button
                          size="sm"
                          className="h-8 px-2 text-[12px]"
                          variant="secondary"
                          disabled={
                            shownSegmentValues.length === 0 || allShownAlreadySelected
                          }
                          onClick={selectShownSegments}
                        >
                          Selecionar exibidos
                        </Button>
                      </div>

                      <div className="max-h-[40vh] overflow-y-auto pr-1">
                        {SEGMENTOS_GRUPOS.map((grp) => {
                          const q = fSegmentsQuery.trim().toLowerCase();
                          const shownOpts = grp.options.filter(
                            (opt) =>
                              !q ||
                              opt.value.toLowerCase().includes(q) ||
                              (opt.desc && opt.desc.toLowerCase().includes(q))
                          );
                          if (shownOpts.length === 0) return null;
                          return (
                            <div key={grp.group} className="mb-2">
                              <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">
                                {grp.group}
                              </p>
                              <div className="space-y-1">
                                {shownOpts.map((opt) => (
                                  <label
                                    key={opt.value}
                                    className="flex items-center gap-1.5 text-[12px] cursor-pointer"
                                  >
                                    <Checkbox
                                      checked={fSegments.includes(opt.value)}
                                      onCheckedChange={() =>
                                        toggle(setFSegments, opt.value)
                                      }
                                      className="h-3 w-3"
                                    />
                                    <span className="truncate">{opt.value}</span>
                                  </label>
                                ))}
                              </div>
                              <Separator className="my-2" />
                            </div>
                          );
                        })}

                        {/* Personalizados */}
                        {(() => {
                          const q = fSegmentsQuery.trim().toLowerCase();
                          const list = customSegmentsFromData.filter(
                            (s) => !q || s.toLowerCase().includes(q)
                          );
                          if (list.length === 0) return null;
                          return (
                            <div className="mb-2">
                              <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">
                                Personalizados
                              </p>
                              <div className="space-y-1">
                                {list.map((opt) => (
                                  <label
                                    key={opt}
                                    className="flex items-center gap-1.5 text-[12px] cursor-pointer"
                                  >
                                    <Checkbox
                                      checked={fSegments.includes(opt)}
                                      onCheckedChange={() => toggle(setFSegments, opt)}
                                      className="h-3 w-3"
                                    />
                                    <span className="truncate">{opt}</span>
                                  </label>
                                ))}
                              </div>
                              <Separator className="my-2" />
                            </div>
                          );
                        })()}
                      </div>

                      {fSegments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {fSegments.map((s) => (
                            <Badge
                              key={s}
                              variant="secondary"
                              className="gap-1 py-0.5 text-[11px]"
                            >
                              {s}
                              <button
                                type="button"
                                onClick={() => toggle(setFSegments, s)}
                                className="ml-1 opacity-70 hover:opacity-100"
                              >
                                <X className="size-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* E-mail / Telefone */}
                    <div className="space-y-1.5">
                      <Label className="text-[12px]">E-mail</Label>
                      <select
                        className="w-full border rounded-md px-2 py-1.5 h-8 text-[12px] bg-background"
                        value={fHasEmail}
                        onChange={(e) => setFHasEmail(e.target.value)}
                      >
                        <option value="">Todos</option>
                        <option value="sim">Com e-mail</option>
                        <option value="nao">Sem e-mail</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px]">Telefone</Label>
                      <select
                        className="w-full border rounded-md px-2 py-1.5 h-8 text-[12px] bg-background"
                        value={fHasPhone}
                        onChange={(e) => setFHasPhone(e.target.value)}
                      >
                        <option value="">Todos</option>
                        <option value="sim">Com telefone</option>
                        <option value="nao">Sem telefone</option>
                      </select>
                    </div>
                  </div>

                  <div className="px-3 py-2 border-t flex justify-end gap-2 items-center bg-background">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-[12px]"
                      onClick={() => setFiltersOpen(false)}
                    >
                      Fechar
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 px-3 text-[12px]"
                      onClick={() => setFiltersOpen(false)}
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 h-9" onClick={openCreate}>
                  <Plus className="size-4" />
                  <span className="whitespace-nowrap">Novo Cliente</span>
                </Button>
              </DialogTrigger>

              <DialogContent className="p-0 sm:max-w-[560px] md:max-w-[600px]">
                <div className="max-h-[80vh] overflow-y-auto p-6">
                  <DialogHeader className="pb-2">
                    <DialogTitle>
                      {mode === "create" ? "Novo Cliente" : "Editar Cliente"}
                    </DialogTitle>
                    <DialogDescription>
                      {mode === "create"
                        ? "Cadastre um novo cliente."
                        : "Atualize os dados do cliente."}
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
                                    setForm((f) => ({
                                      ...f,
                                      segments: f.segments.filter((x) => x !== s),
                                    }))
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
                        <Input name="email" type="email" value={form.email} onChange={onChange} />
                      </div>

                      <div>
                        <Label>Telefone</Label>
                        <Input
                          name="phone"
                          value={form.phone}
                          onChange={onChange}
                          placeholder="+55(DD)Número"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label>Observações</Label>
                        <Textarea name="notes" value={form.notes} onChange={onChange} />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" size="sm" disabled={saving}>
                        {saving ? "Salvando..." : mode === "create" ? "Salvar" : "Atualizar"}
                      </Button>
                    </div>
                  </form>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* -------- KDIs (compactos) -------- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Total de clientes */}
            <div className="rounded-xl border bg-card p-3">
              <p className="text-[11px] text-muted-foreground">Total de clientes (geral)</p>
              <p className="text-xl font-bold leading-tight">{fmtInt.format(totalClientesGeral)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Exibidos após filtros: <b>{fmtInt.format(totalExibidos)}</b>
              </p>
            </div>

            {/* Pizza Top 10 — ocupa 2 colunas em md+ */}
            <div className="rounded-xl border bg-card p-3 md:col-span-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">
                  Top 10 segmentos (% dos clientes exibidos)
                </p>
              </div>

              {pieData.length === 0 ? (
                <div className="text-sm text-muted-foreground mt-2">—</div>
              ) : (
                <div className="w-full h-[260px] mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="40%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={1}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, _name, { payload }) => {
                          const pct =
                            totalExibidos > 0
                              ? ((value / totalExibidos) * 100).toFixed(1) + "%"
                              : "0%";
                          return [`${fmtInt.format(value)} (${pct})`, payload.name];
                        }}
                      />
                      <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        wrapperStyle={{ fontSize: 11, paddingLeft: 8 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* -------- Tabela -------- */}
          <div className="overflow-x-auto rounded-xl border bg-card">
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
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      Carregando…
                    </TableCell>
                  </TableRow>
                ) : pageItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      Nenhum registro
                    </TableCell>
                  </TableRow>
                ) : (
                  pageItems.map((c) => {
                    const id = c.id ?? c._id ?? c.uuid;
                    const company =
                      c.company ?? c.company_name ?? c.companyName ?? "—";
                    const segs = ensureArraySegments(c);
                    return (
                      <TableRow key={id || `${c.name}-${c.email}-${c.phone}`}>
                        <TableCell className="text-center font-medium">
                          {c.name || "—"}
                        </TableCell>
                        <TableCell className="text-center">{company}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {segs.slice(0, 2).map((s) => (
                              <Badge key={s} variant="secondary">
                                {s}
                              </Badge>
                            ))}
                            {segs.length > 2 && (
                              <Badge variant="outline">+{segs.length - 2}</Badge>
                            )}
                            {segs.length === 0 && (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {c.email || "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {c.phone ? formatPhoneDisplay(c.phone) : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              onClick={() => openEdit(c)}
                            >
                              <Edit className="size-4" /> Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="gap-2"
                              onClick={() => confirmDelete(c)}
                            >
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

          {/* -------- Paginação -------- */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Exibindo <b>{pageItems.length}</b> de <b>{totalExibidos}</b> cliente(s)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <div className="text-xs text-muted-foreground">
                Página <b>{page}</b> / <b>{totalPages}</b>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
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
            <Button variant="outline" size="sm" onClick={() => setOpenDelete(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" size="sm" onClick={onDelete} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clients;
