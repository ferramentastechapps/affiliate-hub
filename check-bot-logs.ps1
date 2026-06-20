Write-Host "🔍 Verificando logs do bot na VPS..." -ForegroundColor Cyan

$commands = @"
echo "📊 Status do PM2:"
pm2 status

echo ""
echo "📝 Últimas 50 linhas do log do scraper:"
pm2 logs affiliate-hub-scraper --lines 50 --nostream

echo ""
echo "📝 Últimas 50 linhas do log do listener:"
pm2 logs affiliate-hub-listener --lines 50 --nostream

echo ""
echo "⚠️ Erros recentes (últimas 30 linhas):"
pm2 logs affiliate-hub-scraper --err --lines 30 --nostream
"@

ssh root@212.85.10.239 $commands
