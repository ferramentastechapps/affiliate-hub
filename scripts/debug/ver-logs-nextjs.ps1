# Ver logs do Next.js e testar API
Write-Host "Verificando Next.js..." -ForegroundColor Cyan
Write-Host "Forneca a senha quando solicitado" -ForegroundColor Yellow

$sshCommand = @"
echo "=== .env do site ==="
grep -E "API_SECRET_KEY|AFFILIATE_HUB" ~/affiliate-hub/.env

echo ""
echo "=== Testando API ==="
curl -s -X POST http://127.0.0.1:3005/api/webhook/products -H "Content-Type: application/json" -H "x-api-key: f6c684a41738ecbc7a95d875fcd93db0b8c30e80df6b5fc09bdfd41d0e651598" -d '{"name":"Teste Diagnostico","category":"Diversos","imageUrl":"https://via.placeholder.com/100"}'

echo ""
echo "=== Logs Next.js (ultimas 20 linhas) ==="
pm2 logs nextjs --lines 20
"@

$cleanCommand = $sshCommand -replace "`r", ""
Write-Output $cleanCommand | ssh root@212.85.10.239 "bash"
