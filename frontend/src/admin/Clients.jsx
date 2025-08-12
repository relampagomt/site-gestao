// frontend/src/admin/Clients.jsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Edit, Trash2, Phone, Mail, Building, User, AlertCircle } from 'lucide-react';
import api from '@/services/api';

const Clients = () => {
  const { user } = useAuth();
  const isAdmin = String(user?.role || user?.claims?.role || '').toLowerCase() === 'admin';

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [segmentFilter, setSegmentFilter] = useState('todos');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    segment: '',
    status: 'ativo',
    others: ''
  });

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/clients');
      setClients(Array.isArray(data) ? data : (data?.items || data?.results || data?.clients || []));
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await api.put(`/clients/${editingClient.id}`, formData);
      } else {
        await api.post('/clients', formData);
      }
      await fetchClients();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      alert(error?.response?.data?.message || 'Erro ao salvar cliente');
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      company: client.company || '',
      segment: client.segment || '',
      status: client.status || 'ativo',
      others: client.others || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (clientId) => {
    if (!isAdmin) {
      alert('Apenas administradores podem excluir clientes');
      return;
    }
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        await api.delete(`/clients/${clientId}`);
        await fetchClients();
      } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        alert(error?.response?.data?.message || 'Erro ao excluir cliente');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      segment: '',
      status: 'ativo',
      others: ''
    });
    setEditingClient(null);
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch =
      (client.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.phone || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'todos' || client.status === statusFilter;
    const matchesSegment = segmentFilter === 'todos' || client.segment === segmentFilter;

    return matchesSearch && matchesStatus && matchesSegment;
  });

  const getStatusBadge = (status) => {
    const statusMap = {
      ativo: { variant: 'default', label: 'Ativo' },
      inativo: { variant: 'secondary', label: 'Inativo' },
      pendente: { variant: 'outline', label: 'Pendente' }
    };
    const s = statusMap[status] || statusMap.ativo;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <div className="admin-page-container admin-space-y-6">
      <div className="admin-page-header">
        <h2 className="admin-page-title">Clientes</h2>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={resetForm}
              className="admin-btn-primary"
            >
              <Plus className="h-5 w-5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
              <span className="whitespace-nowrap">Novo Cliente</span>
            </Button>
          </DialogTrigger>

            {/* Modal com container rolável — mantém padrão do projeto */}
            <DialogContent className="w-full max-w-2xl max-h-[85vh] overflow-y-auto p-0 mx-4">
              <div className="px-6 pt-6 pb-3 border-b">
                <DialogHeader>
                  <DialogTitle className="text-base">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
                  <DialogDescription className="text-xs">
                    {editingClient ? 'Edite as informações do cliente' : 'Adicione um novo cliente ao sistema'}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="px-6 py-5">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nome *</Label>
                      <Input id="name" value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                    </div>
                    <div>
                      <Label htmlFor="company">Empresa *</Label>
                      <Input id="company" value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })} required />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Telefone *</Label>
                      <Input id="phone" value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" type="email" value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="segment">Segmento</Label>
                      <Select value={formData.segment}
                        onValueChange={(v) => setFormData({ ...formData, segment: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione o segmento" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Tecnologia">Tecnologia</SelectItem>
                          <SelectItem value="Saúde">Saúde</SelectItem>
                          <SelectItem value="Educação">Educação</SelectItem>
                          <SelectItem value="Varejo">Varejo</SelectItem>
                          <SelectItem value="Serviços">Serviços</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select value={formData.status}
                        onValueChange={(v) => setFormData({ ...formData, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="inativo">Inativo</SelectItem>
                          <SelectItem value="pendente">Pendente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="others">Observações</Label>
                    <Textarea id="others" value={formData.others}
                      onChange={(e) => setFormData({ ...formData, others: e.target.value })}
                      placeholder="Informações adicionais sobre o cliente..." />
                  </div>

                  <div className="pt-2 border-t flex flex-col sm:flex-row justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit">{editingClient ? 'Atualizar' : 'Criar'}</Button>
                  </div>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="admin-card">
          <CardContent className="admin-card-content">
            <div className="admin-space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input placeholder="Buscar clientes por nome, empresa, e‑mail ou telefone..."
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>

              <div className="admin-filters">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por segmento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os segmentos</SelectItem>
                    <SelectItem value="Tecnologia">Tecnologia</SelectItem>
                    <SelectItem value="Saúde">Saúde</SelectItem>
                    <SelectItem value="Educação">Educação</SelectItem>
                    <SelectItem value="Varejo">Varejo</SelectItem>
                    <SelectItem value="Serviços">Serviços</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" className="admin-btn-secondary" onClick={() => { setSearchTerm(''); setStatusFilter('todos'); setSegmentFilter('todos'); }}>
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader className="admin-card-header">
            <CardTitle className="admin-card-title">Lista de Clientes</CardTitle>
            <CardDescription className="admin-card-description">{filteredClients.length} cliente(s) encontrado(s)</CardDescription>
          </CardHeader>
          <CardContent className="admin-card-content">
            {loading ? (
              <div className="admin-loading">
                <div className="admin-loading-spinner"></div>
                <p className="mt-2 text-gray-600">Carregando clientes...</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="admin-empty-state">
                <AlertCircle className="admin-empty-icon" />
                <h3 className="admin-empty-title">Nenhum cliente encontrado</h3>
                <p className="admin-empty-description">{searchTerm ? 'Tente ajustar sua busca' : 'Comece adicionando um novo cliente'}</p>
              </div>
            ) : (
              <div className="w-full">
                {/* Versão mobile: Cards empilhados */}
                <div className="block lg:hidden space-y-4 p-4">
                  {filteredClients.map((client) => (
                    <Card key={client.id} className="w-full">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className="font-medium truncate">{client.name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Building className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className="truncate">{client.company || '—'}</span>
                              </div>
                            </div>
                            <div className="flex-shrink-0 ml-2">
                              {getStatusBadge(client.status)}
                            </div>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{client.phone || '—'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{client.email || '—'}</span>
                            </div>
                            {client.segment && (
                              <div className="text-xs text-gray-500">
                                Segmento: <span className="capitalize">{client.segment}</span>
                              </div>
                            )}
                            {client.others && (
                              <div className="text-xs text-gray-500">
                                <span className="block truncate" title={client.others}>
                                  {client.others}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 pt-2 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(client)}
                              className="admin-btn-secondary flex-1 gap-1 min-h-[36px] touch-manipulation"
                            >
                              <Edit className="w-4 h-4" /> Editar
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(client.id)}
                                className="admin-btn-secondary flex-1 gap-1 min-h-[36px] touch-manipulation text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" /> Excluir
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Versão desktop: Tabela com scroll horizontal */}
                <div className="hidden lg:block">
                  <div className="overflow-x-auto">
                    <Table className="min-w-[980px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[180px]">Cliente</TableHead>
                          <TableHead className="min-w-[160px]">Empresa</TableHead>
                          <TableHead className="min-w-[160px]">Telefone</TableHead>
                          <TableHead className="min-w-[220px]">E‑mail</TableHead>
                          <TableHead className="min-w-[140px]">Segmento</TableHead>
                          <TableHead className="min-w-[120px]">Status</TableHead>
                          <TableHead className="min-w-[240px]">Observações</TableHead>
                          <TableHead className="min-w-[160px] text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredClients.map((client) => (
                          <TableRow key={client.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className="font-medium truncate">{client.name}</span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className="truncate">{client.company || '—'}</span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                <span className="truncate">{client.phone || '—'}</span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                <span className="truncate">{client.email || '—'}</span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <span className="capitalize whitespace-nowrap">{client.segment || '—'}</span>
                            </TableCell>

                            <TableCell>{getStatusBadge(client.status)}</TableCell>

                            <TableCell>
                              <span className="block truncate max-w-[28ch]" title={client.others || ''}>
                                {client.others || '—'}
                              </span>
                            </TableCell>

                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(client)}
                                  className="gap-1 min-h-[36px] touch-manipulation"
                                >
                                  <Edit className="w-4 h-4" /> Editar
                                </Button>
                                {isAdmin && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDelete(client.id)}
                                    className="gap-1 min-h-[36px] touch-manipulation"
                                  >
                                    <Trash2 className="w-4 h-4" /> Excluir
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
};

export default Clients;
