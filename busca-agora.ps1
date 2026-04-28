# Reinicia bot com codigo novo e forca busca imediata
Write-Host "Reiniciando bot e forcando busca..." -ForegroundColor Cyan
Write-Host "Forneca a senha quando solicitado" -ForegroundColor Yellow

$sshCommand = @"
cd ~/affiliate-hub
git pull origin master
pm2 restart affiliate-bot --update-env
sleep 2
echo "Bot reiniciado! Forcando busca manual..."
cd ~/affiliate-hub/bot
timeout 120 python3 main.py --once 2>&1
"@

$cleanCommand = $sshCommand -replace "`r", ""
Write-Output $cleanCommand | ssh root@212.85.10.239 "bash"
