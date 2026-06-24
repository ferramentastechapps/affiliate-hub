$ErrorActionPreference = "Stop"

Write-Host "Preparando para o envio (Shipping) das atualizacoes..." -ForegroundColor Cyan

# Adicionar todas as mudancas
git add .

# Pedir mensagem do commit
if ($env:COMMIT_MSG) {
    $Msg = $env:COMMIT_MSG
} else {
    $Msg = Read-Host "Mensagem do commit (pressione Enter para usar o padrao 'Ship update')"
}

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

# Carregar valores locais do .env para repassar para o VPS
$LocalEnv = @{}
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $parts = $line.Split("=", 2)
            if ($parts.Length -eq 2) {
                $LocalEnv[$parts[0].Trim()] = $parts[1].Trim().Trim('"').Trim("'")
            }
        }
    }
}
$SHOPEE_ID = $LocalEnv["SHOPEE_APP_ID"]
$SHOPEE_SECRET = $LocalEnv["SHOPEE_APP_SECRET"]
$GEMINI_KEY = $LocalEnv["GEMINI_API_KEY"]
$NVIDIA_KEY = $LocalEnv["NVIDIA_API_KEY"]
$OPENROUTER_KEY = $LocalEnv["OPENROUTER_API_KEY"]

# O comando SSH reformulado e robusto para evitar quebra de linhas e skips.
$sshCommand = @"
set -e
cd ~/affiliate-hub
echo "🔄 Atualizando código..."
git reset --hard
git fetch origin
git reset --hard origin/$Branch

# Sincronizar chaves locais para o VPS
SHOPEE_ID="$SHOPEE_ID"
SHOPEE_SECRET="$SHOPEE_SECRET"
GEMINI_KEY_VAL="$GEMINI_KEY"
NVIDIA_KEY_VAL="$NVIDIA_KEY"
OPENROUTER_KEY_VAL="$OPENROUTER_KEY"

echo "⚙️ Sincronizando chaves locais para o VPS..."

if [ -n "$SHOPEE_ID" ]; then
  if grep -q 'SHOPEE_APP_ID=' ~/affiliate-hub/.env; then
    sed -i "s|SHOPEE_APP_ID=.*|SHOPEE_APP_ID=\"$SHOPEE_ID\"|g" ~/affiliate-hub/.env
  else
    echo "SHOPEE_APP_ID=\"$SHOPEE_ID\"" >> ~/affiliate-hub/.env
  fi
  if grep -q 'SHOPEE_APP_ID=' ~/affiliate-hub/bot/.env; then
    sed -i "s|SHOPEE_APP_ID=.*|SHOPEE_APP_ID=\"$SHOPEE_ID\"|g" ~/affiliate-hub/bot/.env
  else
    echo "SHOPEE_APP_ID=\"$SHOPEE_ID\"" >> ~/affiliate-hub/bot/.env
  fi
fi

if [ -n "$SHOPEE_SECRET" ]; then
  if grep -q 'SHOPEE_APP_SECRET=' ~/affiliate-hub/.env; then
    sed -i "s|SHOPEE_APP_SECRET=.*|SHOPEE_APP_SECRET=\"$SHOPEE_SECRET\"|g" ~/affiliate-hub/.env
  else
    echo "SHOPEE_APP_SECRET=\"$SHOPEE_SECRET\"" >> ~/affiliate-hub/.env
  fi
  if grep -q 'SHOPEE_APP_SECRET=' ~/affiliate-hub/bot/.env; then
    sed -i "s|SHOPEE_APP_SECRET=.*|SHOPEE_APP_SECRET=\"$SHOPEE_SECRET\"|g" ~/affiliate-hub/bot/.env
  else
    echo "SHOPEE_APP_SECRET=\"$SHOPEE_SECRET\"" >> ~/affiliate-hub/bot/.env
  fi
fi

