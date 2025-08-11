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
import { Plus, Search, Edit, Trash2, Package, Calendar, User, AlertCircle, Upload, Image, X } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

const Materials = () => {
  const { isAdmin } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState('todos');
  const [dateFilter, setDateFilter] = useState('todos');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [formData, setFormData] = useState({
    date: '',
    quantity: '',
    clienteNome: '',
    amostraUrl: '',
    protocoloUrl: '',
    responsavel: ''
  });
  const [amostraFile, setAmostraFile] = useState(null);
  const [protocoloFile, setProtocoloFile] = useState(null);
  const [amostraPreview, setAmostraPreview] = useState('');
  const [protocoloPreview, setProtocoloPreview] = useState('');

  useEffect(() => {
    fetchMaterials();
    fetchClients();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/materials');
      setMaterials(data || []);
    } catch (error) {
      console.error('Erro ao buscar materiais:', error);
      toast.error('Erro ao carregar materiais');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data } = await api.get('/clients');
      setClients(data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
  };

  const handleFileChange = (file, type) => {
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

    if (type === 'amostra') {
      setAmostraFile(file);
      setAmostraPreview(URL.createObjectURL(file));
    } else {
      setProtocoloFile(file);
      setProtocoloPreview(URL.createObjectURL(file));
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.clienteNome.trim()) {
      toast.error('Nome do cliente é obrigatório');
      return;
    }

    try {
      setSaving(true);
      
      let amostraUrl = formData.amostraUrl;
      let protocoloUrl = formData.protocoloUrl;

      // Upload dos arquivos se houver
      if (amostraFile) {
        amostraUrl = await uploadFile(amostraFile);
      }
      if (protocoloFile) {
        protocoloUrl = await uploadFile(protocoloFile);
      }

      const payload = {
        data: formData.date,
        quantidade: parseInt(formData.quantity),
        clienteNome: formData.clienteNome.trim(),
        amostraUrl,
        protocoloUrl,
        responsavel: formData.responsavel.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingMaterial) {
        await api.put(`/materials/${editingMaterial.id}`, payload);
        toast.success('Material atualizado com sucesso!');
      } else {
        await api.post('/materials', payload);
        toast.success('Material criado com sucesso!');
      }
      
      await fetchMaterials();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar material:', error);
      toast.error(error.message || 'Erro ao salvar material');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (material) => {
    setEditingMaterial(material);
    setFormData({
      date: material.data || '',
      quantity: material.quantidade || '',
      clienteNome: material.clienteNome || '',
      amostraUrl: material.amostraUrl || '',
      protocoloUrl: material.protocoloUrl || '',
      responsavel: material.responsavel || ''
    });
    setAmostraPreview(material.amostraUrl || '');
    setProtocoloPreview(material.protocoloUrl || '');
    setIsDialogOpen(true);
  };

  const handleDelete = async (materialId) => {
    if (!isAdmin()) {
      toast.error('Apenas administradores podem excluir materiais');
      return;
    }
    if (window.confirm('Tem certeza que deseja excluir este material?')) {
      try {
        await api.delete(`/materials/${materialId}`);
        toast.success('Material excluído com sucesso!');
        await fetchMaterials();
      } catch (error) {
        console.error('Erro ao excluir material:', error);
        toast.error('Erro ao excluir material');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      date: '',
      quantity: '',
      clienteNome: '',
      amostraUrl: '',
      protocoloUrl: '',
      responsavel: ''
    });
    setEditingMaterial(null);
    setAmostraFile(null);
    setProtocoloFile(null);
    setAmostraPreview('');
    setProtocoloPreview('');
  };

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.clienteNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.responsavel?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClient = clientFilter === 'todos' || material.clienteNome === clientFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'todos' && material.data) {
      const materialDate = new Date(material.data);
      const today = new Date();
      
      switch (dateFilter) {
        case 'hoje':
          matchesDate = materialDate.toDateString() === today.toDateString();
          break;
        case 'semana':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = materialDate >= weekAgo;
          break;
        case 'mes':
          matchesDate = materialDate.getMonth() === today.getMonth() && 
                       materialDate.getFullYear() === today.getFullYear();
          break;
        case 'trimestre':
          const currentQuarter = Math.floor(today.getMonth() / 3);
          const materialQuarter = Math.floor(materialDate.getMonth() / 3);
          matchesDate = materialQuarter === currentQuarter && 
                       materialDate.getFullYear() === today.getFullYear();
          break;
      }
    }
    
    return matchesSearch && matchesClient && matchesDate;
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'Não informado';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getUniqueClients = () => {
    const uniqueClients = [...new Set(materials.map(m => m.clienteNome).filter(Boolean))];
    return uniqueClients.sort();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <h2 className="text-2xl font-bold tracking-tight mb-4">Materiais</h2>

      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Material</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMaterial ? 'Editar Material' : 'Novo Material'}</DialogTitle>
              <DialogDescription>
                {editingMaterial ? 'Edite as informações do material' : 'Registre um novo recebimento ou coleta de material'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Data *</Label>
                  <Input 
                    id="date" 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantidade *</Label>
                  <Input 
                    id="quantity" 
                    type="number" 
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="clienteNome">Cliente *</Label>
                <Input
                  id="clienteNome"
                  value={formData.clienteNome}
                  onChange={(e) => setFormData({ ...formData, clienteNome: e.target.value })}
                  placeholder="Digite o nome do cliente"
                  list="clientes-list"
                  required
                />
                <datalist id="clientes-list">
                  {getUniqueClients().map((cliente, index) => (
                    <option key={index} value={cliente} />
                  ))}
                </datalist>
              </div>

              <div>
                <Label htmlFor="responsavel">Responsável pela coleta/recebimento *</Label>
                <Input 
                  id="responsavel" 
                  value={formData.responsavel}
                  onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })} 
                  required 
                />
              </div>

              {/* Upload Amostra do Material */}
              <div>
                <Label>Amostra do Material</Label>
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(e) => handleFileChange(e.target.files[0], 'amostra')}
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
                          setFormData({ ...formData, amostraUrl: '' });
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Protocolo */}
              <div>
                <Label>Protocolo</Label>
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(e) => handleFileChange(e.target.files[0], 'protocolo')}
                  />
                  {protocoloPreview && (
                    <div className="relative inline-block">
                      <img 
                        src={protocoloPreview} 
                        alt="Preview protocolo" 
                        className="w-32 h-32 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="absolute -top-2 -right-2"
                        onClick={() => {
                          setProtocoloFile(null);
                          setProtocoloPreview('');
                          setFormData({ ...formData, protocoloUrl: '' });
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : (editingMaterial ? 'Atualizar' : 'Criar')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Buscar materiais por cliente ou responsável..."
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-10" 
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              
              <Button 
                variant="outline" 
                onClick={() => { 
                  setSearchTerm(''); 
                  setClientFilter('todos'); 
                  setDateFilter('todos'); 
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Materiais</CardTitle>
          <CardDescription>{filteredMaterials.length} material(is) encontrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Carregando materiais...</p>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum material encontrado</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Tente ajustar sua busca' : 'Comece registrando um novo material'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[100px]">Data</TableHead>
                      <TableHead className="min-w-[150px]">Cliente</TableHead>
                      <TableHead className="min-w-[100px]">Quantidade</TableHead>
                      <TableHead className="min-w-[150px]">Responsável</TableHead>
                      <TableHead className="min-w-[120px]">Amostras</TableHead>
                      <TableHead className="min-w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMaterials.map((material) => (
                      <TableRow key={material.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="whitespace-nowrap">{formatDate(material.data)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="font-medium truncate">{material.clienteNome}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="whitespace-nowrap">{material.quantidade}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="truncate">{material.responsavel}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {material.amostraUrl && (
                              <Badge variant="outline" className="text-xs whitespace-nowrap">
                                <Image className="w-3 h-3 mr-1" /> Material
                              </Badge>
                            )}
                            {material.protocoloUrl && (
                              <Badge variant="outline" className="text-xs whitespace-nowrap">
                                <Image className="w-3 h-3 mr-1" /> Protocolo
                              </Badge>
                            )}
                            {!material.amostraUrl && !material.protocoloUrl && (
                              <span className="text-gray-400 text-sm whitespace-nowrap">Sem amostras</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(material)} className="whitespace-nowrap">
                              <Edit className="w-4 h-4" />
                            </Button>
                            {isAdmin() && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleDelete(material.id)} 
                                className="whitespace-nowrap text-red-600 hover:text-red-700"
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

export default Materials;

