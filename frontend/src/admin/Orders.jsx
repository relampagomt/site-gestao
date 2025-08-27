// frontend/src/admin/Orders.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";

/* ===================== Utils / Helpers ===================== */
const fmtCurrency = (n) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const parseCurrency = (s) => {
  if (typeof s === "number") return s;
  if (!s) return 0;
  const v = s.toString().replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

const fmtDateBR = (val) => {
  if (!val) return "";
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, d] = val.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      return isNaN(dt) ? val : dt.toLocaleDateString("pt-BR");
    }
    const d = new Date(val);
    return isNaN(d) ? String(val) : d.toLocaleDateString("pt-BR");
  } catch {
    return String(val);
  }
};

const toYYYYMMDD = (value) => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  try {
    const d = new Date(value);
    if (isNaN(d)) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

const sum = (arr) => arr.reduce((a, b) => a + (Number(b) || 0), 0);
const uid = () => Math.random().toString(36).slice(2, 10);

/* ===================== Component ===================== */
export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Preferência (valor médio em multi-itens)
  const STORAGE_KEY = "rel_showAvgUnit";
  const [showAvgUnit, setShowAvgUnit] = useState(true);
  const savePrefTimer = useRef(null);

  // Modal CRUD
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Modal Itens
  const [itemsModalOpen, setItemsModalOpen] = useState(false);
  const [itemsModalOrder, setItemsModalOrder] = useState(null);

  // Form
  const emptyForm = {
    data: "",
    cliente: "",
    empresa: "",
    descricao: "",
    status: "Aberta",
    valorUnit: "",
    quantidade: "",
  };
  const [form, setForm] = useState(emptyForm);

  /* ===== Preferências (backend + fallback localStorage) ===== */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get("/users/me/prefs"); // ajuste se necessário
        if (mounted && data && typeof data.showAvgUnit === "boolean") {
          setShowAvgUnit(data.showAvgUnit);
          try { localStorage.setItem(STORAGE_KEY, data.showAvgUnit ? "1" : "0"); } catch {}
          return;
        }
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (mounted && saved !== null) setShowAvgUnit(saved === "1");
        } catch {}
      } catch {
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (mounted && saved !== null) setShowAvgUnit(saved === "1");
        } catch {}
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, showAvgUnit ? "1" : "0"); } catch {}
    if (savePrefTimer.current) clearTimeout(savePrefTimer.current);
    savePrefTimer.current = setTimeout(async () => {
      try { await api.put("/users/me/prefs", { showAvgUnit }); } catch {}
    }, 400);
    return () => { if (savePrefTimer.current) clearTimeout(savePrefTimer.current); };
  }, [showAvgUnit]);

  /* ===================== Fetch Orders (robusto) ===================== */
  async function fetchOrders() {
    setLoading(true);
    try {
      const resp = await api.get("/orders");
      const arr = Array.isArray(resp?.data) ? resp.data : [];

      const normalized = arr.map((raw, index) => {
        const id = raw.id ?? raw._id ?? `ord_${index}_${uid()}`;

        const dateRaw = raw.date ?? raw.data ?? "";
        const dateForInput = (() => {
          if (!dateRaw) return "";
          if (/^\d{4}-\d{2}-\d{2}$/.test(String(dateRaw))) return String(dateRaw);
          try {
            const d = new Date(dateRaw);
            return isNaN(d) ? "" : d.toISOString().slice(0, 10);
          } catch { return ""; }
        })();

        const clientName = raw.clientName ?? raw.cliente ?? "";
        const companyName = raw.companyName ?? raw.empresa ?? "";
        const description = raw.description ?? raw.descricao ?? "";
        const status = raw.status ?? "Aberta";

        const items = Array.isArray(raw.items) ? raw.items : [];
        const safeItems = items.map((it) => ({
          description: it.description ?? it.descricao ?? "",
          unitPrice: Number(it.unitPrice ?? it.valorUnit ?? 0),
          quantity: Number(it.quantity ?? it.quantidade ?? 0),
        }));

        const itemsQty = sum(safeItems.map((it) => it.quantity));
        const itemsTotal = sum(safeItems.map((it) => it.unitPrice * it.quantity));

        const unitPriceSingle =
          safeItems.length === 1 ? safeItems[0].unitPrice : Number(raw.unitPrice ?? raw.valorUnit ?? 0);

        const quantity = safeItems.length > 0 ? itemsQty : Number(raw.quantity ?? raw.quantidade ?? 0);
        const total =
          raw.total != null ? Number(raw.total)
            : safeItems.length > 0 ? itemsTotal
            : Number(unitPriceSingle) * Number(quantity);

        return {
          id,
          dateRaw,
          dateForInput,
          clientName,
          companyName,
          description,
          status,
          unitPrice: unitPriceSingle,
          quantity,
          total,
          items: safeItems,
        };
      });

      setOrders(normalized);
    } catch (e) {
      console.error("Erro ao buscar orders:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchOrders(); }, []);

  /* ===================== Handlers ===================== */
  function openNew() {
    setEditingId(null);
    setForm({ ...emptyForm, data: new Date().toISOString().slice(0, 10) });
    setIsOpen(true);
  }

  function openEdit(order) {
    setEditingId(order.id);
    setForm({
      data: order.dateForInput || new Date().toISOString().slice(0, 10),
      cliente: order.clientName || "",
      empresa: order.companyName || "",
      descricao: order.description || "",
      status: order.status || "Aberta",
      valorUnit: (order.unitPrice ?? 0).toLocaleString("pt-BR"),
      quantidade: String(order.quantity ?? 0),
    });
    setIsOpen(true);
  }

  async function handleDelete(id) {
    if (!confirm("Excluir esta ordem?")) return;
    try {
      await api.delete(`/orders/${id}`);
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } catch (e) {
      console.error("Erro ao excluir:", e);
      alert("Não foi possível excluir. Verifique a conexão/servidor.");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const dateStr = toYYYYMMDD(form.data);
    const payload = {
      date: dateStr,
      data: dateStr,
      clientName: form.cliente,
      companyName: form.empresa,
      description: form.descricao,
      status: form.status,
      unitPrice: parseCurrency(form.valorUnit),
      quantity: Number(String(form.quantidade).replace(/[^\d]/g, "")) || 0,
    };
    payload.total = Number(payload.unitPrice) * Number(payload.quantity);

    try {
      if (editingId) {
        await api.put(`/orders/${editingId}`, payload);
        setOrders((prev) =>
          prev.map((o) =>
            o.id === editingId
              ? {
                  ...o,
                  dateRaw: payload.date,
                  dateForInput: payload.date,
                  clientName: payload.clientName,
                  companyName: payload.companyName,
                  description: payload.description,
                  status: payload.status,
                  unitPrice: payload.unitPrice,
                  quantity: payload.quantity,
                  total: payload.total,
                  items: [],
                }
              : o
          )
        );
      } else {
        const res = await api.post("/orders", payload);
        const newId = res?.data?.id ?? res?.data?._id ?? `ord_${uid()}`;
        setOrders((prev) => [
          ...prev,
          {
            id: newId,
            dateRaw: payload.date,
            dateForInput: payload.date,
            clientName: payload.clientName,
            companyName: payload.companyName,
            description: payload.description,
            status: payload.status,
            unitPrice: payload.unitPrice,
            quantity: payload.quantity,
            total: payload.total,
            items: [],
          },
        ]);
      }
      setIsOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      fetchOrders();
    } catch (e) {
      console.error("Erro ao salvar:", e);
      alert("Não foi possível salvar. Verifique os campos e o servidor.");
    }
  }

  /* ===================== Totais ===================== */
  const totalGeral = useMemo(
    () => orders.reduce((acc, o) => acc + (Number(o.total) || 0), 0),
    [orders]
  );
  const qtdGeral = useMemo(
    () => orders.reduce((acc, o) => acc + (Number(o.quantity) || 0), 0),
    [orders]
  );

  /* ===================== Render ===================== */
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ordens</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600 flex items-center gap-2">
            <input
              type="checkbox"
              checked={showAvgUnit}
              onChange={(e) => setShowAvgUnit(e.target.checked)}
            />
            Valor médio (multi-itens)
          </label>
          <Button onClick={openNew} className="bg-black text-white hover:opacity-90">
            Nova Ordem
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ordens cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Valor Unit.</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={9}>Carregando...</TableCell>
                  </TableRow>
                )}

                {!loading && orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-gray-500">
                      Nenhuma ordem cadastrada.
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  orders.map((o, idx) => {
                    const hasItems = Array.isArray(o.items) && o.items.length > 0;
                    const avgUnit =
                      Number(o.quantity || 0) > 0
                        ? Number(o.total || 0) / Number(o.quantity || 1)
                        : 0;

                    const unitCol =
                      hasItems && o.items.length > 1
                        ? showAvgUnit
                          ? fmtCurrency(avgUnit)
                          : "—"
                        : fmtCurrency(o.unitPrice);

                    const rowKey = o.id || `row_${idx}`;

                    return (
                      <TableRow key={rowKey}>
                        <TableCell>{fmtDateBR(o.dateRaw || o.dateForInput)}</TableCell>
                        <TableCell>{o.clientName}</TableCell>
                        <TableCell>{o.companyName}</TableCell>
                        <TableCell className="max-w-[280px] truncate">{o.description}</TableCell>
                        <TableCell>{o.status}</TableCell>
                        <TableCell>{Number(o.quantity || 0).toLocaleString("pt-BR")}</TableCell>
                        <TableCell>{unitCol}</TableCell>
                        <TableCell>{fmtCurrency(o.total)}</TableCell>
                        <TableCell className="text-right space-x-2">
                          {hasItems && (
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setItemsModalOrder(o);
                                setItemsModalOpen(true);
                              }}
                            >
                              Itens
                            </Button>
                          )}
                          <Button variant="secondary" onClick={() => openEdit(o)}>
                            Editar
                          </Button>
                          <Button variant="destructive" onClick={() => handleDelete(o.id)}>
                            Excluir
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                {!loading && orders.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={5} />
                    <TableCell className="font-semibold">
                      {qtdGeral.toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {showAvgUnit && qtdGeral > 0 ? fmtCurrency(totalGeral / qtdGeral) : "—"}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {fmtCurrency(totalGeral)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ===== Modal Criar/Editar ===== */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setIsOpen(false);
              setEditingId(null);
              setForm(emptyForm);
            }}
          />
          <div className="relative w-full max-w-2xl rounded-lg bg-white shadow-lg">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">
                {editingId ? "Editar Ordem" : "Nova Ordem"}
              </h2>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsOpen(false);
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                ✕
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Data</label>
                  <Input
                    type="date"
                    value={form.data}
                    onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <select
                    className="w-full border rounded-md h-10 px-3"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option>Aberta</option>
                    <option>Em Planejamento</option>
                    <option>Em Execução</option>
                    <option>Em Validação</option>
                    <option>Concluída</option>
                    <option>Faturada</option>
                    <option>Pausada</option>
                    <option>Cancelada</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Cliente</label>
                  <Input
                    placeholder="Nome do cliente"
                    value={form.cliente}
                    onChange={(e) => setForm((f) => ({ ...f, cliente: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Empresa</label>
                  <Input
                    placeholder="Nome da empresa"
                    value={form.empresa}
                    onChange={(e) => setForm((f) => ({ ...f, empresa: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  rows={3}
                  placeholder="Descreva a ordem (ex.: Panfletagem - Arrastão)"
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium">Valor Unit.</label>
                  <Input
                    placeholder="0,00"
                    value={form.valorUnit}
                    onChange={(e) => setForm((f) => ({ ...f, valorUnit: e.target.value }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Aceita “0,30”, “1,50”, etc. (moeda BR)
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Qtd</label>
                  <Input
                    placeholder="0"
                    value={form.quantidade}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        quantidade: e.target.value.replace(/[^\d]/g, ""),
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Total</label>
                  <div className="h-10 px-3 flex items-center rounded-md bg-green-50 text-green-700 font-semibold">
                    {fmtCurrency(
                      parseCurrency(form.valorUnit) * (Number(form.quantidade || 0) || 0)
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsOpen(false);
                    setEditingId(null);
                    setForm(emptyForm);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="bg-black text-white hover:opacity-90">
                  Salvar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Modal de Itens ===== */}
      {itemsModalOpen && itemsModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setItemsModalOpen(false);
              setItemsModalOrder(null);
            }}
          />
          <div className="relative w-full max-w-3xl rounded-lg bg-white shadow-lg">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">
                Itens da Ordem — {itemsModalOrder.clientName}
              </h2>
              <Button
                variant="ghost"
                onClick={() => {
                  setItemsModalOpen(false);
                  setItemsModalOrder(null);
                }}
              >
                ✕
              </Button>
            </div>
            <div className="p-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor Unit.</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsModalOrder.items.map((it, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="max-w-[420px] truncate">
                          {it.description || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {fmtCurrency(it.unitPrice || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {(Number(it.quantity || 0)).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right">
                          {fmtCurrency((Number(it.unitPrice || 0)) * (Number(it.quantity || 0)))}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-semibold">Totais</TableCell>
                      <TableCell className="text-right font-semibold">
                        {(() => {
                          const q = itemsModalOrder.items.reduce((a, it) => a + (Number(it.quantity || 0)), 0);
                          const t = itemsModalOrder.items.reduce((a, it) => a + (Number(it.unitPrice || 0) * Number(it.quantity || 0)), 0);
                          return q > 0 ? fmtCurrency(t / q) : "—";
                        })()}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {itemsModalOrder.items
                          .reduce((a, it) => a + (Number(it.quantity || 0)), 0)
                          .toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {fmtCurrency(
                          itemsModalOrder.items.reduce(
                            (a, it) => a + (Number(it.unitPrice || 0) * Number(it.quantity || 0)),
                            0
                          )
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <Button
                onClick={() => {
                  setItemsModalOpen(false);
                  setItemsModalOrder(null);
                }}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
