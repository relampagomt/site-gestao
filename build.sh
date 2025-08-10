#!/bin/bash

# Navega para o diretório do frontend
cd frontend

# Instala as dependências do frontend
npm install

# Constrói o frontend
npm run build

# Volta para o diretório raiz do projeto
cd ..

# Remove o diretório static existente no backend (se houver)
rm -rf backend/static

# Cria o diretório static no backend
mkdir -p backend/static

# Copia os arquivos buildados do frontend para o diretório static do backend
cp -r frontend/dist/* backend/static/

echo "Frontend buildado e movido para backend/static com sucesso!"

