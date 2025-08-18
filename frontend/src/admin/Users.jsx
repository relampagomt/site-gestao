import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '@/services/api';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';

import {
  Plus,
  Edit,
  Trash2,
  Search,
  Mail,
  User as UserIcon,
  Lock,
  CheckCircle,
  XCircle,
  UserCog,
} from 'lucide-react';

// Import the new ExportMenu component
import ExportMenu from '@/components/export/ExportMenu';

// --- Mock (somente em DEV) ---------------------------------------------------
const mockUsers = [
  { id: 'u1', name: 'Admin Master', username: 'admin', email: 'admin@empresa.com', role: 'admin', active: true, created_at: '2025-08-01T12:00:00Z' },
  { id: 'u2', name: 'Supervisor 01', username: 'sup01', email: 'sup01@empresa.com', role: 'supervisor', active: true, created_at: '2025-08-01T13:00:00Z' },
  { id: 'u3', name: 'Supervisor 02 (inativo)', username: 'sup02', email: 'sup02@empresa.com', role: 'supervisor', active: false, created_at: '2025-08-02T09:00:00Z' },
];

// --- Helpers ------------------------------------------------------------------
const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'supervisor', label: 'Supervisor' },
];

const initialForm = {
  name: '',
  username: '',
  email: '',
  password: '',
  role: 'supervisor',
  active: true,
};

