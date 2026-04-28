# Ver logs do bot no VPS
# Execute: .\ver-logs-bot.ps1

Write-Host "Buscando logs do bot..." -ForegroundColor Cyan
Write-Host "Forneca a senha quando solicitado" -ForegroundColor Yellow

$sshCommand = @"
echo "=== STATUS PM2 ==="
pm2 list
echo ""
echo "=== LOGS DO BOT (ultimas 50 linhas) ==="
pm2 logs affiliate-bot --lines 50 --nostream 2>/dev/null || pm2 logs promobot --lines 50 --nostream 2>/dev/null || echo "Nenhum bot encontrado no PM2"
"@

$cleanCommand = $sshCommand -replace "`r", ""
Write-Output $cleanCommand | ssh root@212.85.10.239 "bash"
