// frontend/src/admin/Actions.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '@/services/api';
import { useAuth } from '../contexts/AuthContext';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.jsx';
import { Separator } from '@/components/ui/separator.jsx';

import {
  Plus,
  Edit,
  Trash2,
  Search,
  Calendar as CalendarIcon,
  Layers,
  X,
  CheckCircle,
  XCircle,
  Upload,
  ImageIcon
} from 'lucide-react';

// -------------------- OPÇÕES (como solicitado) --------------------
const ACTION_OPTIONS = [
  {
    group: 'Serviços de Panfletagem e Distribuição',
    items: [
      'PAP (Porta a Porta)',
      'Arrastão',
      'Semáforos',
      'Ponto fixo',
      'Distribuição em eventos',
      'Carro de Som',
      'Entrega personalizada',
    ],
  },
  {
    group: 'Serviços de Ações Promocionais e Interação',
    items: [
      'Distribuição de Amostras (Sampling)',
      'Degustação',
      'Demonstração',
      'Blitz promocional',
      'Captação de cadastros',
      'Distribuição de Brindes',
    ],
  },
  {
    group: 'Serviços Complementares',
    items: [
      'Criação e design',
      'Confecção e produção',
      'Impressão',
      'Logística (Coleta e Entrega)',
      'Planejamento estratégico',
      'Relatório e monitoramento',
    ],
  },
];

// -------------------- Mock DEV --------------------
const mockActions = [
  {
    id: 'a1',
    client_name: 'Cliente Exemplo',
    company_name: 'Empresa XYZ',
    types: ['PAP (Porta a Porta)', 'Semáforos'],
    type: 'PAP (Porta a Porta), Semáforos',
    start_date: '2025-08-01',
    end_date: '2025-08-10',
    day_periods: ['manhã', 'tarde'],
    material_qty: 1200,
    material_photo_url: '',
    protocol_photo_url: '',
    notes: 'Campanha bairro central.',
    active: true,
  },
];

// -------------------- Helpers --------------------
const initialForm = {
  client_name: '',
  company_name: '',
  types: [],
  start_date: '',
  end_date: '',
  day_periods: [],
  material_qty: '',
  notes: '',
  active: true,

  // uploads (arquivos):
  material_photo_file: null,
  protocol_photo_file: null,

  // existentes (urls já salvas no registro):
  material_photo_url: '',
  protocol_photo_url: '',
};

const periodOptions = ['manhã', 'tarde', 'noite'];

