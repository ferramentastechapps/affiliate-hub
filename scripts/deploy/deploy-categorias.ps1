# Deploy das Melhorias de Categorias para o VPS

Write-Host "🚀 Iniciando deploy das melhorias de categorias..." -ForegroundColor Cyan

# 1. Fazer push do código
Write-Host "`n📤 Fazendo push para o GitHub..." -ForegroundColor Yellow
git push origin master

# 2. Conectar ao VPS e fazer pull
Write-Host "`n📥 Conectando ao VPS e atualizando código..." -ForegroundColor Yellow
ssh root@212.85.10.239 @"
cd ~/affiliate-hub
echo '🔄 Fazendo git pull...'
git pull origin master

echo '📦 Instalando dependências (se houver novas)...'
npm install

echo '🏗️ Fazendo build do Next.js...'
npm run build

echo '♻️ Reiniciando aplicação...'
pm2 restart next-app

echo '✅ Deploy concluído!'
pm2 status
"@

Write-Host "`n✅ Deploy finalizado!" -ForegroundColor Green
Write-Host "`nVerifique o site em: https://economiza-ai.com.br" -ForegroundColor Cyan
