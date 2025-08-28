// frontend/src/admin/Orders.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import api from "@/services/api";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog.jsx";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Plus, Search, Edit, Trash2, Filter as FilterIcon
} from "lucide-react";

// Export
import ExportMenu from "@/components/export/ExportMenu";

/* ================= Helpers ================= */

// Conversão BR <-> ISO (YYYY-MM-DD)
const isYMD = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
const isDMY = (s) => /^\d{2}\/\d{2}\/\d{4}$/.test(String(s || ""));
const toYMD = (value) => {
  if (!value) return "";
  const s = String(value).trim();
  if (isYMD(s.slice(0, 10))) return s.slice(0, 10);
  if (isDMY(s)) {
    const [d, m, y] = s.split("/");
    return `${y}-${m}-${d}`;
  }
  // fallback: tenta Date parse sem timezone
  const d = new Date(s);
  if (isNaN(d)) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const ymdToBR = (ymd) => {
  if (!ymd || !isYMD(ymd)) return "";
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
};

// Máscara de data BR no input
const maskDateBR = (s) => {
  const d = String(s || "").replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
};
function InputDateBR({ value, onChange, placeholder = "dd/mm/aaaa", ...props }) {
  return (
    <Input
      inputMode="numeric"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(maskDateBR(e.target.value))}
      {...props}
    />
  );
}