if [ -n "$GEMINI_KEY_VAL" ]; then
  if grep -q 'GEMINI_API_KEY=' ~/affiliate-hub/.env; then
    sed -i "s|GEMINI_API_KEY=.*|GEMINI_API_KEY=\"$GEMINI_KEY_VAL\"|g" ~/affiliate-hub/.env
  else
    echo "GEMINI_API_KEY=\"$GEMINI_KEY_VAL\"" >> ~/affiliate-hub/.env
  fi
  if grep -q 'GEMINI_API_KEY=' ~/affiliate-hub/bot/.env; then
    sed -i "s|GEMINI_API_KEY=.*|GEMINI_API_KEY=\"$GEMINI_KEY_VAL\"|g" ~/affiliate-hub/bot/.env
  else
    echo "GEMINI_API_KEY=\"$GEMINI_KEY_VAL\"" >> ~/affiliate-hub/bot/.env
  fi
fi

if [ -n "$NVIDIA_KEY_VAL" ]; then
  if grep -q 'NVIDIA_API_KEY=' ~/affiliate-hub/.env; then
    sed -i "s|NVIDIA_API_KEY=.*|NVIDIA_API_KEY=\"$NVIDIA_KEY_VAL\"|g" ~/affiliate-hub/.env
  else
    echo "NVIDIA_API_KEY=\"$NVIDIA_KEY_VAL\"" >> ~/affiliate-hub/.env
  fi
  if grep -q 'NVIDIA_API_KEY=' ~/affiliate-hub/bot/.env; then
    sed -i "s|NVIDIA_API_KEY=.*|NVIDIA_API_KEY=\"$NVIDIA_KEY_VAL\"|g" ~/affiliate-hub/bot/.env
  else
    echo "NVIDIA_API_KEY=\"$NVIDIA_KEY_VAL\"" >> ~/affiliate-hub/bot/.env
  fi
fi

if [ -n "$OPENROUTER_KEY_VAL" ]; then
  if grep -q 'OPENROUTER_API_KEY=' ~/affiliate-hub/.env; then
    sed -i "s|OPENROUTER_API_KEY=.*|OPENROUTER_API_KEY=\"$OPENROUTER_KEY_VAL\"|g" ~/affiliate-hub/.env
  else
    echo "OPENROUTER_API_KEY=\"$OPENROUTER_KEY_VAL\"" >> ~/affiliate-hub/.env
  fi
  if grep -q 'OPENROUTER_API_KEY=' ~/affiliate-hub/bot/.env; then
    sed -i "s|OPENROUTER_API_KEY=.*|OPENROUTER_API_KEY=\"$OPENROUTER_KEY_VAL\"|g" ~/affiliate-hub/bot/.env
  else
    echo "OPENROUTER_API_KEY=\"$OPENROUTER_KEY_VAL\"" >> ~/affiliate-hub/bot/.env
  fi
fi

echo "📦 Instalando dependências..."
npm install

echo "🗄️  Sincronizando schema do banco de dados..."
npx prisma db push --accept-data-loss

echo "🏗️  Fazendo build do Next.js..."
rm -rf .next
rm -f public/sw.js public/workbox-*.js public/fallback-*.js public/swe-worker-*.js public/worker-*.js
NEXT_TELEMETRY_DISABLED=1 npm run build

echo "🎬 Convertendo vídeo de entrada para MP4 (compatibilidade Android/Chrome)..."
if command -v ffmpeg &>/dev/null; then
  MOV_SRC="public/Video de entrada.mov"
  MP4_DST="public/Video de entrada.mp4"
  if [ -f "$MOV_SRC" ]; then
    if [ ! -f "$MP4_DST" ] || [ "$MOV_SRC" -nt "$MP4_DST" ]; then
      ffmpeg -y -i "$MOV_SRC" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -movflags +faststart "$MP4_DST" 2>/dev/null \
        && echo "  ✅ Video de entrada.mp4 convertido com sucesso!" \
        || echo "  ⚠️  Falha ao converter vídeo — o .mov será usado como fallback"
    else
      echo "  ℹ️  MP4 já atualizado, pulando conversão"
    fi
  else
    echo "  ⚠️  Arquivo .mov não encontrado em public/ — ignorando conversão"
  fi
else
  echo "  ⚠️  ffmpeg não instalado. Instale com: apt-get install -y ffmpeg"
  echo "       Sem conversão, Android não exibirá o vídeo de entrada"
