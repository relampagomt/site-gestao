// frontend/src/admin/financeTabs/LancamentosTab.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "@/services/api";

// UI
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import { Badge } from "@/components/ui/badge.jsx";

// ===== Helpers: pt-BR moeda e data =====
const toBRL = (value) => {
  if (value === null || value === undefined || value === "") return "R$ 0,00";
  const num = Number(value);
  if (Number.isNaN(num)) return "R$ 0,00";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const toDateBR = (iso) => {
  if (!iso) return "—";
  // Espera "YYYY-MM-DD" (sem timezone) conforme padrão do projeto
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return "—";
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
};

const normalizeStatus = (s) => {
  if (!s) return "Pendente";
  const v = String(s).toLowerCase();
  if (["pago", "pagas", "paid"].includes(v)) return "Pago";
  if (["cancelado", "cancelada", "canceled"].includes(v)) return "Cancelado";
  return "Pendente";
};

const StatusPill = ({ status }) => {
  const s = normalizeStatus(status);
  const color =
    s === "Pago" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
    s === "Cancelado" ? "bg-rose-100 text-rose-700 border-rose-200" :
    "bg-amber-100 text-amber-800 border-amber-200";
  return <Badge className={`rounded-full border ${color}`}>{s}</Badge>;
};

const monthOptions = [
  { value: "todos", label: "Todos os meses" },
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const LancamentosTab = () => {
  // Estados de filtro
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("todos");

  // Dados
  const [loading, setLoading] = useState(false);
  const [payables, setPayables] = useState([]);     // Contas a Pagar
  const [receivables, setReceivables] = useState([]); // Contas a Receber
  const [error, setError] = useState("");

  // Carrega dados das duas páginas
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        // Back-end mapeado no projeto: routes/finance.py → /contas-pagar e /contas-receber
        const [pagarRes, receberRes] = await Promise.all([
          api.get("/contas-pagar"),
          api.get("/contas-receber"),
        ]);

        if (!mounted) return;

        // Garante arrays
        setPayables(Array.isArray(pagarRes?.data) ? pagarRes.data : (pagarRes?.data?.items || []));
        setReceivables(Array.isArray(receberRes?.data) ? receberRes.data : (receberRes?.data?.items || []));
      } catch (e) {
        console.error("Erro ao buscar lançamentos:", e);
        setError("Não foi possível obter os lançamentos. Verifique o back-end /contas-pagar e /contas-receber.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ===== Filtros =====
  const filterByMonth = (list, dateField) => {
    if (month === "todos") return list;
    return list.filter((item) => {
      const iso = item?.[dateField]; // "YYYY-MM-DD"
      if (!iso || typeof iso !== "string" || iso.length < 7) return false;
      const mm = iso.slice(5, 7);
      return mm === month;
    });
  };

  const filterBySearch = (list, keys) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((row) =>
      keys.some((k) => String(row?.[k] ?? "").toLowerCase().includes(q))
    );
  };

  // Contas a Pagar → usar vencimento como mês principal
  const pagarFiltrado = useMemo(() => {
    const porMes = filterByMonth(payables, "vencimento");
    return filterBySearch(porMes, ["documento", "descricao", "status"]);
  }, [payables, month, search]);

  // Contas a Receber → usar vencimento como mês principal
  const receberFiltrado = useMemo(() => {
    const porMes = filterByMonth(receivables, "vencimento");
    return filterBySearch(porMes, ["cliente", "nota_fiscal", "status"]);
  }, [receivables, month, search]);

  // ===== Totais simples para feedback =====
  const totals = useMemo(() => {
    const pagarValor = pagarFiltrado.reduce((acc, r) => acc + (Number(r?.valor) || 0), 0);
    const pagarPago  = pagarFiltrado.reduce((acc, r) => acc + (Number(r?.valor_pago) || 0), 0);
    const receberValor = receberFiltrado.reduce((acc, r) => acc + (Number(r?.valor) || 0), 0);
    const receberLiquido = receberFiltrado.reduce((acc, r) => acc + (Number(r?.liquido_recebido) || 0), 0);
    return { pagarValor, pagarPago, receberValor, receberLiquido };
  }, [pagarFiltrado, receberFiltrado]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho da seção */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Lançamentos</CardTitle>
          <CardDescription>Visualize aqui tudo que foi lançado em <strong>Contas a Pagar</strong> e <strong>Contas a Receber</strong>. (Somente leitura)</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <Input
              placeholder="Buscar por documento, descrição, cliente, nota fiscal, status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full md:w-60">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os meses" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* IMPORTANTE: não existe mais botão de novo lançamento */}
          {/* <Button>+ Novo Lançamento</Button>  ← REMOVIDO */}
        </CardContent>
      </Card>

      {/* KPIs simples */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Saídas (Pagar)</CardDescription></CardHeader>
          <CardContent className="text-xl font-semibold">{toBRL(totals.pagarValor)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Total Pago (Pagar)</CardDescription></CardHeader>
          <CardContent className="text-xl font-semibold">{toBRL(totals.pagarPago)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Entradas (Receber)</CardDescription></CardHeader>
          <CardContent className="text-xl font-semibold">{toBRL(totals.receberValor)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Líquido Recebido</CardDescription></CardHeader>
          <CardContent className="text-xl font-semibold">{toBRL(totals.receberLiquido)}</CardContent>
        </Card>
      </div>

      {/* ====================== Tabela: Contas a Pagar ====================== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Contas a Pagar</CardTitle>
          <CardDescription>Vencimento, Documento, Descrição, Valor, Data Pagamento, Valor Pago, Status</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Vencimento</TableHead>
                <TableHead className="text-center">Documento</TableHead>
                <TableHead className="text-center">Descrição</TableHead>
                <TableHead className="text-center">Valor</TableHead>
                <TableHead className="text-center">Data Pagamento</TableHead>
                <TableHead className="text-center">Valor Pago</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6">Carregando…</TableCell>
                </TableRow>
              )}
              {!loading && pagarFiltrado.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Sem registros</TableCell>
                </TableRow>
              )}
              {!loading && pagarFiltrado.map((row, idx) => (
                <TableRow key={row.id || idx}>
                  <TableCell className="text-center">{toDateBR(row?.vencimento)}</TableCell>
                  <TableCell className="text-center">{row?.documento || "—"}</TableCell>
                  <TableCell className="text-center">{row?.descricao || "—"}</TableCell>
                  <TableCell className="text-center">{toBRL(row?.valor)}</TableCell>
                  <TableCell className="text-center">{toDateBR(row?.data_pagamento)}</TableCell>
                  <TableCell className="text-center">{toBRL(row?.valor_pago)}</TableCell>
                  <TableCell className="text-center"><StatusPill status={row?.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {error && <div className="text-sm text-rose-600 mt-3">{error}</div>}
        </CardContent>
      </Card>

      {/* ====================== Tabela: Contas a Receber ====================== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Contas a Receber</CardTitle>
          <CardDescription>Vencimento, Cliente, Nota Fiscal, Valor, Taxas/Juros, Líquido Recebido, Emissão, Baixa, Status</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Vencimento</TableHead>
                <TableHead className="text-center">Cliente</TableHead>
                <TableHead className="text-center">Nota Fiscal</TableHead>
                <TableHead className="text-center">Valor</TableHead>
                <TableHead className="text-center">Taxas/Juros</TableHead>
                <TableHead className="text-center">Líquido Recebido</TableHead>
                <TableHead className="text-center">Emissão</TableHead>
                <TableHead className="text-center">Baixa</TableHead>
                <TableHead className="text-center">Status</TableHead>
                {/* Página é somente leitura nesta aba; não exibimos Ações aqui */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-6">Carregando…</TableCell>
                </TableRow>
              )}
              {!loading && receberFiltrado.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">Sem registros</TableCell>
                </TableRow>
              )}
              {!loading && receberFiltrado.map((row, idx) => (
                <TableRow key={row.id || idx}>
                  <TableCell className="text-center">{toDateBR(row?.vencimento)}</TableCell>
                  <TableCell className="text-center">{row?.cliente || "—"}</TableCell>
                  <TableCell className="text-center">{row?.nota_fiscal || "—"}</TableCell>
                  <TableCell className="text-center">{toBRL(row?.valor)}</TableCell>
                  <TableCell className="text-center">{toBRL(row?.taxas_juros)}</TableCell>
                  <TableCell className="text-center">{toBRL(row?.liquido_recebido)}</TableCell>
                  <TableCell className="text-center">{toDateBR(row?.emissao)}</TableCell>
                  <TableCell className="text-center">{toDateBR(row?.baixa)}</TableCell>
                  <TableCell className="text-center"><StatusPill status={row?.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {error && <div className="text-sm text-rose-600 mt-3">{error}</div>}
        </CardContent>
      </Card>
    </div>
  );
};

export default LancamentosTab;