// Números flex (1.234,56 | 1234.56 | "2" etc)
const parseFlex = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  let s = String(v).trim();
  if (!s) return 0;
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};
const BRL = (n) => Number(parseFlex(n)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtInt = new Intl.NumberFormat("pt-BR");

/* ================= Lógicas de ordem (itens) ================= */

const orderUnitValuePure = (o) => {
  const itens = Array.isArray(o.itens) ? o.itens : [];
  if (!itens.length) return null;
  const vals = itens.map((i) => parseFlex(i.valor_unit)).filter(Number.isFinite);
  if (!vals.length) return null;
  const uniq = new Set(vals.map((v) => v.toFixed(2)));
  return uniq.size === 1 ? vals[0] : null;
};
const orderQty = (o) =>
  (Array.isArray(o.itens) ? o.itens : []).reduce((acc, i) => acc + parseFlex(i.quantidade), 0);
const orderAvgUnit = (o) => {
  const q = orderQty(o);
  const t = parseFlex(o.valor_total);
  return q > 0 ? t / q : 0;
};

/* ================= Estado/Modelo ================= */

const emptyOrder = () => ({
  cliente: "",
  empresa: "",            // padrão novo (compat: também enviaremos 'titulo')
  descricao: "",
  status: "Aberta",
  data: "",               // BR no formulário
  itens: [],
  valor_total: "",
});

export default function Orders() {
  // Fonte de dados
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Preferência local: mostrar “Valor médio” quando não houver unitário único
  const AVG_KEY = "rel_showAvgUnit";
  const [showAvgUnit, setShowAvgUnit] = useState(() => {
    try { return localStorage.getItem(AVG_KEY) !== "0"; } catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem(AVG_KEY, showAvgUnit ? "1" : "0"); } catch {}
  }, [showAvgUnit]);

  // Formulário/Modal
  const [form, setForm] = useState(emptyOrder());
  const [editingId, setEditingId] = useState(null);
  const [open, setOpen] = useState(false);
  const [newItem, setNewItem] = useState({ descricao: "", quantidade: "", valor_unit: "" });

  // Busca/filtros topo + filtros avançados
  const [q, setQ] = useState("");
  const [month, setMonth] = useState(""); // YYYY-MM
  const [openFilters, setOpenFilters] = useState(false);
  const [fStatus, setFStatus] = useState(""); // "", "Aberta", "Em Andamento", ...
  const [fDe, setFDe] = useState(""); // BR
  const [fAte, setFAte] = useState(""); // BR

  // Paginação
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      // mantém sua API
      const { data } = await api.get("/commercial/orders");
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr("Falha ao carregar ordens.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  /* ---------- Normalização + filtros ---------- */
  const normalized = useMemo(() => {
    return (Array.isArray(orders) ? orders : []).map((o) => ({
      ...o,
      _ymd: toYMD(o.data),                          // data normalizada
      _empresa: o.empresa || o.titulo || "",         // compat
      _qtd: orderQty(o),
      _unitPure: orderUnitValuePure(o),
      _unitAvg: orderAvgUnit(o),
    }));
  }, [orders]);

  const filtered = useMemo(() => {
    let list = [...normalized];

    // atalho de mês
    if (month) list = list.filter((o) => (o._ymd || "").slice(0, 7) === month);

    // texto livre
    const k = q.trim().toLowerCase();
    if (k) {
      list = list.filter((o) =>
        [o.cliente, o._empresa, o.descricao, o.status]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(k))
      );
    }

    // status
    if (fStatus) list = list.filter((o) => String(o.status || "") === fStatus);

    // período (BR -> YMD)
    if (fDe || fAte) {
      const de = fDe ? toYMD(fDe) : "0000-01-01";
      const ate = fAte ? toYMD(fAte) : "9999-12-31";
      list = list.filter((o) => (o._ymd || "") >= de && (o._ymd || "") <= ate);
    }

    // ordena por data desc + cliente
    list.sort((a, b) => (b._ymd || "").localeCompare(a._ymd || "") || String(a.cliente||"").localeCompare(b.cliente||"", "pt-BR"));
    return list;
  }, [normalized, q, month, fStatus, fDe, fAte]);

  // KPIs
  const kpiCount = filtered.length;
  const kpiTotal = useMemo(
    () => filtered.reduce((sum, o) => sum + parseFlex(o.valor_total), 0),
    [filtered]
  );

  // Página atual
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  // Export
  const exportData = useMemo(() => {
    return pageItems.map((o) => ({
      "Data": ymdToBR(o._ymd),
      "Cliente": o.cliente || "",
      "Empresa": o._empresa || "",
      "Qtd (itens)": fmtInt.format(o._qtd || 0),
      "Valor unit.": o._unitPure !== null ? BRL(o._unitPure) : (showAvgUnit && (o._qtd || 0) > 0 ? BRL(o._unitAvg) : "—"),
      "Total": BRL(o.valor_total || 0),
      "Status": o.status || "",
      "Descrição": o.descricao || "",
    }));
  }, [pageItems, showAvgUnit]);

  const filtersCount =
    (fStatus ? 1 : 0) + ((fDe || fAte) ? 1 : 0) + (month ? 1 : 0);

  /* ---------- Handlers ---------- */
  const resetFilters = () => {
    setQ(""); setMonth(""); setFStatus(""); setFDe(""); setFAte("");
  };

  const onFormChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };
  const onNewItemChange = (e) => {
    const { name, value } = e.target;
    setNewItem((p) => ({ ...p, [name]: value }));
  };
  const addItem = () => {
    if (!newItem.descricao?.trim()) return;
    const item = {
      descricao: newItem.descricao.trim(),
      quantidade: parseFlex(newItem.quantidade || 1),
      valor_unit: parseFlex(newItem.valor_unit || 0),
    };
    setForm((p) => ({ ...p, itens: [...(p.itens || []), item] }));
    setNewItem({ descricao: "", quantidade: "", valor_unit: "" });
  };
  const removeItem = (idx) => {
    setForm((p) => ({ ...p, itens: p.itens.filter((_, i) => i !== idx) }));
  };
  const updateItemField = (idx, field, value) => {
    setForm((p) => ({
      ...p,
      itens: p.itens.map((it, i) => (i === idx ? { ...it, [field]: value } : it)),
    }));
  };

  const total = useMemo(() => {
    return (form.itens || []).reduce(
      (acc, i) => acc + parseFlex(i.quantidade) * parseFlex(i.valor_unit), 0
    );
  }, [JSON.stringify(form.itens)]);
  useEffect(() => {
    setForm((p) => ({ ...p, valor_total: total.toFixed(2) }));
  }, [total]);

  const resetForm = () => {
    setForm(emptyOrder());
    setEditingId(null);
    setNewItem({ descricao: "", quantidade: "", valor_unit: "" });
  };

  const submit = async (e) => {
    e.preventDefault();
    // revalida total a partir dos itens
    const payloadTotal = (form.itens || []).reduce(
      (acc, i) => acc + parseFlex(i.quantidade) * parseFlex(i.valor_unit), 0
    );
    const payload = {
      ...form,
      // compat: envia empresa e titulo = empresa
      titulo: form.empresa || form.titulo || "",
      data: toYMD(form.data),
      itens: (form.itens || []).map((i) => ({
        descricao: i.descricao,
        quantidade: parseFlex(i.quantidade),
        valor_unit: parseFlex(i.valor_unit),
      })),
      valor_total: Number(payloadTotal.toFixed(2)),
    };
    const url = editingId ? `/commercial/orders/${editingId}` : `/commercial/orders`;
    const method = editingId ? "put" : "post";
    await api[method](url, payload);
    resetForm(); setOpen(false); load();
  };

  const edit = (o) => {
    setEditingId(o.id);
    setForm({
      cliente: o.cliente || "",
      empresa: o.empresa || o.titulo || "",
      descricao: o.descricao || "",
      status: o.status || "Aberta",
      data: ymdToBR(toYMD(o.data) || ""),
      itens: (o.itens || []).map((i) => ({
        descricao: i.descricao || "",
        quantidade: parseFlex(i.quantidade),
        valor_unit: parseFlex(i.valor_unit),
      })),
      valor_total: String(o.valor_total ?? ""),
    });
    setOpen(true);
  };

  const del = async (o) => {
    if (!confirm("Excluir esta ordem?")) return;
    await api.delete(`/commercial/orders/${o.id}`);
    load();
  };

  const goPrev = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const goNext = useCallback(() => setPage((p) => Math.min(totalPages, p + 1)), [totalPages]);

  /* ================= UI ================= */
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-xl">Ordens</CardTitle>
              <CardDescription>Cadastro e gestão de ordens de serviço</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => { resetForm(); setOpen(true); }}>
                <Plus className="mr-2 size-4" />
                Nova Ordem
              </Button>

              <ExportMenu
                data={exportData}
                fileBaseName={`ordens_${month || "filtrado"}`}
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
                placeholder="Buscar por cliente, empresa, descrição ou status..."
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

            <div className="flex-1 md:text-right">
              <label className="text-sm text-muted-foreground inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showAvgUnit}
                  onChange={(e) => setShowAvgUnit(e.target.checked)}
                />
                Mostrar valor médio quando necessário
              </label>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Ordens (após filtros)</p>
              <p className="text-2xl font-bold leading-tight">{fmtInt.format(kpiCount)}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Valor total (após filtros)</p>
              <p className="text-2xl font-bold leading-tight">{BRL(kpiTotal)}</p>
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table className="[text-align:_center] [&_th]:!text-center [&_td]:!text-center [&_th]:!align-middle [&_td]:!align-middle">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs md:text-sm">Data</TableHead>
                  <TableHead className="text-xs md:text-sm">Cliente</TableHead>
                  <TableHead className="text-xs md:text-sm">Empresa</TableHead>
                  <TableHead className="text-xs md:text-sm">Descrição</TableHead>
                  <TableHead className="text-xs md:text-sm">Status</TableHead>
                  <TableHead className="text-xs md:text-sm">Qtd</TableHead>
                  <TableHead className="text-xs md:text-sm">Valor Unit.</TableHead>
                  <TableHead className="text-xs md:text-sm">Total</TableHead>
                  <TableHead className="text-xs md:text-sm w-[160px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-muted-foreground">Carregando...</TableCell>
                  </TableRow>
                ) : pageItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-muted-foreground">Nenhuma ordem encontrada</TableCell>
                  </TableRow>
                ) : (
                  pageItems.map((o) => {
                    const unit = o._unitPure !== null ? BRL(o._unitPure) : (showAvgUnit && (o._qtd || 0) > 0 ? BRL(o._unitAvg) : "—");
                    return (
                      <TableRow key={o.id}>
                        <TableCell>{ymdToBR(o._ymd)}</TableCell>
                        <TableCell>{o.cliente || "—"}</TableCell>
                        <TableCell>{o._empresa || "—"}</TableCell>
                        <TableCell>{o.descricao || "—"}</TableCell>
                        <TableCell>{o.status || "—"}</TableCell>
                        <TableCell>{fmtInt.format(o._qtd || 0)}</TableCell>
                        <TableCell>{unit}</TableCell>
                        <TableCell>{BRL(o.valor_total)}</TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-2">
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => edit(o)}>
                              <Edit className="size-4" /> Editar
                            </Button>
                            <Button variant="destructive" size="sm" className="gap-2" onClick={() => del(o)}>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="order-2 sm:order-1 text-xs text-muted-foreground">
              Exibindo <b>{pageItems.length}</b> de <b>{filtered.length}</b> — Total exibido:{" "}
              <b>{BRL(kpiTotal)}</b>
            </div>
            <div className="order-1 sm:order-2 flex items-center justify-between gap-2">
              <Button type="button" variant="outline" size="sm" className="min-w-[92px] h-9" disabled={page <= 1} onClick={goPrev}>Anterior</Button>
              <div className="shrink-0 text-xs tabular-nums">
                <span className="inline-block rounded-md border bg-muted/60 px-2.5 py-1">
                  Página <b>{page}</b><span className="opacity-60">/{totalPages}</span>
                </span>
              </div>
              <Button type="button" variant="outline" size="sm" className="min-w-[92px] h-9" disabled={page >= totalPages} onClick={goNext}>Próxima</Button>
            </div>
          </div>

          {/* Filtros Avançados */}
          {openFilters && (
            <div className="rounded-xl border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Filtros avançados</h4>
                <Button variant="ghost" size="sm" onClick={() => setOpenFilters(false)}>Fechar</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Status</Label>
                  <select
                    className="border rounded-md px-3 py-2 text-sm bg-background w-full mt-1"
                    value={fStatus}
                    onChange={(e) => setFStatus(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option>Aberta</option>
                    <option>Em Andamento</option>
                    <option>Concluída</option>
                    <option>Cancelada</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs">De (DD/MM/AAAA)</Label>
                  <Input value={fDe} onChange={(e) => setFDe(maskDateBR(e.target.value))} placeholder="01/01/2025" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Até (DD/MM/AAAA)</Label>
                  <Input value={fAte} onChange={(e) => setFAte(maskDateBR(e.target.value))} placeholder="31/12/2025" className="mt-1" />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-xs text-muted-foreground">
                  {filtersCount ? `${filtersCount} filtro(s) ativo(s)` : "Sem filtros ativos"}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={resetFilters}>Limpar</Button>
                  <Button variant="secondary" size="sm" onClick={() => setOpenFilters(false)}>Aplicar</Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Criar/Editar (padrão reduzido) */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Ordem" : "Nova Ordem"}</DialogTitle>
            <DialogDescription>Preencha as informações da ordem</DialogDescription>
          </DialogHeader>

          <div className="pt-2">
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Cliente</Label>
                  <Input name="cliente" value={form.cliente} onChange={onFormChange} required />
                </div>
                <div>
                  <Label className="text-xs">Empresa</Label>
                  <Input name="empresa" value={form.empresa} onChange={onFormChange} />
                </div>
                <div>
                  <Label className="text-xs">Data</Label>
                  <InputDateBR value={form.data} onChange={(val) => setForm((p) => ({ ...p, data: val }))} />
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <select name="status" value={form.status} onChange={onFormChange} className="border rounded px-3 py-2 w-full">
                    <option>Aberta</option>
                    <option>Em Andamento</option>
                    <option>Concluída</option>
                    <option>Cancelada</option>
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-xs">Descrição</Label>
                <Textarea name="descricao" value={form.descricao} onChange={onFormChange} rows={4} />
              </div>

              {/* Itens */}
              <div className="border rounded p-3">
                <div className="font-medium mb-3">Itens</div>

                <div className="grid md:grid-cols-5 gap-2 mb-3">
                  <Input name="descricao" value={newItem.descricao} onChange={onNewItemChange} placeholder="Descrição (item)" className="md:col-span-2" />
                  <Input name="quantidade" value={newItem.quantidade} onChange={onNewItemChange} placeholder="Qtd" />
                  <Input name="valor_unit" value={newItem.valor_unit} onChange={onNewItemChange} placeholder="Valor unit." />
                  <Button type="button" onClick={addItem}>+ Adicionar</Button>
                </div>

                {(form.itens || []).length > 0 && (
                  <div className="overflow-auto">
                    <Table className="min-w-full text-sm">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-center">Descrição</TableHead>
                          <TableHead className="text-center">Qtd</TableHead>
                          <TableHead className="text-center">Valor Unit.</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                          <TableHead className="text-center">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {form.itens.map((i, idx) => {
                          const rowTotal = parseFlex(i.quantidade) * parseFlex(i.valor_unit);
                          return (
                            <TableRow key={idx}>
                              <TableCell className="w-[40%] text-center align-middle">
                                <Input value={i.descricao} onChange={(e) => updateItemField(idx, "descricao", e.target.value)} />
                              </TableCell>
                              <TableCell className="w-[10%] text-center align-middle">
                                <Input value={i.quantidade} onChange={(e) => updateItemField(idx, "quantidade", parseFlex(e.target.value))} />
                              </TableCell>
                              <TableCell className="w-[20%] text-center align-middle">
                                <Input value={i.valor_unit} onChange={(e) => updateItemField(idx, "valor_unit", parseFlex(e.target.value))} />
                              </TableCell>
                              <TableCell className="w-[20%] text-center align-middle">{BRL(rowTotal)}</TableCell>
                              <TableCell className="text-center align-middle w-[10%]">
                                <div className="flex justify-center">
                                  <Button type="button" variant="destructive" onClick={() => removeItem(idx)}>Remover</Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="text-right font-semibold mt-3">Total: {BRL(total)}</div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit">{editingId ? "Salvar" : "Adicionar"}</Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
