// frontend/src/admin/financeTabs/ContasReceberTab.jsx
import React from 'react';
import api from '@/lib/api';
import { toISO, toBR } from '@/utils/dateBR';
import { kpisReceber } from '@/utils/financeMath';

function ImportarXlsx({ onDone }) {
  const ref = React.useRef();
  const send = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    await api.post('/contas-receber/import', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
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
        onChange={(e) => e.target.files[0] && send(e.target.files[0])}
      />
      <button className="btn btn-outline" onClick={() => ref.current?.click()}>
        Importar .xlsx
      </button>
    </>
  );
}

const emptyForm = {
  id: null,
  vencimento: '',
  cliente: '',
  notaFiscal: '',
  dataEmissao: '',
  valor: '',
  taxasJuros: '',
  documentoRecebimento: '',
  dataBaixa: '',
  valorLiqRecebido: '',
};

export default function ContasReceberTab() {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);
  const [kpi, setKpi] = React.useState({ total: 0, recebido: 0, emAberto: 0, atrasados: 0 });
  const [month, setMonth] = React.useState('');

  const reload = React.useCallback(async () => {
    setLoading(true);
    const qs = month ? `?month=${month}` : '';
    const { data } = await api.get(`/contas-receber${qs}`);
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [month]);

  React.useEffect(() => { reload(); }, [reload]);
  React.useEffect(() => { setKpi(kpisReceber(items)); }, [items]);

  const openNew = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (it) => {
    setForm({
      id: it.id,
      vencimento: toISO(it.vencimento || it.date),
      cliente: it.cliente || it.notes || '',
      notaFiscal: it.notaFiscal || '',
      dataEmissao: toISO(it.dataEmissao),
      valor: it.valor ?? it.amount ?? '',
      taxasJuros: it.taxasJuros ?? '',
      documentoRecebimento: it.documentoRecebimento || '',
      dataBaixa: toISO(it.dataBaixa),
      valorLiqRecebido: it.valorLiqRecebido ?? '',
    });
    setModalOpen(true);
  };

  const save = async () => {
    const payload = {
      vencimento: toISO(form.vencimento),
      cliente: form.cliente || '',
      notaFiscal: form.notaFiscal || null,
      dataEmissao: toISO(form.dataEmissao) || null,
      valor: form.valor,
      taxasJuros: form.taxasJuros || 0,
      documentoRecebimento: form.documentoRecebimento || null,
      dataBaixa: toISO(form.dataBaixa) || null,
      valorLiqRecebido: form.valorLiqRecebido || 0,
    };
    if (!payload.vencimento) return alert('Vencimento inválido');
    if (!payload.valor || Number(payload.valor) <= 0) return alert('Valor inválido');

    if (form.id) {
      await api.patch(`/contas-receber/${form.id}`, payload);
    } else {
      await api.post('/contas-receber', payload);
    }
    setModalOpen(false);
    await reload();
  };

  const del = async (it) => {
    if (!confirm('Excluir conta?')) return;
    await api.delete(`/contas-receber/${it.id}`);
    await reload();
  };

  const dinheiro = (n) =>
    (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="card p-3">
          <div className="text-sm text-gray-500">Total a Receber</div>
          <div className="text-xl font-semibold">{dinheiro(kpi.total)}</div>
        </div>
        <div className="card p-3">
          <div className="text-sm text-gray-500">Total Recebido Líquido</div>
          <div className="text-xl font-semibold text-green-600">{dinheiro(kpi.recebido)}</div>
        </div>
        <div className="card p-3">
          <div className="text-sm text-gray-500">Total em Aberto</div>
          <div className="text-xl font-semibold text-orange-600">{dinheiro(kpi.emAberto)}</div>
        </div>
        <div className="card p-3">
          <div className="text-sm text-gray-500">Recebimentos Atrasados</div>
          <div className="text-xl font-semibold text-red-600">{kpi.atrasados}</div>
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2">
        <button className="btn btn-primary" onClick={openNew}>Nova Conta</button>
        <ImportarXlsx onDone={reload} />
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="input input-bordered ml-auto"
        />
        {month && (
          <button className="btn btn-ghost" onClick={() => setMonth('')}>Limpar Filtro</button>
        )}
      </div>

      {/* Tabela */}
      <div className="overflow-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Vencimento</th>
              <th>Cliente</th>
              <th>Nota Fiscal</th>
              <th>Data Emissão</th>
              <th>Valor</th>
              <th>Taxas/Juros</th>
              <th>Doc. Receb.</th>
              <th>Data Baixa</th>
              <th>Valor Líq. Recebido</th>
              <th>Status</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.map((it) => {
              const valor = Number(it.amount || it.valor || 0);
              const liq  = Number(it.valorLiqRecebido || 0);
              const status = liq >= valor ? 'Recebido' : 'Pendente';
              return (
                <tr key={it.id}>
                  <td>{toBR(it.date || it.vencimento)}</td>
                  <td>{it.cliente || it.notes || '-'}</td>
                  <td>{it.notaFiscal || '-'}</td>
                  <td>{toBR(it.dataEmissao)}</td>
                  <td>{dinheiro(valor)}</td>
                  <td>{dinheiro(it.taxasJuros || 0)}</td>
                  <td>{it.documentoRecebimento || '-'}</td>
                  <td>{toBR(it.dataBaixa)}</td>
                  <td>{dinheiro(liq)}</td>
                  <td>
                    <span className={`badge ${status === 'Recebido' ? 'badge-success' : 'badge-warning'}`}>
                      {status}
                    </span>
                  </td>
                  <td className="text-right space-x-2">
                    <button className="btn btn-sm" onClick={() => openEdit(it)}>Editar</button>
                    <button className="btn btn-sm btn-error" onClick={() => del(it)}>Excluir</button>
                  </td>
                </tr>
              );
            })}
            {loading && (
              <tr><td colSpan="11" className="text-center py-6">Carregando...</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan="11" className="text-center py-6">Sem registros</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-5xl">
            <h3 className="font-bold text-lg">{form.id ? 'Editar' : 'Nova'} Conta a Receber</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              <div>
                <label className="label">Vencimento *</label>
                <input
                  className="input input-bordered w-full"
                  placeholder="DD/MM/AAAA"
                  value={toBR(form.vencimento)}
                  onChange={(e) => setForm(s => ({ ...s, vencimento: toISO(e.target.value) }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Cliente *</label>
                <input
                  className="input input-bordered w-full"
                  value={form.cliente}
                  onChange={(e) => setForm(s => ({ ...s, cliente: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Nota Fiscal</label>
                <input
                  className="input input-bordered w-full"
                  value={form.notaFiscal}
                  onChange={(e) => setForm(s => ({ ...s, notaFiscal: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Data Emissão</label>
                <input
                  className="input input-bordered w-full"
                  placeholder="DD/MM/AAAA"
                  value={toBR(form.dataEmissao)}
                  onChange={(e) => setForm(s => ({ ...s, dataEmissao: toISO(e.target.value) }))}
                />
              </div>
              <div>
                <label className="label">Valor *</label>
                <input
                  className="input input-bordered w-full"
                  type="number"
                  step="0.01"
                  value={form.valor}
                  onChange={(e) => setForm(s => ({ ...s, valor: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Taxas/Juros</label>
                <input
                  className="input input-bordered w-full"
                  type="number"
                  step="0.01"
                  value={form.taxasJuros}
                  onChange={(e) => setForm(s => ({ ...s, taxasJuros: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Doc. Recebimento</label>
                <input
                  className="input input-bordered w-full"
                  value={form.documentoRecebimento}
                  onChange={(e) => setForm(s => ({ ...s, documentoRecebimento: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Data Baixa</label>
                <input
                  className="input input-bordered w-full"
                  placeholder="DD/MM/AAAA"
                  value={toBR(form.dataBaixa)}
                  onChange={(e) => setForm(s => ({ ...s, dataBaixa: toISO(e.target.value) }))}
                />
              </div>
              <div>
                <label className="label">Valor Líq. Recebido</label>
                <input
                  className="input input-bordered w-full"
                  type="number"
                  step="0.01"
                  value={form.valorLiqRecebido}
                  onChange={(e) => setForm(s => ({ ...s, valorLiqRecebido: e.target.value }))}
                />
              </div>
            </div>

            <div className="modal-action">
              <button className="btn" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save}>Salvar</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setModalOpen(false)} />
        </div>
      )}
    </div>
  );
}
