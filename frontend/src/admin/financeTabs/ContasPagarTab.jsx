// frontend/src/admin/financeTabs/ContasPagarTab.jsx
import React from "react";
import api from "@/lib/api";
import { toISO, toBR } from "@/utils/dateBR";
import { parseNum } from "@/utils/financeMath";

/* ==== CSV helpers (mesmo padrão do Lançamentos) ==== */
const toCSV = (rows) => {
  if (!rows?.length) return "";
  const head = Object.keys(rows[0]);
  const esc = (v) =>
    `"${String(v ?? "").replaceAll('"', '""').replaceAll("\n", " ") }"`;
  return [head.join(","), ...rows.map((r) => head.map((k) => esc(r[k])).join(","))].join("\n");
};
const downloadCSV = (filename, rows) => {
  const blob = new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};
/* ==================================================== */

const emptyForm = {
  id: null,
  vencimento: "",
  documento: "",
  descricao: "",
  valor: "",
  dataPagamento: "",
  valorPago: "",
};

function ImportXlsx({ onDone }) {
  const ref = React.useRef(null);
  const handleFile = async (f) => {
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    await api.post("/contas-pagar/import", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    onDone?.();
  };
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <button type="button" className="btn btn-ghost" onClick={() => ref.current?.click()}>
        Importar
      </button>
    </>
  );
}

