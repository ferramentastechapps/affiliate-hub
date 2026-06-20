Write-Host "🔍 Verificando status dos bots..." -ForegroundColor Cyan

ssh root@212.85.10.239 @"
echo '📊 STATUS PM2:'
pm2 status

echo ''
echo '🕐 SCRAPER - Últimas 30 linhas:'
pm2 logs affiliate-hub-scraper --lines 30 --nostream

echo ''
echo '❌ ERROS DO SCRAPER:'
pm2 logs affiliate-hub-scraper --err --lines 20 --nostream

echo ''
echo '🔄 PROCESSOS PYTHON:'
ps aux | grep -E 'main.py|telegram' | grep -v grep
"@
