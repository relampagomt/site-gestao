import React, { useState, useEffect } from 'react';
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
// ✅ ADICIONADO: Selects do shadcn/ui
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Target,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Package,
  User,
  Building
} from 'lucide-react';

const Actions = () => {
  const { isAdmin } = useAuth();
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [dateFilter, setDateFilter] = useState('todos');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAction, setEditingAction] = useState(null);
  const [formData, setFormData] = useState({
    client_name: '',
    company_name: '',
    action_type: '',
    start_date: '',
    end_date: '',
    periods_of_day: '',
    material_quantity: '',
    material_photo_url: '',
    observations: ''
  });

  const actionTypes = [
    'Panfletagem Residencial',
    'Sinaleiros/Pedestres',
    'Eventos Estratégicos',
    'Ações Promocionais',
    'Marketing de Guerrilha'
  ];

  useEffect(() => {
    fetchActions();
  }, []);

  const fetchActions = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/actions');
      setActions(data || []);
    } catch (error) {
      console.error('Erro ao buscar ações:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredActions = actions.filter(action => {
    const matchesSearch = action.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.action_type?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesActionType = actionTypeFilter === 'todos' || action.action_type === actionTypeFilter;
    const matchesStatus = statusFilter === 'todos' || action.status === statusFilter;

    let matchesDate = true;
    if (dateFilter !== 'todos' && action.start_date) {
      const actionDate = new Date(action.start_date);
      const today = new Date();

      switch (dateFilter) {
        case 'hoje':
          matchesDate = actionDate.toDateString() === today.toDateString();
          break;
        case 'semana':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = actionDate >= weekAgo;
          break;
        case 'mes':
          matchesDate = actionDate.getMonth() === today.getMonth() &&
                       actionDate.getFullYear() === today.getFullYear();
          break;
        case 'trimestre':
          const currentQuarter = Math.floor(today.getMonth() / 3);
          const actionQuarter = Math.floor(actionDate.getMonth() / 3);
          matchesDate = actionQuarter === currentQuarter &&
                       actionDate.getFullYear() === today.getFullYear();
          break;
      }
    }

    return matchesSearch && matchesActionType && matchesStatus && matchesDate;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAction) {
        await api.put(`/actions/${editingAction.id}`, formData);
      } else {
        await api.post('/actions', formData);
      }
      await fetchActions();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar ação:', error);
      alert(error?.response?.data?.message || 'Erro ao salvar ação');
    }
  };

  const handleEdit = (action) => {
    setEditingAction(action);
    setFormData({
      client_name: action.client_name || '',
      company_name: action.company_name || '',
      action_type: action.action_type || '',
      start_date: action.start_date || '',
      end_date: action.end_date || '',
      periods_of_day: action.periods_of_day || '',
      material_quantity: action.material_quantity || '',
      material_photo_url: action.material_photo_url || '',
      observations: action.observations || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (actionId) => {
    if (!isAdmin()) {
      alert('Apenas administradores podem excluir ações');
      return;
    }
    if (window.confirm('Tem certeza que deseja excluir esta ação?')) {
      try {
        await api.delete(`/actions/${actionId}`);
        await fetchActions();
      } catch (error) {
        console.error('Erro ao excluir ação:', error);
        alert(error?.response?.data?.message || 'Erro ao excluir ação');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      client_name: '',
      company_name: '',
      action_type: '',
      start_date: '',
      end_date: '',
      periods_of_day: '',
      material_quantity: '',
      material_photo_url: '',
      observations: ''
    });
    setEditingAction(null);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Planejada': { color: 'bg-blue-100 text-blue-800', icon: Clock },
      'Em Andamento': { color: 'bg-yellow-100 text-yellow-800', icon: TrendingUp },
      'Pausada': { color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
      'Concluída': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'Cancelada': { color: 'bg-red-100 text-red-800', icon: AlertCircle }
    };

    const config = statusConfig[status] || statusConfig['Planejada'];
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const getProgressBar = (progress) => (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="bg-red-600 h-2 rounded-full"
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <h2 className="text-2xl font-bold tracking-tight mb-4">Ações</h2>
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-red-700 hover:bg-red-800"
              onClick={resetForm}
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Nova Ação</span>
              <span className="sm:hidden">Nova</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingAction ? 'Editar Ação' : 'Nova Ação Promocional'}
              </DialogTitle>
              <DialogDescription>
                {editingAction
                  ? 'Edite as informações da ação abaixo.'
                  : 'Preencha as informações da nova ação promocional.'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client_name">Nome do Cliente</Label>
                  <Input
                    id="client_name"
                    value={formData.client_name}
                    onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="company_name">Nome da Empresa</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="action_type">Tipo de Ação</Label>
                <select
                  id="action_type"
                  value={formData.action_type}
                  onChange={(e) => setFormData({...formData, action_type: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Selecione o tipo</option>
                  {actionTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  value={formData.observations}
                  onChange={(e) => setFormData({...formData, observations: e.target.value})}
                  rows={3}
                  placeholder="Descrição da ação, objetivos, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Data de Início</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">Data de Término</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="periods_of_day">Períodos do Dia</Label>
                  <Input
                    id="periods_of_day"
                    value={formData.periods_of_day}
                    onChange={(e) => setFormData({...formData, periods_of_day: e.target.value})}
                    placeholder="Ex: Manhã, Tarde, Noite"
                  />
                </div>
                <div>
                  <Label htmlFor="material_quantity">Quantidade de Material</Label>
                  <Input
                    id="material_quantity"
                    type="number"
                    value={formData.material_quantity}
                    onChange={(e) => setFormData({...formData, material_quantity: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="material_photo_url">URL da Foto do Material</Label>
                <Input
                  id="material_photo_url"
                  type="url"
                  value={formData.material_photo_url}
                  onChange={(e) => setFormData({...formData, material_photo_url: e.target.value})}
                  placeholder="https://exemplo.com/foto-material.jpg"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="bg-red-700 hover:bg-red-800">
                  {editingAction ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Ações</p>
                <p className="text-2xl font-bold">{actions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ações Ativas</p>
                <p className="text-2xl font-bold">{actions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Materiais</p>
                <p className="text-2xl font-bold">
                  {actions.reduce((sum, a) => sum + (parseInt(a.material_quantity) || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Clientes Atendidos</p>
                <p className="text-2xl font-bold">
                  {new Set(actions.map(a => a.client_name)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca e Filtros */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar ações por cliente, empresa ou tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="Panfletagem">Panfletagem</SelectItem>
                  <SelectItem value="Degustação">Degustação</SelectItem>
                  <SelectItem value="Promoção">Promoção</SelectItem>
                  <SelectItem value="Evento">Evento</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="Planejada">Planejada</SelectItem>
                  <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                  <SelectItem value="Pausada">Pausada</SelectItem>
                  <SelectItem value="Concluída">Concluída</SelectItem>
                  <SelectItem value="Cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os períodos</SelectItem>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="semana">Esta semana</SelectItem>
                  <SelectItem value="mes">Este mês</SelectItem>
                  <SelectItem value="trimestre">Este trimestre</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={() => { setSearchTerm(''); setActionTypeFilter('todos'); setStatusFilter('todos'); setDateFilter('todos'); }}>
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Ações */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Ações Promocionais</CardTitle>
          <CardDescription>
            Gerencie todas as campanhas e ações promocionais
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Carregando ações...</p>
            </div>
          ) : filteredActions.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma ação encontrada</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Tente ajustar sua busca' : 'Comece criando uma nova ação promocional'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Cliente</TableHead>
                      <TableHead className="min-w-[150px]">Empresa</TableHead>
                      <TableHead className="min-w-[150px]">Tipo</TableHead>
                      <TableHead className="min-w-[120px]">Período</TableHead>
                      <TableHead className="min-w-[100px]">Quantidade</TableHead>
                      <TableHead className="min-w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredActions.map((action) => (
                      <TableRow key={action.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{action.client_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Building className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{action.company_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="whitespace-nowrap">{action.action_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {action.start_date && (
                              <div className="whitespace-nowrap">{new Date(action.start_date).toLocaleDateString('pt-BR')}</div>
                            )}
                            {action.end_date && (
                              <div className="text-gray-500 text-xs whitespace-nowrap">até {new Date(action.end_date).toLocaleDateString('pt-BR')}</div>
                            )}
                            {action.periods_of_day && (
                              <div className="text-gray-500 text-xs">{action.periods_of_day}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="whitespace-nowrap">{action.material_quantity || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(action)}
                              className="whitespace-nowrap"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {isAdmin() && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(action.id)}
                                className="text-red-600 hover:text-red-700 whitespace-nowrap"
                              >
                                <Trash2 className="w-4 h-4" />
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Actions;
