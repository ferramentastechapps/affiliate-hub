# ------------------------------------------------------------------------
# SCRIPT PARA REINICIAR CONEXÃO DO WHATSAPP NA VPS
# ------------------------------------------------------------------------

Write-Host "------------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "REINICIANDO O WHATSAPP-ENGINE E PREPARANDO NOVO QR CODE" -ForegroundColor Cyan
Write-Host "------------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host ""

$commands = @"
echo "1. Parando o whatsapp-engine..."
pm2 stop whatsapp-engine

echo "2. Encerrando processos pendentes do Chrome/Chromium..."
pkill -9 -f chrome 2>/dev/null || true
pkill -9 -f chromium 2>/dev/null || true

echo "3. Limpando a sessão antiga do WhatsApp e cache..."
rm -rf ~/affiliate-hub/whatsapp/.wwebjs_auth
rm -rf ~/affiliate-hub/whatsapp/.wwebjs_cache

echo "4. Atualizando repositorio e iniciando o whatsapp-engine..."
cd ~/affiliate-hub && git pull || true
pm2 start whatsapp-engine

echo "5. Aguardando 10 segundos para inicializacao do Chrome..."
sleep 10

echo "6. Exibindo QR Code nos logs do PM2..."
pm2 logs whatsapp-engine --lines 60 --nostream
"@

# Remove retornos de carro (\r) para evitar problemas no linux
$cleanCommand = $commands -replace "`r", ""

Write-Host "Executando comandos na VPS..." -ForegroundColor Yellow
Write-Output $cleanCommand | ssh root@212.85.10.239 "bash"
