import React from "react";
import api from "@/lib/api";
import { toISO, toBR } from "@/utils/dateBR";

const n = (v) => Number(v || 0);
const money = (v) =>
  n(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// CSV
const toCSV = (rows) => {
  if (!rows?.length) return "";
  const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const head = Object.keys(rows[0]);
  return [head.join(","), ...rows.map((r) => head.map((k) => esc(r[k])).join(","))].join("\n");
};
const downloadCSV = (name, rows) => {
  const blob = new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};

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

function ImportXlsx({ onDone }) {
  const inp = React.useRef(null);
  const onFile = async (file) => {
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
        ref={inp}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <button type="button" className="btn btn-ghost" onClick={() => inp.current?.click()}>
        Importar
      </button>
    </>
  );
}

export default function ContasReceberTab() {
  const [list, setList] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [month, setMonth] = React.useState("");

  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);

  const reload = React.useCallback(async () => {
    setLoading(true);
    const qs = month ? `?month=${encodeURIComponent(month)}` : "";
    const { data } = await api.get(`/contas-receber${qs}`);
    setList(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [month]);

  React.useEffect(() => void reload(), [reload]);

  const filtered = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return list;
    return list.filter((it) =>
      [it.cliente, it.notaFiscal, it.notes, it.vencimento, it.dataEmissao, it.dataBaixa]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(t)
    );
  }, [list, q]);

  const totals = React.useMemo(() => {
    let valor = 0,
      liq = 0;
    filtered.forEach((it) => {
      valor += n(it.valor ?? it.amount);
      liq += n(it.valorLiqRecebido);
    });
    return { valor, liq, saldo: valor - liq };
  }, [filtered]);

  const openNew = () => {
    setForm(emptyForm);
    setOpen(true);
  };
  const openEdit = (it) => {
    setForm({
      id: it.id,
      vencimento: toISO(it.vencimento || it.date),
      cliente: it.cliente || "",
      notaFiscal: it.notaFiscal || "",
      dataEmissao: toISO(it.dataEmissao),
      valor: it.valor ?? it.amount ?? "",
      taxasJuros: it.taxasJuros ?? "",
      documentoRecebimento: it.documentoRecebimento || "",
      dataBaixa: toISO(it.dataBaixa),
      valorLiqRecebido: it.valorLiqRecebido ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    const payload = {
      vencimento: toISO(form.vencimento),
      cliente: form.cliente || "",
      notaFiscal: form.notaFiscal || null,
      dataEmissao: toISO(form.dataEmissao) || null,
      valor: n(form.valor),
      taxasJuros: n(form.taxasJuros),
      documentoRecebimento: form.documentoRecebimento || null,
      dataBaixa: toISO(form.dataBaixa) || null,
      valorLiqRecebido: n(form.valorLiqRecebido),
    };
    if (!payload.vencimento) return alert("Vencimento inválido");
    if (!payload.valor) return alert("Valor inválido");

    if (form.id) await api.patch(`/contas-receber/${form.id}`, payload);
    else await api.post(`/contas-receber`, payload);

    setOpen(false);
    await reload();
  };

  const del = async (it) => {
    if (!confirm("Excluir conta?")) return;
    await api.delete(`/contas-receber/${it.id}`);
    await reload();
  };

  const exportar = () => {
    const rows = filtered.map((it) => {
      const valor = n(it.valor ?? it.amount);
      const liq = n(it.valorLiqRecebido);
      return {
        id: it.id,
        vencimento: toBR(it.vencimento || it.date),
        cliente: it.cliente || "",
        nota_fiscal: it.notaFiscal || "",
        data_emissao: toBR(it.dataEmissao),
        valor,
        taxas_juros: n(it.taxasJuros),
        doc_recebimento: it.documentoRecebimento || "",
        data_baixa: toBR(it.dataBaixa),
        valor_liq_recebido: liq,
        status: liq >= valor ? "Recebido" : "Pendente",
      };
    });
    downloadCSV("contas_receber.csv", rows);
  };

  return (
    <section className="card bg-base-100 shadow-sm">
      <div className="card-body">
        {/* ====== BARRA DE AÇÕES (igual lançamentos) ====== */}
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

        {/* ====== TABELA (igual lançamentos) ====== */}
        <div className="overflow-x-auto">
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
              {loading && (
                <tr>
                  <td colSpan={11} className="text-center py-8">
                    Carregando...
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((it) => {
                  const valor = n(it.valor ?? it.amount);
                  const liq = n(it.valorLiqRecebido);
                  const status = liq >= valor ? "Recebido" : "Pendente";
                  return (
                    <tr key={it.id}>
                      <td>{toBR(it.vencimento || it.date)}</td>
                      <td>{it.cliente || "-"}</td>
                      <td>{it.notaFiscal || "-"}</td>
                      <td>{toBR(it.dataEmissao)}</td>
                      <td className="text-right">{money(valor)}</td>
                      <td className="text-right">{money(n(it.taxasJuros))}</td>
                      <td>{it.documentoRecebimento || "-"}</td>
                      <td>{toBR(it.dataBaixa)}</td>
                      <td className="text-right">{money(liq)}</td>
                      <td>
                        <span
                          className={`badge ${
                            status === "Recebido" ? "badge-success" : "badge-warning"
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
                <td className="text-right font-medium">{money(totals.valor)}</td>
                <td colSpan={3} className="text-right font-medium">
                  Saldo:
                </td>
                <td className="text-right font-medium">{money(totals.saldo)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="pt-2 text-xs text-gray-500">
          Total: {filtered.length} conta(s) | A Receber: {money(totals.valor)} | Recebido
          Líq.: {money(totals.liq)} | Em Aberto: {money(totals.saldo)}
        </div>
      </div>

      {/* ====== MODAL ====== */}
      {open && (
        <div className="modal modal-open">
          <div className="modal-box max-w-5xl">
            <h3 className="font-bold text-lg">{form.id ? "Editar" : "Nova"} Conta a Receber</h3>

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
                  onChange={(e) => setForm((s) => ({ ...s, cliente: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Nota Fiscal</label>
                <input
                  className="input input-bordered w-full"
                  value={form.notaFiscal}
                  onChange={(e) => setForm((s) => ({ ...s, notaFiscal: e.target.value }))}
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
                  onChange={(e) => setForm((s) => ({ ...s, valor: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Taxas/Juros</label>
                <input
                  className="input input-bordered w-full"
                  type="number"
                  step="0.01"
                  value={form.taxasJuros}
                  onChange={(e) => setForm((s) => ({ ...s, taxasJuros: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Doc. Recebimento</label>
                <input
                  className="input input-bordered w-full"
                  value={form.documentoRecebimento}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, documentoRecebimento: e.target.value }))
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
                    setForm((s) => ({ ...s, valorLiqRecebido: e.target.value }))
                  }
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
