Write-Host "🔍 DIAGNÓSTICO RÁPIDO - Bot parou às 10:25" -ForegroundColor Red
Write-Host "=" * 60 -ForegroundColor Yellow

$commands = @"
echo "📊 1. STATUS PM2:"
pm2 status

echo ""
echo "🕐 2. ÚLTIMAS LINHAS DO SCRAPER (desde 10:25):"
pm2 logs affiliate-hub-scraper --lines 100 --nostream | tail -50

echo ""
echo "🕐 3. ÚLTIMAS LINHAS DO LISTENER:"
pm2 logs affiliate-hub-listener --lines 100 --nostream | tail -50

echo ""
echo "❌ 4. ERROS DO SCRAPER:"
pm2 logs affiliate-hub-scraper --err --lines 50 --nostream

echo ""
echo "❌ 5. ERROS DO LISTENER:"
pm2 logs affiliate-hub-listener --err --lines 50 --nostream

echo ""
echo "🔄 6. VERIFICANDO PROCESSOS PYTHON:"
ps aux | grep python3 | grep -E 'main.py|telegram_listener.py'

echo ""
echo "📁 7. VERIFICANDO bot_state.json:"
cd ~/affiliate-hub && ls -lh bot_state.json 2>/dev/null || echo "bot_state.json não encontrado"

echo ""
echo "🌐 8. TESTANDO CONEXÃO COM API:"
curl -s -o /dev/null -w "Status: %{http_code}\n" http://127.0.0.1:3005/api/products

echo ""
echo "💾 9. USO DE MEMÓRIA:"
free -h

echo ""
echo "💿 10. ESPAÇO EM DISCO:"
df -h | grep -E 'Filesystem|/$'
"@

ssh root@212.85.10.239 $commands

Write-Host "`n" -ForegroundColor Yellow
Write-Host "=" * 60 -ForegroundColor Yellow
Write-Host "✅ Diagnóstico completo!" -ForegroundColor Green
