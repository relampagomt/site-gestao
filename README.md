# Relâmpago - Projeto Refatorado

Este projeto foi refatorado para separar o frontend e backend, permitindo deploy independente no Vercel (frontend) e Render (backend).

## Estrutura do Projeto

```
relampago_refactored/
├── frontend/          # Aplicação React para deploy no Vercel
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   ├── vercel.json    # Configuração para Vercel
│   ├── .env.example
│   └── README.md
├── backend/           # API Flask para deploy no Render
│   ├── src/
│   ├── instance/
│   ├── app.py
│   ├── requirements.txt
│   ├── render.yaml    # Configuração para Render
│   ├── .env.example
│   └── README.md
└── README.md
```

## Deploy

### Frontend (Vercel)

1. Acesse o diretório `frontend/`
2. Siga as instruções no `frontend/README.md`
3. Configure a variável `VITE_API_URL` com a URL do backend

### Backend (Render)

1. Acesse o diretório `backend/`
2. Siga as instruções no `backend/README.md`
3. Configure todas as variáveis de ambiente necessárias
4. Configure a variável `FRONTEND_URL` com a URL do frontend

## Configuração de CORS

O backend está configurado para aceitar requisições do frontend através da variável de ambiente `FRONTEND_URL`. Certifique-se de configurar corretamente as URLs em produção.

## Variáveis de Ambiente

### Frontend (.env.local)
```
VITE_API_URL=https://your-backend-app.onrender.com
```

### Backend (.env)
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

## Desenvolvimento Local

1. **Backend**: Execute `python app.py` no diretório `backend/`
2. **Frontend**: Execute `npm run dev` no diretório `frontend/`
3. Configure as variáveis de ambiente locais conforme os arquivos `.env.example`

## Tecnologias

- **Frontend**: React, Vite, Tailwind CSS, Radix UI
- **Backend**: Flask, SQLAlchemy, PostgreSQL
- **Deploy**: Vercel (frontend), Render (backend)

