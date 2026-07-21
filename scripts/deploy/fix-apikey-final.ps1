# Fix definitivo: atualiza API key no VPS e faz rebuild
Write-Host "Aplicando fix definitivo da API key..." -ForegroundColor Cyan
Write-Host "Forneca a senha quando solicitado" -ForegroundColor Yellow

$KEY = "f6c684a41738ecbc7a95d875fcd93db0b8c30e80df6b5fc09bdfd41d0e651598"

$sshCommand = @"
cd ~/affiliate-hub

echo "=== .env ANTES ==="
grep "API_SECRET_KEY" .env

echo ""
echo "=== Atualizando chave ==="
sed -i 's|API_SECRET_KEY=.*|API_SECRET_KEY="f6c684a41738ecbc7a95d875fcd93db0b8c30e80df6b5fc09bdfd41d0e651598"|' .env

echo ""
echo "=== .env DEPOIS ==="
grep "API_SECRET_KEY" .env

echo ""
echo "=== Rebuild Next.js ==="
npm run build

echo ""
echo "=== Reiniciando tudo ==="
pm2 restart nextjs --update-env
sleep 3
pm2 restart affiliate-bot --update-env

echo ""
echo "=== Testando API ==="
sleep 2
curl -s -X POST http://127.0.0.1:3005/api/webhook/products \
  -H "Content-Type: application/json" \
  -H "x-api-key: f6c684a41738ecbc7a95d875fcd93db0b8c30e80df6b5fc09bdfd41d0e651598" \
  -d '{"name":"Teste Final","category":"Diversos","imageUrl":"https://via.placeholder.com/100"}'

echo ""
echo "=== Pronto! ==="
pm2 list
"@

$cleanCommand = $sshCommand -replace "`r", ""
Write-Output $cleanCommand | ssh root@212.85.10.239 "bash"
