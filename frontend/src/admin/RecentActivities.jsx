// frontend/src/admin/RecentActivities.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import api from "@/services/api";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Separator } from "@/components/ui/separator.jsx";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input.jsx";

/* Utils pequenos (para não depender de Actions.jsx) */
const ensureArrayTypes = (item) => {
  if (Array.isArray(item?.types)) return item.types;
  if (typeof item?.type === "string" && item.type.trim())
    return item.type.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
};
const br = (ymd) => {
  if (!ymd) return "";
  const s = String(ymd);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  }
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
};
const statusChip = (s) =>
  s === "andamento" ? "bg-blue-100 text-blue-800 border-blue-300"
  : s === "concluido" ? "bg-green-100 text-green-800 border-green-300"
  : "bg-amber-100 text-amber-800 border-amber-300";
const getStatus = (a) => a?.status ? a.status : (a?.active === false ? "concluido" : "aguardando");

export default function RecentActivities() {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  // Histórico (dentro do modal)
  const [histQuery, setHistQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const fetchActions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/actions");
      const list = Array.isArray(res.data) ? res.data : [];
      // ordena: mais recentes primeiro (por start_date/start_datetime)
      list.sort((a, b) => {
        const ax = (a.start_date || a.start_datetime || "").toString();
        const bx = (b.start_date || b.start_datetime || "").toString();
        return bx.localeCompare(ax);
      });
      setActions(list);
    } catch {
      setActions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchActions(); }, [fetchActions]);

  // Lista curta da seção (5 mais recentes)
  const recent = useMemo(() => actions.slice(0, 8), [actions]);

  // Histórico com busca + paginação dentro do modal
  const filteredHist = useMemo(() => {
    const q = histQuery.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a) => {
      const txt = [
        a.client_name, a.company_name, a.notes, a.supervisor,
        ensureArrayTypes(a).join(" ")
      ].filter(Boolean).join(" ").toLowerCase();
      return txt.includes(q);
    });
  }, [actions, histQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredHist.length / pageSize));
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredHist.slice(start, start + pageSize);
  }, [filteredHist, page]);

  const openDetails = (item) => { setSelected(item); setOpen(true); };

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg md:text-xl font-semibold">Atividades Recentes</CardTitle>
          <CardDescription>Últimas ações realizadas no sistema</CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground py-6">Carregando…</div>
          ) : recent.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6">Sem atividades ainda.</div>
          ) : (
            <div className="divide-y">
              {recent.map((a) => {
                const id = a.id ?? a._id ?? a.uuid ?? Math.random();
                return (
                  <button
                    key={id}
                    onClick={() => openDetails(a)}
                    className="w-full text-left py-3 flex items-start gap-3 hover:bg-accent/40 rounded-md px-2 transition"
                  >
                    <div className="mt-1 h-5 w-5 rounded-full border flex items-center justify-center text-muted-foreground">∿</div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{a.client_name || a.company_name || "Ação"}</div>
                      <div className="text-xs text-muted-foreground">
                        {br(a.start_date || a.start_datetime)}
                      </div>
                    </div>
                    <div className="ml-auto">
                      <Badge variant="outline" className={`capitalize ${statusChip(getStatus(a))}`}>
                        {getStatus(a)}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL: Detalhes + Histórico com paginação */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-3xl max-h-[85vh] overflow-hidden p-0">
          <div className="grid grid-rows-[auto,1fr] h-full">
            <div className="px-5 pt-5 pb-3 border-b">
              <DialogHeader>
                <DialogTitle className="text-base">
                  {selected ? (selected.client_name || selected.company_name || "Detalhes da ação") : "Detalhes da ação"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Visualize os dados completos e acesse o histórico logo abaixo.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="overflow-y-auto p-5 space-y-6">
              {/* Detalhes */}
              {selected && (
                <div className="rounded-lg border p-4">
                  <div className="flex flex-wrap gap-x-8 gap-y-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Cliente</div>
                      <div className="text-sm font-medium">{selected.client_name || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Empresa</div>
                      <div className="text-sm font-medium">{selected.company_name || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Período</div>
                      <div className="text-sm font-medium">
                        {br(selected.start_date || selected.start_datetime)}{selected.end_date || selected.end_datetime ? " → " + br(selected.end_date || selected.end_datetime) : ""}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Status</div>
                      <div>
                        <Badge className={`capitalize ${statusChip(getStatus(selected))}`}>{getStatus(selected)}</Badge>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Supervisor</div>
                      <div className="text-sm font-medium">{selected.supervisor || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Qtd. Material</div>
                      <div className="text-sm font-medium">{selected.material_qty ?? "—"}</div>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  <div className="flex flex-wrap gap-2">
                    {ensureArrayTypes(selected).map((t) => (
                      <Badge key={t} variant="secondary">{t}</Badge>
                    ))}
                    {(!ensureArrayTypes(selected).length) && (
                      <span className="text-xs text-muted-foreground">Sem tipos informados</span>
                    )}
                  </div>

                  {Array.isArray(selected?.day_periods) && selected.day_periods.length > 0 && (
                    <>
                      <Separator className="my-3" />
                      <div className="flex flex-wrap gap-2">
                        {selected.day_periods.map((p) => (
                          <Badge key={p} variant="outline">{p}</Badge>
                        ))}
                      </div>
                    </>
                  )}

                  {Array.isArray(selected?.team_members) && selected.team_members.length > 0 && (
                    <>
                      <Separator className="my-3" />
                      <div className="text-xs text-muted-foreground mb-1">Equipe</div>
                      <div className="flex flex-wrap gap-2">
                        {selected.team_members.map((n) => (
                          <Badge key={n} variant="outline">{n}</Badge>
                        ))}
                      </div>
                    </>
                  )}

                  {selected?.notes && (
                    <>
                      <Separator className="my-3" />
                      <div className="text-xs text-muted-foreground mb-1">Observações</div>
                      <p className="text-sm whitespace-pre-wrap">{selected.notes}</p>
                    </>
                  )}
                </div>
              )}

              {/* Histórico com paginação */}
              <div className="rounded-lg border">
                <div className="p-4 flex flex-wrap items-center gap-3 justify-between">
                  <div className="font-medium">Histórico de Atividades</div>
                  <div className="relative w-full sm:w-[260px]">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      className="pl-8 h-9"
                      placeholder="Buscar no histórico…"
                      value={histQuery}
                      onChange={(e)=>setHistQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center">Cliente</TableHead>
                        <TableHead className="text-center">Empresa</TableHead>
                        <TableHead className="text-center">Período</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-sm text-muted-foreground">
                            Nada encontrado.
                          </TableCell>
                        </TableRow>
                      ) : pageItems.map((a) => {
                        const { start_date, start_datetime, end_date, end_datetime } = a;
                        const st = getStatus(a);
                        return (
                          <TableRow key={(a.id ?? a._id ?? a.uuid) + (a.start_date || a.start_datetime || "")}>
                            <TableCell className="text-center font-medium">{a.client_name || "—"}</TableCell>
                            <TableCell className="text-center">{a.company_name || "—"}</TableCell>
                            <TableCell className="text-center">
                              {br(start_date || start_datetime)}{(end_date || end_datetime) ? " → " + br(end_date || end_datetime) : ""}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={`capitalize ${statusChip(st)}`}>{st}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button size="sm" variant="outline" onClick={()=>setSelected(a)}>Ver</Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Paginação */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-xs text-muted-foreground order-2 sm:order-1">
                    Exibindo <b>{pageItems.length}</b> de <b>{filteredHist.length}</b> registros
                  </div>
                  <div className="order-1 sm:order-2 flex items-center gap-2">
                    <Button variant="outline" size="sm" className="min-w-[92px] h-9" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>
                      <ChevronLeft className="size-4 mr-1" /> Anterior
                    </Button>
                    <span className="text-xs tabular-nums inline-block rounded-md border bg-muted/60 px-2.5 py-1">
                      Página <b>{page}</b><span className="opacity-60">/{totalPages}</span>
                    </span>
                    <Button variant="outline" size="sm" className="min-w-[92px] h-9" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>
                      Próxima <ChevronRight className="size-4 ml-1" />
                    </Button>
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
