# Roda diagnóstico no VPS
# Execute: .\diagnostico-bot.ps1

Write-Host "🔍 Conectando ao VPS para diagnóstico..." -ForegroundColor Cyan
Write-Host "Forneça a senha quando solicitado" -ForegroundColor Yellow
Write-Host ""

$cmd = @'
cd ~/affiliate-hub
echo "=== GIT PULL ==="
git pull origin master --quiet

echo ""
echo "=== LOGS DO BOT (últimas 30 linhas) ==="
pm2 logs affiliate-bot --lines 30 --nostream 2>/dev/null || pm2 logs promobot --lines 30 --nostream 2>/dev/null

echo ""
echo "=== STATUS PM2 ==="
pm2 list

echo ""
echo "=== DIAGNÓSTICO API ==="
python3 bot/testar_api_agora.py
'@

ssh root@212.85.10.239 $cmd
