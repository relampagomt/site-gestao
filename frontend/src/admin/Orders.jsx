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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";

/* ---------- Helpers ---------- */
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

/* Datas: máscara BR + conversores BR <-> ISO */
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

/* Valor unit. “puro” para exibir na lista:
   - se tiver 1 item, mostra
   - se TODOS os itens tiverem o MESMO valor unit., mostra
   - senão, retorna null
*/
const orderUnitValue = (o) => {
  const itens = Array.isArray(o.itens) ? o.itens : [];
  if (!itens.length) return null;
  const vals = itens.map((i) => parseFlex(i.valor_unit)).filter(Number.isFinite);
  if (!vals.length) return null;
  const uniq = new Set(vals.map((v) => v.toFixed(2)));
  return uniq.size === 1 ? vals[0] : null;
};

/* Quantidade total da ordem (soma dos itens) */
const orderQty = (o) =>
  (Array.isArray(o.itens) ? o.itens : []).reduce(
    (acc, i) => acc + parseFlex(i.quantidade),
    0
  );

/* Valor médio da ordem (Total ÷ Qtd) quando fizer sentido */
const orderAvgUnit = (o) => {
  const q = orderQty(o);
  const t = parseFlex(o.valor_total);
  return q > 0 ? t / q : 0;
};

