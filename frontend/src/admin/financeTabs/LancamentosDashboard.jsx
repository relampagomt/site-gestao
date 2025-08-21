import React, { useEffect, useMemo, useState } from "react";
import api from "@/services/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import { Badge } from "@/components/ui/badge.jsx";

import { BRL, isoToBR } from "@/lib/br.js";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Normalização de status
function normalizeStatus(any) {
  const raw = (any ?? "").toString().trim().toLowerCase();
  if (["pago", "paid", "quitado", "settled", "1", "true"].includes(raw)) return "Pago";
  if (["cancelado", "canceled", "cancelled", "estornado"].includes(raw)) return "Cancelado";
  if (["pendente", "pending", "", "0", "false", "em aberto"].includes(raw)) return "Pendente";
  return any ? String(any) : "Pendente";
}

function StatusBadge({ value }) {
  const v = normalizeStatus(value);
  if (v === "Pago") return <Badge className="bg-green-600">Pago</Badge>;
  if (v === "Pendente") return <Badge className="bg-amber-600">Pendente</Badge>;
  if (v === "Cancelado") return <Badge className="bg-gray-500">Cancelado</Badge>;
  return <Badge className="bg-gray-500">{v}</Badge>;
}

function decoratePagar(row) {
  const valor = Number(row?.valor ?? row?.amount ?? 0);
  let pago = Number(row?.valorPago ?? 0);
  const status = normalizeStatus(row?.status ?? row?.situacao ?? row?.paymentStatus);
  if ((!row?.valorPago || isNaN(pago)) && status === "Pago") pago = valor;
  if (status === "Cancelado") pago = 0;
  const aberto = Math.max(valor - pago, 0);
  const venc = String(row.date || row.vencimento || "").slice(0, 10);
  return { ...row, tipo: "pagar", status, _valor: valor, _pago: pago, _aberto: aberto, _venc: venc };
}

function decorateReceber(row) {
  const valor = Number(row?.valor ?? row?.amount ?? 0);
  const taxas = Number(row?.taxasJuros ?? 0);
  let liq = Number(row?.valorLiqRecebido ?? row?.valorLiquidoRecebido ?? 0);
  const status = normalizeStatus(row?.status ?? row?.situacao ?? row?.paymentStatus);
  if ((isNaN(liq) || (!row?.valorLiqRecebido && !row?.valorLiquidoRecebido)) && status === "Pago") {
    liq = Math.max(valor - taxas, 0);
  } else if (status !== "Pago") {
    liq = 0;
  }
  const aberto = Math.max(valor - liq, 0);
  const venc = String(row.date || row.vencimento || "").slice(0, 10);
  return { ...row, tipo: "receber", status, _valor: valor, _liq: liq, _aberto: aberto, _taxas: taxas, _venc: venc };
}

