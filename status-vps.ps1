# Ver status rapido do VPS
Write-Host "Verificando status..." -ForegroundColor Cyan
Write-Host "Forneca a senha quando solicitado" -ForegroundColor Yellow

$sshCommand = @"
pm2 list
echo ""
grep "API_SECRET_KEY" ~/affiliate-hub/.env
echo ""
curl -s -o /dev/null -w "API Status: %{http_code}" -X POST http://127.0.0.1:3005/api/webhook/products -H "Content-Type: application/json" -H "x-api-key: f6c684a41738ecbc7a95d875fcd93db0b8c30e80df6b5fc09bdfd41d0e651598" -d '{"name":"Teste","category":"Diversos","imageUrl":"https://via.placeholder.com/100"}'
"@

$cleanCommand = $sshCommand -replace "`r", ""
Write-Output $cleanCommand | ssh root@212.85.10.239 "bash"
