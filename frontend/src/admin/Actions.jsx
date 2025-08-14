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

import { formatDateBR } from '@/utils/dates.js'; // datas em dd/MM/aaaa

/* ===================== OPÇÕES ===================== */
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

/* ===================== Mock DEV ===================== */
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
    material_photo_url: 'https://via.placeholder.com/800x500.png?text=Material',
    notes: 'Campanha bairro central.',
    active: true,
  },
];

/* ===================== Helpers ===================== */
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
  material_photo_file: null,
  material_photo_url: '',
};

const periodOptions = ['manhã', 'tarde', 'noite'];

const ensureArrayTypes = (item) => {
  if (Array.isArray(item?.types)) return item.types;
  if (typeof item?.type === 'string' && item.type.trim()) {
    return item.type.split(',').map((s) => s.trim()).filter(Boolean);
    }
  return [];
};

// Upload genérico (usaremos apenas para 'material')
async function uploadFile(file, fieldName = 'file') {
  if (!file) return '';
  const fd = new FormData();
  fd.append(fieldName, file);
  const resp = await api.post('/upload', fd);
  return resp?.data?.url || resp?.data?.secure_url || resp?.data?.location || '';
}

/* ===================== Componente ===================== */
const Actions = () => {
  const { user } = useAuth();
  const isAdmin = String(user?.role || user?.claims?.role || '').toLowerCase() === 'admin';

  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState([]);
  const [query, setQuery] = useState('');

  // create/edit dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...initialForm });
  const [typesPopoverOpen, setTypesPopoverOpen] = useState(false);

  // preview somente do material
  const [previewItem, setPreviewItem] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  /* -------- Load -------- */
  const loadActions = async () => {
    try {
      setLoading(true);
      if (import.meta.env.DEV) {
        await new Promise((r) => setTimeout(r, 250));
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

  useEffect(() => { loadActions(); }, []);

  /* -------- Filter -------- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a) => {
      const typesBlob = ensureArrayTypes(a).join(' ').toLowerCase();
      const blob = `${a.client_name} ${a.company_name} ${a.notes} ${typesBlob}`.toLowerCase();
      return blob.includes(q);
    });
  }, [actions, query]);

  /* -------- Form helpers -------- */
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
      const next = exists ? prev.day_periods.filter((p) => p !== period) : [...prev.day_periods, period];
      return { ...prev, day_periods: next };
    });
  };

  /* -------- Create -------- */
  const handleCreate = async (e) => {
    e.preventDefault();
    if (form.types.length === 0) return alert('Selecione ao menos um tipo de ação.');
    if (form.start_date && form.end_date && form.start_date > form.end_date) {
      return alert('Data de término não pode ser anterior à data de início.');
    }

    try {
      let materialUrl = '';

      if (import.meta.env.DEV) {
        materialUrl = form.material_photo_file ? URL.createObjectURL(form.material_photo_file) : '';
      } else {
        if (form.material_photo_file) materialUrl = await uploadFile(form.material_photo_file, 'material');
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
        notes: form.notes || '',
        active: !!form.active,
      };

      if (import.meta.env.DEV) {
        setActions((prev) => [...prev, { id: `dev-${Date.now()}`, ...payload }]);
      } else {
        await api.post('/actions', payload);
        await loadActions();
      }

      setIsCreateOpen(false);
      resetForm();
    } catch (err) {
      console.error('Erro ao criar ação:', err);
      alert('Erro ao criar ação: ' + (err?.response?.data?.message || err.message));
    }
  };

  /* -------- Edit -------- */
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      client_name: item.client_name || '',
      company_name: item.company_name || '',
      types: ensureArrayTypes(item),
      start_date: (item.start_date || '').slice(0, 10), // compatível com input date
      end_date: (item.end_date || '').slice(0, 10),
      day_periods: Array.isArray(item.day_periods) ? item.day_periods : [],
      material_qty: item.material_qty ?? '',
      material_photo_file: null,
      material_photo_url: item.material_photo_url || '',
      notes: item.notes || '',
      active: typeof item.active === 'boolean' ? item.active : true,
    });
    setIsEditOpen(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editing) return;
    if (form.types.length === 0) return alert('Selecione ao menos um tipo de ação.');
    if (form.start_date && form.end_date && form.start_date > form.end_date) {
      return alert('Data de término não pode ser anterior à data de início.');
    }

    try {
      let materialUrl = form.material_photo_url || '';

      if (import.meta.env.DEV) {
        if (form.material_photo_file) materialUrl = URL.createObjectURL(form.material_photo_file);
      } else {
        if (form.material_photo_file) materialUrl = await uploadFile(form.material_photo_file, 'material');
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
        notes: form.notes || '',
        active: !!form.active,
      };

      if (import.meta.env.DEV) {
        setActions((prev) => prev.map((a) => (a.id === editing.id ? { ...a, ...payload } : a)));
      } else {
        await api.put(`/actions/${editing.id}`, payload);
        await loadActions();
      }

      setIsEditOpen(false);
      setEditing(null);
      resetForm();
    } catch (err) {
      console.error('Erro ao atualizar ação:', err);
      alert('Erro ao atualizar ação: ' + (err?.response?.data?.message || err.message));
    }
  };

  /* -------- Delete -------- */
  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta ação?')) return;
    try {
      if (import.meta.env.DEV) {
        setActions((prev) => prev.filter((a) => a.id !== id));
      } else {
        await api.delete(`/actions/${id}`);
        await loadActions();
      }
    } catch (err) {
      console.error('Erro ao excluir ação:', err);
      alert('Erro ao excluir ação: ' + (err?.response?.data?.message || err.message));
    }
  };

  /* -------- UI helpers -------- */
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
                      <Checkbox checked={checked} onCheckedChange={() => toggleType(opt)} />
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
    const [name, setName] = useState('');
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
            setName(file ? file.name : '');
            onFile(file);
          }}
        />
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">{hint}</p>
          {name && <span className="text-[11px] text-muted-foreground italic truncate max-w-[50%]">{name}</span>}
        </div>
        {existingUrl ? (
          <button
            type="button"
            onClick={() => { setPreviewItem({ material_photo_url: existingUrl }); setIsPreviewOpen(true); }}
            className="inline-flex items-center gap-2 text-xs underline text-blue-600"
          >
            <ImageIcon className="size-4" /> Ver imagem atual
          </button>
        ) : null}
      </div>
    );
  };

  /* ===================== RENDER ===================== */
  return (
    <div className="admin-page-container admin-space-y-6">
      <Card className="admin-card">
        <CardHeader className="admin-card-header admin-page-header">
          <div>
            <CardTitle className="admin-page-title">Ações</CardTitle>
            <CardDescription className="admin-card-description">Cadastre e gerencie ações promocionais e de distribuição.</CardDescription>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 opacity-60" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por cliente, empresa, tipo ou observação"
                className="pl-9 w-full sm:w-[260px]"
              />
            </div>

            {/* Modal CRIAR */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="admin-btn-primary">
                  <Plus className="h-5 w-5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                  <span className="whitespace-nowrap">Nova Ação</span>
                </Button>
              </DialogTrigger>

              <DialogContent className="w-full max-w-lg max-h-[85vh] overflow-y-auto p-0">
                <div className="px-5 pt-5 pb-3 border-b">
                  <DialogHeader>
                    <DialogTitle className="text-base">Criar ação</DialogTitle>
                    <DialogDescription className="text-xs">Preencha os campos para criar uma nova ação.</DialogDescription>
                  </DialogHeader>
                </div>

                <div className="px-5 py-4">
                  <form className="space-y-4" onSubmit={handleCreate}>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="client_name">Nome do cliente</Label>
                        <Input id="client_name" value={form.client_name} onChange={(e) => onChange('client_name', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="company_name">Nome da empresa</Label>
                        <Input id="company_name" value={form.company_name} onChange={(e) => onChange('company_name', e.target.value)} />
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

                      <div className="space-y-1.5">
                        <Label htmlFor="start_date" className="flex items-center gap-2"><CalendarIcon className="size-4" /> Início</Label>
                        <Input id="start_date" type="date" value={form.start_date} onChange={(e) => onChange('start_date', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="end_date" className="flex items-center gap-2"><CalendarIcon className="size-4" /> Término</Label>
                        <Input id="end_date" type="date" value={form.end_date} onChange={(e) => onChange('end_date', e.target.value)} />
                      </div>

                      <div className="space-y-1.5 md:col-span-2">
                        <Label>Períodos do dia</Label>
                        <div className="flex flex-wrap gap-4">
                          {periodOptions.map((p) => (
                            <label key={p} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox checked={form.day_periods.includes(p)} onCheckedChange={() => togglePeriod(p)} />
                              <span className="text-sm">{p}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="material_qty">Quantidade de material</Label>
                        <Input id="material_qty" type="number" min={0} value={form.material_qty} onChange={(e) => onChange('material_qty', e.target.value)} />
                      </div>

                      {/* Upload ÚNICO no CREATE: apenas MATERIAL */}
                      <FileInput
                        id="material_photo_file"
                        label="Amostra do material (imagem)"
                        onFile={(f) => onChange('material_photo_file', f)}
                        hint="Envie uma imagem (jpg, png...)."
                        existingUrl={null}
                      />

                      <div className="space-y-1.5 md:col-span-2">
                        <Label htmlFor="notes">Observações</Label>
                        <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => onChange('notes', e.target.value)} />
                      </div>

                      <div className="flex items-center gap-2 md:col-span-2">
                        <Checkbox id="active" checked={!!form.active} onCheckedChange={(v) => onChange('active', !!v)} />
                        <Label htmlFor="active">Ativo</Label>
                      </div>
                    </div>

                    <div className="pt-2 mt-4 border-t flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                      <Button type="submit">Salvar</Button>
                    </div>
                  </form>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        {/* Tabela */}
        <CardContent>
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">Cliente</TableHead>
                    <TableHead className="text-center">Empresa</TableHead>
                    <TableHead className="text-center">Tipos</TableHead>
                    <TableHead className="text-center">Validade</TableHead>
                    <TableHead className="text-center">Material</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Nenhuma ação encontrada.</TableCell></TableRow>
                  ) : (
                    filtered.map((a) => {
                      const types = ensureArrayTypes(a);
                      const range = (a.start_date || a.end_date)
                        ? `${formatDateBR(a.start_date)} — ${formatDateBR(a.end_date)}`
                        : '—';
                      const hasMaterialImage = !!a.material_photo_url;
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
                            {hasMaterialImage ? (
                              <button
                                type="button"
                                onClick={() => { setPreviewItem(a); setIsPreviewOpen(true); }}
                                className="inline-block"
                                title="Ver amostra do material"
                              >
                                <div className="w-10 h-10 rounded-md overflow-hidden border">
                                  <img
                                    src={a.material_photo_url}
                                    alt="thumb material"
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                </div>
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>

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
                            <div className="flex justify-end gap-2 flex-wrap">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => openEdit(a)}
                                className="gap-1 min-h-[36px] touch-manipulation"
                              >
                                <Edit className="size-4" /> Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(a.id)}
                                className="gap-1 min-h-[36px] touch-manipulation"
                              >
                                <Trash2 className="size-4" /> Excluir
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
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Total: <strong>{filtered.length}</strong> ação(ões)
          </p>
        </CardContent>
      </Card>

      {/* Modal EDITAR */}
      <Dialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); if (!v) { setEditing(null); resetForm(); } }}>
        <DialogContent className="w-full max-w-lg max-h-[85vh] overflow-y-auto p-0">
          <div className="px-5 pt-5 pb-3 border-b">
            <DialogHeader>
              <DialogTitle className="text-base">Editar ação</DialogTitle>
              <DialogDescription className="text-xs">Atualize as informações e salve.</DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-5 py-4">
            <form className="space-y-4" onSubmit={handleEdit}>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="e_client_name">Nome do cliente</Label>
                  <Input id="e_client_name" value={form.client_name} onChange={(e) => onChange('client_name', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e_company_name">Nome da empresa</Label>
                  <Input id="e_company_name" value={form.company_name} onChange={(e) => onChange('company_name', e.target.value)} />
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

                <div className="space-y-1.5">
                  <Label htmlFor="e_start_date" className="flex items-center gap-2"><CalendarIcon className="size-4" /> Início</Label>
                  <Input id="e_start_date" type="date" value={form.start_date} onChange={(e) => onChange('start_date', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e_end_date" className="flex items-center gap-2"><CalendarIcon className="size-4" /> Término</Label>
                  <Input id="e_end_date" type="date" value={form.end_date} onChange={(e) => onChange('end_date', e.target.value)} />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Períodos do dia</Label>
                  <div className="flex flex-wrap gap-4">
                    {periodOptions.map((p) => (
                      <label key={p} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={form.day_periods.includes(p)} onCheckedChange={() => togglePeriod(p)} />
                        <span className="text-sm">{p}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="e_material_qty">Quantidade de material</Label>
                  <Input id="e_material_qty" type="number" min={0} value={form.material_qty} onChange={(e) => onChange('material_qty', e.target.value)} />
                </div>

                {/* Apenas MATERIAL no EDITAR */}
                <FileInput
                  id="e_material_photo_file"
                  label="Amostra do material (imagem)"
                  onFile={(f) => onChange('material_photo_file', f)}
                  hint="Envie uma imagem (jpg, png...)."
                  existingUrl={form.material_photo_url}
                />

                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="e_notes">Observações</Label>
                  <Textarea id="e_notes" rows={3} value={form.notes} onChange={(e) => onChange('notes', e.target.value)} />
                </div>

                <div className="flex items-center gap-2 md:col-span-2">
                  <Checkbox id="e_active" checked={!!form.active} onCheckedChange={(v) => onChange('active', !!v)} />
                  <Label htmlFor="e_active">Ativo</Label>
                </div>
              </div>

              <div className="pt-2 mt-4 border-t flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setIsEditOpen(false); setEditing(null); resetForm(); }}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview de imagem (somente material) */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Amostra do material</DialogTitle>
            <DialogDescription>Visualização da imagem anexada.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            {previewItem?.material_photo_url ? (
              <div className="border rounded-md overflow-hidden">
                <img
                  src={previewItem.material_photo_url}
                  alt="Material"
                  className="w-full h-auto object-contain"
                />
                <div className="p-2 text-sm text-center">Amostra do material</div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Sem imagem para exibir.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Actions;
