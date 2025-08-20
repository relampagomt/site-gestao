// frontend/src/admin/RecentActivities.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "@/services/api";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";

import { Activity, Search, ChevronLeft, ChevronRight } from "lucide-react";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");

export default function RecentActivities() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  // histórico dentro do modal
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8); // 0 = todos

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/actions");
        const arr = Array.isArray(res.data) ? res.data : [];
        // mais recentes primeiro
        const sorted = arr
          .slice()
          .sort(
            (a, b) =>
              new Date(b.created_at || b.start_date || 0) -
              new Date(a.created_at || a.start_date || 0)
          );
        setList(sorted);
      } catch (e) {
        setList([]);
      }
    })();
  }, []);

  const latest = useMemo(() => list.slice(0, 12), [list]);

  const filteredHistory = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return list;
    return list.filter((a) =>
      [
        a.client_name,
        a.company_name,
        a.title,
        a.type,
        a.status,
        a.supervisor,
        a.material_quantity,
        a.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(k)
    );
  }, [list, q]);

  const totalPages =
    pageSize === 0 ? 1 : Math.max(1, Math.ceil(filteredHistory.length / pageSize));

  const pageItems = useMemo(() => {
    if (pageSize === 0) return filteredHistory; // mostrar todos
    const start = (page - 1) * pageSize;
    return filteredHistory.slice(start, start + pageSize);
  }, [filteredHistory, page, pageSize]);

  // abrir modal
  const openDetails = (row) => {
    setSelected(row || null);
    setOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base sm:text-lg">Atividades Recentes</CardTitle>
            <CardDescription>Últimas ações realizadas no sistema</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openDetails(null)}
            title="Abrir histórico completo"
          >
            Ver todo o histórico
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {latest.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem atividades recentes.</p>
          ) : (
            <>
              {latest.map((a, i) => (
                <button
                  key={i}
                  onClick={() => openDetails(a)}
                  className="w-full text-left group"
                >
                  <div className="flex items-center gap-3 rounded-lg border px-3 py-2 hover:bg-muted/40 transition">
                    <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {a.client_name || a.company_name || a.title || "Ação"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(a.start_date || a.created_at)}
                      </p>
                    </div>
                    {a.status && (
                      <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5">
                        {a.status}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
              <div className="pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => openDetails(null)}
                >
                  Ver todo o histórico
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ===== Modal super compacto, sem cortes ===== */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          // largura/altura responsivas e corpo rolável
          className="p-0 w-[min(96vw,760px)] sm:max-w-[760px] max-h-[85vh] overflow-hidden fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <div className="grid h-full grid-rows-[auto,1fr]">
            {/* Cabeçalho */}
            <div className="px-5 pt-5 pb-3 border-b bg-background">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-lg">
                  {selected
                    ? (selected.client_name ||
                      selected.company_name ||
                      selected.title ||
                      "Detalhes")
                    : "Histórico completo"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Visualize os dados completos {selected ? "desta atividade e" : "e"} acesse o histórico logo abaixo.
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Corpo rolável ÚNICO (sem scroll aninhado na tabela) */}
            <div
              className="overflow-y-auto overscroll-contain"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {/* Detalhes compactos (apenas se houver item selecionado) */}
              {selected && (
                <div className="p-5 pb-4">
                  <div className="rounded-lg border bg-card p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <Info label="Cliente" value={selected?.client_name} />
                      <Info label="Empresa" value={selected?.company_name} />

                      <Info
                        label="Período"
                        value={
                          selected
                            ? `${fmtDate(selected.start_date)} → ${fmtDate(
                                selected.end_date || selected.start_date
                              )}`
                            : "—"
                        }
                      />
                      <Info label="Supervisor" value={selected?.supervisor} />

                      <Info
                        label="Qtd. Material"
                        value={
                          typeof selected?.material_quantity === "number"
                            ? String(selected.material_quantity)
                            : String(selected?.material_quantity || "0")
                        }
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">Status</span>
                        {selected?.status ? (
                          <Badge variant="secondary" className="h-5 text-[10px] px-2">
                            {selected.status}
                          </Badge>
                        ) : (
                          <span className="text-xs">—</span>
                        )}
                      </div>

                      {/* Tipos / Turno */}
                      <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
                        {(Array.isArray(selected?.types)
                          ? selected?.types
                          : String(selected?.type || "")
                              .split(",")
                              .map((s) => s.trim())
                        )
                          .filter(Boolean)
                          .map((t, i) => (
                            <Badge key={i} variant="outline" className="h-5 text-[10px]">
                              {t}
                            </Badge>
                          ))}
                        {selected?.shift && (
                          <Badge variant="outline" className="h-5 text-[10px]">
                            {selected.shift}
                          </Badge>
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <p className="text-[11px] text-muted-foreground mb-1">Observações</p>
                        <p className="text-xs whitespace-pre-wrap">
                          {selected?.notes || "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Histórico com busca + paginação (sem corte de conteúdo) */}
              <div className="px-5 pb-5">
                <div className="rounded-lg border bg-card">
                  <div className="flex items-center justify-between gap-2 p-3 border-b">
                    <p className="text-sm font-medium">Histórico de Atividades</p>

                    {/* Busca */}
                    <div className="flex items-center gap-2">
                      <div className="relative w-[min(56vw,320px)]">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={q}
                          onChange={(e) => {
                            setQ(e.target.value);
                            setPage(1);
                          }}
                          placeholder="Buscar no histórico…"
                          className="pl-8 h-8 text-xs"
                        />
                      </div>

                      {/* Itens por página */}
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="text-muted-foreground">Itens:</span>
                        <select
                          className="border rounded px-2 h-8 bg-background"
                          value={String(pageSize)}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setPageSize(v);
                            setPage(1);
                          }}
                        >
                          <option value="8">8</option>
                          <option value="20">20</option>
                          <option value="50">50</option>
                          <option value="100">100</option>
                          <option value="0">Todos</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Tabela sem scroll interno vertical (só horizontal se precisar) */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[11px]">Cliente</TableHead>
                          <TableHead className="text-[11px]">Empresa</TableHead>
                          <TableHead className="text-[11px]">Período</TableHead>
                          <TableHead className="text-[11px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pageItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-xs py-6">
                              Sem registros.
                            </TableCell>
                          </TableRow>
                        ) : (
                          pageItems.map((r, i) => (
                            <TableRow key={`${r.id || i}-${r.start_date || ""}`}>
                              <TableCell className="text-xs">{r.client_name || "—"}</TableCell>
                              <TableCell className="text-xs">{r.company_name || "—"}</TableCell>
                              <TableCell className="text-xs">
                                {fmtDate(r.start_date)} → {fmtDate(r.end_date || r.start_date)}
                              </TableCell>
                              <TableCell className="text-xs">
                                {r.status ? (
                                  <Badge variant="secondary" className="h-5 text-[10px] px-2">
                                    {r.status}
                                  </Badge>
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Paginação compacta (mobile-safe com onPointerUp) */}
                  <div className="flex items-center justify-between p-3 border-t">
                    <span className="text-[11px] text-muted-foreground">
                      Exibindo <b>{pageItems.length}</b> de{" "}
                      <b>{filteredHistory.length}</b> registros
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        disabled={page <= 1 || pageSize === 0}
                        onPointerUp={() => setPage((p) => Math.max(1, p - 1))}
                        aria-label="Página anterior"
                        title="Anterior"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs tabular-nums">
                        {page} <span className="opacity-60">/ {totalPages}</span>
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        disabled={page >= totalPages || pageSize === 0}
                        onPointerUp={() => setPage((p) => Math.min(totalPages, p + 1))}
                        aria-label="Próxima página"
                        title="Próxima"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* --------- subcomponente de info compacto --------- */
function Info({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-xs font-medium truncate">{value || "—"}</p>
    </div>
  );
}
