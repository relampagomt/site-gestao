// frontend/src/admin/Commercial.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog.jsx";

/**
 * IMPORTANTE:
 * - O axios `api` já tem baseURL `/api`. Portanto use caminhos RELATIVOS `/commercial/...`.
 */

/* ---------- Helpers compartilhados ---------- */
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

const BRL = (v) => {
  const n = parseFlex(v);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

// Datas BR <-> ISO
const maskDateBR = (s) => {
  const d = String(s || "").replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
};
const toISO = (s) => {
  const str = String(s || "").trim();
  if (!str) return "";
  if (str.length >= 10 && str[2] === "/" && str[5] === "/") {
    const [dd, mm, yy] = str.slice(0, 10).split("/");
    return `${yy}-${mm}-${dd}`;
  }
  if (/^\d{8}$/.test(str)) {
    const dd = str.slice(0, 2), mm = str.slice(2, 4), yy = str.slice(4, 8);
    return `${yy}-${mm}-${dd}`;
  }
  return str.slice(0, 10);
};
const fmtBRDate = (iso) => {
  if (!iso) return "";
  const s = String(iso);
  if (s.length >= 10 && s[4] === "-" && s[7] === "-") {
    const [yy, mm, dd] = s.slice(0, 10).split("-");
    return `${dd}/${mm}/${yy}`;
  }
  if (s.length === 8 && /^\d{8}$/.test(s))
    return `${s.slice(0, 2)}/${s.slice(2, 4)}/${s.slice(4, 8)}`;
  if (s.length >= 10 && s[2] === "/" && s[5] === "/") return s.slice(0, 10);
  return s;
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

/* ---------- Hooks utilitários ---------- */
const useLoad = (path) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const reload = async () => {
    setLoading(true); setErr("");
    try {
      const { data } = await api.get(path);
      setData(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr("Falha ao carregar.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, [path]);
  return { data, loading, err, reload, setData };
};

/* ---------- Estado inicial ---------- */
const emptyRecord = () => ({
  name: "",
  company: "",
  phone: "",
  stage: "Novo",
  value: "",
  source: "",
  notes: "",
});

const emptyOrder = () => ({
  cliente: "",
  empresa: "",        // substitui 'titulo'
  descricao: "",
  status: "Aberta",
  data: "",
  itens: [],
  valor_total: "",
});

/* ---------- Componente principal ---------- */
export default function Commercial() {
  const [tab, setTab] = useState("records");

  // Records
  const records = useLoad("/commercial/records");
  const [recForm, setRecForm] = useState(emptyRecord());
  const [recEditId, setRecEditId] = useState(null);

  // Orders
  const orders = useLoad("/commercial/orders");
  const [ordForm, setOrdForm] = useState(emptyOrder());
  const [ordEditId, setOrdEditId] = useState(null);
  const [openOrder, setOpenOrder] = useState(false);

  const [newItem, setNewItem] = useState({ descricao: "", quantidade: "", valor_unit: "" });

  /* ---------- Records Handlers ---------- */
  const onRec = (e) => { const { name, value } = e.target; setRecForm((p) => ({ ...p, [name]: value })); };

  const submitRecord = async (e) => {
    e.preventDefault();
    const method = recEditId ? "put" : "post";
    const url = recEditId ? `/commercial/records/${recEditId}` : `/commercial/records`;
    await api[method](url, {
      ...recForm,
      value: parseFlex(recForm.value),
    });
    setRecForm(emptyRecord());
    setRecEditId(null);
    records.reload();
  };

  const editRecord = (r) => {
    setRecEditId(r.id);
    setRecForm({
      name: r.name || "",
      company: r.company || "",
      phone: r.phone || "",
      stage: r.stage || "Novo",
      value: r.value || "",
      source: r.source || "",
      notes: r.notes || "",
    });
  };

  const deleteRecord = async (r) => {
    if (!confirm("Excluir registro?")) return;
    await api.delete(`/commercial/records/${r.id}`);
    records.reload();
  };

  /* ---------- Orders Handlers ---------- */
  const onOrd = (e) => { const { name, value } = e.target; setOrdForm((p) => ({ ...p, [name]: value })); };

  const addItem = () => {
    if (!newItem.descricao?.trim()) return;
    const item = {
      descricao: newItem.descricao.trim(),
      quantidade: parseFlex(newItem.quantidade || 1),
      valor_unit: parseFlex(newItem.valor_unit || 0),
    };
    setOrdForm((p) => ({ ...p, itens: [...(p.itens || []), item] }));
    setNewItem({ descricao: "", quantidade: "", valor_unit: "" });
  };
  const removeItem = (idx) => {
    setOrdForm((p) => ({ ...p, itens: p.itens.filter((_, i) => i !== idx) }));
  };
  const updateItemField = (idx, field, value) => {
    setOrdForm((p) => ({
      ...p,
      itens: p.itens.map((it, i) => (i === idx ? { ...it, [field]: value } : it)),
    }));
  };

  const orderTotal = useMemo(() => {
    return (ordForm.itens || []).reduce((acc, i) => acc + parseFlex(i.quantidade) * parseFlex(i.valor_unit), 0);
  }, [JSON.stringify(ordForm.itens)]);

  useEffect(() => {
    setOrdForm((p) => ({ ...p, valor_total: orderTotal.toFixed(2) }));
  }, [orderTotal]);

  const resetOrderForm = () => {
    setOrdForm(emptyOrder());
    setOrdEditId(null);
    setNewItem({ descricao: "", quantidade: "", valor_unit: "" });
  };

  const submitOrder = async (e) => {
    e.preventDefault();
    const payloadTotal = (ordForm.itens || []).reduce(
      (acc, i) => acc + parseFlex(i.quantidade) * parseFlex(i.valor_unit),
      0
    );
    const payload = {
      ...ordForm,
      data: toISO(ordForm.data),
      itens: (ordForm.itens || []).map((i) => ({
        descricao: i.descricao,
        quantidade: parseFlex(i.quantidade),
        valor_unit: parseFlex(i.valor_unit),
      })),
      valor_total: Number(payloadTotal.toFixed(2)),
    };
    const url = ordEditId ? `/commercial/orders/${ordEditId}` : `/commercial/orders`;
    const method = ordEditId ? "put" : "post";
    await api[method](url, payload);
    resetOrderForm();
    setOpenOrder(false);
    orders.reload();
  };

  const editOrder = (o) => {
    setOrdEditId(o.id);
    setOrdForm({
      cliente: o.cliente || "",
      empresa: o.empresa || o.titulo || "",
      descricao: o.descricao || "",
      status: o.status || "Aberta",
      data: fmtBRDate(o.data || ""),
      itens: (o.itens || []).map((i) => ({
        descricao: i.descricao || "",
        quantidade: parseFlex(i.quantidade),
        valor_unit: parseFlex(i.valor_unit),
      })),
      valor_total: String(o.valor_total ?? ""),
    });
    setOpenOrder(true);
  };

  const deleteOrder = async (o) => {
    if (!confirm("Excluir esta ordem?")) return;
    await api.delete(`/commercial/orders/${o.id}`);
    orders.reload();
  };

  const orderUnitValue = (o) => {
    const itens = Array.isArray(o.itens) ? o.itens : [];
    if (!itens.length) return null;
    const vals = itens.map((i) => parseFlex(i.valor_unit)).filter(Number.isFinite);
    if (!vals.length) return null;
    const uniq = new Set(vals.map((v) => v.toFixed(2)));
    return uniq.size === 1 ? vals[0] : null;
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Comercial</h1>
        <div className="flex gap-2">
          <Button onClick={() => setTab("records")} variant={tab === "records" ? "default" : "secondary"}>Registros</Button>
          <Button onClick={() => setTab("orders")} variant={tab === "orders" ? "default" : "secondary"}>Ordens</Button>
        </div>
      </div>

      {tab === "records" && (
        <section className="grid md:grid-cols-4 gap-3">
          {/* Novo registro */}
          <Card className="md:col-span-1">
            <CardHeader><CardTitle>Novo Registro</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={submitRecord} className="grid gap-2">
                <Input name="name" value={recForm.name} onChange={onRec} placeholder="Nome" required />
                <Input name="company" value={recForm.company} onChange={onRec} placeholder="Empresa" />
                <Input name="phone" value={recForm.phone} onChange={onRec} placeholder="Telefone" />
                <Input name="stage" value={recForm.stage} onChange={onRec} placeholder="Etapa" />
                <Input name="value" value={recForm.value} onChange={onRec} placeholder="Valor (R$)" />
                <Input name="source" value={recForm.source} onChange={onRec} placeholder="Origem" />
                <Textarea name="notes" value={recForm.notes} onChange={onRec} placeholder="Observações" />
                <div className="flex justify-end">
                  <Button type="submit">{recEditId ? "Salvar" : "Adicionar"}</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Lista registros */}
          <Card className="md:col-span-3">
            <CardHeader><CardTitle>Registros</CardTitle></CardHeader>
            <CardContent className="overflow-auto">
              {records.loading ? (
                <div className="text-sm text-muted-foreground">Carregando...</div>
              ) : (
                <Table className="min-w-full text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Nome</TableHead>
                      <TableHead className="text-center">Empresa</TableHead>
                      <TableHead className="text-center">Telefone</TableHead>
                      <TableHead className="text-center">Etapa</TableHead>
                      <TableHead className="text-center">Valor</TableHead>
                      <TableHead className="text-center">Origem</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.data.map((r) => (
                      <tr key={r.id} className="border-t">
                        <TableCell className="text-center">{r.name || "—"}</TableCell>
                        <TableCell className="text-center">{r.company || "—"}</TableCell>
                        <TableCell className="text-center">{r.phone || "—"}</TableCell>
                        <TableCell className="text-center">{r.stage || "—"}</TableCell>
                        <TableCell className="text-center">{r.value ? BRL(r.value) : "—"}</TableCell>
                        <TableCell className="text-center">{r.source || "—"}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button variant="secondary" onClick={() => editRecord(r)}>Editar</Button>
                            <Button variant="destructive" onClick={() => deleteRecord(r)}>Excluir</Button>
                          </div>
                        </TableCell>
                      </tr>
                    ))}
                    {records.data.length === 0 && (
                      <tr><TableCell colSpan={7} className="text-center text-muted-foreground">Sem registros.</TableCell></tr>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {tab === "orders" && (
        <section className="grid gap-3">
          <div className="flex justify-end">
            <Button onClick={() => { resetOrderForm(); setOpenOrder(true); }}>Nova Ordem</Button>
          </div>

          <Card>
            <CardHeader><CardTitle>Ordens cadastradas</CardTitle></CardHeader>
            <CardContent className="overflow-auto">
              {orders.loading ? (
                <div className="text-sm text-muted-foreground">Carregando...</div>
              ) : (
                <Table className="min-w-full text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Data</TableHead>
                      <TableHead className="text-center">Cliente</TableHead>
                      <TableHead className="text-center">Empresa</TableHead>
                      <TableHead className="text-center">Descrição</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Valor Unit.</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.data.map((o) => (
                      <tr key={o.id} className="border-t">
                        <TableCell className="text-center">{fmtBRDate(o.data)}</TableCell>
                        <TableCell className="text-center">{o.cliente || "—"}</TableCell>
                        <TableCell className="text-center">{o.empresa || o.titulo || "—"}</TableCell>
                        <TableCell className="text-center">{o.descricao || "—"}</TableCell>
                        <TableCell className="text-center">{o.status || "—"}</TableCell>
                        <TableCell className="text-center">{orderUnitValue(o) !== null ? BRL(orderUnitValue(o)) : "—"}</TableCell>
                        <TableCell className="text-center">{BRL(o.valor_total)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button variant="secondary" onClick={() => editOrder(o)}>Editar</Button>
                            <Button variant="destructive" onClick={() => deleteOrder(o)}>Excluir</Button>
                          </div>
                        </TableCell>
                      </tr>
                    ))}
                    {orders.data.length === 0 && (
                      <tr><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhuma ordem cadastrada.</TableCell></tr>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Modal de Ordem — aparência padronizada com Actions */}
          <Dialog open={openOrder} onOpenChange={(o) => { setOpenOrder(o); if (!o) resetOrderForm(); }}>
            <DialogContent className="w-full max-w-lg max-h-[85vh] overflow-y-auto p-0">
              {/* Header */}
              <div className="px-5 pt-5 pb-3 border-b">
                <DialogHeader>
                  <DialogTitle className="text-base">{ordEditId ? "Editar Ordem" : "Nova Ordem"}</DialogTitle>
                  <DialogDescription className="text-xs">
                    Preencha os campos e salve para {ordEditId ? "atualizar" : "adicionar"} a ordem.
                  </DialogDescription>
                </DialogHeader>
              </div>

              {/* Body */}
              <div className="px-5 py-4">
                <form onSubmit={submitOrder} className="grid md:grid-cols-4 gap-3">
                  <Input
                    name="cliente"
                    value={ordForm.cliente}
                    onChange={onOrd}
                    placeholder="Cliente"
                    required
                    className="md:col-span-2"
                  />
                  <Input
                    name="empresa"
                    value={ordForm.empresa}
                    onChange={onOrd}
                    placeholder="Empresa"
                    className="md:col-span-2"
                  />

                  <InputDateBR
                    name="data"
                    value={ordForm.data}
                    onChange={(val) => setOrdForm((p) => ({ ...p, data: val }))}
                    placeholder="dd/mm/aaaa"
                  />

                  <select
                    name="status"
                    value={ordForm.status}
                    onChange={onOrd}
                    className="border rounded px-3 py-2"
                  >
                    <option>Aberta</option>
                    <option>Em Andamento</option>
                    <option>Concluída</option>
                    <option>Cancelada</option>
                  </select>

                  <Textarea
                    name="descricao"
                    value={ordForm.descricao}
                    onChange={onOrd}
                    placeholder="Descrição"
                    className="md:col-span-4"
                  />

                  {/* Itens */}
                  <div className="md:col-span-4 border rounded p-3">
                    <div className="font-medium mb-3">Itens</div>

                    <div className="grid md:grid-cols-5 gap-2 mb-3">
                      <Input
                        name="descricao"
                        value={newItem.descricao}
                        onChange={(e) => setNewItem((p) => ({ ...p, descricao: e.target.value }))}
                        placeholder="Descrição do item"
                        className="md:col-span-2"
                      />
                      <Input
                        name="quantidade"
                        value={newItem.quantidade}
                        onChange={(e) => setNewItem((p) => ({ ...p, quantidade: e.target.value }))}
                        placeholder="Qtd"
                      />
                      <Input
                        name="valor_unit"
                        value={newItem.valor_unit}
                        onChange={(e) => setNewItem((p) => ({ ...p, valor_unit: e.target.value }))}
                        placeholder="Valor unit."
                      />
                      <Button type="button" onClick={addItem}>+ Adicionar</Button>
                    </div>

                    {(ordForm.itens || []).length > 0 && (
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
                            {ordForm.itens.map((i, idx) => {
                              const rowTotal = parseFlex(i.quantidade) * parseFlex(i.valor_unit);
                              return (
                                <tr key={idx} className="border-t">
                                  <TableCell className="w-[40%] text-center align-middle">
                                    <Input
                                      value={i.descricao}
                                      onChange={(e) => updateItemField(idx, "descricao", e.target.value)}
                                    />
                                  </TableCell>
                                  <TableCell className="w-[10%] text-center align-middle">
                                    <Input
                                      value={i.quantidade}
                                      onChange={(e) => updateItemField(idx, "quantidade", parseFlex(e.target.value))}
                                    />
                                  </TableCell>
                                  <TableCell className="w-[20%] text-center align-middle">
                                    <Input
                                      value={i.valor_unit}
                                      onChange={(e) => updateItemField(idx, "valor_unit", parseFlex(e.target.value))}
                                    />
                                  </TableCell>
                                  <TableCell className="w/[20%] text-center align-middle">
                                    {BRL(rowTotal)}
                                  </TableCell>
                                  <TableCell className="text-center align-middle w-[10%]">
                                    <div className="flex justify-center">
                                      <Button type="button" variant="destructive" onClick={() => removeItem(idx)}>
                                        Remover
                                      </Button>
                                    </div>
                                  </TableCell>
                                </tr>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    <div className="text-right font-semibold mt-3">
                      Total: {BRL(orderTotal)}
                    </div>
                  </div>

                  <div className="md:col-span-4 flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => { resetOrderForm(); setOpenOrder(false); }}>
                      Cancelar
                    </Button>
                    <Button type="submit" size="sm">{ordEditId ? "Salvar Alterações" : "Adicionar Ordem"}</Button>
                  </div>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        </section>
      )}
    </div>
  );
}
