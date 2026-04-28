# Corrige a API key no .env do Next.js no VPS e reinicia
Write-Host "Corrigindo API key no VPS..." -ForegroundColor Cyan
Write-Host "Forneca a senha quando solicitado" -ForegroundColor Yellow

$NOVA_CHAVE = "f6c684a41738ecbc7a95d875fcd93db0b8c30e80df6b5fc09bdfd41d0e651598"

$sshCommand = @"
cd ~/affiliate-hub
echo "Atualizando API_SECRET_KEY no .env do site..."
sed -i 's|API_SECRET_KEY=.*|API_SECRET_KEY="$NOVA_CHAVE"|g' .env
grep API_SECRET_KEY .env

echo "Reiniciando Next.js para aplicar nova chave..."
pm2 restart nextjs --update-env

echo "Aguardando 3s..."
sleep 3

echo "Testando API com nova chave..."
curl -s -o /dev/null -w "Status: %{http_code}" -X POST http://127.0.0.1:3005/api/webhook/products -H "Content-Type: application/json" -H "x-api-key: $NOVA_CHAVE" -d '{"name":"Teste","category":"Diversos","imageUrl":"https://via.placeholder.com/100"}'

echo ""
echo "Reiniciando affiliate-bot..."
pm2 restart affiliate-bot --update-env

echo "Pronto! Status:"
pm2 list
"@

$cleanCommand = $sshCommand -replace "`r", ""
$cleanCommand = $cleanCommand -replace '\$NOVA_CHAVE', $NOVA_CHAVE
Write-Output $cleanCommand | ssh root@212.85.10.239 "bash"
