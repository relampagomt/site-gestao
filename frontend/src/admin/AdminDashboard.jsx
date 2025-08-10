import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { LogOut, User, Shield, Settings } from 'lucide-react';

const AdminDashboard = () => {
  const { user, logout, isAdmin } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b brand-shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold brand-text-vinho">Relâmpago</h1>
              <span className="ml-3 text-gray-500">Painel de Gestão</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">{user?.name}</span>
                <Badge variant={isAdmin() ? "default" : "secondary"}>
                  {user?.role === 'admin' ? 'Administrador' : 'Supervisor'}
                </Badge>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Bem-vindo, {user?.name}!
          </h2>
          <p className="text-gray-600 mt-2">
            Gerencie suas operações através do painel de controle
          </p>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Acesso Total
              </CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold brand-text-vinho">
                {isAdmin() ? 'Sim' : 'Limitado'}
              </div>
              <p className="text-xs text-muted-foreground">
                {isAdmin() 
                  ? 'Você tem acesso completo ao sistema' 
                  : 'Acesso limitado aos seus dados'
                }
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Perfil
              </CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold brand-text-vinho">
                {user?.role === 'admin' ? 'Admin' : 'Supervisor'}
              </div>
              <p className="text-xs text-muted-foreground">
                {user?.email}
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Configurações
              </CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold brand-text-vinho">
                Ativo
              </div>
              <p className="text-xs text-muted-foreground">
                Sistema funcionando normalmente
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Funcionalidades</CardTitle>
              <CardDescription>
                Recursos disponíveis para seu perfil
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isAdmin() ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span>Gerenciar usuários</span>
                      <Badge>Disponível</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Relatórios completos</span>
                      <Badge>Disponível</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Configurações do sistema</span>
                      <Badge>Disponível</Badge>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span>Visualizar dados próprios</span>
                      <Badge>Disponível</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Editar perfil</span>
                      <Badge>Disponível</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Relatórios limitados</span>
                      <Badge variant="secondary">Limitado</Badge>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações do Sistema</CardTitle>
              <CardDescription>
                Status e informações gerais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Status do sistema</span>
                  <Badge className="bg-green-100 text-green-800">Online</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Última atualização</span>
                  <span className="text-sm text-gray-500">Hoje</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Versão</span>
                  <span className="text-sm text-gray-500">1.0.0</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;

