// frontend/src/admin/Materials.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Checkbox } from "@/components/ui/checkbox.jsx";
import { Separator } from "@/components/ui/separator.jsx";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  UploadCloud,
  X,
  Filter as FilterIcon,
} from "lucide-react";
import api from "@/services/api";
import ImagePreview from "@/components/ImagePreview.jsx";

// Export
import ExportMenu from "@/components/export/ExportMenu";
// >>> ADICIONADO: utilizar barra de paginação responsiva
import PaginationBar from "@/components/PaginationBar.jsx";

/* ===== Helpers de Data e Normalização ===== */

const TZ = "America/Cuiaba";
const fmtInt = new Intl.NumberFormat("pt-BR");

function isYMD(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
}
function isDMY(s) {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(String(s || ""));
}
function toYMDInCuiaba(value) {
  if (!value) return "";
  const s = String(value).trim();
  if (isYMD(s.slice(0, 10))) return s.slice(0, 10);
  if (isDMY(s)) {
    const [d, m, y] = s.split("/");
    return `${y}-${m}-${d}`;
  }
  const d = new Date(s);
  if (isNaN(d)) return "";
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
}
function ymdToBR(ymd) {
  if (!ymd || !isYMD(ymd)) return "";
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}
function brToYMD(br) {
  if (!br) return "";
  const s = String(br).trim();
  if (!isDMY(s)) return "";
  const [d, m, y] = s.split("/");
  return `${y}-${m}-${d}`;
}

/* ===== Helpers de URL ===== */
const getSampleUrl = (row) => row?.material_sample_url || row?.sampleUrl || "";
const getProtocolUrl = (row) => row?.protocol_url || row?.protocolUrl || "";

