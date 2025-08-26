// frontend/src/admin/Orders.jsx
import React, { useEffect, useMemo, useState } from "react";
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

/**
 * IMPORTANTE:
 * - O axios `api` já possui baseURL `/api`.
 *   Portanto, use caminhos RELATIVOS: `/commercial/orders`, sem repetir `/api`.
 * - Endpoints usados (conforme backend):
 *   GET    /commercial/orders
 *   POST   /commercial/orders
 *   PUT    /commercial/orders/:id
 *   DELETE /commercial/orders/:id
 */

const BRL = (n) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const toNum = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const emptyOrder = () => ({
  cliente: "",
  titulo: "",
  descricao: "",
  status: "Aberta",
  data: "",
  itens: [],
  valor_total: "",
});

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [form, setForm] = useState(emptyOrder());
  const [editingId, setEditingId] = useState(null);

  const [newItem, setNewItem] = useState({
    descricao: "",
    quantidade: "",
    valor_unit: "",
  });

  // -------- Load ----------
  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const { data } = await api.get("/commercial/orders");
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr("Falha ao carregar ordens.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // -------- Handlers -------
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
      quantidade: toNum(newItem.quantidade || 1),
      valor_unit: toNum(newItem.valor_unit || 0),
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
      itens: p.itens.map((it, i) =>
        i === idx ? { ...it, [field]: field === "descricao" ? value : value } : it
      ),
    }));
  };

  const total = useMemo(() => {
    return (form.itens || []).reduce(
      (acc, i) => acc + Number(i.quantidade || 0) * Number(i.valor_unit || 0),
      0
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

  // -------- Submit --------
  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      itens: (form.itens || []).map((i) => ({
        descricao: i.descricao,
        quantidade: toNum(i.quantidade),
        valor_unit: toNum(i.valor_unit),
      })),
      valor_total: toNum(form.valor_total),
    };

    const url = editingId
      ? `/commercial/orders/${editingId}`
      : `/commercial/orders`;
    const method = editingId ? "put" : "post";

    await api[method](url, payload);
    resetForm();
    load();
  };

  const edit = (o) => {
    setEditingId(o.id);
    setForm({
      cliente: o.cliente || "",
      titulo: o.titulo || "",
      descricao: o.descricao || "",
      status: o.status || "Aberta",
      data: o.data || "",
      itens: (o.itens || []).map((i) => ({
        descricao: i.descricao || "",
        quantidade: toNum(i.quantidade),
        valor_unit: toNum(i.valor_unit),
      })),
      valor_total: String(o.valor_total ?? ""),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const del = async (o) => {
    if (!confirm("Excluir esta ordem?")) return;
    await api.delete(`/commercial/orders/${o.id}`);
    load();
  };

  // -------- UI ------------
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Ordens</h1>

      {err && (
        <div className="bg-red-50 text-red-700 border border-red-200 px-3 py-2 rounded mb-4">
          {err}
        </div>
      )}

      {/* Formulário */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{editingId ? "Editar Ordem" : "Nova Ordem"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid md:grid-cols-4 gap-3">
            <Input
              name="cliente"
              value={form.cliente}
              onChange={onFormChange}
              placeholder="Cliente"
              required
              className="md:col-span-2"
            />
            <Input
              name="titulo"
              value={form.titulo}
              onChange={onFormChange}
              placeholder="Título"
              className="md:col-span-2"
            />
            <Input
              name="data"
              value={form.data}
              onChange={onFormChange}
              placeholder="Data (YYYY-MM-DD)"
            />
            <select
              name="status"
              value={form.status}
              onChange={onFormChange}
              className="border rounded px-3 py-2"
            >
              <option>Aberta</option>
              <option>Em Andamento</option>
              <option>Concluída</option>
              <option>Cancelada</option>
            </select>
            <Textarea
              name="descricao"
              value={form.descricao}
              onChange={onFormChange}
              placeholder="Descrição"
              className="md:col-span-4"
            />

            {/* Itens */}
            <div className="md:col-span-4 border rounded p-3">
              <div className="font-medium mb-3">Itens</div>

              {/* Linha de adição */}
              <div className="grid md:grid-cols-5 gap-2 mb-3">
                <Input
                  name="descricao"
                  value={newItem.descricao}
                  onChange={onNewItemChange}
                  placeholder="Descrição do item"
                  className="md:col-span-2"
                />
                <Input
                  name="quantidade"
                  value={newItem.quantidade}
                  onChange={onNewItemChange}
                  placeholder="Qtd"
                />
                <Input
                  name="valor_unit"
                  value={newItem.valor_unit}
                  onChange={onNewItemChange}
                  placeholder="Valor unit."
                />
                <Button type="button" onClick={addItem}>
                  + Adicionar
                </Button>
              </div>

              {/* Lista de itens */}
              {(form.itens || []).length > 0 && (
                <div className="overflow-auto">
                  <Table className="min-w-full text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Qtd</TableHead>
                        <TableHead>Valor Unit.</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.itens.map((i, idx) => {
                        const rowTotal =
                          Number(i.quantidade || 0) * Number(i.valor_unit || 0);
                        return (
                          <tr key={idx} className="border-t">
                            <TableCell className="w-[40%]">
                              <Input
                                value={i.descricao}
                                onChange={(e) =>
                                  updateItemField(idx, "descricao", e.target.value)
                                }
                              />
                            </TableCell>
                            <TableCell className="w-[10%]">
                              <Input
                                value={i.quantidade}
                                onChange={(e) =>
                                  updateItemField(
                                    idx,
                                    "quantidade",
                                    toNum(e.target.value)
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell className="w-[20%]">
                              <Input
                                value={i.valor_unit}
                                onChange={(e) =>
                                  updateItemField(
                                    idx,
                                    "valor_unit",
                                    toNum(e.target.value)
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell className="w-[20%]">{BRL(rowTotal)}</TableCell>
                            <TableCell className="text-right w-[10%]">
                              <Button
                                type="button"
                                variant="destructive"
                                onClick={() => removeItem(idx)}
                              >
                                Remover
                              </Button>
                            </TableCell>
                          </tr>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="text-right font-semibold mt-3">
                Total: {BRL(form.valor_total)}
              </div>
            </div>

            <div className="md:col-span-4 flex gap-2">
              <Button type="submit">
                {editingId ? "Salvar Alterações" : "Adicionar Ordem"}
              </Button>
              {editingId && (
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancelar edição
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabela de ordens */}
      <Card>
        <CardHeader>
          <CardTitle>Ordens cadastradas</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          {loading ? (
            <div className="text-sm text-gray-500">Carregando...</div>
          ) : (
            <Table className="min-w-full text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t">
                    <TableCell>{o.data}</TableCell>
                    <TableCell>{o.cliente}</TableCell>
                    <TableCell>{o.titulo}</TableCell>
                    <TableCell>{o.status}</TableCell>
                    <TableCell>{BRL(o.valor_total)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="secondary"
                        onClick={() => edit(o)}
                        className="mr-2"
                      >
                        Editar
                      </Button>
                      <Button variant="destructive" onClick={() => del(o)}>
                        Excluir
                      </Button>
                    </TableCell>
                  </tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
