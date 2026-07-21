# Forca uma busca imediata de produtos
Write-Host "Forcando busca de produtos..." -ForegroundColor Cyan
Write-Host "Forneca a senha quando solicitado" -ForegroundColor Yellow

$sshCommand = @"
cd ~/affiliate-hub/bot
python3 main.py --once
"@

$cleanCommand = $sshCommand -replace "`r", ""
Write-Output $cleanCommand | ssh root@212.85.10.239 "bash"
