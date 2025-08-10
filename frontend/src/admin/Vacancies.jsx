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
  Briefcase, 
  Users,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye
} from 'lucide-react';

const Vacancies = () => {
  const [vacancies, setVacancies] = useState([
    {
      id: 1,
      title: 'Panfleteiro(a) - Região Centro',
      department: 'Operacional',
      location: 'Centro, Cuiabá/MT',
      type: 'CLT',
      salary: 1500,
      description: 'Responsável pela distribuição de panfletos em região central da cidade',
      requirements: 'Ensino fundamental completo, disponibilidade para trabalhar em horários flexíveis',
      benefits: 'Vale transporte, vale alimentação, plano de saúde',
      status: 'Aberta',
      createdAt: '2024-11-01',
      applications: 12,
      workload: '40h/semana'
    },
    {
      id: 2,
      title: 'Supervisor de Equipe',
      department: 'Gestão',
      location: 'Várzea Grande/MT',
      type: 'CLT',
      salary: 3500,
      description: 'Supervisionar equipes de panfletagem e garantir qualidade do serviço',
      requirements: 'Ensino médio completo, experiência em liderança de equipes',
      benefits: 'Vale transporte, vale alimentação, plano de saúde, participação nos lucros',
      status: 'Em Processo',
      createdAt: '2024-10-15',
      applications: 8,
      workload: '44h/semana'
    },
    {
      id: 3,
      title: 'Assistente Administrativo',
      department: 'Administrativo',
      location: 'Cuiabá/MT',
      type: 'CLT',
      salary: 2200,
      description: 'Apoio nas atividades administrativas e atendimento ao cliente',
      requirements: 'Ensino médio completo, conhecimentos em informática',
      benefits: 'Vale transporte, vale alimentação, plano de saúde',
      status: 'Fechada',
      createdAt: '2024-09-20',
      applications: 25,
      workload: '40h/semana'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVacancy, setEditingVacancy] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    location: '',
    type: '',
    salary: '',
    description: '',
    requirements: '',
    benefits: '',
    status: 'Aberta',
    workload: ''
  });

  const departments = ['Operacional', 'Gestão', 'Administrativo', 'Comercial', 'Financeiro'];
  const jobTypes = ['CLT', 'PJ', 'Freelancer', 'Estágio', 'Temporário'];
  const statusOptions = ['Aberta', 'Em Processo', 'Pausada', 'Fechada', 'Cancelada'];

  const filteredVacancies = vacancies.filter(vacancy =>
    vacancy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vacancy.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vacancy.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingVacancy) {
      setVacancies(vacancies.map(vacancy => 
        vacancy.id === editingVacancy.id 
          ? { ...vacancy, ...formData, salary: parseFloat(formData.salary) }
          : vacancy
      ));
    } else {
      const newVacancy = {
        id: Math.max(...vacancies.map(v => v.id)) + 1,
        ...formData,
        salary: parseFloat(formData.salary),
        createdAt: new Date().toISOString().split('T')[0],
        applications: 0
      };
      setVacancies([...vacancies, newVacancy]);
    }

    setFormData({
      title: '',
      department: '',
      location: '',
      type: '',
      salary: '',
      description: '',
      requirements: '',
      benefits: '',
      status: 'Aberta',
      workload: ''
    });
    setEditingVacancy(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (vacancy) => {
    setEditingVacancy(vacancy);
    setFormData({
      title: vacancy.title,
      department: vacancy.department,
      location: vacancy.location,
      type: vacancy.type,
      salary: vacancy.salary.toString(),
      description: vacancy.description,
      requirements: vacancy.requirements,
      benefits: vacancy.benefits,
      status: vacancy.status,
      workload: vacancy.workload
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (vacancyId) => {
    if (window.confirm('Tem certeza que deseja excluir esta vaga?')) {
      setVacancies(vacancies.filter(vacancy => vacancy.id !== vacancyId));
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Aberta': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'Em Processo': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'Pausada': { color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
      'Fechada': { color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
      'Cancelada': { color: 'bg-red-100 text-red-800', icon: AlertCircle }
    };
    
    const config = statusConfig[status] || statusConfig['Aberta'];
    const Icon = config.icon;
    
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Gestão de Vagas</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-red-700 hover:bg-red-800"
              onClick={() => {
                setEditingVacancy(null);
                setFormData({
                  title: '',
                  department: '',
                  location: '',
                  type: '',
                  salary: '',
                  description: '',
                  requirements: '',
                  benefits: '',
                  status: 'Aberta',
                  workload: ''
                });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Vaga
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingVacancy ? 'Editar Vaga' : 'Nova Vaga'}
              </DialogTitle>
              <DialogDescription>
                {editingVacancy 
                  ? 'Edite as informações da vaga abaixo.'
                  : 'Preencha as informações da nova vaga.'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Título da Vaga</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="department">Departamento</Label>
                  <select
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Selecione o departamento</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Localização</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Tipo de Contrato</Label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Selecione o tipo</option>
                    {jobTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="salary">Salário (R$)</Label>
                  <Input
                    id="salary"
                    type="number"
                    step="0.01"
                    value={formData.salary}
                    onChange={(e) => setFormData({...formData, salary: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="workload">Carga Horária</Label>
                  <Input
                    id="workload"
                    value={formData.workload}
                    onChange={(e) => setFormData({...formData, workload: e.target.value})}
                    placeholder="Ex: 40h/semana"
                    required
                  />
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
                <Label htmlFor="description">Descrição da Vaga</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label htmlFor="requirements">Requisitos</Label>
                <Textarea
                  id="requirements"
                  value={formData.requirements}
                  onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label htmlFor="benefits">Benefícios</Label>
                <Textarea
                  id="benefits"
                  value={formData.benefits}
                  onChange={(e) => setFormData({...formData, benefits: e.target.value})}
                  rows={2}
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
                  {editingVacancy ? 'Salvar' : 'Criar'}
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
              <Briefcase className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Vagas</p>
                <p className="text-2xl font-bold">{vacancies.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Vagas Abertas</p>
                <p className="text-2xl font-bold">
                  {vacancies.filter(v => v.status === 'Aberta').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Candidatos</p>
                <p className="text-2xl font-bold">
                  {vacancies.reduce((sum, v) => sum + v.applications, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Em Processo</p>
                <p className="text-2xl font-bold">
                  {vacancies.filter(v => v.status === 'Em Processo').length}
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
              placeholder="Buscar vagas por título, departamento ou localização..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Vagas */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Vagas</CardTitle>
          <CardDescription>
            Gerencie todas as vagas de emprego da empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Salário</TableHead>
                <TableHead>Candidatos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVacancies.map((vacancy) => (
                <TableRow key={vacancy.id}>
                  <TableCell className="font-medium">{vacancy.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{vacancy.department}</Badge>
                  </TableCell>
                  <TableCell>{vacancy.location}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{vacancy.type}</Badge>
                  </TableCell>
                  <TableCell>R$ {vacancy.salary.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1 text-gray-500" />
                      {vacancy.applications}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(vacancy.status)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(vacancy)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(vacancy.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Vacancies;

