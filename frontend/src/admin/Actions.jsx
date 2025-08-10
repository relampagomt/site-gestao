import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
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
  AlertCircle
} from 'lucide-react';

const Actions = () => {
  const [actions, setActions] = useState([
    {
      id: 1,
      title: 'Campanha Black Friday - Supermercado Central',
      client: 'Supermercado Central',
      type: 'Panfletagem Residencial',
      description: 'Distribuição de panfletos promocionais para a Black Friday em bairros residenciais',
      startDate: '2024-11-20',
      endDate: '2024-11-29',
      budget: 5000,
      status: 'Em Andamento',
      location: 'Centro, Cuiabá/MT',
      team: 'Equipe A',
      materials: 10000,
      progress: 65
    },
    {
      id: 2,
      title: 'Ação Promocional - Farmácia Popular',
      client: 'Farmácia Popular',
      type: 'Sinaleiros/Pedestres',
      description: 'Distribuição de materiais promocionais em pontos de grande circulação',
      startDate: '2024-11-15',
      endDate: '2024-11-25',
      budget: 3500,
      status: 'Planejada',
      location: 'Jardim Europa, Cuiabá/MT',
      team: 'Equipe B',
      materials: 5000,
      progress: 0
    },
    {
      id: 3,
      title: 'Evento Inauguração - Loja Fashion',
      client: 'Loja de Roupas Fashion',
      type: 'Eventos Estratégicos',
      description: 'Ação promocional para inauguração da nova loja no shopping',
      startDate: '2024-10-01',
      endDate: '2024-10-05',
      budget: 8000,
      status: 'Concluída',
      location: 'Shopping Center, Várzea Grande/MT',
      team: 'Equipe C',
      materials: 15000,
      progress: 100
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAction, setEditingAction] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    client: '',
    type: '',
    description: '',
    startDate: '',
    endDate: '',
    budget: '',
    status: 'Planejada',
    location: '',
    team: '',
    materials: ''
  });

  const actionTypes = [
    'Panfletagem Residencial',
    'Sinaleiros/Pedestres', 
    'Eventos Estratégicos',
    'Ações Promocionais',
    'Marketing de Guerrilha'
  ];

  const teams = ['Equipe A', 'Equipe B', 'Equipe C', 'Equipe D'];
  const statusOptions = ['Planejada', 'Em Andamento', 'Pausada', 'Concluída', 'Cancelada'];

  const filteredActions = actions.filter(action =>
    action.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    action.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    action.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingAction) {
      setActions(actions.map(action => 
        action.id === editingAction.id 
          ? { ...action, ...formData, budget: parseFloat(formData.budget), materials: parseInt(formData.materials) }
          : action
      ));
    } else {
      const newAction = {
        id: Math.max(...actions.map(a => a.id)) + 1,
        ...formData,
        budget: parseFloat(formData.budget),
        materials: parseInt(formData.materials),
        progress: 0
      };
      setActions([...actions, newAction]);
    }

    setFormData({
      title: '',
      client: '',
      type: '',
      description: '',
      startDate: '',
      endDate: '',
      budget: '',
      status: 'Planejada',
      location: '',
      team: '',
      materials: ''
    });
    setEditingAction(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (action) => {
    setEditingAction(action);
    setFormData({
      title: action.title,
      client: action.client,
      type: action.type,
      description: action.description,
      startDate: action.startDate,
      endDate: action.endDate,
      budget: action.budget.toString(),
      status: action.status,
      location: action.location,
      team: action.team,
      materials: action.materials.toString()
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (actionId) => {
    if (window.confirm('Tem certeza que deseja excluir esta ação?')) {
      setActions(actions.filter(action => action.id !== actionId));
    }
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
      <h2 className="text-2xl font-bold tracking-tight mb-4">Gestão de Ações Promocionais</h2>
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-red-700 hover:bg-red-800"
              onClick={() => {
                setEditingAction(null);
                setFormData({
                  title: '',
                  client: '',
                  type: '',
                  description: '',
                  startDate: '',
                  endDate: '',
                  budget: '',
                  status: 'Planejada',
                  location: '',
                  team: '',
                  materials: ''
                });
              }}
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
                  <Label htmlFor="title">Título da Ação</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="client">Cliente</Label>
                  <Input
                    id="client"
                    value={formData.client}
                    onChange={(e) => setFormData({...formData, client: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Tipo de Ação</Label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
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
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Data de Início</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Data de Término</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="budget">Orçamento (R$)</Label>
                  <Input
                    id="budget"
                    type="number"
                    step="0.01"
                    value={formData.budget}
                    onChange={(e) => setFormData({...formData, budget: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="materials">Qtd. Materiais</Label>
                  <Input
                    id="materials"
                    type="number"
                    value={formData.materials}
                    onChange={(e) => setFormData({...formData, materials: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="team">Equipe</Label>
                  <select
                    id="team"
                    value={formData.team}
                    onChange={(e) => setFormData({...formData, team: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Selecione a equipe</option>
                    {teams.map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="location">Localização</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  required
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
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Em Andamento</p>
                <p className="text-2xl font-bold">
                  {actions.filter(a => a.status === 'Em Andamento').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Orçamento Total</p>
                <p className="text-2xl font-bold">
                  R$ {actions.reduce((sum, a) => sum + a.budget, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Concluídas</p>
                <p className="text-2xl font-bold">
                  {actions.filter(a => a.status === 'Concluída').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar ações por título, cliente ou tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Título</TableHead>
                    <TableHead className="min-w-[120px]">Cliente</TableHead>
                    <TableHead className="min-w-[150px]">Tipo</TableHead>
                    <TableHead className="min-w-[120px]">Período</TableHead>
                    <TableHead className="min-w-[100px]">Orçamento</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="min-w-[120px]">Progresso</TableHead>
                    <TableHead className="min-w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActions.map((action) => (
                    <TableRow key={action.id}>
                      <TableCell className="font-medium">
                        <div className="max-w-[180px]">
                          <p className="truncate">{action.title}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="truncate">{action.client}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="whitespace-nowrap">{action.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="whitespace-nowrap">{new Date(action.startDate).toLocaleDateString('pt-BR')}</div>
                          <div className="text-gray-500 text-xs whitespace-nowrap">até {new Date(action.endDate).toLocaleDateString('pt-BR')}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="whitespace-nowrap">R$ {action.budget.toLocaleString()}</span>
                      </TableCell>
                      <TableCell>{getStatusBadge(action.status)}</TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-[100px]">
                          {getProgressBar(action.progress)}
                          <div className="text-xs text-gray-500">{action.progress}%</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(action)}
                            className="whitespace-nowrap"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(action.id)}
                            className="text-red-600 hover:text-red-800 whitespace-nowrap"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Actions;