const emptyOrder = () => ({
  cliente: "",
  titulo: "",
  descricao: "",
  status: "Aberta",
  data: "",            // BR no formulário
  itens: [],
  valor_total: "",
});

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Toggle: Valor médio (multi-itens) — persistido em localStorage
  const AVG_KEY = "rel_showAvgUnit";
  const [showAvgUnit, setShowAvgUnit] = useState(() => {
    try { return localStorage.getItem(AVG_KEY) !== "0"; } catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem(AVG_KEY, showAvgUnit ? "1" : "0"); } catch {}
  }, [showAvgUnit]);

  const [form, setForm] = useState(emptyOrder());
  const [editingId, setEditingId] = useState(null);
  const [open, setOpen] = useState(false);

  const [newItem, setNewItem] = useState({
    descricao: "",
    quantidade: "",
    valor_unit: "",
  });

  /* ---------- Load ---------- */
  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      // mantém a rota que JÁ FUNCIONAVA
      const { data } = await api.get("/commercial/orders");
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr("Falha ao carregar ordens.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  /* ---------- Handlers ---------- */
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
      (acc, i) => acc + parseFlex(i.quantidade) * parseFlex(i.valor_unit),
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

  /* ---------- Submit ---------- */
  const submit = async (e) => {
    e.preventDefault();

    // Recalcula o total a partir dos itens (fonte da verdade)
    const payloadTotal = (form.itens || []).reduce(
      (acc, i) => acc + parseFlex(i.quantidade) * parseFlex(i.valor_unit),
      0
    );

    const payload = {
      ...form,
      data: toISO(form.data), // BR -> ISO (mantém seu padrão)
      itens: (form.itens || []).map((i) => ({
        descricao: i.descricao,
        quantidade: parseFlex(i.quantidade),
        valor_unit: parseFlex(i.valor_unit),
      })),
      valor_total: Number(payloadTotal.toFixed(2)),
    };

    const url = editingId
      ? `/commercial/orders/${editingId}`
      : `/commercial/orders`;
    const method = editingId ? "put" : "post";

    await api[method](url, payload);
    resetForm();
    setOpen(false);
    load();
  };

  const edit = (o) => {
    setEditingId(o.id);
    setForm({
      cliente: o.cliente || "",
      titulo: o.titulo || "",
      descricao: o.descricao || "",
      status: o.status || "Aberta",
      data: fmtBRDate(o.data || ""), // ISO -> BR
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

  /* ---------- Totais p/ rodapé ---------- */
  const qtdGeral = useMemo(
    () => orders.reduce((acc, o) => acc + orderQty(o), 0),
    [orders]
  );
  const totalGeral = useMemo(
    () => orders.reduce((acc, o) => acc + parseFlex(o.valor_total), 0),
    [orders]
  );

  /* ---------- UI ---------- */
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
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
          <Button
            onClick={() => {
              resetForm();
              setOpen(true);
            }}
          >
            Nova Ordem
          </Button>
        </div>
      </div>

      {err && (
        <div className="bg-red-50 text-red-700 border border-red-200 px-3 py-2 rounded mb-4">
          {err}
        </div>
      )}

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
                  <TableHead className="text-center">Data</TableHead>
                  <TableHead className="text-center">Cliente</TableHead>
                  <TableHead className="text-center">Título</TableHead>
                  <TableHead className="text-center">Descrição</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>{/* NOVA */}
                  <TableHead className="text-center">Valor Unit.</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => {
                  const unitPure = orderUnitValue(o);             // valor “puro” se único/igual
                  const qty = orderQty(o);
                  const unitToShow =
                    unitPure !== null
                      ? BRL(unitPure)
                      : showAvgUnit && qty > 0
                      ? BRL(orderAvgUnit(o)) // média quando toggle ligado
                      : "—";
                  return (
                    <tr key={o.id} className="border-t">
                      <TableCell className="text-center align-middle">
                        {fmtBRDate(o.data)}
                      </TableCell>
                      <TableCell className="text-center align-middle">{o.cliente}</TableCell>
                      <TableCell className="text-center align-middle">{o.titulo}</TableCell>
                      <TableCell className="text-center align-middle">
                        {o.descricao || "—"}
                      </TableCell>
                      <TableCell className="text-center align-middle">{o.status}</TableCell>
                      <TableCell className="text-center align-middle">
                        {qty.toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        {unitToShow}
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        {BRL(o.valor_total)}
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        <div className="flex justify-center gap-2">
                          <Button variant="secondary" onClick={() => edit(o)}>
                            Editar
                          </Button>
                          <Button variant="destructive" onClick={() => del(o)}>
                            Excluir
                          </Button>
                        </div>
                      </TableCell>
                    </tr>
                  );
                })}

                {orders.length === 0 && (
                  <tr>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                      Nenhuma ordem cadastrada.
                    </TableCell>
                  </tr>
                )}

                {/* Rodapé com totais */}
                {orders.length > 0 && (
                  <tr className="border-t font-semibold">
                    <TableCell colSpan={5} />
                    <TableCell className="text-center">
                      {qtdGeral.toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-center">
                      {showAvgUnit && qtdGeral > 0 ? BRL(totalGeral / qtdGeral) : "—"}
                    </TableCell>
                    <TableCell className="text-center">{BRL(totalGeral)}</TableCell>
                    <TableCell />
                  </tr>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* MODAL: Nova/Editar Ordem */}
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) resetForm();
        }}
      >
        <DialogContent className="w-[92vw] sm:max-w-[1100px] sm:p-8 rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Ordem" : "Nova Ordem"}</DialogTitle>
          </DialogHeader>

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

            {/* Data com máscara BR */}
            <InputDateBR
              name="data"
              value={form.data}
              onChange={(val) => setForm((p) => ({ ...p, data: val }))}
              placeholder="dd/mm/aaaa"
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
                        <TableHead className="text-center">Descrição</TableHead>
                        <TableHead className="text-center">Qtd</TableHead>
                        <TableHead className="text-center">Valor Unit.</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.itens.map((i, idx) => {
                        const rowTotal =
                          parseFlex(i.quantidade) * parseFlex(i.valor_unit);
                        return (
                          <tr key={idx} className="border-t">
                            <TableCell className="w-[40%] text-center align-middle">
                              <Input
                                value={i.descricao}
                                onChange={(e) =>
                                  updateItemField(idx, "descricao", e.target.value)
                                }
                              />
                            </TableCell>
                            <TableCell className="w-[10%] text-center align-middle">
                              <Input
                                value={i.quantidade}
                                onChange={(e) =>
                                  updateItemField(idx, "quantidade", parseFlex(e.target.value))
                                }
                              />
                            </TableCell>
                            <TableCell className="w-[20%] text-center align-middle">
                              <Input
                                value={i.valor_unit}
                                onChange={(e) =>
                                  updateItemField(idx, "valor_unit", parseFlex(e.target.value))
                                }
                              />
                            </TableCell>
                            <TableCell className="w-[20%] text-center align-middle">
                              {BRL(rowTotal)}
                            </TableCell>
                            <TableCell className="text-center align-middle w-[10%]">
                              <div className="flex justify-center">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  onClick={() => removeItem(idx)}
                                >
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
                Total: {BRL(total)}
              </div>
            </div>

            <div className="md:col-span-4 flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  resetForm();
                  setOpen(false);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editingId ? "Salvar Alterações" : "Adicionar Ordem"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
