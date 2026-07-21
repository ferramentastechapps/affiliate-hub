# ========================================================================
# [SSL] Script para Configurar SSL e Nginx para Economizai na VPS
# ========================================================================

$ErrorActionPreference = "Stop"

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "SSL - CONFIGURAR SSL E NGINX - ECONOMIZAI" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Este script ira conectar na VPS e automatizar:" -ForegroundColor Yellow
Write-Host "1. Instalacao do Certbot e plugin Nginx (se ausentes)" -ForegroundColor White
Write-Host "2. Configuracao do Nginx para economizai.usejotashop.com.br (Porta 3005)" -ForegroundColor White
Write-Host "3. Geracao e instalacao do certificado Let's Encrypt com redirecionamento HTTPS" -ForegroundColor White
Write-Host "4. Reinicio e validacao do Nginx" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Deseja continuar? (s/n)"

if ($confirm -ne "s") {
    Write-Host "Operacao cancelada pelo usuario." -ForegroundColor Red
    exit
}

$sshCommand = @'
set -e

echo '========================================================================'
echo '1. VERIFICANDO / INSTALANDO CERTBOT'
echo '========================================================================'
if ! command -v certbot &> /dev/null; then
    echo 'Certbot nao encontrado. Instalando Certbot e plugin Nginx...'
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
    echo '[OK] Certbot instalado com sucesso!'
else
    echo '[OK] Certbot ja esta instalado!'
fi

echo ''
echo '========================================================================'
echo '2. ATUALIZANDO CONFIGURACAO DO NGINX PARA ECONOMIZAI'
echo '========================================================================'

# Criar a configuracao do Nginx para o novo dominio
cat > /etc/nginx/sites-available/economizai.usejotashop.com.br << 'EOF'
server {
    listen 80;
    server_name economizai.usejotashop.com.br;

    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

# Habilitar o site no Nginx
echo 'Ativando o site no Nginx...'
ln -sf /etc/nginx/sites-available/economizai.usejotashop.com.br /etc/nginx/sites-enabled/

# Testar configuracao
echo 'Testando configuracao do Nginx...'
nginx -t

# Recarregar Nginx para reconhecer o novo dominio em HTTP
echo 'Recarregando Nginx...'
systemctl reload nginx

echo ''
echo '========================================================================'
echo '3. EMITINDO CERTIFICADO SSL (LET''S ENCRYPT)'
echo '========================================================================'

# Solicitar certificado SSL e configurar redirecionamento automatico de HTTP para HTTPS
echo 'Executando Certbot...'
certbot --nginx -d economizai.usejotashop.com.br --non-interactive --agree-tos -m jotanogueira@icloud.com --redirect

echo ''
echo '========================================================================'
echo '4. RECARREGANDO SERVICOS'
echo '========================================================================'
systemctl reload nginx
echo '[OK] SSL Configurado e Nginx recarregado!'
echo '========================================================================'
'@

# Remover retornos de carro (\r) para compatibilidade perfeita com bash no Linux
$cleanCommand = $sshCommand -replace "`r", ""

Write-Host "Conectando na VPS (root@212.85.10.239)..." -ForegroundColor Yellow
Write-Host "Forneca a senha da VPS quando solicitado:" -ForegroundColor Yellow
Write-Host ""

# Executar na VPS
Write-Output $cleanCommand | ssh root@212.85.10.239 "bash"

Write-Host ""
Write-Host "========================================================================" -ForegroundColor Green
Write-Host "CONFIGURACAO CONCLUIDA COM SUCESSO!" -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Acesse o site para testar:" -ForegroundColor Yellow
Write-Host "URL: https://economizai.usejotashop.com.br" -ForegroundColor Cyan
Write-Host ""