const ensureArrayTypes = (item) => {
  if (Array.isArray(item?.types)) return item.types;
  if (typeof item?.type === 'string' && item.type.trim()) {
    return item.type.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

// Upload helper (ajuste o endpoint/campo conforme seu backend)
async function uploadFile(file) {
  const fd = new FormData();
  fd.append('file', file);
  const resp = await api.post('/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  // esperado: { url: 'https://...' }
  return resp?.data?.url;
}

const Actions = () => {
  const { user } = useAuth();
  const isAdmin = String(user?.role || user?.claims?.role || '').toLowerCase() === 'admin';

  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState([]);

  const [query, setQuery] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({ ...initialForm });
  const [typesPopoverOpen, setTypesPopoverOpen] = useState(false);

  // -------------------- Load --------------------
  const loadActions = async () => {
    try {
      setLoading(true);

      if (import.meta.env.DEV) {
        await new Promise((r) => setTimeout(r, 350));
        setActions(mockActions);
        return;
      }

      const { data } = await api.get('/actions');
      const list = Array.isArray(data) ? data : (data?.actions || []);
      setActions(list);
    } catch (err) {
      console.error('Erro ao carregar ações:', err);
      if (import.meta.env.DEV) setActions(mockActions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------- Filter --------------------
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a) => {
      const typesBlob = ensureArrayTypes(a).join(' ').toLowerCase();
      const blob = `${a.client_name} ${a.company_name} ${a.notes} ${typesBlob}`.toLowerCase();
      return blob.includes(q);
    });
  }, [actions, query]);

  // -------------------- Form helpers --------------------
  const resetForm = () => setForm({ ...initialForm });
  const onChange = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const toggleType = (type) => {
    setForm((prev) => {
      const exists = prev.types.includes(type);
      const next = exists ? prev.types.filter((t) => t !== type) : [...prev.types, type];
      return { ...prev, types: next };
    });
  };

  const togglePeriod = (period) => {
    setForm((prev) => {
      const exists = prev.day_periods.includes(period);
      const next = exists
        ? prev.day_periods.filter((p) => p !== period)
        : [...prev.day_periods, period];
      return { ...prev, day_periods: next };
    });
  };

  // -------------------- Create --------------------
  const handleCreate = async (e) => {
    e.preventDefault();

    if (form.types.length === 0) {
      alert('Selecione ao menos um tipo de ação.');
      return;
    }
    if (form.start_date && form.end_date && form.start_date > form.end_date) {
      alert('Data de término não pode ser anterior à data de início.');
      return;
    }

    try {
      let materialUrl = '';
      let protocolUrl = '';

      if (import.meta.env.DEV) {
        // Em DEV, simulamos upload criando objectURL (não persiste)
        if (form.material_photo_file) {
          materialUrl = URL.createObjectURL(form.material_photo_file);
        }
        if (form.protocol_photo_file) {
          protocolUrl = URL.createObjectURL(form.protocol_photo_file);
        }

        const newItem = {
          id: `dev-${Date.now()}`,
          ...form,
          type: form.types.join(', '), // compat
          material_qty: Number(form.material_qty || 0),
          material_photo_url: materialUrl,
          protocol_photo_url: protocolUrl,
        };
        setActions((prev) => [...prev, newItem]);
        setIsCreateOpen(false);
        resetForm();
        alert('Ação criada (upload simulado em DEV).');
        return;
      }

      // Upload reais (se houver arquivos)
      if (form.material_photo_file) {
        materialUrl = await uploadFile(form.material_photo_file);
      }
      if (form.protocol_photo_file) {
        protocolUrl = await uploadFile(form.protocol_photo_file);
      }

      const payload = {
        client_name: form.client_name,
        company_name: form.company_name,
        types: form.types,
        type: form.types.join(', '), // compat
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        day_periods: form.day_periods,
        material_qty: Number(form.material_qty || 0),
        material_photo_url: materialUrl,
        protocol_photo_url: protocolUrl,
        notes: form.notes || '',
        active: !!form.active,
      };

      await api.post('/actions', payload);
      await loadActions();
      setIsCreateOpen(false);
      resetForm();
      alert('Ação criada com sucesso.');
    } catch (err) {
      console.error('Erro ao criar ação:', err);
      alert('Erro ao criar ação: ' + (err?.response?.data?.message || err.message));
    }
  };

  // -------------------- Edit --------------------
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      client_name: item.client_name || '',
      company_name: item.company_name || '',
      types: ensureArrayTypes(item),
      start_date: item.start_date || '',
      end_date: item.end_date || '',
      day_periods: Array.isArray(item.day_periods) ? item.day_periods : [],
      material_qty: item.material_qty ?? '',
      material_photo_file: null,
      protocol_photo_file: null,
      material_photo_url: item.material_photo_url || '',
      protocol_photo_url: item.protocol_photo_url || '',
      notes: item.notes || '',
      active: typeof item.active === 'boolean' ? item.active : true,
    });
    setIsEditOpen(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editing) return;

    if (form.types.length === 0) {
      alert('Selecione ao menos um tipo de ação.');
      return;
    }
    if (form.start_date && form.end_date && form.start_date > form.end_date) {
      alert('Data de término não pode ser anterior à data de início.');
      return;
    }

    try {
      let materialUrl = form.material_photo_url || '';
      let protocolUrl = form.protocol_photo_url || '';

      if (import.meta.env.DEV) {
        if (form.material_photo_file) {
          materialUrl = URL.createObjectURL(form.material_photo_file);
        }
        if (form.protocol_photo_file) {
          protocolUrl = URL.createObjectURL(form.protocol_photo_file);
        }

        setActions((prev) =>
          prev.map((a) =>
            a.id === editing.id
              ? {
                  ...a,
                  ...form,
                  type: form.types.join(', '),
                  material_qty: Number(form.material_qty || 0),
                  material_photo_url: materialUrl,
                  protocol_photo_url: protocolUrl,
                }
              : a
          )
        );
        setIsEditOpen(false);
        setEditing(null);
        resetForm();
        alert('Ação atualizada (upload simulado em DEV).');
        return;
      }

      // Se usuário escolheu novos arquivos, faz upload e substitui URL
      if (form.material_photo_file) {
        materialUrl = await uploadFile(form.material_photo_file);
      }
      if (form.protocol_photo_file) {
        protocolUrl = await uploadFile(form.protocol_photo_file);
      }

      const payload = {
        client_name: form.client_name,
        company_name: form.company_name,
        types: form.types,
        type: form.types.join(', '),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        day_periods: form.day_periods,
        material_qty: Number(form.material_qty || 0),
        material_photo_url: materialUrl,
        protocol_photo_url: protocolUrl,
        notes: form.notes || '',
        active: !!form.active,
      };

      await api.put(`/actions/${editing.id}`, payload);
      await loadActions();
      setIsEditOpen(false);
      setEditing(null);
      resetForm();
      alert('Ação atualizada com sucesso.');
    } catch (err) {
      console.error('Erro ao atualizar ação:', err);
      alert('Erro ao atualizar ação: ' + (err?.response?.data?.message || err.message));
    }
  };

  // -------------------- Delete --------------------
  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta ação?')) return;
    try {
      if (import.meta.env.DEV) {
        setActions((prev) => prev.filter((a) => a.id !== id));
        alert('Ação excluída (simulação DEV).');
        return;
      }

      await api.delete(`/actions/${id}`);
      await loadActions();
      alert('Ação excluída com sucesso.');
    } catch (err) {
      console.error('Erro ao excluir ação:', err);
      alert('Erro ao excluir ação: ' + (err?.response?.data?.message || err.message));
    }
  };

  // -------------------- UI helpers --------------------
  const TypeSelector = () => (
    <Popover open={typesPopoverOpen} onOpenChange={setTypesPopoverOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="inline-flex flex-wrap gap-2">
            {form.types.length === 0 ? 'Selecionar tipos' : (
              form.types.slice(0, 2).map((t) => (
                <Badge key={t} variant="secondary" className="mr-1">{t}</Badge>
              ))
            )}
            {form.types.length > 2 && (
              <Badge variant="outline">+{form.types.length - 2}</Badge>
            )}
          </span>
          <Layers className="size-4 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Tipos de ação</span>
          {form.types.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => onChange('types', [])}>
              Limpar
            </Button>
          )}
        </div>
        <div className="max-h-[320px] overflow-auto pr-1 space-y-4">
          {ACTION_OPTIONS.map((group) => (
            <div key={group.group}>
              <p className="text-xs font-semibold text-muted-foreground mb-2">{group.group}</p>
              <div className="space-y-2">
                {group.items.map((opt) => {
                  const checked = form.types.includes(opt);
                  return (
                    <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleType(opt)}
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>
              <Separator className="my-3" />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setTypesPopoverOpen(false)}>Fechar</Button>
          <Button onClick={() => setTypesPopoverOpen(false)}>Aplicar</Button>
        </div>
      </PopoverContent>
    </Popover>
  );

  const FileInput = ({ id, label, onFile, hint, existingUrl }) => {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="flex items-center gap-2">
          <Upload className="size-4" /> {label}
        </Label>
        <Input
          id={id}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            onFile(file);
          }}
        />
        <p className="text-[11px] text-muted-foreground">{hint}</p>
        {existingUrl ? (
          <a href={existingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs underline text-blue-600">
            <ImageIcon className="size-4" /> Ver imagem atual
          </a>
        ) : null}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Ações</CardTitle>
            <CardDescription>Cadastre e gerencie ações promocionais e de distribuição (com upload de amostras e protocolo).</CardDescription>
          </div>

          <div className="flex gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 opacity-60" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por cliente, empresa, tipo ou observação"
                className="pl-9 w-[260px]"
              />
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="size-4" />
                  Nova Ação
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Cadastrar ação</DialogTitle>
                  <DialogDescription>Preencha os campos abaixo para registrar a ação.</DialogDescription>
                </DialogHeader>

                <form className="space-y-5" onSubmit={handleCreate}>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="client_name">Nome do cliente</Label>
                      <Input
                        id="client_name"
                        value={form.client_name}
                        onChange={(e) => onChange('client_name', e.target.value)}
                        placeholder="Ex.: João da Silva"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="company_name">Nome da empresa</Label>
                      <Input
                        id="company_name"
                        value={form.company_name}
                        onChange={(e) => onChange('company_name', e.target.value)}
                        placeholder="Ex.: Supermercado Rio Branco"
                        required
                      />
                    </div>

                    {/* Multi-select de tipos */}
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Tipo(s) de ação</Label>
                      <TypeSelector />
                      {form.types.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {form.types.map((t) => (
                            <Badge key={t} variant="secondary" className="gap-1">
                              {t}
                              <button type="button" onClick={() => toggleType(t)} className="ml-1 opacity-70 hover:opacity-100">
                                <X className="size-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Validade */}
                    <div className="space-y-1.5">
                      <Label htmlFor="start_date" className="flex items-center gap-2">
                        <CalendarIcon className="size-4" /> Início
                      </Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={form.start_date}
                        onChange={(e) => onChange('start_date', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="end_date" className="flex items-center gap-2">
                        <CalendarIcon className="size-4" /> Término
                      </Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={form.end_date}
                        onChange={(e) => onChange('end_date', e.target.value)}
                      />
                    </div>

                    {/* Períodos do dia */}
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Períodos do dia</Label>
                      <div className="flex flex-wrap gap-4">
                        {periodOptions.map((p) => (
                          <label key={p} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={form.day_periods.includes(p)}
                              onCheckedChange={() => togglePeriod(p)}
                            />
                            <span className="text-sm">{p}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Quantidade de material */}
                    <div className="space-y-1.5">
                      <Label htmlFor="material_qty">Quantidade de material</Label>
                      <Input
                        id="material_qty"
                        type="number"
                        min={0}
                        value={form.material_qty}
                        onChange={(e) => onChange('material_qty', e.target.value)}
                        placeholder="Ex.: 1000"
                      />
                    </div>

                    {/* Uploads */}
                    <FileInput
                      id="material_photo_file"
                      label="Amostra do material (imagem)"
                      onFile={(f) => onChange('material_photo_file', f)}
                      hint="Envie uma foto do material (jpg, png...)."
                      existingUrl={null}
                    />

                    <FileInput
                      id="protocol_photo_file"
                      label="Amostra do protocolo (imagem)"
                      onFile={(f) => onChange('protocol_photo_file', f)}
                      hint="Envie uma foto do protocolo (jpg, png...)."
                      existingUrl={null}
                    />

                    {/* Observações */}
                    <div className="space-y-1.5 md:col-span-2">
                      <Label htmlFor="notes">Observações</Label>
                      <Textarea
                        id="notes"
                        value={form.notes}
                        onChange={(e) => onChange('notes', e.target.value)}
                        rows={3}
                        placeholder="Detalhes relevantes..."
                      />
                    </div>

                    <div className="flex items-center gap-2 md:col-span-2">
                      <Checkbox
                        id="active"
                        checked={!!form.active}
                        onCheckedChange={(v) => onChange('active', !!v)}
                      />
                      <Label htmlFor="active">Ativo</Label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">Salvar</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Tipos</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Nenhuma ação encontrada.</TableCell></TableRow>
                ) : (
                  filtered.map((a) => {
                    const types = ensureArrayTypes(a);
                    const range = (a.start_date || a.end_date)
                      ? `${a.start_date || '—'} → ${a.end_date || '—'}`
                      : '—';
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.client_name || '-'}</TableCell>
                        <TableCell>{a.company_name || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {types.slice(0, 3).map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
                            {types.length > 3 && <Badge variant="outline">+{types.length - 3}</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>{range}</TableCell>
                        <TableCell>
                          {a.active ? (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <CheckCircle className="size-4" /> Ativa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600">
                              <XCircle className="size-4" /> Inativa
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="secondary" onClick={() => openEdit(a)}>
                              <Edit className="size-4 mr-1" /> Editar
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(a.id)}>
                              <Trash2 className="size-4 mr-1" /> Excluir
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Total: <strong>{filtered.length}</strong> ação(ões)
          </p>
        </CardContent>
      </Card>

      {/* EDIT MODAL */}
      <Dialog open={isEditOpen} onOpenChange={(v) => {
        setIsEditOpen(v);
        if (!v) {
          setEditing(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar ação</DialogTitle>
            <DialogDescription>Atualize as informações e salve.</DialogDescription>
          </DialogHeader>

          <form className="space-y-5" onSubmit={handleEdit}>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="e_client_name">Nome do cliente</Label>
                <Input
                  id="e_client_name"
                  value={form.client_name}
                  onChange={(e) => onChange('client_name', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="e_company_name">Nome da empresa</Label>
                <Input
                  id="e_company_name"
                  value={form.company_name}
                  onChange={(e) => onChange('company_name', e.target.value)}
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label>Tipo(s) de ação</Label>
                <TypeSelector />
                {form.types.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.types.map((t) => (
                      <Badge key={t} variant="secondary" className="gap-1">
                        {t}
                        <button type="button" onClick={() => toggleType(t)} className="ml-1 opacity-70 hover:opacity-100">
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Validade */}
              <div className="space-y-1.5">
                <Label htmlFor="e_start_date" className="flex items-center gap-2">
                  <CalendarIcon className="size-4" /> Início
                </Label>
                <Input
                  id="e_start_date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => onChange('start_date', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e_end_date" className="flex items-center gap-2">
                  <CalendarIcon className="size-4" /> Término
                </Label>
                <Input
                  id="e_end_date"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => onChange('end_date', e.target.value)}
                />
              </div>

              {/* Períodos do dia */}
              <div className="space-y-1.5 md:col-span-2">
                <Label>Períodos do dia</Label>
                <div className="flex flex-wrap gap-4">
                  {periodOptions.map((p) => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={form.day_periods.includes(p)}
                        onCheckedChange={() => togglePeriod(p)}
                      />
                      <span className="text-sm">{p}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Quantidade de material */}
              <div className="space-y-1.5">
                <Label htmlFor="e_material_qty">Quantidade de material</Label>
                <Input
                  id="e_material_qty"
                  type="number"
                  min={0}
                  value={form.material_qty}
                  onChange={(e) => onChange('material_qty', e.target.value)}
                />
              </div>

              {/* Uploads com preview de existente */}
              <FileInput
                id="e_material_photo_file"
                label="Amostra do material (imagem)"
                onFile={(f) => onChange('material_photo_file', f)}
                hint="Selecione para substituir a imagem atual."
                existingUrl={form.material_photo_url}
              />

              <FileInput
                id="e_protocol_photo_file"
                label="Amostra do protocolo (imagem)"
                onFile={(f) => onChange('protocol_photo_file', f)}
                hint="Selecione para substituir a imagem atual."
                existingUrl={form.protocol_photo_url}
              />

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="e_notes">Observações</Label>
                <Textarea
                  id="e_notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => onChange('notes', e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 md:col-span-2">
                <Checkbox
                  id="e_active"
                  checked={!!form.active}
                  onCheckedChange={(v) => onChange('active', !!v)}
                />
                <Label htmlFor="e_active">Ativa</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => {
                setIsEditOpen(false);
                setEditing(null);
                resetForm();
              }}>
                Cancelar
              </Button>
              <Button type="submit">Salvar alterações</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Actions;
