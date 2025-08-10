# Relâmpago - Sistema Refatorado

Sistema institucional com painel de gestão separado em frontend (React) e backend (Flask API).

## Arquitetura

- **Frontend**: React + Vite (deploy na Vercel)
- **Backend**: Flask API REST (deploy no Render)
- **Banco de dados**: Firebase Firestore
- **Autenticação**: JWT com roles (admin/supervisor)

## Estrutura do Projeto

```
projeto_refatorado/
├── frontend/                 # React + Vite
│   ├── src/
│   │   ├── admin/           # Painel administrativo
│   │   ├── components/      # Componentes reutilizáveis
│   │   ├── contexts/        # Context API (AuthContext)
│   │   ├── pages/           # Páginas (Home, Login)
│   │   └── services/        # Serviços de API
│   └── vercel.json          # Configuração Vercel
└── backend/                 # Flask API
    ├── src/
    │   ├── middleware/      # Middleware de autenticação
    │   ├── routes/          # Rotas da API
    │   └── services/        # Serviços (Firebase, usuários)
    └── requirements.txt     # Dependências Python
```

## Rotas do Frontend

- `/` - Página institucional
- `/login` - Página de login
- `/admin` - Painel de gestão (protegido)

## API Endpoints

- `GET /healthcheck` - Status da API
- `POST /api/auth/login` - Login (gera JWT)
- `GET /api/auth/me` - Dados do usuário atual

## Deploy

### Frontend (Vercel)

1. Conecte o repositório na Vercel
2. Configure o build command: `npm run build`
3. Configure o output directory: `dist`
4. Atualize a URL do backend no `vercel.json`

### Backend (Render)

1. Conecte o repositório no Render
2. Configure as variáveis de ambiente (ver `.env.example`)
3. Configure o build command: `pip install -r requirements.txt`
4. Configure o start command: `gunicorn src.main:app`

## Variáveis de Ambiente

### Backend (Render)

```env
JWT_SECRET_KEY=sua-chave-jwt-secreta
FIREBASE_CREDENTIALS_JSON={"type":"service_account",...}
ADMIN_NAME=Administrador
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@relampago.com
ADMIN_PASSWORD=senha-segura
```

### Frontend (Vercel)

Não são necessárias variáveis de ambiente. A API é acessada via proxy configurado no `vercel.json`.

## Desenvolvimento Local

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou venv\Scripts\activate  # Windows
pip install -r requirements.txt
python src/main.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Autenticação e Permissões

### Roles

- **admin**: Acesso total ao sistema
- **supervisor**: Acesso limitado aos próprios dados

### Usuário Admin Padrão

O sistema cria automaticamente um usuário admin na inicialização usando as variáveis de ambiente `ADMIN_*`.

## Firebase Setup

1. Crie um projeto no Firebase Console
2. Ative o Firestore Database
3. Gere uma chave de conta de serviço
4. Configure a variável `FIREBASE_CREDENTIALS_JSON` com o JSON da chave

## Tecnologias Utilizadas

### Frontend
- React 18
- React Router DOM
- Tailwind CSS
- shadcn/ui
- Axios
- Lucide React

### Backend
- Flask
- Flask-JWT-Extended
- Flask-CORS
- Firebase Admin SDK
- bcrypt
- Gunicorn

