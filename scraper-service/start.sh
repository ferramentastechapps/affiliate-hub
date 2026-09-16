#!/bin/bash
# Scrapling Microservice - Linux VPS (produção)
# Uso: bash start.sh
# Recomendado: gerenciar via PM2 (veja ecosystem.config.js)

cd "$(dirname "$0")"

echo "🕷️  Iniciando Scrapling Microservice na porta 8001..."

# Instalar dependências se necessário
if ! command -v uvicorn &> /dev/null; then
    echo "📦 Instalando dependências Python..."
    pip install -r requirements.txt
    scrapling install  # instala browsers para DynamicFetcher
fi

uvicorn main:app --host 127.0.0.1 --port 8001 --workers 2
