// frontend/src/admin/financeTabs/ContasReceberTab.jsx
import React from "react";
import api from "@/lib/api";
import { toISO, toBR } from "@/utils/dateBR";
import { kpisReceber, parseNum } from "@/utils/financeMath";

// CSV util
const toCSV = (rows) => {
  if (!rows?.length) return "";
  const head = Object.keys(rows[0]);
  const esc = (v) =>
    `"${String(v ?? "").replaceAll('"', '""').replaceAll("\n", " ")}"`;
  const body = rows.map((r) => head.map((k) => esc(r[k])).join(","));
  return [head.join(","), ...body].join("\n");
};
const downloadCSV = (filename, rows) => {
  const blob = new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

function ImportarXlsx({ onDone }) {
  const ref = React.useRef();
  const send = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    await api.post("/contas-receber/import", fd, {
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
        onChange={(e) => send(e.target.files?.[0])}
      />
      <button className="btn btn-ghost" onClick={() => ref.current?.click()}>
        Importar
      </button>
    </>
  );
}

const emptyForm = {
  id: null,
  vencimento: "",
  cliente: "",
  notaFiscal: "",
  dataEmissao: "",
  valor: "",
  taxasJuros: "",
  documentoRecebimento: "",
  dataBaixa: "",
  valorLiqRecebido: "",
};

export default function ContasReceberTab() {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);

  const [q, setQ] = React.useState("");
  const [month, setMonth] = React.useState(""); // YYYY-MM

  const [kpi, setKpi] = React.useState({
    total: 0,
    recebido: 0,
    emAberto: 0,
    atrasados: 0,
  });

  const dinheiro = (n) =>
    (Number(n) || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  const reload = React.useCallback(async () => {
    setLoading(true);
    const qs = month ? `?month=${encodeURIComponent(month)}` : "";
    const { data } = await api.get(`/contas-receber${qs}`);
    const list = Array.isArray(data) ? data : [];
    setItems(list);
    setLoading(false);
  }, [month]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  React.useEffect(() => {
    setKpi(kpisReceber(items));
  }, [items]);

  const filtered = React.useMemo(() => {
    const t = (q || "").trim().toLowerCase();
    if (!t) return items;
    return items.filter((it) => {
      const str =
        [
          it.cliente,
          it.notaFiscal,
          it.notes,
          it.category,
          it.date,
          toBR(it.date),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase() || "";
      return str.includes(t);
    });
  }, [items, q]);

  const openNew = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (it) => {
    setForm({
      id: it.id,
      vencimento: toISO(it.vencimento || it.date),
      cliente: it.cliente || it.notes || "",
      notaFiscal: it.notaFiscal || "",
      dataEmissao: toISO(it.dataEmissao),
      valor: it.valor ?? it.amount ?? "",
      taxasJuros: it.taxasJuros ?? "",
      documentoRecebimento: it.documentoRecebimento || "",
      dataBaixa: toISO(it.dataBaixa),
      valorLiqRecebido: it.valorLiqRecebido ?? "",
    });
    setModalOpen(true);
  };

  const save = async () => {
    const payload = {
      vencimento: toISO(form.vencimento),
      cliente: form.cliente || "",
      notaFiscal: form.notaFiscal || null,
      dataEmissao: toISO(form.dataEmissao) || null,
      valor: form.valor,
      taxasJuros: form.taxasJuros || 0,
      documentoRecebimento: form.documentoRecebimento || null,
      dataBaixa: toISO(form.dataBaixa) || null,
      valorLiqRecebido: form.valorLiqRecebido || 0,
    };
    if (!payload.vencimento) return alert("Vencimento inválido");
    if (!payload.valor || Number(payload.valor) <= 0)
      return alert("Valor inválido");

    if (form.id) {
      await api.patch(`/contas-receber/${form.id}`, payload);
    } else {
      await api.post("/contas-receber", payload);
    }
    setModalOpen(false);
    await reload();
  };

  const del = async (it) => {
    if (!confirm("Excluir conta?")) return;
    await api.delete(`/contas-receber/${it.id}`);
    await reload();
  };

  const exportar = () => {
    const rows = filtered.map((it) => ({
      id: it.id,
      vencimento: toBR(it.date || it.vencimento),
      cliente: it.cliente || it.notes || "",
      nota_fiscal: it.notaFiscal || "",
      data_emissao: toBR(it.dataEmissao),
      valor: parseNum(it.amount || it.valor || 0),
      taxas_juros: parseNum(it.taxasJuros || 0),
      doc_recebimento: it.documentoRecebimento || "",
      data_baixa: toBR(it.dataBaixa),
      valor_liq_recebido: parseNum(it.valorLiqRecebido || 0),
      status:
        parseNum(it.valorLiqRecebido || 0) >= parseNum(it.amount || it.valor || 0)
          ? "Recebido"
          : "Pendente",
    }));
    downloadCSV("contas_receber.csv", rows);
  };

  const totals = React.useMemo(() => {
    let valor = 0,
      liq = 0;
    filtered.forEach((it) => {
      valor += parseNum(it.amount || it.valor);
      liq += parseNum(it.valorLiqRecebido);
    });
    return { valor, liq, saldo: valor - liq };
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* KPIs no mesmo estilo de lançamentos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card bg-base-100 p-4">
          <div className="text-sm text-gray-500">Entradas (a Receber)</div>
          <div className="text-2xl font-semibold">{dinheiro(kpi.total)}</div>
          <div className="text-xs text-gray-400 mt-1">Receitas registradas</div>
        </div>
        <div className="card bg-base-100 p-4">
          <div className="text-sm text-gray-500">Total Recebido Líquido</div>
          <div className="text-2xl font-semibold text-green-600">
            {dinheiro(kpi.recebido)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Valor já recebido</div>
        </div>
        <div className="card bg-base-100 p-4">
          <div className="text-sm text-gray-500">Em Aberto</div>
          <div className="text-2xl font-semibold text-orange-600">
            {dinheiro(kpi.emAberto)}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {kpi.atrasados} recebimento(s) vencido(s)
          </div>
        </div>
      </div>

      {/* Barra de ações padronizada */}
      <div className="card bg-base-100 p-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="flex-1">
            <input
              className="input input-bordered w-full"
              placeholder="Buscar contas..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

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

          {/* placeholder */}
          <button disabled className="btn btn-ghost md:w-40" aria-disabled>
            Filtrar por ações
          </button>

          <button className="btn" onClick={() => setMonth("")}>
            Limpar Filtros
          </button>

          <button className="btn btn-ghost" onClick={exportar}>
            Exportar
          </button>

          <ImportarXlsx onDone={reload} />

          <button className="btn btn-primary" onClick={openNew}>
            Nova Conta
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="card bg-base-100">
        <div className="overflow-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Vencimento</th>
                <th>Cliente</th>
                <th>Nota Fiscal</th>
                <th>Data Emissão</th>
                <th className="text-right">Valor</th>
                <th className="text-right">Taxas/Juros</th>
                <th>Doc. Receb.</th>
                <th>Data Baixa</th>
                <th className="text-right">Valor Líq. Recebido</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                filtered.map((it) => {
                  const valor = parseNum(it.amount || it.valor);
                  const liq = parseNum(it.valorLiqRecebido);
                  const status = liq >= valor ? "Recebido" : "Pendente";
                  return (
                    <tr key={it.id}>
                      <td>{toBR(it.date || it.vencimento)}</td>
                      <td>{it.cliente || it.notes || "-"}</td>
                      <td>{it.notaFiscal || "-"}</td>
                      <td>{toBR(it.dataEmissao)}</td>
                      <td className="text-right">{dinheiro(valor)}</td>
                      <td className="text-right">
                        {dinheiro(parseNum(it.taxasJuros || 0))}
                      </td>
                      <td>{it.documentoRecebimento || "-"}</td>
                      <td>{toBR(it.dataBaixa)}</td>
                      <td className="text-right">{dinheiro(liq)}</td>
                      <td>
                        <span
                          className={`badge ${
                            status === "Recebido"
                              ? "badge-success"
                              : "badge-warning"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="text-right space-x-2">
                        <button
                          className="btn btn-sm"
                          onClick={() => openEdit(it)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-sm btn-error"
                          onClick={() => del(it)}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              {loading && (
                <tr>
                  <td colSpan={11} className="text-center py-8">
                    Carregando...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-8">
                    Nenhuma conta encontrada.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="text-right font-medium">
                  Total:
                </td>
                <td className="text-right font-medium">
                  {dinheiro(totals.valor)}
                </td>
                <td colSpan={3} className="text-right font-medium">
                  Saldo:
                </td>
                <td className="text-right font-medium">
                  {dinheiro(totals.saldo)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="p-3 text-xs text-gray-500">
          Total: {filtered.length} conta(s) | A Receber:{" "}
          {dinheiro(totals.valor)} | Recebido Líq.: {dinheiro(totals.liq)} | Em
          Aberto: {dinheiro(totals.saldo)}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-5xl">
            <h3 className="font-bold text-lg">
              {form.id ? "Editar" : "Nova"} Conta a Receber
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
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
              <div className="md:col-span-2">
                <label className="label">Cliente *</label>
                <input
                  className="input input-bordered w-full"
                  value={form.cliente}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, cliente: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="label">Nota Fiscal</label>
                <input
                  className="input input-bordered w-full"
                  value={form.notaFiscal}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, notaFiscal: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="label">Data Emissão</label>
                <input
                  className="input input-bordered w-full"
                  placeholder="DD/MM/AAAA"
                  value={toBR(form.dataEmissao)}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, dataEmissao: toISO(e.target.value) }))
                  }
                />
              </div>
              <div>
                <label className="label">Valor *</label>
                <input
                  className="input input-bordered w-full"
                  type="number"
                  step="0.01"
                  value={form.valor}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, valor: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="label">Taxas/Juros</label>
                <input
                  className="input input-bordered w-full"
                  type="number"
                  step="0.01"
                  value={form.taxasJuros}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, taxasJuros: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="label">Doc. Recebimento</label>
                <input
                  className="input input-bordered w-full"
                  value={form.documentoRecebimento}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      documentoRecebimento: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="label">Data Baixa</label>
                <input
                  className="input input-bordered w-full"
                  placeholder="DD/MM/AAAA"
                  value={toBR(form.dataBaixa)}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, dataBaixa: toISO(e.target.value) }))
                  }
                />
              </div>
              <div>
                <label className="label">Valor Líq. Recebido</label>
                <input
                  className="input input-bordered w-full"
                  type="number"
                  step="0.01"
                  value={form.valorLiqRecebido}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      valorLiqRecebido: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="modal-action">
              <button className="btn" onClick={() => setModalOpen(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={save}>
                Salvar
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setModalOpen(false)} />
        </div>
      )}
    </div>
  );
}
