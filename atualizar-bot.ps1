# Atualiza apenas o bot no VPS (sem rebuild do Next.js)
# Execute: .\atualizar-bot.ps1

Write-Host "Atualizando bot no VPS..." -ForegroundColor Cyan
Write-Host "Forneca a senha quando solicitado" -ForegroundColor Yellow

$sshCommand = @"
cd ~/affiliate-hub
git pull origin master
pm2 restart affiliate-bot 2>/dev/null || pm2 restart promobot 2>/dev/null || echo "Nenhum bot encontrado"
pm2 list
pm2 logs affiliate-bot --lines 40 --nostream 2>/dev/null || pm2 logs promobot --lines 40 --nostream 2>/dev/null
"@

$cleanCommand = $sshCommand -replace "`r", ""
Write-Output $cleanCommand | ssh root@212.85.10.239 "bash"
