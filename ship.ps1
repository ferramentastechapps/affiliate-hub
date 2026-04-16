$ErrorActionPreference = "Stop"

Write-Host "Preparando para o envio (Shipping) das atualizacoes..." -ForegroundColor Cyan

# Adicionar todas as mudancas
git add .

# Pedir mensagem do commit
$Msg = Read-Host "Mensagem do commit (pressione Enter para usar o padrao 'Ship update')"

if ([string]::IsNullOrWhiteSpace($Msg)) {
    $Msg = "Ship update"
}

# Realizar o commit
git commit -m $Msg

# Descobrir o nome da branch atual para dar push corretamente
$Branch = git branch --show-current
if ([string]::IsNullOrWhiteSpace($Branch)) {
    $Branch = "main"
}

Write-Host "Realizando o push para a branch $Branch..." -ForegroundColor Yellow
git push origin $Branch

Write-Host "Atualizacao enviada ao Github com sucesso!" -ForegroundColor Green

Write-Host "Iniciando Deploy na VPS (root@212.85.10.239)..." -ForegroundColor Cyan
Write-Host "Forneca a senha da VPS quando solicitado:" -ForegroundColor Yellow

# O comando SSH reformulado e robusto para evitar quebra de linhas e skips.
$sshCommand = @"
set -e
cd ~/affiliate-hub
echo "🔄 Atualizando código..."
git reset --hard
git pull origin $Branch

echo "📦 Instalando dependências..."
npm install

echo "🏗️  Fazendo build do Next.js..."
rm -rf .next
npm run build

echo "🤖 Configurando bot..."
cd bot
sed -i 's|AFFILIATE_HUB_URL=.*|AFFILIATE_HUB_URL=http://127.0.0.1:3005|g' ~/affiliate-hub/bot/.env
pip3 install -r requirements.txt --break-system-packages

echo "🔄 Reiniciando serviços..."
pkill -9 -f main.py || true
nohup python3 main.py > bot.log 2>&1 &

cd ~/affiliate-hub
pm2 delete nextjs 2>/dev/null || true
pm2 start npm --name "nextjs" -- start -- -p 3005
pm2 save

echo "✅ Deploy completo!"
pm2 status
echo "🌐 Next.js rodando em http://127.0.0.1:3005"
"@

# Envia o script à VPS como um pacote sólido para não engolir chamadas
$cleanCommand = $sshCommand -replace "`r", ""
Write-Output $cleanCommand | ssh root@212.85.10.239 "bash"

Write-Host "Deploy na VPS finalizado e sistemas rodando!" -ForegroundColor Green