const Users = () => {
  const { user } = useAuth();
  const canAdmin = user?.role === 'admin';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(initialForm);

  // Load users
  const loadUsers = async () => {
    setLoading(true);
    try {
      if (import.meta.env.DEV) {
        setUsers(mockUsers);
        setLoading(false);
        return;
      }

      const { data } = await api.get('/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filtered data
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const blob = `${u.name} ${u.username} ${u.email} ${u.role}`.toLowerCase();
      return blob.includes(q);
    });
  }, [users, query]);

  // Form handlers
  const resetForm = () => setForm({ ...initialForm });
  const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  // Create user
  const handleCreateUser = async (e) => {
    e.preventDefault();

    try {
      if (!form.username || !form.password) {
        alert('Preencha pelo menos username e senha.');
        return;
      }

      if (import.meta.env.DEV) {
        const newUser = {
          id: `dev-${Date.now()}`,
          name: form.name || '',
          username: form.username,
          email: form.email || '',
          role: form.role || 'supervisor',
          active: !!form.active,
          created_at: new Date().toISOString(),
        };
        setUsers((prev) => [...prev, newUser]);
        setIsCreateOpen(false);
        resetForm();
        alert('Usuário criado (simulação DEV).');
        return;
      }

      const payload = {
        username: form.username,
        password: form.password,
        role: form.role || 'supervisor',
        name: form.name || '',
      };

      const { data: created } = await api.post('/users', payload);

      const extra = {};
      if (typeof form.active === 'boolean') extra.active = form.active;
      if (form.email) extra.email = form.email;

      if (Object.keys(extra).length > 0 && created?.id) {
        await api.put(`/users/${created.id}`, extra);
      }

      await loadUsers();
      setIsCreateOpen(false);
      resetForm();
      alert('Usuário criado com sucesso.');
    } catch (err) {
      console.error('Erro ao criar usuário:', err);
      alert('Erro ao criar usuário: ' + (err?.response?.data?.message || err.message));
    }
  };

  // Edit user
  const openEdit = (u) => {
    setEditingUser(u);
    setForm({
      name: u.name || '',
      username: u.username || '',
      email: u.email || '',
      password: '',
      role: u.role || 'supervisor',
      active: typeof u.active === 'boolean' ? u.active : true,
    });
    setIsEditOpen(true);
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      if (import.meta.env.DEV) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === editingUser.id
              ? {
                  ...u,
                  name: form.name,
                  username: form.username,
                  email: form.email,
                  role: form.role,
                  active: form.active,
                }
              : u
          )
        );
        setIsEditOpen(false);
        setEditingUser(null);
        resetForm();
        alert('Usuário atualizado (simulação DEV).');
        return;
      }

      const payload = {
        username: form.username,
        name: form.name,
        role: form.role,
        active: form.active,
        email: form.email || undefined,
      };
      if (form.password) payload.password = form.password;

      await api.put(`/users/${editingUser.id}`, payload);

      await loadUsers();
      setIsEditOpen(false);
      setEditingUser(null);
      resetForm();
      alert('Usuário atualizado com sucesso.');
    } catch (err) {
      console.error('Erro ao atualizar usuário:', err);
      alert('Erro ao atualizar usuário: ' + (err?.response?.data?.message || err.message));
    }
  };

  // Delete user
  const handleDeleteUser = async (userId) => {
    if (!canAdmin) return;
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;

    try {
      if (import.meta.env.DEV) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        alert('Usuário excluído (simulação DEV).');
        return;
      }

      await api.delete(`/users/${userId}`);
      await loadUsers();
      alert('Usuário excluído com sucesso.');
    } catch (err) {
      console.error('Erro ao excluir usuário:', err);
      alert('Erro ao excluir usuário: ' + (err?.response?.data?.message || err.message));
    }
  };

  // Toggle active status
  const handleToggleActive = async (userId, currentActive) => {
    try {
      if (import.meta.env.DEV) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, active: !currentActive } : u))
        );
        alert(`Usuário ${!currentActive ? 'ativado' : 'desativado'} (simulação DEV).`);
        return;
      }

      await api.put(`/users/${userId}`, { active: !currentActive });
      await loadUsers();
    } catch (err) {
      console.error('Erro ao alterar status do usuário:', err);
      alert('Erro ao alterar status do usuário: ' + (err?.response?.data?.message || err.message));
    }
  };

  // Prepare data for export
  const exportData = useMemo(() => {
    return filtered.map((u) => ({
      nome: u.name || '',
      username: u.username || '',
      email: u.email || '',
      perfil: u.role === 'admin' ? 'Admin' : 'Supervisor',
      status: u.active ? 'Ativo' : 'Inativo',
      criado_em: u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '',
    }));
  }, [filtered]);

  const exportColumns = [
    { key: 'nome', header: 'Nome' },
    { key: 'username', header: 'Username' },
    { key: 'email', header: 'E-mail' },
    { key: 'perfil', header: 'Perfil' },
    { key: 'status', header: 'Status' },
    { key: 'criado_em', header: 'Criado em' },
  ];

  const pdfOptions = {
    title: 'Relatório de Usuários',
    orientation: 'l', // landscape for more columns
    filtersSummary: `Filtros aplicados: ${
      query ? `Busca: "${query}"` : 'Nenhum filtro aplicado'
    }`,
    columnStyles: {
      0: { cellWidth: 60 }, // Nome
      1: { cellWidth: 40 }, // Username
      2: { cellWidth: 70 }, // Email
      3: { cellWidth: 30 }, // Perfil
      4: { cellWidth: 30 }, // Status
      5: { cellWidth: 40 }, // Criado em
    }
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-3 md:px-6 py-4 md:py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">Usuários</h1>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg md:text-xl font-semibold flex items-center gap-2">
                <UserCog className="size-5" />
                Usuários
              </CardTitle>
              <CardDescription>Gerencie contas, perfis e permissões.</CardDescription>
            </div>
            <div className="ml-auto">
              <ExportMenu
                data={exportData}
                columns={exportColumns}
                filename="usuarios"
                pdfOptions={pdfOptions}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3">
            <div className="relative flex-1 w-full md:w-[320px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por nome, usuário, e-mail ou perfil"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {/* Create User Button - Only for Admin */}
            {canAdmin && (
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2" onClick={resetForm}>
                    <Plus className="size-4" />
                    <span className="whitespace-nowrap">Novo Usuário</span>
                  </Button>
                </DialogTrigger>

                <DialogContent className="w-full max-w-lg max-h-[85vh] overflow-y-auto p-0">
                  <div className="px-5 pt-5 pb-3 border-b">
                    <DialogHeader>
                      <DialogTitle className="text-base">Criar usuário</DialogTitle>
                      <DialogDescription className="text-xs">
                        Preencha os campos para criar um novo usuário.
                      </DialogDescription>
                    </DialogHeader>
                  </div>

                  <div className="px-5 py-4">
                    <form className="space-y-4" onSubmit={handleCreateUser}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="name" className="flex items-center gap-2">
                            <UserIcon className="size-4" /> Nome
                          </Label>
                          <Input
                            id="name"
                            value={form.name}
                            onChange={(e) => onChange('name', e.target.value)}
                            placeholder="Nome completo"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="username">Username</Label>
                          <Input
                            id="username"
                            value={form.username}
                            onChange={(e) => onChange('username', e.target.value)}
                            placeholder="login"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="email" className="flex items-center gap-2">
                            <Mail className="size-4" /> E-mail (opcional)
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            value={form.email}
                            onChange={(e) => onChange('email', e.target.value)}
                            placeholder="nome@empresa.com"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="password" className="flex items-center gap-2">
                            <Lock className="size-4" /> Senha
                          </Label>
                          <Input
                            id="password"
                            type="password"
                            value={form.password}
                            onChange={(e) => onChange('password', e.target.value)}
                            placeholder="••••••••"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label>Perfil</Label>
                          <Select value={form.role} onValueChange={(v) => onChange('role', v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um perfil" />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((r) => (
                                <SelectItem key={r.value} value={r.value}>
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center gap-2 pt-7">
                          <Checkbox
                            id="active"
                            checked={!!form.active}
                            onCheckedChange={(v) => onChange('active', !!v)}
                          />
                          <Label htmlFor="active">Ativo</Label>
                        </div>
                      </div>

                      <div className="pt-2 mt-4 border-t flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" size="sm">Criar</Button>
                      </div>
                    </form>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Nome</TableHead>
                  <TableHead className="text-center">Username</TableHead>
                  <TableHead className="text-center">E-mail</TableHead>
                  <TableHead className="text-center">Perfil</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Nenhum usuário encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="text-center font-medium">{u.name || '-'}</TableCell>
                      <TableCell className="text-center">{u.username}</TableCell>
                      <TableCell className="text-center">{u.email || '-'}</TableCell>
                      <TableCell className="text-center">
                        {u.role === 'admin' ? (
                          <Badge className="bg-primary/90">Admin</Badge>
                        ) : (
                          <Badge variant="secondary">Supervisor</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {u.active ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <CheckCircle className="size-4" /> Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600">
                            <XCircle className="size-4" /> Inativo
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => handleToggleActive(u.id, !!u.active)}
                            title={u.active ? 'Desativar' : 'Ativar'}
                          >
                            {u.active ? 'Desativar' : 'Ativar'}
                          </Button>

                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openEdit(u)}
                            className="gap-1"
                          >
                            <Edit className="size-4" />
                            Editar
                          </Button>

                          {canAdmin && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteUser(u.id)}
                              className="gap-1"
                            >
                              <Trash2 className="size-4" />
                              Excluir
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Total: <strong>{filtered.length}</strong> usuário(s)
          </p>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); if (!v) { setEditingUser(null); resetForm(); } }}>
        <DialogContent className="w-full max-w-lg max-h-[85vh] overflow-y-auto p-0">
          <div className="px-5 pt-5 pb-3 border-b">
            <DialogHeader>
              <DialogTitle className="text-base">Editar usuário</DialogTitle>
              <DialogDescription className="text-xs">
                Atualize as informações do usuário.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-5 py-4">
            <form className="space-y-4" onSubmit={handleEditUser}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="e_name" className="flex items-center gap-2">
                    <UserIcon className="size-4" /> Nome
                  </Label>
                  <Input
                    id="e_name"
                    value={form.name}
                    onChange={(e) => onChange('name', e.target.value)}
                    placeholder="Nome completo"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="e_username">Username</Label>
                  <Input
                    id="e_username"
                    value={form.username}
                    onChange={(e) => onChange('username', e.target.value)}
                    placeholder="login"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="e_email" className="flex items-center gap-2">
                    <Mail className="size-4" /> E-mail (opcional)
                  </Label>
                  <Input
                    id="e_email"
                    type="email"
                    value={form.email}
                    onChange={(e) => onChange('email', e.target.value)}
                    placeholder="nome@empresa.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="e_password" className="flex items-center gap-2">
                    <Lock className="size-4" /> Nova senha (opcional)
                  </Label>
                  <Input
                    id="e_password"
                    type="password"
                    value={form.password}
                    onChange={(e) => onChange('password', e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Perfil</Label>
                  <Select value={form.role} onValueChange={(v) => onChange('role', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 pt-7">
                  <Checkbox
                    id="e_active"
                    checked={!!form.active}
                    onCheckedChange={(v) => onChange('active', !!v)}
                  />
                  <Label htmlFor="e_active">Ativo</Label>
                </div>
              </div>

              <div className="pt-2 mt-4 border-t flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm">Atualizar</Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;

