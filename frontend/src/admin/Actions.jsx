import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { useAuth } from '../contexts/AuthContext';
import api from '@/services/api';
import { Plus, Search, Edit, Trash2, Target, Calendar, Users, DollarSign, TrendingUp, Clock, Filter, X } from 'lucide-react';
import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE_URL || window.location.origin;

/**
 * Permissões:
 * - supervisor: só pode ver/editar/excluir ações com createdBy === user.uid
 * - admin: pode tudo
 */
function canEditOrDelete(acao, user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'supervisor') return acao?.createdBy === user.uid;
  return false;
}

const PERIODOS = ['Manhã', 'Tarde', 'Noite'];

const defaultForm = {
  nomeCliente: '',
  nomeEmpresa: '',
  tipoAcao: '',
  dataInicio: '',
  dataFim: '',
  periodosDia: [],
  quantidadeMaterial: '',
  fotoMaterial: null, // File
  observacoes: '',
};

export default function Acoes() {
  const { user } = useAuth(); // espera { uid, role, nome } no AuthProvider
  const [acoes, setAcoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null); // registro sendo editado
  const [form, setForm] = useState(defaultForm);
  const [enviando, setEnviando] = useState(false);
  const [previewFoto, setPreviewFoto] = useState('');

  // Carregar e conectar socket
  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        setLoading(true);
        const { data } = await api.get('/acoes');
        if (!ativo) return;

        // Se for supervisor, filtra só dele
        const lista = (data || []).filter(a =>
          user?.role === 'admin' ? true : a.createdBy === user?.uid
        );

        setAcoes(lista);
      } catch (e) {
        setErro(e?.response?.data?.message || e.message || 'Falha ao carregar ações');
      } finally {
        setLoading(false);
      }
    }

    carregar();

    // Socket
    const socket = io(SOCKET_URL, { transports: ['websocket'] });

    const handleCreated = (novo) => {
      // supervisor só recebe suas próprias (ou admin recebe todas)
      if (user?.role === 'admin' || novo.createdBy === user?.uid) {
        setAcoes(prev => {
          const existe = prev.some(a => a.id === novo.id);
          return existe ? prev : [novo, ...prev];
        });
      }
    };

    const handleUpdated = (atualizado) => {
      if (user?.role === 'admin' || atualizado.createdBy === user?.uid) {
        setAcoes(prev => prev.map(a => (a.id === atualizado.id ? atualizado : a)));
      }
    };

    const handleDeleted = (id) => {
      setAcoes(prev => prev.filter(a => a.id !== id));
    };

    socket.on('actions:created', handleCreated);
    socket.on('actions:updated', handleUpdated);
    socket.on('actions:deleted', handleDeleted);

    return () => {
      ativo = false;
      socket.off('actions:created', handleCreated);
      socket.off('actions:updated', handleUpdated);
      socket.off('actions:deleted', handleDeleted);
      socket.close();
    };
  }, [user]);

  // Filtro de busca (nome cliente/empresa/tipo)
  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return acoes;
    return acoes.filter(a => {
      return (
        a.nomeCliente?.toLowerCase().includes(q) ||
        a.nomeEmpresa?.toLowerCase().includes(q) ||
        a.tipoAcao?.toLowerCase().includes(q)
      );
    });
  }, [acoes, busca]);

  function abrirNovo() {
    setEditando(null);
    setForm(defaultForm);
    setPreviewFoto('');
    setModalAberto(true);
  }

  function abrirEdicao(acao) {
    setEditando(acao);
    setForm({
      nomeCliente: acao.nomeCliente || '',
      nomeEmpresa: acao.nomeEmpresa || '',
      tipoAcao: acao.tipoAcao || '',
      dataInicio: acao.dataInicio?.slice(0, 10) || '',
      dataFim: acao.dataFim?.slice(0, 10) || '',
      periodosDia: Array.isArray(acao.periodosDia) ? acao.periodosDia : [],
      quantidadeMaterial: String(acao.quantidadeMaterial || ''),
      fotoMaterial: null, // só envia se trocar
      observacoes: acao.observacoes || '',
    });
    setPreviewFoto(acao.fotoMaterialUrl || '');
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setTimeout(() => {
      setEditando(null);
      setForm(defaultForm);
      setPreviewFoto('');
    }, 200);
  }

  function onChange(e) {
    const { name, value, type, checked, files } = e.target;
    if (name === 'fotoMaterial' && files?.[0]) {
      const file = files[0];
      setForm(prev => ({ ...prev, fotoMaterial: file }));
      const url = URL.createObjectURL(file);
      setPreviewFoto(url);
      return;
    }
    if (name === 'periodosDia') {
      const p = value;
      setForm(prev => {
        const atual = new Set(prev.periodosDia || []);
        if (checked) atual.add(p);
        else atual.delete(p);
        return { ...prev, periodosDia: Array.from(atual) };
      });
      return;
    }
    setForm(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
  }

  async function salvar(e) {
    e?.preventDefault?.();
    setEnviando(true);
    try {
      const fd = new FormData();
      fd.append('nomeCliente', form.nomeCliente);
      fd.append('nomeEmpresa', form.nomeEmpresa);
      fd.append('tipoAcao', form.tipoAcao);
      fd.append('dataInicio', form.dataInicio);
      fd.append('dataFim', form.dataFim);
      fd.append('periodosDia', JSON.stringify(form.periodosDia || []));
      fd.append('quantidadeMaterial', String(form.quantidadeMaterial || ''));
      fd.append('observacoes', form.observacoes || '');
      if (form.fotoMaterial) fd.append('fotoMaterial', form.fotoMaterial);
      // Para controle de autoria no backend
      if (user?.uid) fd.append('createdBy', user.uid);

      if (editando?.id) {
        await api.put(`/acoes/${editando.id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/acoes', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      fecharModal(); // lista será atualizada pelo socket
    } catch (e) {
      setErro(e?.response?.data?.message || e.message || 'Falha ao salvar ação');
    } finally {
      setEnviando(false);
    }
  }

  async function excluir(acao) {
    if (!canEditOrDelete(acao, user)) return;
    if (!confirm('Excluir esta ação?')) return;
    try {
      await api.delete(`/acoes/${acao.id}`);
      // remoção chegará via socket; removemos otimista também:
      setAcoes(prev => prev.filter(a => a.id !== acao.id));
    } catch (e) {
      setErro(e?.response?.data?.message || e.message || 'Falha ao excluir ação');
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto w-full">
      <Card className="border">
        <CardHeader className="gap-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-2xl">Ações</CardTitle>
              <CardDescription>Cadastre, edite e acompanhe as ações em tempo real.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 opacity-60" />
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por cliente, empresa ou tipo…"
                  className="pl-8 w-[260px]"
                />
              </div>
              <Button onClick={abrirNovo} className="whitespace-nowrap">
                <Plus className="mr-2 size-4" /> Nova ação
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {erro ? (
            <div className="text-red-600 text-sm">{erro}</div>
          ) : null}

          {loading ? (
            <div className="text-sm opacity-70">Carregando…</div>
          ) : filtradas.length === 0 ? (
            <div className="text-sm opacity-70">Nenhuma ação encontrada.</div>
          ) : (
            <div className="overflow-x-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="min-w-[160px]">Período</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead className="text-right">Qtd. Material</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead className="w-[140px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtradas.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.nomeCliente}</TableCell>
                      <TableCell>{a.nomeEmpresa}</TableCell>
                      <TableCell>{a.tipoAcao}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(a.periodosDia || []).map((p) => (
                            <Badge key={p} variant="secondary">{p}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{a.dataInicio?.slice(0, 10)}</TableCell>
                      <TableCell>{a.dataFim?.slice(0, 10)}</TableCell>
                      <TableCell className="text-right">{a.quantidadeMaterial ?? '-'}</TableCell>
                      <TableCell>
                        {a.createdByName ? (
                          <span className="inline-flex items-center gap-1">
                            <Users className="size-4 opacity-60" /> {a.createdByName}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => abrirEdicao(a)}
                            disabled={!canEditOrDelete(a, user)}
                            title={canEditOrDelete(a, user) ? 'Editar' : 'Sem permissão'}
                          >
                            <Edit className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => excluir(a)}
                            disabled={!canEditOrDelete(a, user)}
                            title={canEditOrDelete(a, user) ? 'Excluir' : 'Sem permissão'}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Cadastro/Edição */}
      <Dialog open={modalAberto} onOpenChange={(o) => (o ? setModalAberto(true) : fecharModal())}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar ação' : 'Nova ação'}</DialogTitle>
            <DialogDescription>Preencha os dados abaixo e salve.</DialogDescription>
          </DialogHeader>

          <form onSubmit={salvar} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nomeCliente">Nome do cliente</Label>
                <Input
                  id="nomeCliente"
                  name="nomeCliente"
                  value={form.nomeCliente}
                  onChange={onChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="nomeEmpresa">Nome da empresa</Label>
                <Input
                  id="nomeEmpresa"
                  name="nomeEmpresa"
                  value={form.nomeEmpresa}
                  onChange={onChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="tipoAcao">Tipo de ação</Label>
                <Input
                  id="tipoAcao"
                  name="tipoAcao"
                  value={form.tipoAcao}
                  onChange={onChange}
                  placeholder="Ex.: Blitz, PDV, Panfletagem…"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="dataInicio">Data de início</Label>
                  <Input
                    id="dataInicio"
                    name="dataInicio"
                    type="date"
                    value={form.dataInicio}
                    onChange={onChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dataFim">Data de término</Label>
                  <Input
                    id="dataFim"
                    name="dataFim"
                    type="date"
                    value={form.dataFim}
                    onChange={onChange}
                    required
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <Label>Períodos do dia</Label>
                <div className="flex flex-wrap gap-3 mt-2">
                  {PERIODOS.map((p) => (
                    <label key={p} className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="periodosDia"
                        value={p}
                        checked={form.periodosDia.includes(p)}
                        onChange={onChange}
                      />
                      <span>{p}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="quantidadeMaterial">Quantidade de material</Label>
                <Input
                  id="quantidadeMaterial"
                  name="quantidadeMaterial"
                  type="number"
                  min={0}
                  value={form.quantidadeMaterial}
                  onChange={onChange}
                  placeholder="Ex.: 200"
                />
              </div>
              <div>
                <Label htmlFor="fotoMaterial">Foto do material</Label>
                <Input id="fotoMaterial" name="fotoMaterial" type="file" accept="image/*" onChange={onChange} />
                {previewFoto ? (
                  <img
                    src={previewFoto}
                    alt="Pré-visualização"
                    className="mt-2 h-24 w-24 object-cover rounded-md border"
                  />
                ) : null}
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  name="observacoes"
                  value={form.observacoes}
                  onChange={onChange}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={fecharModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={enviando}>
                {enviando ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
