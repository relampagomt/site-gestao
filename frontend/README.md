# Relâmpago Frontend

Frontend da aplicação Relâmpago desenvolvido em React com Vite.

## Configuração para Deploy no Vercel

### 1. Preparação

1. Faça o build do projeto:
   ```bash
   npm run build
   ```

2. Configure a variável de ambiente no Vercel:
   ```
   VITE_API_URL=https://your-backend-app.onrender.com
   ```

### 2. Deploy

1. Conecte seu repositório GitHub ao Vercel
2. Selecione o diretório `frontend` como root directory
3. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 3. Configuração de Roteamento

O arquivo `vercel.json` já está configurado para suportar roteamento SPA (Single Page Application).

## Desenvolvimento Local

1. Clone o repositório
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure as variáveis de ambiente (copie `.env.example` para `.env.local`)
4. Execute:
   ```bash
   npm run dev
   ```

## Tecnologias Utilizadas

- React 19
- Vite
- Tailwind CSS
- Radix UI
- Lucide React
- React Router DOM
- Framer Motion

## Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria o build de produção
- `npm run preview` - Visualiza o build de produção
- `npm run lint` - Executa o linter