const isProbablyImage = (u = "") =>
  /\.(png|jpe?g|gif|webp|bmp|tif?f|svg)(\?|#|$)/i.test(String(u));

/* ============================ Component ============================ */

const emptyForm = {
  client_name: "",
  responsible: "",
  date: "", // YYYY-MM-DD
  quantity: "",
  notes: "",
  material_sample_url: "",
  protocol_url: "",
};

const Materials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  // busca / filtros simples
  const [q, setQ] = useState("");
  const [month, setMonth] = useState(""); // YYYY-MM

  // filtros avançados
  const [openFilters, setOpenFilters] = useState(false);
  const [fClients, setFClients] = useState([]); // array de nomes (string)
  const [fResponsibles, setFResponsibles] = useState([]); // array de nomes (string)
  const [fHasSample, setFHasSample] = useState(""); // "", "sim", "nao"
  const [fHasProtocol, setFHasProtocol] = useState(""); // "", "sim", "nao"
  const [fQtyMin, setFQtyMin] = useState("");
  const [fQtyMax, setFQtyMax] = useState("");
  const [fStartBr, setFStartBr] = useState(""); // "DD/MM/YYYY"
  const [fEndBr, setFEndBr] = useState(""); // "DD/MM/YYYY"

  // agrupamento/resumo
  const [groupBy, setGroupBy] = useState("nenhum"); // 'nenhum' | 'mes' | 'ano'
  const [yearFocus, setYearFocus] = useState("todos"); // usado quando groupBy==='mes'

  // paginação simples (client-side)
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // modal (criar/editar)
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create"); // "create" | "edit"
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState({ ...emptyForm, id: null });

  // modal delete
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [delId, setDelId] = useState(null);

  // upload flags
  const [uploadingSample, setUploadingSample] = useState(false);
  const [uploadingProtocol, setUploadingProtocol] = useState(false);

  // efeitos
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await api.get("/materials");
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        if (mounted) setMaterials(list);
      } catch (err) {
        console.error("Erro ao carregar materiais:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  /* ============== Derivados p/ filtros (combos) ============== */
  const allClients = useMemo(() => {
    const set = new Set();
    (materials || []).forEach((m) => {
      const v = (m.client_name ?? m.clientName ?? "").trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [materials]);

  const allResponsibles = useMemo(() => {
    const set = new Set();
    (materials || []).forEach((m) => {
      const v = (m.responsible ?? "").trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [materials]);

  /* ================== Filtro + Ordenação ================== */
  const filtered = useMemo(() => {
    let list = Array.isArray(materials) ? [...materials] : [];

    // normaliza data
    list = list.map((m) => {
      const _ymd = toYMDInCuiaba(m.date);
      return { ...m, _ymd };
    });

    // mês único (atalho)
    if (month) list = list.filter((m) => m._ymd.slice(0, 7) === month);

    // busca por digitação
    const k = q.trim().toLowerCase();
    if (k) {
      list = list.filter((m) =>
        [m.client_name, m.responsible, String(m.quantity), m.notes]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(k))
      );
    }

    // filtros
    if (fClients.length > 0) {
      const set = new Set(fClients);
      list = list.filter((m) => set.has((m.client_name ?? m.clientName ?? "").trim()));
    }
    if (fResponsibles.length > 0) {
      const set = new Set(fResponsibles);
      list = list.filter((m) => set.has((m.responsible ?? "").trim()));
    }
    if (fHasSample) {
      const want = fHasSample === "sim";
      list = list.filter((m) => Boolean(getSampleUrl(m)) === want);
    }
    if (fHasProtocol) {
      const want = fHasProtocol === "sim";
      list = list.filter((m) => Boolean(getProtocolUrl(m)) === want);
    }
    if (fQtyMin || fQtyMax) {
      const min = Number(fQtyMin || 0);
      const max = fQtyMax ? Number(fQtyMax) : Number.MAX_SAFE_INTEGER;
      list = list.filter((m) => {
        const qn = Number(m.quantity || 0);
        return qn >= min && qn <= max;
      });
    }
    if (fStartBr || fEndBr) {
      const start = brToYMD(fStartBr) || "0000-01-01";
      const end = brToYMD(fEndBr) || "9999-12-31";
      list = list.filter((m) => m._ymd >= start && m._ymd <= end);
    }

    // ordena por data desc
    list.sort((a, b) => b._ymd.localeCompare(a._ymd));
    return list;
  }, [materials, q, month, fClients, fResponsibles, fHasSample, fHasProtocol, fQtyMin, fQtyMax, fStartBr, fEndBr]);

  /* ================== RESUMOS DINÂMICOS (baseado em FILTERED) ================== */

  const totalRegistrosFiltrados = filtered.length;
  const totalQtdFiltrada = useMemo(
    () => filtered.reduce((sum, m) => sum + Number(m.quantity || 0), 0),
    [filtered]
  );

  const byMonth = useMemo(() => {
    const map = new Map();
    filtered.forEach((m) => {
      if (!m._ymd) return;
      const ym = m._ymd.slice(0, 7);
      const prev = map.get(ym) || { count: 0, qty: 0 };
      prev.count += 1;
      prev.qty += Number(m.quantity || 0);
      map.set(ym, prev);
    });
    return Array.from(map.entries())
      .map(([ym, v]) => ({ ym, ...v }))
      .sort((a, b) => a.ym.localeCompare(b.ym));
  }, [filtered]);

  const byYear = useMemo(() => {
    const map = new Map();
    filtered.forEach((m) => {
      if (!m._ymd) return;
      const y = m._ymd.slice(0, 4);
      const prev = map.get(y) || { count: 0, qty: 0 };
      prev.count += 1;
      prev.qty += Number(m.quantity || 0);
      map.set(y, prev);
    });
    return Array.from(map.entries())
      .map(([year, v]) => ({ year, ...v }))
      .sort((a, b) => a.year.localeCompare(b.year));
  }, [filtered]);

  const yearOptions = useMemo(() => {
    const ys = new Set(byMonth.map((m) => m.ym.slice(0, 4)));
    return ["todos", ...Array.from(ys).sort()];
  }, [byMonth]);

  const formatMonthLabel = useCallback((ym) => {
    if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return "";
    const [y, m] = ym.split("-");
    const date = new Date(Number(y), Number(m) - 1, 1);
    return new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
      timeZone: TZ,
    }).format(date);
  }, []);

  const setMonthFilterFromCard = (ym) => setMonth(ym);

  // Export (com fallback dos campos)
  const exportData = useMemo(() => {
    return filtered.map((item) => ({
      "Cliente": item.client_name || "",
      "Responsável": item.responsible || "",
      "Data": ymdToBR(item._ymd || toYMDInCuiaba(item.date) || ""),
      "Quantidade": item.quantity ?? "",
      "Observações": item.notes || "",
      "Amostra (URL)": getSampleUrl(item),
      "Protocolo (URL)": getProtocolUrl(item),
    }));
  }, [filtered]);

  /* ================== Paginação ================== */
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  // ====== Navegação (corrigida para mobile) ======
  const goPrev = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);
  const goNext = useCallback(() => {
    setPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages]);

  /* ================== Handlers CRUD ================== */

  const openCreate = () => {
    setMode("create");
    setCurrent({ ...emptyForm, id: null });
    setOpen(true);
  };

  const openEdit = (row) => {
    setMode("edit");
    setCurrent({
      id: row.id,
      client_name: row.client_name || "",
      responsible: row.responsible || "",
      date: row._ymd || toYMDInCuiaba(row.date) || "",
      quantity: row.quantity ?? "",
      notes: row.notes || "",
      material_sample_url: getSampleUrl(row),
      protocol_url: getProtocolUrl(row),
    });
    setOpen(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        client_name: current.client_name?.trim() || "",
        responsible: current.responsible?.trim() || "",
        date: toYMDInCuiaba(current.date),
        quantity: Number(current.quantity || 0),
        notes: current.notes?.trim() || "",
        material_sample_url: current.material_sample_url?.trim() || "",
        protocol_url: current.protocol_url?.trim() || "",
      };

      if (mode === "create") {
        const res = await api.post("/materials", payload);
        const created = res.data || payload;
        setMaterials((old) => [{ ...created }, ...old]);
      } else {
        await api.put(`/materials/${current.id}`, payload);
        setMaterials((old) =>
          old.map((m) => (m.id === current.id ? { ...m, ...payload } : m))
        );
      }
      setOpen(false);
    } catch (err) {
      console.error("Erro ao salvar material:", err);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id) => {
    setDelId(id);
    setOpenDelete(true);
  };

  const onDelete = async () => {
    if (!delId) return;
    setDeleting(true);
    try {
      await api.delete(`/materials/${delId}`);
      setMaterials((old) => old.filter((m) => m.id !== delId));
      setOpenDelete(false);
    } catch (err) {
      console.error("Erro ao excluir material:", err);
    } finally {
      setDeleting(false);
    }
  };

  /* ================== Upload ================== */
  const uploadAnyFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data?.url || "";
  };

  const onSampleChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingSample(true);
      const url = await uploadAnyFile(file);
      if (url) setCurrent((c) => ({ ...c, material_sample_url: url }));
    } finally {
      setUploadingSample(false);
    }
  };

  const onProtocolChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingProtocol(true);
      const url = await uploadAnyFile(file);
      if (url) setCurrent((c) => ({ ...c, protocol_url: url }));
    } finally {
      setUploadingProtocol(false);
    }
  };

  /* ================== UI ================== */

  const resetFilters = () => {
    setQ("");
    setMonth("");
    setFClients([]);
    setFResponsibles([]);
    setFHasSample("");
    setFHasProtocol("");
    setFQtyMin("");
    setFQtyMax("");
    setFStartBr("");
    setFEndBr("");
  };

  const filtersCount =
    (fClients.length ? 1 : 0) +
    (fResponsibles.length ? 1 : 0) +
    (fHasSample ? 1 : 0) +
    (fHasProtocol ? 1 : 0) +
    ((fStartBr || fEndBr) ? 1 : 0) +
    ((fQtyMin || fQtyMax) ? 1 : 0) +
    (month ? 1 : 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-xl">Materiais</CardTitle>
              <CardDescription>Cadastro e gestão de materiais enviados</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={openCreate}>
                <Plus className="mr-2 size-4" />
                Novo Material
              </Button>

              {/* Export */}
              <ExportMenu
                data={exportData}
                fileBaseName={`materiais_${month || "filtrado"}`}
                buttonProps={{ variant: "outline", size: "sm" }}
              />

              <Button
                variant={openFilters || filtersCount ? "secondary" : "outline"}
                size="sm"
                onClick={() => setOpenFilters((v) => !v)}
              >
                <FilterIcon className="mr-2 size-4" />
                Filtros {filtersCount ? <Badge variant="secondary" className="ml-2">{filtersCount}</Badge> : null}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Linha de busca e mês */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative md:w-1/2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar materiais..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            {/* Filtro por mês (atalho) */}
            <div className="flex items-center gap-2">
              <Label htmlFor="filter-month" className="text-xs md:text-sm whitespace-nowrap">Mês</Label>
              <Input
                id="filter-month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-[180px]"
              />
              {month ? (
                <Button variant="ghost" size="sm" onClick={() => setMonth("")}>Limpar mês</Button>
              ) : null}
            </div>

            {/* Limpar filtros/Busca */}
            <div className="flex-1 md:text-right">
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Limpar todos
              </Button>
            </div>
          </div>

          {/* Controles de Agrupamento */}
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <div className="flex items-center gap-2">
              <Label className="text-xs md:text-sm">Agrupar por</Label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="nenhum">Nenhum</option>
                <option value="mes">Mês</option>
                <option value="ano">Ano</option>
              </select>
            </div>

            {groupBy === "mes" && (
              <div className="flex items-center gap-2">
                <Label className="text-xs md:text-sm">Ano</Label>
                <select
                  value={yearFocus}
                  onChange={(e) => setYearFocus(e.target.value)}
                  className="border rounded-md px-3 py-2 text-sm bg-background"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y === "todos" ? "Todos" : y}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Registros (após filtros)</p>
              <p className="text-2xl font-bold leading-tight">{fmtInt.format(totalRegistrosFiltrados)}</p>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Qtd total (soma de “Qtd”, após filtros)</p>
              <p className="text-2xl font-bold leading-tight">{fmtInt.format(totalQtdFiltrada)}</p>
            </div>
          </div>

          {/* Quebras por MÊS / ANO */}
          {groupBy === "mes" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Totais por mês (clique para filtrar pelo mês)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {byMonth.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Sem dados para o agrupamento.</div>
                ) : (
                  byMonth
                    .filter(({ ym }) => (yearFocus === "todos" ? true : ym.startsWith(String(yearFocus))))
                    .map(({ ym, count, qty }) => (
                      <button
                        key={ym}
                        type="button"
                        onClick={() => setMonthFilterFromCard(ym)}
                        className="rounded-xl border bg-card p-4 text-left hover:shadow-sm transition"
                        title="Aplicar filtro por mês"
                      >
                        <div className="text-xs text-muted-foreground">{formatMonthLabel(ym)}</div>
                        <div className="mt-1 text-sm">
                          Registros: <b>{fmtInt.format(count)}</b>
                        </div>
                        <div className="text-sm">
                          Qtd: <b>{fmtInt.format(qty)}</b>
                        </div>
                      </button>
                    ))
                )}
              </div>
            </div>
          )}

          {groupBy === "ano" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Totais por ano (clique para filtrar período)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {byYear.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Sem dados para o agrupamento.</div>
                ) : (
                  byYear.map(({ year, count, qty }) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => {
                        setMonth("");
                        setFStartBr(`01/01/${year}`);
                        setFEndBr(`31/12/${year}`);
                      }}
                      className="rounded-xl border bg-card p-4 text-left hover:shadow-sm transition"
                      title="Aplicar filtro por ano"
                    >
                      <div className="text-xs text-muted-foreground">{year}</div>
                      <div className="mt-1 text-sm">
                        Registros: <b>{fmtInt.format(count)}</b>
                      </div>
                      <div className="text-sm">
                        Qtd: <b>{fmtInt.format(qty)}</b>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tabela */}
          <div className="overflow-x-auto rounded-xl border bg-card">
            {/* Centralização horizontal + vertical para TODOS os th/td */}
            <Table className="[text-align:_center] [&_th]:!text-center [&_td]:!text-center [&_th]:!align-middle [&_td]:!align-middle">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs md:text-sm !text-center !align-middle">Data</TableHead>
                  <TableHead className="text-xs md:text-sm !text-center !align-middle">Cliente</TableHead>
                  <TableHead className="text-xs md:text-sm !text-center !align-middle">Responsável</TableHead>
                  <TableHead className="text-xs md:text-sm !text-center !align-middle">Qtd</TableHead>
                  <TableHead className="text-xs md:text-sm !text-center !align-middle">Amostra</TableHead>
                  <TableHead className="text-xs md:text-sm !text-center !align-middle">Protocolo</TableHead>
                  <TableHead className="text-xs md:text-sm !text-center !align-middle">Observações</TableHead>
                  <TableHead className="text-xs md:text-sm w-[160px] !text-center !align-middle">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-muted-foreground !text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : pageItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-muted-foreground !text-center">
                      Nenhum material encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  pageItems.map((row) => {
                    const sampleUrl = getSampleUrl(row);
                    const protocolUrl = getProtocolUrl(row);
                    return (
                      <TableRow key={row.id || `${row.client_name}-${row.date}`}>
                        <TableCell className="!align-middle !text-center">
                          {ymdToBR(row._ymd || toYMDInCuiaba(row.date))}
                        </TableCell>
                        <TableCell className="!align-middle !text-center">{row.client_name}</TableCell>
                        <TableCell className="!align-middle !text-center">{row.responsible}</TableCell>
                        <TableCell className="!align-middle !text-center">
                          {fmtInt.format(Number(row.quantity || 0))}
                        </TableCell>

                        {/* Amostra: miniatura */}
                        <TableCell className="!align-middle !text-center">
                          {sampleUrl ? (
                            <ImagePreview src={sampleUrl} />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        {/* Protocolo: miniatura se imagem, link se pdf/outro */}
                        <TableCell className="!align-middle !text-center">
                          {protocolUrl ? (
                            isProbablyImage(protocolUrl) ? (
                              <ImagePreview src={protocolUrl} />
                            ) : (
                              <a
                                href={protocolUrl}
                                className="text-xs text-primary underline hover:no-underline"
                                target="_blank"
                                rel="noreferrer"
                              >
                                Abrir
                              </a>
                            )
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell className="!align-middle max-w-[260px] !text-center">
                          <div className="text-xs text-muted-foreground whitespace-pre-wrap break-words text-center">
                            {row.notes || "—"}
                          </div>
                        </TableCell>

                        {/* Ações */}
                        <TableCell className="!align-middle !text-center">
                          <div className="flex justify-center gap-2">
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => openEdit(row)}>
                              <Edit className="size-4" />
                              Editar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="gap-2"
                              onClick={() => confirmDelete(row.id)}
                            >
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

          {/* Paginação — SUBSTITUÍDO pelo componente responsivo */}
          <PaginationBar
            page={page}
            totalPages={totalPages}
            onPrev={goPrev}
            onNext={goNext}
            left={
              <p className="text-xs text-muted-foreground">
                Exibindo <b>{pageItems.length}</b> de <b>{total}</b> — Qtd total exibida:{" "}
                <b>{fmtInt.format(totalQtdFiltrada)}</b>
              </p>
            }
          />

          {/* Filtros Avançados */}
          {openFilters && (
            <div className="rounded-xl border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Filtros avançados</h4>
                <Button variant="ghost" size="sm" onClick={() => setOpenFilters(false)}>
                  Fechar
                </Button>
              </div>
              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Clientes */}
                <div>
                  <Label className="text-xs">Clientes</Label>
                  <ComboMulti
                    options={allClients}
                    values={fClients}
                    onChange={setFClients}
                    placeholder="Selecione clientes"
                  />
                </div>

                {/* Responsáveis */}
                <div>
                  <Label className="text-xs">Responsáveis</Label>
                  <ComboMulti
                    options={allResponsibles}
                    values={fResponsibles}
                    onChange={setFResponsibles}
                    placeholder="Selecione responsáveis"
                  />
                </div>

                {/* Amostra */}
                <div>
                  <Label className="text-xs">Possui Amostra?</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <label className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={fHasSample === "sim"}
                        onCheckedChange={(v) => setFHasSample(v ? "sim" : (fHasSample === "sim" ? "" : fHasSample))}
                      />
                      Sim
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={fHasSample === "nao"}
                        onCheckedChange={(v) => setFHasSample(v ? "nao" : (fHasSample === "nao" ? "" : fHasSample))}
                      />
                      Não
                    </label>
                  </div>
                </div>

                {/* Protocolo */}
                <div>
                  <Label className="text-xs">Possui Protocolo?</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <label className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={fHasProtocol === "sim"}
                        onCheckedChange={(v) => setFHasProtocol(v ? "sim" : (fHasProtocol === "sim" ? "" : fHasProtocol))}
                      />
                      Sim
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={fHasProtocol === "nao"}
                        onCheckedChange={(v) => setFHasProtocol(v ? "nao" : (fHasProtocol === "nao" ? "" : fHasProtocol))}
                      />
                      Não
                    </label>
                  </div>
                </div>

                {/* Quantidade Min/Max */}
                <div>
                  <Label className="text-xs">Quantidade (mín.)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={fQtyMin}
                    onChange={(e) => setFQtyMin(e.target.value)}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Quantidade (máx.)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={fQtyMax}
                    onChange={(e) => setFQtyMax(e.target.value)}
                    placeholder="1000"
                    className="mt-1"
                  />
                </div>

                {/* Período (Data BR) */}
                <div>
                  <Label className="text-xs">Início (DD/MM/AAAA)</Label>
                  <Input
                    placeholder="01/01/2025"
                    value={fStartBr}
                    onChange={(e) => setFStartBr(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Fim (DD/MM/AAAA)</Label>
                  <Input
                    placeholder="31/12/2025"
                    value={fEndBr}
                    onChange={(e) => setFEndBr(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-xs text-muted-foreground">
                  {filtersCount ? `${filtersCount} filtro(s) ativo(s)` : "Sem filtros ativos"}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => {
                    setFClients([]);
                    setFResponsibles([]);
                    setFHasSample("");
                    setFHasProtocol("");
                    setFQtyMin("");
                    setFQtyMax("");
                    setFStartBr("");
                    setFEndBr("");
                    setMonth("");
                  }}>
                    Limpar
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setOpenFilters(false)}>
                    Aplicar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Criar/Editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "Novo Material" : "Editar Material"}</DialogTitle>
            <DialogDescription>Preencha as informações do material</DialogDescription>
          </DialogHeader>

          <div className="pt-2">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Cliente</Label>
                  <Input
                    value={current.client_name}
                    onChange={(e) => setCurrent((c) => ({ ...c, client_name: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs">Responsável</Label>
                  <Input
                    value={current.responsible}
                    onChange={(e) => setCurrent((c) => ({ ...c, responsible: e.target.value }))}
                  />
                </div>

                <div>
                  <Label className="text-xs">Data</Label>
                  <Input
                    type="date"
                    value={current.date}
                    onChange={(e) => setCurrent((c) => ({ ...c, date: e.target.value }))}
                  />
                </div>

                <div>
                  <Label className="text-xs">Quantidade</Label>
                  <Input
                    type="number"
                    min="0"
                    value={current.quantity}
                    onChange={(e) => setCurrent((c) => ({ ...c, quantity: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Observações</Label>
                <Textarea
                  value={current.notes}
                  onChange={(e) => setCurrent((c) => ({ ...c, notes: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Amostra */}
                <div className="space-y-2">
                  <Label className="text-xs">Amostra do Material</Label>
                  <div className="flex items-center gap-3">
                    <Input type="file" accept="image/*" onChange={onSampleChange} />
                    <Button type="button" variant="outline" disabled className="gap-2">
                      <UploadCloud className="size-4" />
                      {uploadingSample ? "Enviando..." : "Upload"}
                    </Button>
                  </div>
                  {current.material_sample_url ? (
                    <div className="relative inline-flex items-center gap-2 mt-2">
                      <ImagePreview src={current.material_sample_url} />
                      <button
                        type="button"
                        className="bg-white border rounded-full p-1 shadow"
                        onClick={() => setCurrent((c) => ({ ...c, material_sample_url: "" }))}
                        title="Remover"
                      >
                        <X className="size-4 text-red-600" />
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* Protocolo */}
                <div className="space-y-2">
                  <Label className="text-xs">Protocolo</Label>
                  <div className="flex items-center gap-3">
                    <Input type="file" accept="image/*,.pdf" onChange={onProtocolChange} />
                    <Button type="button" variant="outline" disabled className="gap-2">
                      <UploadCloud className="size-4" />
                      {uploadingProtocol ? "Enviando..." : "Upload"}
                    </Button>
                  </div>
                  {current.protocol_url ? (
                    <div className="relative inline-flex items-center gap-2 mt-2">
                      {isProbablyImage(current.protocol_url) ? (
                        <ImagePreview src={current.protocol_url} />
                      ) : (
                        <a
                          href={current.protocol_url}
                          className="text-xs text-primary underline hover:no-underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Abrir protocolo
                        </a>
                      )}
                      <button
                        type="button"
                        className="bg-white border rounded-full p-1 shadow"
                        onClick={() => setCurrent((c) => ({ ...c, protocol_url: "" }))}
                        title="Remover"
                      >
                        <X className="size-4 text-red-600" />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex justify-end gap-2">
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

      {/* Modal Delete */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir material</DialogTitle>
            <DialogDescription>Esta ação não poderá ser desfeita.</DialogDescription>
          </DialogHeader>
          <p className="text-sm">
            Tem certeza que deseja excluir este registro?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpenDelete(false)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={onDelete} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ================== Components Auxiliares ================== */

const ComboMulti = ({ options, values, onChange, placeholder }) => {
  const [open, setOpen] = useState(false);
  const toggle = (opt) => {
    const set = new Set(values || []);
    if (set.has(opt)) set.delete(opt);
    else set.add(opt);
    onChange(Array.from(set));
  };
  const clear = () => onChange([]);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate">{values?.length ? `${values.length} selecionado(s)` : (placeholder || "Selecionar")}</span>
        <FilterIcon className="size-4 opacity-70" />
      </Button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="p-2 max-h-64 overflow-auto">
            <div className="flex justify-end">
              <Button size="xs" variant="ghost" onClick={clear}>Limpar</Button>
            </div>
            <div className="mt-1 space-y-1">
              {options.map((opt) => {
                const checked = values.includes(opt);
                return (
                  <label key={opt} className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-accent cursor-pointer">
                    <Checkbox checked={checked} onCheckedChange={() => toggle(opt)} />
                    <span className="truncate">{opt}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end p-2 border-t">
            <Button size="sm" onClick={() => setOpen(false)}>OK</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Materials;