export default function LancamentosDashboard() {
  const [pagar, setPagar] = useState([]);
  const [receber, setReceber] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState("todos");
  const [busca, setBusca] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([api.get("/contas-pagar"), api.get("/contas-receber")]);
      const arrP = Array.isArray(r1.data) ? r1.data.map(decoratePagar) : [];
      const arrR = Array.isArray(r2.data) ? r2.data.map(decorateReceber) : [];
      setPagar(arrP);
      setReceber(arrR);
    } catch (e) {
      console.error("Erro ao carregar visão geral", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Filtro por mês e busca
  const filterBy = (rows) => {
    const q = busca.trim().toLowerCase();
    return rows.filter((r) => {
      const inMonth = mes === "todos" ? true : String(r._venc || "").slice(5, 7) === mes;
      const inSearch =
        !q ||
        String(r.descricao || r.notes || r.cliente || r.documento || r.notaFiscal || "").toLowerCase().includes(q) ||
        String(r.status || "").toLowerCase().includes(q);
      return inMonth && inSearch;
    });
  };

  const pagarF = useMemo(() => filterBy(pagar), [pagar, mes, busca]);
  const receberF = useMemo(() => filterBy(receber), [receber, mes, busca]);

  // KPIs agregados (painel geral)
  const kpi = useMemo(() => {
    let saidas = 0, pagos = 0, abertoPagar = 0;
    for (const i of pagarF) {
      saidas += i._valor;
      pagos += Math.min(i._pago, i._valor);
      abertoPagar += Math.max(i._valor - i._pago, 0);
    }

    let entradas = 0, recebidos = 0, abertoReceber = 0;
    for (const i of receberF) {
      entradas += i._valor;
      recebidos += Math.min(i._liq, i._valor);
      abertoReceber += Math.max(i._valor - i._liq, 0);
    }

    const saldoProjetado = recebidos - pagos; // realizado
    const saldoABerto = entradas - saidas; // compromissado total

    return {
      saidas, pagos, abertoPagar,
      entradas, recebidos, abertoReceber,
      saldoProjetado, saldoABerto,
    };
  }, [pagarF, receberF]);

  // Gráfico: fluxo mensal (por YYYY-MM)
  const chartMes = useMemo(() => {
    const acc = new Map();
    const add = (ym, f) => acc.set(ym, { mes: ym, entradas: 0, saidas: 0, ...acc.get(ym), ...f(acc.get(ym) || {}) });

    for (const r of pagarF) {
      const ym = (r._venc || "").slice(0, 7);
      add(ym, (p) => ({ ...p, saidas: (p.saidas || 0) + r._valor, pagos: (p.pagos || 0) + r._pago }));
    }
    for (const r of receberF) {
      const ym = (r._venc || "").slice(0, 7);
      add(ym, (p) => ({ ...p, entradas: (p.entradas || 0) + r._valor, recebidos: (p.recebidos || 0) + r._liq }));
    }

    // Ordena por mês
    return Array.from(acc.values()).sort((a, b) => a.mes.localeCompare(b.mes));
  }, [pagarF, receberF]);

  // Gráfico: distribuição por status
  const statusData = useMemo(() => {
    const count = { Pendente: 0, Pago: 0, Cancelado: 0 };
    pagarF.forEach((r) => (count[normalizeStatus(r.status)]++));
    receberF.forEach((r) => (count[normalizeStatus(r.status)]++));
    return [
      { name: "Pendente", value: count.Pendente },
      { name: "Pago", value: count.Pago },
      { name: "Cancelado", value: count.Cancelado },
    ];
  }, [pagarF, receberF]);

  const COLORS = ["#2563eb", "#16a34a", "#6b7280"]; // azul, verde, cinza

  // Próximos vencimentos (7 dias)
  const proximos = useMemo(() => {
    const all = [
      ...pagarF.map((r) => ({
        tipo: "Pagar",
        id: r.id,
        venc: r._venc,
        desc: r.descricao || r.notes || r.documento || "-",
        valor: r._valor,
        status: r.status,
      })),
      ...receberF.map((r) => ({
        tipo: "Receber",
        id: r.id,
        venc: r._venc,
        desc: r.descricao || r.cliente || r.notaFiscal || "-",
        valor: r._valor,
        status: r.status,
      })),
    ];
    const today = new Date().toISOString().slice(0, 10);
    const week = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    return all
      .filter((x) => x.venc && x.venc >= today && x.venc <= week)
      .sort((a, b) => a.venc.localeCompare(b.venc))
      .slice(0, 10);
  }, [pagarF, receberF]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="w-full sm:max-w-xs">
          <Label>Buscar</Label>
          <Input placeholder="Cliente, descrição, status..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="w-full sm:max-w-[200px]">
          <Label>Mês</Label>
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="01">Janeiro</SelectItem>
              <SelectItem value="02">Fevereiro</SelectItem>
              <SelectItem value="03">Março</SelectItem>
              <SelectItem value="04">Abril</SelectItem>
              <SelectItem value="05">Maio</SelectItem>
              <SelectItem value="06">Junho</SelectItem>
              <SelectItem value="07">Julho</SelectItem>
              <SelectItem value="08">Agosto</SelectItem>
              <SelectItem value="09">Setembro</SelectItem>
              <SelectItem value="10">Outubro</SelectItem>
              <SelectItem value="11">Novembro</SelectItem>
              <SelectItem value="12">Dezembro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1" />
        <Button onClick={load} variant="outline">Atualizar</Button>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs font-normal">Entradas (a Receber)</CardTitle></CardHeader><CardContent className="text-lg font-semibold">{BRL(kpi.entradas)}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs font-normal">Saídas (Despesas)</CardTitle></CardHeader><CardContent className="text-lg font-semibold">{BRL(kpi.saidas)}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs font-normal">Recebido Líquido</CardTitle></CardHeader><CardContent className="text-lg font-semibold">{BRL(kpi.recebidos)}</CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs font-normal">Total Pago</CardTitle></CardHeader><CardContent className="text-lg font-semibold">{BRL(kpi.pagos)}</CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2 h-[320px]">
          <CardHeader className="pb-1"><CardTitle>Fluxo por mês</CardTitle></CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartMes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(v) => BRL(v)} />
                <Legend />
                <Bar dataKey="entradas" name="Entradas" />
                <Bar dataKey="saidas" name="Saídas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="h-[320px]">
          <CardHeader className="pb-1"><CardTitle>Distribuição de Status</CardTitle></CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={100} label>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pagar" className="w-full">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="pagar">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="receber">Contas a Receber</TabsTrigger>
        </TabsList>
        <TabsContent value="pagar">
          <Card>
            <CardHeader><CardTitle>Despesas</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Vencimento</TableHead>
                      <TableHead className="text-center">Documento</TableHead>
                      <TableHead className="text-center">Descrição</TableHead>
                      <TableHead className="text-center">Valor</TableHead>
                      <TableHead className="text-center">Pago</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!loading && pagarF.map((r) => (
                      <TableRow key={`p-${r.id}`}>
                        <TableCell className="text-center">{isoToBR(r._venc)}</TableCell>
                        <TableCell className="text-center">{r.documento || "-"}</TableCell>
                        <TableCell className="text-center">{r.descricao || r.notes || "-"}</TableCell>
                        <TableCell className="text-center">{BRL(r._valor)}</TableCell>
                        <TableCell className="text-center">{BRL(r._pago)}</TableCell>
                        <TableCell className="text-center"><StatusBadge value={r.status} /></TableCell>
                      </TableRow>
                    ))}
                    {loading && (
                      <TableRow><TableCell colSpan={6} className="text-center py-6">Carregando...</TableCell></TableRow>
                    )}
                    {!loading && pagarF.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-6">Sem registros</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="receber">
          <Card>
            <CardHeader><CardTitle>Receitas</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Vencimento</TableHead>
                      <TableHead className="text-center">Cliente</TableHead>
                      <TableHead className="text-center">Nota Fiscal</TableHead>
                      <TableHead className="text-center">Valor</TableHead>
                      <TableHead className="text-center">Líquido</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!loading && receberF.map((r) => (
                      <TableRow key={`r-${r.id}`}>
                        <TableCell className="text-center">{isoToBR(r._venc)}</TableCell>
                        <TableCell className="text-center">{r.cliente || "-"}</TableCell>
                        <TableCell className="text-center">{r.notaFiscal || "-"}</TableCell>
                        <TableCell className="text-center">{BRL(r._valor)}</TableCell>
                        <TableCell className="text-center">{BRL(r._liq)}</TableCell>
                        <TableCell className="text-center"><StatusBadge value={r.status} /></TableCell>
                      </TableRow>
                    ))}
                    {loading && (
                      <TableRow><TableCell colSpan={6} className="text-center py-6">Carregando...</TableCell></TableRow>
                    )}
                    {!loading && receberF.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-6">Sem registros</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader><CardTitle>Próximos 7 dias</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Tipo</TableHead>
                  <TableHead className="text-center">Vencimento</TableHead>
                  <TableHead className="text-center">Descrição</TableHead>
                  <TableHead className="text-center">Valor</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proximos.map((p, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-center">{p.tipo}</TableCell>
                    <TableCell className="text-center">{isoToBR(p.venc)}</TableCell>
                    <TableCell className="text-center">{p.desc}</TableCell>
                    <TableCell className="text-center">{BRL(p.valor)}</TableCell>
                    <TableCell className="text-center"><StatusBadge value={p.status} /></TableCell>
                  </TableRow>
                ))}
                {!loading && proximos.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-6">Nada nos próximos 7 dias</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