fi


echo "🤖 Configurando bot..."
cd bot
sed -i 's|AFFILIATE_HUB_URL=.*|AFFILIATE_HUB_URL=https://economizei.ftech-apps.com.br|g' ~/affiliate-hub/bot/.env
sed -i 's|AFFILIATE_HUB_API_KEY=.*|AFFILIATE_HUB_API_KEY=f6c684a41738ecbc7a95d875fcd93db0b8c30e80df6b5fc09bdfd41d0e651598|g' ~/affiliate-hub/bot/.env
grep -q 'AFFILIATE_HUB_API_KEY' ~/affiliate-hub/bot/.env || echo 'AFFILIATE_HUB_API_KEY=f6c684a41738ecbc7a95d875fcd93db0b8c30e80df6b5fc09bdfd41d0e651598' >> ~/affiliate-hub/bot/.env
sed -i 's|AFFILIATE_HUB_API_KEY=.*|AFFILIATE_HUB_API_KEY=f6c684a41738ecbc7a95d875fcd93db0b8c30e80df6b5fc09bdfd41d0e651598|g' ~/affiliate-hub/.env
grep -q 'TELEGRAM_PROMO_GROUP_ID' ~/affiliate-hub/bot/.env || echo 'TELEGRAM_PROMO_GROUP_ID=-5152308507' >> ~/affiliate-hub/bot/.env
grep -q 'LOMADEE_APP_TOKEN' ~/affiliate-hub/bot/.env || echo 'LOMADEE_APP_TOKEN=lmd_dev_9GWWVA5hbj_0LovGyptGY0L0QyYxZeR0QWwcnFI6k3u' >> ~/affiliate-hub/bot/.env
sed -i 's|LOMADEE_APP_TOKEN=.*|LOMADEE_APP_TOKEN=lmd_dev_9GWWVA5hbj_0LovGyptGY0L0QyYxZeR0QWwcnFI6k3u|g' ~/affiliate-hub/bot/.env
grep -q 'LOMADEE_SOURCE_ID' ~/affiliate-hub/bot/.env || echo 'LOMADEE_SOURCE_ID=2324685' >> ~/affiliate-hub/bot/.env
sed -i 's|LOMADEE_SOURCE_ID=.*|LOMADEE_SOURCE_ID=2324685|g' ~/affiliate-hub/bot/.env

pip3 install -r requirements.txt --break-system-packages

echo "🔄 Reiniciando serviços..."
cd ~/affiliate-hub

# Matar processos python órfãos rodando main.py e telegram_listener.py (nohup antigo e listeners soltos)
pkill -f "python3.*main.py" || true
pkill -f "python3.*telegram_listener.py" || true
pkill -f telegram_listener.py || true

# Remover processos antigos/duplicados do PM2 se existirem
pm2 delete affiliate-bot > /dev/null 2>&1 || true
pm2 delete promobot > /dev/null 2>&1 || true
pm2 delete affiliate-listener > /dev/null 2>&1 || true
pm2 delete affiliate-hub-listener > /dev/null 2>&1 || true
pm2 delete affiliate-hub-scraper > /dev/null 2>&1 || true
pm2 delete affiliate-scraper > /dev/null 2>&1 || true
pm2 delete affiliate-hub-web > /dev/null 2>&1 || true
pm2 delete nextjs > /dev/null 2>&1 || true
pm2 delete telegram-bot > /dev/null 2>&1 || true
pm2 delete whatsapp-engine > /dev/null 2>&1 || true

# Iniciar ou recarregar os bots usando o arquivo de ecossistema
cd ~/affiliate-hub
pm2 start ecosystem.config.js

pm2 save


echo "✅ Deploy completo!"
pm2 status
echo "🌐 Next.js rodando em http://127.0.0.1:3005"
"@

# Envia o script à VPS como um pacote sólido para não engolir chamadas
$cleanCommand = $sshCommand -replace "`r", ""
Write-Output $cleanCommand | ssh root@212.85.10.239 "bash"

Write-Host "Deploy na VPS finalizado e sistemas rodando!" -ForegroundColor Green