export default function ContasPagarTab() {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [month, setMonth] = React.useState(""); // YYYY-MM

  // modal + form
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);

  const money = (n) =>
    (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const reload = React.useCallback(async () => {
    setLoading(true);
    const qs = month ? `?month=${encodeURIComponent(month)}` : "";
    const { data } = await api.get(`/contas-pagar${qs}`);
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [month]);

  React.useEffect(() => void reload(), [reload]);

  const filtered = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter((it) =>
      [it.documento, it.descricao, it.notes, it.date, toBR(it.date)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(t)
    );
  }, [items, q]);

  const totals = React.useMemo(() => {
    let valor = 0,
      pago = 0;
    filtered.forEach((it) => {
      valor += parseNum(it.amount ?? it.valor);
      pago += parseNum(it.valorPago);
    });
    return { valor, pago, saldo: valor - pago };
  }, [filtered]);

  const openNew = () => {
    setForm(emptyForm);
    setOpen(true);
  };
  const openEdit = (it) => {
    setForm({
      id: it.id,
      vencimento: toISO(it.vencimento || it.date),
      documento: it.documento || "",
      descricao: it.descricao || it.notes || "",
      valor: it.valor ?? it.amount ?? "",
      dataPagamento: toISO(it.dataPagamento),
      valorPago: it.valorPago ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    const payload = {
      vencimento: toISO(form.vencimento),
      documento: form.documento || null,
      descricao: form.descricao || "",
      valor: form.valor,
      dataPagamento: toISO(form.dataPagamento) || null,
      valorPago: form.valorPago || 0,
    };
    if (!payload.vencimento) return alert("Vencimento inválido.");
    if (!payload.valor || Number(payload.valor) <= 0) return alert("Valor inválido.");
    if (form.id) await api.patch(`/contas-pagar/${form.id}`, payload);
    else await api.post(`/contas-pagar`, payload);
    setOpen(false);
    await reload();
  };

  const del = async (it) => {
    if (!confirm("Excluir conta?")) return;
    await api.delete(`/contas-pagar/${it.id}`);
    await reload();
  };

  const exportar = () => {
    const rows = filtered.map((it) => {
      const valor = parseNum(it.amount ?? it.valor);
      const pago = parseNum(it.valorPago ?? 0);
      return {
        id: it.id,
        vencimento: toBR(it.date || it.vencimento),
        documento: it.documento || "",
        descricao: it.descricao || it.notes || "",
        valor,
        data_pagamento: toBR(it.dataPagamento),
        valor_pago: pago,
        status: pago >= valor ? "Pago" : "Pendente",
      };
    });
    downloadCSV("contas_pagar.csv", rows);
  };

  return (
    <section className="card bg-base-100 shadow-sm">
      <div className="card-body">
        {/* --- BARRA DE AÇÕES (mesma ordem/estilo do Lançamentos) --- */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center mb-4">
          <input
            className="input input-bordered w-full md:flex-1"
            placeholder="Buscar contas..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <select
            className="select select-bordered w-full md:w-48"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            <option value="">Todos os meses</option>
            {Array.from({ length: 18 }).map((_, i) => {
              const d = new Date();
              d.setMonth(d.getMonth() - i);
              const ym = d.toISOString().slice(0, 7);
              return (
                <option key={ym} value={ym}>
                  {ym}
                </option>
              );
            })}
          </select>

          <button className="btn btn-ghost" disabled aria-disabled>
            Filtrar por ações
          </button>

          <button className="btn" onClick={() => setMonth("")}>
            Limpar Filtros
          </button>

          <button className="btn btn-ghost" onClick={exportar}>
            Exportar
          </button>

          <ImportXlsx onDone={reload} />

          <button className="btn btn-primary" onClick={openNew}>
            Nova Conta
          </button>
        </div>

        {/* --- TABELA (mesma aparência do Lançamentos) --- */}
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Vencimento</th>
                <th>Documento</th>
                <th>Descrição</th>
                <th className="text-right">Valor</th>
                <th>Data Pagamento</th>
                <th className="text-right">Valor Pago</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="text-center py-8">
                    Carregando...
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((it) => {
                  const valor = parseNum(it.amount ?? it.valor);
                  const pago = parseNum(it.valorPago);
                  const status = pago >= valor ? "Pago" : "Pendente";
                  return (
                    <tr key={it.id}>
                      <td>{toBR(it.date || it.vencimento)}</td>
                      <td>{it.documento || "-"}</td>
                      <td>{it.descricao || it.notes || "-"}</td>
                      <td className="text-right">{money(valor)}</td>
                      <td>{toBR(it.dataPagamento)}</td>
                      <td className="text-right">{money(pago)}</td>
                      <td>
                        <span
                          className={`badge ${
                            status === "Pago" ? "badge-success" : "badge-warning"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="text-right space-x-2">
                        <button className="btn btn-sm" onClick={() => openEdit(it)}>
                          Editar
                        </button>
                        <button className="btn btn-sm btn-error" onClick={() => del(it)}>
                          Excluir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8">
                    Nenhuma conta encontrada.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="text-right font-medium">
                  Total:
                </td>
                <td className="text-right font-medium">{money(totals.valor)}</td>
                <td className="text-right font-medium">Saldo:</td>
                <td className="text-right font-medium">{money(totals.saldo)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* rodapé igual lançamentos */}
        <div className="pt-2 text-xs text-gray-500">
          Total: {filtered.length} conta(s) | A Pagar: {money(totals.valor)} | Pago:{" "}
          {money(totals.pago)} | Em Aberto: {money(totals.saldo)}
        </div>
      </div>

      {/* --- MODAL (datas BR na UI, ISO ao salvar) --- */}
      {open && (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <h3 className="font-bold text-lg">{form.id ? "Editar" : "Nova"} Conta a Pagar</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <div>
                <label className="label">Vencimento *</label>
                <input
                  className="input input-bordered w-full"
                  placeholder="DD/MM/AAAA"
                  value={toBR(form.vencimento)}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, vencimento: toISO(e.target.value) }))
                  }
                />
              </div>
              <div>
                <label className="label">Documento</label>
                <input
                  className="input input-bordered w-full"
                  value={form.documento}
                  onChange={(e) => setForm((s) => ({ ...s, documento: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Descrição *</label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={3}
                  value={form.descricao}
                  onChange={(e) => setForm((s) => ({ ...s, descricao: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Valor *</label>
                <input
                  className="input input-bordered w-full"
                  type="number"
                  step="0.01"
                  value={form.valor}
                  onChange={(e) => setForm((s) => ({ ...s, valor: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Data Pagamento</label>
                <input
                  className="input input-bordered w-full"
                  placeholder="DD/MM/AAAA"
                  value={toBR(form.dataPagamento)}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, dataPagamento: toISO(e.target.value) }))
                  }
                />
              </div>
              <div>
                <label className="label">Valor Pago</label>
                <input
                  className="input input-bordered w-full"
                  type="number"
                  step="0.01"
                  value={form.valorPago}
                  onChange={(e) => setForm((s) => ({ ...s, valorPago: e.target.value }))}
                />
              </div>
            </div>

            <div className="modal-action">
              <button className="btn" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={save}>
                Salvar
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setOpen(false)} />
        </div>
      )}
    </section>
  );
}
