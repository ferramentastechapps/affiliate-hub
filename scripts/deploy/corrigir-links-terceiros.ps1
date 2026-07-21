# Script PowerShell para corrigir links de afiliados terceiros
# Executa deploy completo e adiciona AMAZON_TAG no .env da VPS

Write-Host "=== CORREÇÃO DE LINKS DE AFILIADOS TERCEIROS ===" -ForegroundColor Cyan
Write-Host ""

# Passo 1: Commit e push do código local
Write-Host "PASSO 1: Fazendo commit e push do código..." -ForegroundColor Yellow
git add -A
git commit -m "fix: resolver links divulgador.link e aplicar tag correta"
git push

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao fazer push. Verifique o git." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Código enviado com sucesso!" -ForegroundColor Green
Write-Host ""

# Passo 2: Deploy na VPS
Write-Host "PASSO 2: Fazendo deploy na VPS..." -ForegroundColor Yellow

$deployCommands = @"
cd /root/affiliate-hub
echo '=== Atualizando código ==='
git pull
echo ''
echo '=== Verificando AMAZON_TAG no .env ==='
if grep -q 'AMAZON_TAG' .env; then
    echo '✅ AMAZON_TAG já existe:'
    grep 'AMAZON_TAG' .env
else
    echo '❌ AMAZON_TAG não encontrada, adicionando...'
    echo '' >> .env
    echo '# Tag de afiliado Amazon' >> .env
    echo 'AMAZON_TAG=jota012d-20' >> .env
    echo '✅ AMAZON_TAG adicionada com sucesso!'
fi
echo ''
echo '=== Fazendo build do Next.js ==='
npm run build
echo ''
echo '=== Reiniciando serviços ==='
pm2 restart ecosystem.config.js
echo ''
echo '=== Status dos serviços ==='
pm2 list
echo ''
echo '=== Deploy concluído! ==='
"@

ssh root@212.85.10.239 $deployCommands

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Houve algum erro no deploy. Verifique os logs acima." -ForegroundColor Yellow
} else {
    Write-Host "✅ Deploy concluído com sucesso!" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== PRÓXIMOS PASSOS ===" -ForegroundColor Cyan
Write-Host "1. Aguarde ~30 segundos para o Next.js reiniciar completamente" -ForegroundColor White
Write-Host "2. Teste enviando este link no Telegram:" -ForegroundColor White
Write-Host "   https://amzn.divulgador.link/JsQPa8IE" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Resultado esperado:" -ForegroundColor White
Write-Host "   ✅ Link: amazon.com.br/dp/B0H3PVXCKD?tag=jota012d-20" -ForegroundColor Green
Write-Host "   ✅ Nome: Chaleira Elétrica... (não 'Amazon.com.br')" -ForegroundColor Green
Write-Host "   ✅ Foto: Imagem da chaleira" -ForegroundColor Green
Write-Host "   ✅ Sem timeout" -ForegroundColor Green
Write-Host ""
Write-Host "4. Para ver logs em tempo real:" -ForegroundColor White
Write-Host "   ssh root@212.85.10.239 ""pm2 logs nextjs --lines 50""" -ForegroundColor Yellow
Write-Host ""
