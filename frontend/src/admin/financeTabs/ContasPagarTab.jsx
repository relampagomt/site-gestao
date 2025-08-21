// frontend/src/admin/financeTabs/ContasPagarTab.jsx
import React from 'react';
import api from '@/lib/api';
import { toISO, toBR } from '@/utils/dateBR';
import { kpisPagar } from '@/utils/financeMath';

function ImportarXlsx({ onDone }) {
  const ref = React.useRef();
  const send = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    await api.post('/contas-pagar/import', fd, {
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
  documento: '',
  descricao: '',
  valor: '',
  dataPagamento: '',
  valorPago: '',
};

export default function ContasPagarTab() {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);
  const [kpi, setKpi] = React.useState({ total: 0, pago: 0, emAberto: 0, atrasados: 0 });
  const [month, setMonth] = React.useState(''); // YYYY-MM

  const reload = React.useCallback(async () => {
    setLoading(true);
    const qs = month ? `?month=${month}` : '';
    const { data } = await api.get(`/contas-pagar${qs}`);
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [month]);

  React.useEffect(() => { reload(); }, [reload]);

  React.useEffect(() => {
    setKpi(kpisPagar(items));
  }, [items]);

  const openNew = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (it) => {
    setForm({
      id: it.id,
      vencimento: toISO(it.vencimento || it.date),
      documento: it.documento || '',
      descricao: it.descricao || it.notes || '',
      valor: it.valor ?? it.amount ?? '',
      dataPagamento: toISO(it.dataPagamento),
      valorPago: it.valorPago ?? '',
    });
    setModalOpen(true);
  };

  const save = async () => {
    const payload = {
      vencimento: toISO(form.vencimento),
      documento: form.documento || null,
      descricao: form.descricao || '',
      valor: form.valor,
      dataPagamento: toISO(form.dataPagamento) || null,
      valorPago: form.valorPago || 0,
    };
    if (!payload.vencimento) return alert('Vencimento inválido');
    if (!payload.valor || Number(payload.valor) <= 0) return alert('Valor inválido');

    if (form.id) {
      await api.patch(`/contas-pagar/${form.id}`, payload);
    } else {
      await api.post('/contas-pagar', payload);
    }
    setModalOpen(false);
    await reload();
  };

  const del = async (it) => {
    if (!confirm('Excluir conta?')) return;
    await api.delete(`/contas-pagar/${it.id}`);
    await reload();
  };

  const dinheiro = (n) =>
    (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="card p-3">
          <div className="text-sm text-gray-500">Total a Pagar</div>
          <div className="text-xl font-semibold">{dinheiro(kpi.total)}</div>
        </div>
        <div className="card p-3">
          <div className="text-sm text-gray-500">Total Pago</div>
          <div className="text-xl font-semibold text-green-600">{dinheiro(kpi.pago)}</div>
        </div>
        <div className="card p-3">
          <div className="text-sm text-gray-500">Total em Aberto</div>
          <div className="text-xl font-semibold text-orange-600">{dinheiro(kpi.emAberto)}</div>
        </div>
        <div className="card p-3">
          <div className="text-sm text-gray-500">Contas Vencidas</div>
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
              <th>Documento</th>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Data Pagamento</th>
              <th>Valor Pago</th>
              <th>Status</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.map((it) => {
              const valor = Number(it.amount || it.valor || 0);
              const pago = Number(it.valorPago || 0);
              const status = pago >= valor ? 'Pago' : 'Pendente';
              return (
                <tr key={it.id}>
                  <td>{toBR(it.date || it.vencimento)}</td>
                  <td>{it.documento || '-'}</td>
                  <td>{it.descricao || it.notes || '-'}</td>
                  <td>{dinheiro(valor)}</td>
                  <td>{toBR(it.dataPagamento)}</td>
                  <td>{dinheiro(pago)}</td>
                  <td>
                    <span className={`badge ${status === 'Pago' ? 'badge-success' : 'badge-warning'}`}>
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
              <tr><td colSpan="8" className="text-center py-6">Carregando...</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan="8" className="text-center py-6">Sem registros</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <h3 className="font-bold text-lg">{form.id ? 'Editar' : 'Nova'} Conta a Pagar</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <div>
                <label className="label">Vencimento *</label>
                <input
                  className="input input-bordered w-full"
                  placeholder="DD/MM/AAAA"
                  value={toBR(form.vencimento)}
                  onChange={(e) => setForm(s => ({ ...s, vencimento: toISO(e.target.value) }))}
                />
              </div>
              <div>
                <label className="label">Documento</label>
                <input
                  className="input input-bordered w-full"
                  value={form.documento}
                  onChange={(e) => setForm(s => ({ ...s, documento: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Descrição *</label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={3}
                  value={form.descricao}
                  onChange={(e) => setForm(s => ({ ...s, descricao: e.target.value }))}
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
                <label className="label">Data Pagamento</label>
                <input
                  className="input input-bordered w-full"
                  placeholder="DD/MM/AAAA"
                  value={toBR(form.dataPagamento)}
                  onChange={(e) => setForm(s => ({ ...s, dataPagamento: toISO(e.target.value) }))}
                />
              </div>
              <div>
                <label className="label">Valor Pago</label>
                <input
                  className="input input-bordered w-full"
                  type="number"
                  step="0.01"
                  value={form.valorPago}
                  onChange={(e) => setForm(s => ({ ...s, valorPago: e.target.value }))}
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
