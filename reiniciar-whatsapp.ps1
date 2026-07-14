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

echo "2. Limpando a sessao antiga do WhatsApp..."
rm -rf ~/affiliate-hub/whatsapp/.wwebjs_auth

echo "3. Iniciando o whatsapp-engine novamente..."
pm2 start whatsapp-engine

echo "4. Exibindo logs para escaneamento do QR Code..."
echo "Aguarde alguns segundos para o QR Code carregar. Pressione Ctrl+C para fechar os logs quando estiver conectado."
pm2 logs whatsapp-engine --lines 40
"@

# Remove retornos de carro (\r) para evitar problemas no linux
$cleanCommand = $commands -replace "`r", ""

Write-Host "Executando comandos na VPS..." -ForegroundColor Yellow
Write-Output $cleanCommand | ssh root@212.85.10.239 "bash"
