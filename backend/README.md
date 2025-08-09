# Relâmpago Backend

Backend API para o sistema Relâmpago desenvolvido em Flask.

## Configuração para Deploy no Render

### 1. Preparação do Banco de Dados

1. No Render, crie um novo PostgreSQL database
2. Anote a connection string fornecida

### 2. Configuração das Variáveis de Ambiente

Configure as seguintes variáveis de ambiente no Render:

```
DATABASE_URL=postgresql://username:password@hostname:port/database
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_DEFAULT_SENDER=noreply@relampago.com
FRONTEND_URL=https://your-frontend-domain.vercel.app
PORT=5000
```

### 3. Deploy

1. Conecte seu repositório GitHub ao Render
2. Selecione o diretório `backend` como root directory
3. Configure:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python app.py`
   - **Environment**: Python 3.11

### 4. Inicialização do Banco

Após o primeiro deploy, execute as migrações:

```bash
flask db upgrade
```

## Desenvolvimento Local

1. Clone o repositório
2. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```
3. Configure as variáveis de ambiente (copie `.env.example` para `.env`)
4. Execute:
   ```bash
   python app.py
   ```

## Estrutura da API

- `/api/auth` - Autenticação
- `/api/users` - Usuários
- `/api/clients` - Clientes
- `/api/actions` - Ações
- `/api/vacancies` - Vagas
- `/api/contacts` - Contatos
- `/api/dashboard` - Dashboard
- `/api/materials` - Materiais
- `/healthcheck` - Health check

