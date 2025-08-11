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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { toast } from 'sonner';
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
  Building,
  X,
  Image
} from 'lucide-react';

const Actions = () => {
  const { isAdmin } = useAuth();
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState([]);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [clientFilter, setClientFilter] = useState('todos');
  const [dateFilter, setDateFilter] = useState('todos');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAction, setEditingAction] = useState(null);
  const [formData, setFormData] = useState({
    clienteNome: '',
    empresaNome: '',
    tiposAcao: [],
    dataInicio: '',
    dataTermino: '',
    periodo: '',
    quantidadeMaterial: '',
    amostraMaterialUrl: '',
    observacoes: '',
    status: 'em aberto'
  });
  const [amostraFile, setAmostraFile] = useState(null);
  const [amostraPreview, setAmostraPreview] = useState('');

  const actionTypes = [
    'Panfletagem (semáforo)',
    'Panfletagem (porta de loja)',
    'Blitz sonora',
    'Sampling/Distribuição',
    'Degustação',
    'Demonstração de produto',
    'Mascote',
    'Cupom/QR',
    'Cadastro/Survey',
    'Ação em condomínio',
    'Ação em faculdade',
    'Ação em eventos/feiras',
    'Ativação com brinde',
    'Roadshow'
  ];

  const periods = [
    { value: 'manhã', label: 'Manhã' },
    { value: 'tarde', label: 'Tarde' },
    { value: 'noite', label: 'Noite' },
    { value: 'integral', label: 'Integral' }
  ];

  const statusOptions = [
    { value: 'em processo', label: 'Em Processo', color: 'bg-blue-100 text-blue-800' },
    { value: 'em aberto', label: 'Em Aberto', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'finalizado', label: 'Finalizado', color: 'bg-green-100 text-green-800' },
    { value: 'cancelado', label: 'Cancelado', color: 'bg-red-100 text-red-800' }
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
      toast.error('Erro ao carregar ações');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (file) => {
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.match(/^image\/(png|jpeg)$/)) {
      toast.error('Apenas arquivos PNG e JPG são permitidos');
      return;
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo deve ter no máximo 5MB');
      return;
    }

    setAmostraFile(file);
    setAmostraPreview(URL.createObjectURL(file));
  };

  const uploadFile = async (file) => {
    if (!file) return '';
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return data.url;
    } catch (error) {
      console.error('Erro no upload:', error);
      throw new Error('Falha no upload do arquivo');
    }
  };

  const handleActionTypeChange = (actionType, checked) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        tiposAcao: [...prev.tiposAcao, actionType]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        tiposAcao: prev.tiposAcao.filter(type => type !== actionType)
      }));
    }
  };

  const filteredActions = actions.filter(action => {
    const matchesSearch = action.clienteNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.empresaNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.tiposAcao?.some(tipo => tipo.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesActionType = actionTypeFilter.length === 0 || 
      actionTypeFilter.some(filter => action.tiposAcao?.includes(filter));
    
    const matchesStatus = statusFilter === 'todos' || action.status === statusFilter;
    const matchesClient = clientFilter === 'todos' || action.clienteNome === clientFilter;

    let matchesDate = true;
    if (dateFilter !== 'todos' && action.dataInicio) {
      const actionDate = new Date(action.dataInicio);
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

    return matchesSearch && matchesActionType && matchesStatus && matchesClient && matchesDate;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.tiposAcao.length === 0) {
      toast.error('Selecione pelo menos um tipo de ação');
      return;
    }

    try {
      setSaving(true);
      
      let amostraMaterialUrl = formData.amostraMaterialUrl;

      // Upload do arquivo se houver
      if (amostraFile) {
        amostraMaterialUrl = await uploadFile(amostraFile);
      }

      const payload = {
        clienteNome: formData.clienteNome.trim(),
        empresaNome: formData.empresaNome.trim(),
        tiposAcao: formData.tiposAcao,
        dataInicio: formData.dataInicio,
        dataTermino: formData.dataTermino,
        periodo: formData.periodo,
        quantidadeMaterial: parseInt(formData.quantidadeMaterial),
        amostraMaterialUrl,
        observacoes: formData.observacoes.trim(),
        status: formData.status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingAction) {
        await api.put(`/actions/${editingAction.id}`, payload);
        toast.success('Ação atualizada com sucesso!');
      } else {
        await api.post('/actions', payload);
        toast.success('Ação criada com sucesso!');
      }
      
      await fetchActions();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar ação:', error);
      toast.error(error.message || 'Erro ao salvar ação');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (action) => {
    setEditingAction(action);
    setFormData({
      clienteNome: action.clienteNome || '',
      empresaNome: action.empresaNome || '',
      tiposAcao: action.tiposAcao || [],
      dataInicio: action.dataInicio || '',
      dataTermino: action.dataTermino || '',
      periodo: action.periodo || '',
      quantidadeMaterial: action.quantidadeMaterial || '',
      amostraMaterialUrl: action.amostraMaterialUrl || '',
      observacoes: action.observacoes || '',
      status: action.status || 'em aberto'
    });
    setAmostraPreview(action.amostraMaterialUrl || '');
    setIsDialogOpen(true);
  };

  const handleDelete = async (actionId) => {
    if (!isAdmin()) {
      toast.error('Apenas administradores podem excluir ações');
      return;
    }
    if (window.confirm('Tem certeza que deseja excluir esta ação?')) {
      try {
        await api.delete(`/actions/${actionId}`);
        toast.success('Ação excluída com sucesso!');
        await fetchActions();
      } catch (error) {
        console.error('Erro ao excluir ação:', error);
        toast.error('Erro ao excluir ação');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      clienteNome: '',
      empresaNome: '',
      tiposAcao: [],
      dataInicio: '',
      dataTermino: '',
      periodo: '',
      quantidadeMaterial: '',
      amostraMaterialUrl: '',
      observacoes: '',
      status: 'em aberto'
    });
    setEditingAction(null);
    setAmostraFile(null);
    setAmostraPreview('');
  };

  const getStatusBadge = (status) => {
    const statusConfig = statusOptions.find(s => s.value === status) || statusOptions[1];
    return (
      <Badge className={statusConfig.color}>
        {statusConfig.label}
      </Badge>
    );
  };

  const getUniqueClients = () => {
    const uniqueClients = [...new Set(actions.map(a => a.clienteNome).filter(Boolean))];
    return uniqueClients.sort();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setActionTypeFilter([]);
    setStatusFilter('todos');
    setClientFilter('todos');
    setDateFilter('todos');
  };

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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                  <Label htmlFor="clienteNome">Nome do Cliente *</Label>
                  <Input
                    id="clienteNome"
                    value={formData.clienteNome}
                    onChange={(e) => setFormData({...formData, clienteNome: e.target.value})}
                    placeholder="Digite o nome do cliente"
                    list="clientes-actions-list"
                    required
                  />
                  <datalist id="clientes-actions-list">
                    {getUniqueClients().map((cliente, index) => (
                      <option key={index} value={cliente} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <Label htmlFor="empresaNome">Nome da Empresa *</Label>
                  <Input
                    id="empresaNome"
                    value={formData.empresaNome}
                    onChange={(e) => setFormData({...formData, empresaNome: e.target.value})}
                    required
                  />
                </div>
              </div>

              {/* Tipos de Ação - Multi-select */}
              <div>
                <Label>Tipos de Ação * (selecione um ou mais)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto border rounded p-3">
                  {actionTypes.map(type => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`action-${type}`}
                        checked={formData.tiposAcao.includes(type)}
                        onCheckedChange={(checked) => handleActionTypeChange(type, checked)}
                      />
                      <Label htmlFor={`action-${type}`} className="text-sm">
                        {type}
                      </Label>
                    </div>
                  ))}
                </div>
                {formData.tiposAcao.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.tiposAcao.map(type => (
                      <Badge key={type} variant="secondary" className="text-xs">
                        {type}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="ml-1 h-auto p-0"
                          onClick={() => handleActionTypeChange(type, false)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dataInicio">Data de Início *</Label>
                  <Input
                    id="dataInicio"
                    type="date"
                    value={formData.dataInicio}
                    onChange={(e) => setFormData({...formData, dataInicio: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dataTermino">Data de Término *</Label>
                  <Input
                    id="dataTermino"
                    type="date"
                    value={formData.dataTermino}
                    onChange={(e) => setFormData({...formData, dataTermino: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="periodo">Período do Dia *</Label>
                  <Select value={formData.periodo} onValueChange={(value) => setFormData({...formData, periodo: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      {periods.map(period => (
                        <SelectItem key={period.value} value={period.value}>
                          {period.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quantidadeMaterial">Quantidade de Material *</Label>
                  <Input
                    id="quantidadeMaterial"
                    type="number"
                    value={formData.quantidadeMaterial}
                    onChange={(e) => setFormData({...formData, quantidadeMaterial: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="status">Status *</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Upload Amostra do Material */}
              <div>
                <Label>Amostra do Material</Label>
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(e) => handleFileChange(e.target.files[0])}
                  />
                  {amostraPreview && (
                    <div className="relative inline-block">
                      <img 
                        src={amostraPreview} 
                        alt="Preview amostra" 
                        className="w-32 h-32 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="absolute -top-2 -right-2"
                        onClick={() => {
                          setAmostraFile(null);
                          setAmostraPreview('');
                          setFormData({ ...formData, amostraMaterialUrl: '' });
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  rows={3}
                  placeholder="Descrição da ação, objetivos, etc."
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
                <Button type="submit" className="bg-red-700 hover:bg-red-800" disabled={saving}>
                  {saving ? 'Salvando...' : (editingAction ? 'Salvar' : 'Criar')}
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
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Finalizadas</p>
                <p className="text-2xl font-bold">
                  {actions.filter(a => a.status === 'finalizado').length}
                </p>
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
                  {actions.reduce((sum, a) => sum + (parseInt(a.quantidadeMaterial) || 0), 0).toLocaleString()}
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
                  {new Set(actions.map(a => a.clienteNome)).size}
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

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  {statusOptions.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os clientes</SelectItem>
                  {getUniqueClients().map((cliente) => (
                    <SelectItem key={cliente} value={cliente}>
                      {cliente}
                    </SelectItem>
                  ))}
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

              <div className="col-span-2">
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  Limpar Todos os Filtros
                </Button>
              </div>
            </div>

            {/* Filtros de Tipos de Ação Ativos */}
            {actionTypeFilter.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600">Tipos filtrados:</span>
                {actionTypeFilter.map(type => (
                  <Badge key={type} variant="secondary" className="text-xs">
                    {type}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-1 h-auto p-0"
                      onClick={() => setActionTypeFilter(prev => prev.filter(t => t !== type))}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Ações */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Ações</CardTitle>
          <CardDescription>{filteredActions.length} ação(ões) encontrada(s)</CardDescription>
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
                {searchTerm || actionTypeFilter.length > 0 || statusFilter !== 'todos' || clientFilter !== 'todos' || dateFilter !== 'todos' 
                  ? 'Tente ajustar seus filtros' 
                  : 'Comece criando uma nova ação promocional'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Cliente</TableHead>
                      <TableHead className="min-w-[120px]">Empresa</TableHead>
                      <TableHead className="min-w-[200px]">Tipos de Ação</TableHead>
                      <TableHead className="min-w-[100px]">Período</TableHead>
                      <TableHead className="min-w-[100px]">Data Início</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="min-w-[80px]">Material</TableHead>
                      <TableHead className="min-w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredActions.map((action) => (
                      <TableRow key={action.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="font-medium truncate">{action.clienteNome}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Building className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{action.empresaNome}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {action.tiposAcao?.slice(0, 2).map((tipo, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tipo}
                              </Badge>
                            ))}
                            {action.tiposAcao?.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{action.tiposAcao.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {action.periodo}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="whitespace-nowrap">
                              {action.dataInicio ? new Date(action.dataInicio).toLocaleDateString('pt-BR') : 'N/A'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(action.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="whitespace-nowrap">{action.quantidadeMaterial}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(action)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            {isAdmin() && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleDelete(action.id)}
                                className="text-red-600 hover:text-red-700"
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

