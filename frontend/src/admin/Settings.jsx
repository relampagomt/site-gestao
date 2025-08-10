import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Database,
  Mail,
  Phone,
  MapPin,
  Building,
  Save,
  Download,
  Upload,
  Trash2,
  Key,
  Globe,
  Palette
} from 'lucide-react';

const Settings = () => {
  const [companySettings, setCompanySettings] = useState({
    name: 'Relâmpago Distribuições',
    email: 'contato@relampagodistribuicoes.com.br',
    phone: '(65) 3333-4444',
    address: 'Rua das Flores, 123 - Centro, Cuiabá/MT',
    website: 'www.relampagodistribuicoes.com.br',
    description: 'Empresa especializada em panfletagem e ações promocionais'
  });

  const [userSettings, setUserSettings] = useState({
    name: 'Administrador',
    email: 'admin@relampago.com',
    role: 'Administrador',
    language: 'pt-BR',
    timezone: 'America/Cuiaba'
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    weeklyReports: true,
    monthlyReports: true,
    newClientAlerts: true,
    campaignAlerts: true,
    systemAlerts: true
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: 30,
    passwordExpiry: 90,
    loginAttempts: 5,
    ipWhitelist: '',
    auditLog: true
  });

  const [systemSettings, setSystemSettings] = useState({
    maintenanceMode: false,
    backupFrequency: 'daily',
    dataRetention: 365,
    apiRateLimit: 1000,
    maxFileSize: 10,
    allowedFileTypes: 'pdf,doc,docx,jpg,png,gif'
  });

  const handleCompanySubmit = (e) => {
    e.preventDefault();
    // Aqui você salvaria as configurações da empresa
    alert('Configurações da empresa salvas com sucesso!');
  };

  const handleUserSubmit = (e) => {
    e.preventDefault();
    // Aqui você salvaria as configurações do usuário
    alert('Configurações do usuário salvas com sucesso!');
  };

  const handleNotificationSubmit = (e) => {
    e.preventDefault();
    // Aqui você salvaria as configurações de notificação
    alert('Configurações de notificação salvas com sucesso!');
  };

  const handleSecuritySubmit = (e) => {
    e.preventDefault();
    // Aqui você salvaria as configurações de segurança
    alert('Configurações de segurança salvas com sucesso!');
  };

  const handleSystemSubmit = (e) => {
    e.preventDefault();
    // Aqui você salvaria as configurações do sistema
    alert('Configurações do sistema salvas com sucesso!');
  };

  const handleBackup = () => {
    alert('Backup iniciado! Você será notificado quando estiver concluído.');
  };

  const handleRestore = () => {
    if (window.confirm('Tem certeza que deseja restaurar o backup? Esta ação não pode ser desfeita.')) {
      alert('Restauração iniciada! O sistema será reiniciado após a conclusão.');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight mb-4">Configurações</h2>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="company">Empresa</TabsTrigger>
          <TabsTrigger value="user">Usuário</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
        </TabsList>

        {/* Configurações da Empresa */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Informações da Empresa
              </CardTitle>
              <CardDescription>
                Configure as informações básicas da sua empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCompanySubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyName">Nome da Empresa</Label>
                    <Input
                      id="companyName"
                      value={companySettings.name}
                      onChange={(e) => setCompanySettings({...companySettings, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyEmail">E-mail</Label>
                    <Input
                      id="companyEmail"
                      type="email"
                      value={companySettings.email}
                      onChange={(e) => setCompanySettings({...companySettings, email: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyPhone">Telefone</Label>
                    <Input
                      id="companyPhone"
                      value={companySettings.phone}
                      onChange={(e) => setCompanySettings({...companySettings, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyWebsite">Website</Label>
                    <Input
                      id="companyWebsite"
                      value={companySettings.website}
                      onChange={(e) => setCompanySettings({...companySettings, website: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="companyAddress">Endereço</Label>
                  <Input
                    id="companyAddress"
                    value={companySettings.address}
                    onChange={(e) => setCompanySettings({...companySettings, address: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="companyDescription">Descrição</Label>
                  <Textarea
                    id="companyDescription"
                    value={companySettings.description}
                    onChange={(e) => setCompanySettings({...companySettings, description: e.target.value})}
                    rows={3}
                  />
                </div>

                <Button type="submit" className="bg-red-700 hover:bg-red-800">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Configurações
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configurações do Usuário */}
        <TabsContent value="user">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Configurações do Usuário
              </CardTitle>
              <CardDescription>
                Gerencie suas preferências pessoais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUserSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="userName">Nome</Label>
                    <Input
                      id="userName"
                      value={userSettings.name}
                      onChange={(e) => setUserSettings({...userSettings, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="userEmail">E-mail</Label>
                    <Input
                      id="userEmail"
                      type="email"
                      value={userSettings.email}
                      onChange={(e) => setUserSettings({...userSettings, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="userLanguage">Idioma</Label>
                    <select
                      id="userLanguage"
                      value={userSettings.language}
                      onChange={(e) => setUserSettings({...userSettings, language: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="pt-BR">Português (Brasil)</option>
                      <option value="en-US">English (US)</option>
                      <option value="es-ES">Español</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="userTimezone">Fuso Horário</Label>
                    <select
                      id="userTimezone"
                      value={userSettings.timezone}
                      onChange={(e) => setUserSettings({...userSettings, timezone: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="America/Cuiaba">América/Cuiabá</option>
                      <option value="America/Sao_Paulo">América/São Paulo</option>
                      <option value="America/Manaus">América/Manaus</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="userRole">Função</Label>
                  <Input
                    id="userRole"
                    value={userSettings.role}
                    disabled
                    className="bg-gray-100"
                  />
                </div>

                <Button type="submit" className="bg-red-700 hover:bg-red-800">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Configurações
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configurações de Notificações */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Configurações de Notificações
              </CardTitle>
              <CardDescription>
                Configure como e quando receber notificações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleNotificationSubmit} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Tipos de Notificação</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="emailNotifications">Notificações por E-mail</Label>
                      <p className="text-sm text-gray-500">Receber notificações via e-mail</p>
                    </div>
                    <Switch
                      id="emailNotifications"
                      checked={notificationSettings.emailNotifications}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({...notificationSettings, emailNotifications: checked})
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="smsNotifications">Notificações por SMS</Label>
                      <p className="text-sm text-gray-500">Receber notificações via SMS</p>
                    </div>
                    <Switch
                      id="smsNotifications"
                      checked={notificationSettings.smsNotifications}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({...notificationSettings, smsNotifications: checked})
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="pushNotifications">Notificações Push</Label>
                      <p className="text-sm text-gray-500">Receber notificações no navegador</p>
                    </div>
                    <Switch
                      id="pushNotifications"
                      checked={notificationSettings.pushNotifications}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({...notificationSettings, pushNotifications: checked})
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Relatórios</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="weeklyReports">Relatórios Semanais</Label>
                      <p className="text-sm text-gray-500">Receber resumo semanal</p>
                    </div>
                    <Switch
                      id="weeklyReports"
                      checked={notificationSettings.weeklyReports}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({...notificationSettings, weeklyReports: checked})
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="monthlyReports">Relatórios Mensais</Label>
                      <p className="text-sm text-gray-500">Receber resumo mensal</p>
                    </div>
                    <Switch
                      id="monthlyReports"
                      checked={notificationSettings.monthlyReports}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({...notificationSettings, monthlyReports: checked})
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Alertas</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="newClientAlerts">Novos Clientes</Label>
                      <p className="text-sm text-gray-500">Alertas sobre novos clientes</p>
                    </div>
                    <Switch
                      id="newClientAlerts"
                      checked={notificationSettings.newClientAlerts}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({...notificationSettings, newClientAlerts: checked})
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="campaignAlerts">Campanhas</Label>
                      <p className="text-sm text-gray-500">Alertas sobre campanhas</p>
                    </div>
                    <Switch
                      id="campaignAlerts"
                      checked={notificationSettings.campaignAlerts}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({...notificationSettings, campaignAlerts: checked})
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="systemAlerts">Sistema</Label>
                      <p className="text-sm text-gray-500">Alertas do sistema</p>
                    </div>
                    <Switch
                      id="systemAlerts"
                      checked={notificationSettings.systemAlerts}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({...notificationSettings, systemAlerts: checked})
                      }
                    />
                  </div>
                </div>

                <Button type="submit" className="bg-red-700 hover:bg-red-800">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Configurações
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configurações de Segurança */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Configurações de Segurança
              </CardTitle>
              <CardDescription>
                Configure as opções de segurança do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSecuritySubmit} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="twoFactorAuth">Autenticação de Dois Fatores</Label>
                    <p className="text-sm text-gray-500">Adicionar camada extra de segurança</p>
                  </div>
                  <Switch
                    id="twoFactorAuth"
                    checked={securitySettings.twoFactorAuth}
                    onCheckedChange={(checked) => 
                      setSecuritySettings({...securitySettings, twoFactorAuth: checked})
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sessionTimeout">Timeout de Sessão (minutos)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeout: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="passwordExpiry">Expiração de Senha (dias)</Label>
                    <Input
                      id="passwordExpiry"
                      type="number"
                      value={securitySettings.passwordExpiry}
                      onChange={(e) => setSecuritySettings({...securitySettings, passwordExpiry: parseInt(e.target.value)})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="loginAttempts">Máximo de Tentativas de Login</Label>
                  <Input
                    id="loginAttempts"
                    type="number"
                    value={securitySettings.loginAttempts}
                    onChange={(e) => setSecuritySettings({...securitySettings, loginAttempts: parseInt(e.target.value)})}
                  />
                </div>

                <div>
                  <Label htmlFor="ipWhitelist">Lista de IPs Permitidos</Label>
                  <Textarea
                    id="ipWhitelist"
                    value={securitySettings.ipWhitelist}
                    onChange={(e) => setSecuritySettings({...securitySettings, ipWhitelist: e.target.value})}
                    placeholder="192.168.1.1, 10.0.0.1"
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auditLog">Log de Auditoria</Label>
                    <p className="text-sm text-gray-500">Registrar todas as ações do sistema</p>
                  </div>
                  <Switch
                    id="auditLog"
                    checked={securitySettings.auditLog}
                    onCheckedChange={(checked) => 
                      setSecuritySettings({...securitySettings, auditLog: checked})
                    }
                  />
                </div>

                <Button type="submit" className="bg-red-700 hover:bg-red-800">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Configurações
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configurações do Sistema */}
        <TabsContent value="system">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="w-5 h-5 mr-2" />
                  Configurações do Sistema
                </CardTitle>
                <CardDescription>
                  Configure as opções avançadas do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSystemSubmit} className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="maintenanceMode">Modo de Manutenção</Label>
                      <p className="text-sm text-gray-500">Ativar modo de manutenção</p>
                    </div>
                    <Switch
                      id="maintenanceMode"
                      checked={systemSettings.maintenanceMode}
                      onCheckedChange={(checked) => 
                        setSystemSettings({...systemSettings, maintenanceMode: checked})
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="backupFrequency">Frequência de Backup</Label>
                      <select
                        id="backupFrequency"
                        value={systemSettings.backupFrequency}
                        onChange={(e) => setSystemSettings({...systemSettings, backupFrequency: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="hourly">A cada hora</option>
                        <option value="daily">Diário</option>
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensal</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="dataRetention">Retenção de Dados (dias)</Label>
                      <Input
                        id="dataRetention"
                        type="number"
                        value={systemSettings.dataRetention}
                        onChange={(e) => setSystemSettings({...systemSettings, dataRetention: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="apiRateLimit">Limite de API (req/min)</Label>
                      <Input
                        id="apiRateLimit"
                        type="number"
                        value={systemSettings.apiRateLimit}
                        onChange={(e) => setSystemSettings({...systemSettings, apiRateLimit: parseInt(e.target.value)})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxFileSize">Tamanho Máximo de Arquivo (MB)</Label>
                      <Input
                        id="maxFileSize"
                        type="number"
                        value={systemSettings.maxFileSize}
                        onChange={(e) => setSystemSettings({...systemSettings, maxFileSize: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="allowedFileTypes">Tipos de Arquivo Permitidos</Label>
                    <Input
                      id="allowedFileTypes"
                      value={systemSettings.allowedFileTypes}
                      onChange={(e) => setSystemSettings({...systemSettings, allowedFileTypes: e.target.value})}
                      placeholder="pdf,doc,docx,jpg,png,gif"
                    />
                  </div>

                  <Button type="submit" className="bg-red-700 hover:bg-red-800">
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Configurações
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Backup e Restauração */}
            <Card>
              <CardHeader>
                <CardTitle>Backup e Restauração</CardTitle>
                <CardDescription>
                  Gerencie backups do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-4">
                  <Button onClick={handleBackup} className="bg-green-600 hover:bg-green-700">
                    <Download className="w-4 h-4 mr-2" />
                    Fazer Backup
                  </Button>
                  <Button onClick={handleRestore} variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Restaurar Backup
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;


