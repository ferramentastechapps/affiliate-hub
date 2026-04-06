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

# O comando SSH abaixo entra no servidor, atualiza o codigo com git pull, instala depedencias do bot e reinicia o robo em background
$sshCommand = "cd ~/affiliate-hub && git reset --hard && git pull origin $Branch && cd bot && sed -i 's|AFFILIATE_HUB_URL=.*|AFFILIATE_HUB_URL=http://localhost:3005|g' ~/affiliate-hub/bot/.env && pip3 install -r requirements.txt --break-system-packages && pkill -9 -f main.py; screen -dmS promo-bot python3 main.py; echo 'Robo reiniciado com Sucesso!'"

ssh -t root@212.85.10.239 $sshCommand

Write-Host "Deploy na VPS finalizado e Robo rodando em Background!" -ForegroundColor Green
