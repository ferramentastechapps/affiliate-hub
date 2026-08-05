# ------------------------------------------------------------------------
# SCRIPT PARA REINICIAR CONEXÃO DO WHATSAPP NA VPS
# ------------------------------------------------------------------------

Write-Host "------------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "REINICIANDO O WHATSAPP-ENGINE E PREPARANDO NOVO QR CODE" -ForegroundColor Cyan
Write-Host "------------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host ""

$commands = @"
echo "1. Encerrando processos antigos do Chrome e WhatsApp..."
pkill -9 -f chrome || true
pkill -9 -f "whatsapp/engine.js" || true
pm2 stop whatsapp-engine || true

echo "2. Limpando a sessão antiga do WhatsApp..."
rm -rf ~/affiliate-hub/whatsapp/.wwebjs_auth

echo "3. Iniciando o whatsapp-engine..."
cd ~/affiliate-hub
pm2 restart whatsapp-engine || pm2 start ./whatsapp/engine.js --name whatsapp-engine

echo ""
echo "========================================================================"
echo "🌐 VOCÊ PODE ABRIR O QR CODE NO SEU NAVEGADOR:"
echo "👉 http://212.85.10.239:3006/qr"
echo "========================================================================"
echo ""
echo "4. Exibindo logs para escaneamento do QR Code no terminal (RAW)..."
echo "Aguarde alguns segundos para o QR Code carregar. Pressione Ctrl+C para fechar quando estiver conectado."
sleep 4
pm2 logs whatsapp-engine --raw --lines 40
"@

# Remove retornos de carro (\r) para evitar problemas no linux
$cleanCommand = $commands -replace "`r", ""

# Iniciar conexão SSH com a chave id_ed25519 se ela existir
$sshKeyPath = "$env:USERPROFILE\.ssh\id_ed25519"
if (Test-Path $sshKeyPath) {
    Write-Host "Conectando com a chave SSH..." -ForegroundColor Yellow
    Write-Output $cleanCommand | ssh -i "$sshKeyPath" root@212.85.10.239 "bash"
} else {
    Write-Host "Chave SSH não encontrada em $sshKeyPath. Tentando conexão padrão..." -ForegroundColor Yellow
    Write-Output $cleanCommand | ssh root@212.85.10.239 "bash"
}

