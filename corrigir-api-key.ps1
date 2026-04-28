# Corrige a API key do bot no VPS e para o processo duplicado
Write-Host "Corrigindo API key e conflito de bots..." -ForegroundColor Cyan
Write-Host "Forneca a senha quando solicitado" -ForegroundColor Yellow

$sshCommand = @"
echo "=== Verificando API key atual do Next.js ==="
grep API_SECRET_KEY ~/affiliate-hub/.env

echo ""
echo "=== Verificando API key atual do bot ==="
cat ~/affiliate-hub/bot/.env 2>/dev/null || echo "bot/.env nao encontrado"

echo ""
echo "=== Sincronizando API keys ==="
API_KEY=$(grep "^API_SECRET_KEY=" ~/affiliate-hub/.env | cut -d'=' -f2 | tr -d '"')
echo "API key do site: $API_KEY"

if [ -z "$API_KEY" ]; then
  echo "ERRO: API_SECRET_KEY nao encontrada no .env do site!"
else
  if [ -f ~/affiliate-hub/bot/.env ]; then
    sed -i "s|^AFFILIATE_HUB_API_KEY=.*|AFFILIATE_HUB_API_KEY=$API_KEY|g" ~/affiliate-hub/bot/.env
    echo "bot/.env atualizado!"
  else
    echo "AFFILIATE_HUB_API_KEY=$API_KEY" >> ~/affiliate-hub/bot/.env
    echo "bot/.env criado com a chave!"
  fi
fi

echo ""
echo "=== Parando processo duplicado affiliate-listener ==="
pm2 stop affiliate-listener 2>/dev/null && echo "affiliate-listener parado" || echo "affiliate-listener nao encontrado"

echo ""
echo "=== Reiniciando affiliate-bot ==="
pm2 restart affiliate-bot

echo ""
echo "=== Status final ==="
pm2 list

echo ""
echo "=== Aguardando 5s e verificando logs ==="
sleep 5
pm2 logs affiliate-bot --lines 20 --nostream
"@

$cleanCommand = $sshCommand -replace "`r", ""
Write-Output $cleanCommand | ssh root@212.85.10.239 "bash"
