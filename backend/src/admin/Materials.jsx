import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Plus, Search, Edit, Trash2, FileText, Image } from 'lucide-react';

const Materials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [formData, setFormData] = useState({
    empresa: '',
    quantidade: '',
    data_inicio: '',
    data_termino: '',
    nome_campanha: '',
    responsavel: '',
    documento: null,
    amostra: null
  });

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/materials/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMaterials(data.materials || []);
      }
    } catch (error) {
      console.error('Erro ao buscar materiais:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formDataToSend = new FormData();
    Object.keys(formData).forEach(key => {
      if (formData[key] !== null && formData[key] !== '') {
        formDataToSend.append(key, formData[key]);
      }
    });

    try {
      const token = localStorage.getItem('token');
      const url = editingMaterial 
        ? `/api/materials/${editingMaterial.id}` 
        : '/api/materials/';
      
      const method = editingMaterial ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (response.ok) {
        fetchMaterials();
        setIsDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error('Erro ao salvar material:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este material?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/materials/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          fetchMaterials();
        }
      } catch (error) {
        console.error('Erro ao excluir material:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      empresa: '',
      quantidade: '',
      data_inicio: '',
      data_termino: '',
      nome_campanha: '',
      responsavel: '',
      documento: null,
      amostra: null
    });
    setEditingMaterial(null);
  };

  const openEditDialog = (material) => {
    setEditingMaterial(material);
    setFormData({
      empresa: material.empresa || '',
      quantidade: material.quantidade || '',
      data_inicio: material.data_inicio || '',
      data_termino: material.data_termino || '',
      nome_campanha: material.nome_campanha || '',
      responsavel: material.responsavel || '',
      documento: null,
      amostra: null
    });
    setIsDialogOpen(true);
  };

  const filteredMaterials = materials.filter(material =>
    material.empresa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.nome_campanha?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.responsavel?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center items-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Materiais</h1>
          <p className="text-muted-foreground">
            Gerencie os materiais e campanhas da empresa
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Material
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingMaterial ? 'Editar Material' : 'Novo Material'}
              </DialogTitle>
              <DialogDescription>
                Preencha as informações do material
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="empresa">Empresa *</Label>
                  <Input
                    id="empresa"
                    value={formData.empresa}
                    onChange={(e) => setFormData({...formData, empresa: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="quantidade">Quantidade</Label>
                  <Input
                    id="quantidade"
                    type="number"
                    value={formData.quantidade}
                    onChange={(e) => setFormData({...formData, quantidade: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="data_inicio">Data Início</Label>
                  <Input
                    id="data_inicio"
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({...formData, data_inicio: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="data_termino">Data Término</Label>
                  <Input
                    id="data_termino"
                    type="date"
                    value={formData.data_termino}
                    onChange={(e) => setFormData({...formData, data_termino: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="nome_campanha">Nome da Campanha</Label>
                <Input
                  id="nome_campanha"
                  value={formData.nome_campanha}
                  onChange={(e) => setFormData({...formData, nome_campanha: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="responsavel">Responsável</Label>
                <Input
                  id="responsavel"
                  value={formData.responsavel}
                  onChange={(e) => setFormData({...formData, responsavel: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="documento">Documento</Label>
                  <Input
                    id="documento"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setFormData({...formData, documento: e.target.files[0]})}
                  />
                </div>
                <div>
                  <Label htmlFor="amostra">Amostra/Imagem</Label>
                  <Input
                    id="amostra"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({...formData, amostra: e.target.files[0]})}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingMaterial ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4" />
            <Input
              placeholder="Buscar materiais..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Campanha</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Arquivos</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.map((material) => (
                <TableRow key={material.id}>
                  <TableCell className="font-medium">{material.empresa}</TableCell>
                  <TableCell>{material.nome_campanha}</TableCell>
                  <TableCell>{material.quantidade}</TableCell>
                  <TableCell>
                    {material.data_inicio && material.data_termino && (
                      <span className="text-sm">
                        {new Date(material.data_inicio).toLocaleDateString()} - {new Date(material.data_termino).toLocaleDateString()}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{material.responsavel}</TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      {material.documento_url && (
                        <Badge variant="secondary" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          Doc
                        </Badge>
                      )}
                      {material.imagem_url && (
                        <Badge variant="secondary" className="text-xs">
                          <Image className="h-3 w-3 mr-1" />
                          Img
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(material)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(material.id)}
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

export default Materials;

