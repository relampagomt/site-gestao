// frontend/src/admin/Users.jsx
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
  Shield,
  Mail,
  User as UserIcon,
  Lock,
  CheckCircle,
  XCircle,
} from 'lucide-react';

// --- Mock (somente em DEV) ---------------------------------------------------
const mockUsers = [
  {
    id: 'u1',
    name: 'Admin Master',
    username: 'admin',
    email: 'admin@empresa.com',
    role: 'admin',
    active: true,
    created_at: '2025-08-01T12:00:00Z',
  },
  {
    id: 'u2',
    name: 'Supervisor 01',
    username: 'sup01',
    email: 'sup01@empresa.com',
    role: 'supervisor',
    active: true,
    created_at: '2025-08-01T13:00:00Z',
  },
  {
    id: 'u3',
    name: 'Supervisor 02 (inativo)',
    username: 'sup02',
    email: 'sup02@empresa.com',
    role: 'supervisor',
    active: false,
    created_at: '2025-08-02T09:00:00Z',
  },
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

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return '-';
  }
}

// --- Componente ---------------------------------------------------------------
const Users = () => {
  const { user } = useAuth(); // { role, ... }
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);

  const [query, setQuery] = useState('');

  // Create
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({ ...initialForm });

  // Edit
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const canAdmin = useMemo(() => {
    const role = user?.role || user?.claims?.role;
    return String(role).toLowerCase() === 'admin';
  }, [user]);

  // -------------------------- LOAD -------------------------------------------
  const loadUsers = async () => {
    try {
      setLoading(true);

      if (import.meta.env.DEV) {
        await new Promise((r) => setTimeout(r, 400));
        setUsers(mockUsers);
        return;
      }

      const { data } = await api.get('/users');
      const list = Array.isArray(data) ? data : (data?.users || []);
      setUsers(list);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      if (import.meta.env.DEV) setUsers(mockUsers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------- FILTER -----------------------------------------
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const blob = `${u.name} ${u.username} ${u.email} ${u.role}`.toLowerCase();
      return blob.includes(q);
    });
  }, [users, query]);

  // -------------------------- FORM HANDLERS -----------------------------------
  const resetForm = () => setForm({ ...initialForm });
  const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  // -------------------------- CREATE ------------------------------------------
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

  // -------------------------- EDIT -------------------------------------------
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

  // -------------------------- DELETE -----------------------------------------
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

  // -------------------------- TOGGLE ACTIVE -----------------------------------
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

  // -------------------------- RENDER ------------------------------------------
  return (
    <div className="admin-page-container admin-space-y-6">
      <Card className="admin-card">
        <CardHeader className="admin-card-header admin-page-header">
          <div>
            <CardTitle className="admin-page-title flex items-center gap-2">
              <Shield className="size-5" />
              Usuários
            </CardTitle>
            <CardDescription className="admin-card-description">Gerencie contas, perfis e permissões.</CardDescription>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 opacity-60" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome, usuário, e-mail ou perfil"
                className="pl-9 w-full sm:w-[260px]"
              />
            </div>

            {canAdmin && (
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="admin-btn-primary"
                    onClick={resetForm}
                  >
                    <Plus className="h-5 w-5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                    <span className="whitespace-nowrap">Novo Usuário</span>
                  </Button>
                </DialogTrigger>

                {/* Casulo padrão */}
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

                      {/* Footer padrão */}
                      <div className="pt-2 mt-4 border-t flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit">Criar</Button>
                      </div>
                    </form>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            <div className="overflow-x-auto">
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
                              className="gap-1 min-h-[36px] touch-manipulation"
                              onClick={() => handleToggleActive(u.id, !!u.active)}
                              title={u.active ? 'Desativar' : 'Ativar'}
                            >
                              {u.active ? 'Desativar' : 'Ativar'}
                            </Button>

                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => openEdit(u)}
                              className="gap-1 min-h-[36px] touch-manipulation"
                            >
                              <Edit className="size-4" />
                              Editar
                            </Button>

                            {canAdmin && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteUser(u.id)}
                                className="gap-1 min-h-[36px] touch-manipulation"
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
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            Total: <strong>{filtered.length}</strong> usuário(s)
          </p>
        </CardContent>
      </Card>

      {/* EDIT MODAL */}
      <Dialog
        open={isEditOpen}
        onOpenChange={(v) => {
          setIsEditOpen(v);
          if (!v) {
            setEditingUser(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="w-full max-w-lg max-h-[85vh] overflow-y-auto p-0">
          <div className="px-5 pt-5 pb-3 border-b">
            <DialogHeader>
              <DialogTitle className="text-base">Editar usuário</DialogTitle>
              <DialogDescription className="text-xs">
                Atualize as informações necessárias e salve.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-5 py-4">
            <form className="space-y-4" onSubmit={handleEditUser}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="e-name" className="flex items-center gap-2">
                    <UserIcon className="size-4" /> Nome
                  </Label>
                  <Input
                    id="e-name"
                    value={form.name}
                    onChange={(e) => onChange('name', e.target.value)}
                    placeholder="Nome completo"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="e-username">Username</Label>
                  <Input
                    id="e-username"
                    value={form.username}
                    onChange={(e) => onChange('username', e.target.value)}
                    placeholder="login"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="e-email" className="flex items-center gap-2">
                    <Mail className="size-4" /> E-mail
                  </Label>
                  <Input
                    id="e-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => onChange('email', e.target.value)}
                    placeholder="nome@empresa.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="e-password" className="flex items-center gap-2">
                    <Lock className="size-4" /> Nova senha (opcional)
                  </Label>
                  <Input
                    id="e-password"
                    type="password"
                    value={form.password}
                    onChange={(e) => onChange('password', e.target.value)}
                    placeholder="Deixe em branco para não alterar"
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
                    id="e-active"
                    checked={!!form.active}
                    onCheckedChange={(v) => onChange('active', !!v)}
                  />
                  <Label htmlFor="e-active">Ativo</Label>
                </div>
              </div>

              {/* Footer padrão */}
              <div className="pt-2 mt-4 border-t flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditOpen(false);
                    setEditingUser(null);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">Salvar alterações</Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;
