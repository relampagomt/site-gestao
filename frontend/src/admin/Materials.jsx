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
import { Plus, Search, Edit, Trash2, Package, Calendar, User, AlertCircle, Upload, Image } from 'lucide-react';
import api from '@/services/api';

const Materials = () => {
  const { isAdmin } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [formData, setFormData] = useState({
    date: '',
    quantity: '',
    client_id: '',        // string no Select
    client_name: '',
    material_sample_url: '',
    protocol_sample_url: '',
    responsible: ''
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        client_id: formData.client_id ? Number(formData.client_id) : null, // ✅ converter para número
      };

      if (editingMaterial) {
        await api.put(`/materials/${editingMaterial.id}`, payload);
      } else {
        await api.post('/materials', payload);
      }
      await fetchMaterials();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar material:', error);
      alert(error?.response?.data?.message || 'Erro ao salvar material');
    }
  };

  const handleEdit = (material) => {
    setEditingMaterial(material);
    setFormData({
      date: material.date || '',
      quantity: material.quantity || '',
      client_id: material.client_id != null ? String(material.client_id) : '',
      client_name: material.client_name || '',
      material_sample_url: material.material_sample_url || '',
      protocol_sample_url: material.protocol_sample_url || '',
      responsible: material.responsible || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (materialId) => {
    if (!isAdmin()) {
      alert('Apenas administradores podem excluir materiais');
      return;
    }
    if (window.confirm('Tem certeza que deseja excluir este material?')) {
      try {
        await api.delete(`/materials/${materialId}`);
        await fetchMaterials();
      } catch (error) {
        console.error('Erro ao excluir material:', error);
        alert(error?.response?.data?.message || 'Erro ao excluir material');
      }
    }
  };

  const handleClientChange = (value) => {
    const selectedClient = clients.find(c => String(c.id) === String(value)); // ✅ comparar como string
    setFormData((prev) => ({
      ...prev,
      client_id: value,
      client_name: selectedClient ? selectedClient.name : ''
    }));
  };

  const resetForm = () => {
    setFormData({
      date: '',
      quantity: '',
      client_id: '',
      client_name: '',
      material_sample_url: '',
      protocol_sample_url: '',
      responsible: ''
    });
    setEditingMaterial(null);
  };

  const filteredMaterials = materials.filter(material =>
    material.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.responsible?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    if (!dateString) return 'Não informado';
    return new Date(dateString).toLocaleDateString('pt-BR');
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

          <DialogContent className="max-w-2xl mx-4">
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
                  <Input id="date" type="date" value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantidade *</Label>
                  <Input id="quantity" type="number" value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} required />
                </div>
              </div>

              <div>
                <Label htmlFor="client">Cliente *</Label>
                <Select value={formData.client_id} onValueChange={handleClientChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={String(client.id)}>
                        {client.name} - {client.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="responsible">Responsável pela coleta/recebimento *</Label>
                <Input id="responsible" value={formData.responsible}
                  onChange={(e) => setFormData({ ...formData, responsible: e.target.value })} required />
              </div>

              <div>
                <Label htmlFor="material_sample_url">URL da Amostra do Material</Label>
                <Input id="material_sample_url" type="url" value={formData.material_sample_url}
                  onChange={(e) => setFormData({ ...formData, material_sample_url: e.target.value })}
                  placeholder="https://exemplo.com/imagem-material.jpg" />
              </div>

              <div>
                <Label htmlFor="protocol_sample_url">URL da Amostra do Protocolo</Label>
                <Input id="protocol_sample_url" type="url" value={formData.protocol_sample_url}
                  onChange={(e) => setFormData({ ...formData, protocol_sample_url: e.target.value })}
                  placeholder="https://exemplo.com/imagem-protocolo.jpg" />
              </div>

              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">{editingMaterial ? 'Atualizar' : 'Criar'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input placeholder="Buscar materiais por cliente ou responsável..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
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
                            <span className="whitespace-nowrap">{formatDate(material.date)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="font-medium truncate">{material.client_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="whitespace-nowrap">{material.quantity}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="truncate">{material.responsible}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {material.material_sample_url && (
                              <Badge variant="outline" className="text-xs whitespace-nowrap">
                                <Image className="w-3 h-3 mr-1" /> Material
                              </Badge>
                            )}
                            {material.protocol_sample_url && (
                              <Badge variant="outline" className="text-xs whitespace-nowrap">
                                <Image className="w-3 h-3 mr-1" /> Protocolo
                              </Badge>
                            )}
                            {!material.material_sample_url && !material.protocol_sample_url && (
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
                              <Button variant="outline" size="sm" onClick={() => handleDelete(material.id)} className="text-red-600 hover:text-red-700 whitespace-nowrap">
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
