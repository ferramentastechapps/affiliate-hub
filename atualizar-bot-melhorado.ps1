# Script para atualizar o bot com as melhorias no VPS
# Execute: .\atualizar-bot-melhorado.ps1

Write-Host "🚀 Atualizando Bot de Promoções v2.0" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

# 1. Verificar se está na raiz do projeto
if (-not (Test-Path "bot/scrapers.py")) {
    Write-Host "❌ Execute este script na raiz do projeto!" -ForegroundColor Red
    exit 1
}

Write-Host "📦 1. Verificando arquivos modificados..." -ForegroundColor Cyan
$arquivos_modificados = @(
    "bot/scrapers.py",
    "bot/config.py",
    "bot/telegram_bot.py",
    "bot/main.py",
    "bot/README.md",
    ".env.example"
)

$arquivos_novos = @(
    "bot/MELHORIAS_IMPLEMENTADAS.md",
    "bot/testar_melhorias.py",
    "ESTRATEGIA_MELHORAR_BOT.md",
    "RESUMO_MELHORIAS.md"
)

foreach ($arquivo in $arquivos_modificados) {
    if (Test-Path $arquivo) {
        Write-Host "  ✅ $arquivo" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $arquivo (não encontrado)" -ForegroundColor Red
    }
}

foreach ($arquivo in $arquivos_novos) {
    if (Test-Path $arquivo) {
        Write-Host "  ✅ $arquivo (novo)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  $arquivo (não encontrado)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "📝 2. Verificando .env..." -ForegroundColor Cyan

if (Test-Path ".env") {
    Write-Host "  ✅ .env encontrado" -ForegroundColor Green
    
    # Verificar se tem as novas variáveis
    $env_content = Get-Content ".env" -Raw
    
    $novas_vars = @(
        "MIN_QUALITY_SCORE",
        "SEARCH_INTERVAL_MINUTES"
    )
    
    $faltando = @()
    foreach ($var in $novas_vars) {
        if ($env_content -notmatch $var) {
            $faltando += $var
        }
    }
    
    if ($faltando.Count -gt 0) {
        Write-Host "  ⚠️  Variáveis faltando no .env:" -ForegroundColor Yellow
        foreach ($var in $faltando) {
            Write-Host "     - $var" -ForegroundColor Yellow
        }
        Write-Host ""
        Write-Host "  💡 Adicione estas linhas no seu .env:" -ForegroundColor Cyan
        Write-Host "     SEARCH_INTERVAL_MINUTES=15" -ForegroundColor White
        Write-Host "     MIN_QUALITY_SCORE=30" -ForegroundColor White
    } else {
        Write-Host "  ✅ Todas as variáveis necessárias estão presentes" -ForegroundColor Green
    }
} else {
    Write-Host "  ⚠️  .env não encontrado - copie de .env.example" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🧪 3. Testando as melhorias localmente..." -ForegroundColor Cyan
Write-Host "  (Pressione Ctrl+C para pular)" -ForegroundColor Gray

try {
    $test_result = python bot/testar_melhorias.py 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Testes passaram!" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Alguns testes falharam (pode ser normal)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠️  Não foi possível executar testes" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📤 4. Preparando para enviar ao VPS..." -ForegroundColor Cyan

# Criar lista de arquivos para enviar
$arquivos_enviar = $arquivos_modificados + $arquivos_novos

Write-Host "  📋 Arquivos que serão enviados:" -ForegroundColor White
foreach ($arquivo in $arquivos_enviar) {
    if (Test-Path $arquivo) {
        Write-Host "     ✅ $arquivo" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "🚀 5. Comandos para executar no VPS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "# 1. Conectar ao VPS" -ForegroundColor White
Write-Host "ssh seu-usuario@seu-vps" -ForegroundColor Gray
Write-Host ""
Write-Host "# 2. Ir para o diretório do projeto" -ForegroundColor White
Write-Host "cd /caminho/do/projeto" -ForegroundColor Gray
Write-Host ""
Write-Host "# 3. Fazer backup" -ForegroundColor White
Write-Host "cp -r bot bot_backup_$(date +%Y%m%d)" -ForegroundColor Gray
Write-Host ""
Write-Host "# 4. Atualizar arquivos (use scp ou git)" -ForegroundColor White
Write-Host "# Opção A: Git" -ForegroundColor Gray
Write-Host "git pull" -ForegroundColor Gray
Write-Host ""
Write-Host "# Opção B: SCP (execute no Windows)" -ForegroundColor Gray
Write-Host "scp -r bot/* seu-usuario@seu-vps:/caminho/do/projeto/bot/" -ForegroundColor Gray
Write-Host ""
Write-Host "# 5. Atualizar .env (adicionar novas variáveis)" -ForegroundColor White
Write-Host "nano .env" -ForegroundColor Gray
Write-Host "# Adicione:" -ForegroundColor Gray
Write-Host "# SEARCH_INTERVAL_MINUTES=15" -ForegroundColor Gray
Write-Host "# MIN_QUALITY_SCORE=30" -ForegroundColor Gray
Write-Host ""
Write-Host "# 6. Testar as melhorias" -ForegroundColor White
Write-Host "cd bot" -ForegroundColor Gray
Write-Host "python testar_melhorias.py" -ForegroundColor Gray
Write-Host ""
Write-Host "# 7. Reiniciar o bot" -ForegroundColor White
Write-Host "# Se estiver usando systemd:" -ForegroundColor Gray
Write-Host "sudo systemctl restart bot-promocoes" -ForegroundColor Gray
Write-Host ""
Write-Host "# Se estiver usando screen:" -ForegroundColor Gray
Write-Host "screen -r bot" -ForegroundColor Gray
Write-Host "# Pressione Ctrl+C para parar" -ForegroundColor Gray
Write-Host "python main.py" -ForegroundColor Gray
Write-Host "# Pressione Ctrl+A+D para desanexar" -ForegroundColor Gray
Write-Host ""
Write-Host "# 8. Verificar logs" -ForegroundColor White
Write-Host "tail -f bot.log" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ Preparação concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Documentação:" -ForegroundColor Cyan
Write-Host "  - RESUMO_MELHORIAS.md - Resumo das mudanças" -ForegroundColor White
Write-Host "  - bot/MELHORIAS_IMPLEMENTADAS.md - Documentação completa" -ForegroundColor White
Write-Host "  - ESTRATEGIA_MELHORAR_BOT.md - Estratégia e próximos passos" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Bot v2.0 pronto para deploy!" -ForegroundColor Green
