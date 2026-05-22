# ------------------------------------------------------------------------
# SCRIPT PARA SEPARAR PROJETOS MISTURADOS NA VPS
# ------------------------------------------------------------------------

Write-Host "------------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "SEPARAR PROJETOS MISTURADOS NA VPS" -ForegroundColor Cyan
Write-Host "------------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host ""

Write-Host "Este script vai:" -ForegroundColor Yellow
Write-Host "1. Parar todos os processos" -ForegroundColor White
Write-Host "2. Limpar configuracoes antigas" -ForegroundColor White
Write-Host "3. Configurar Affiliate Hub na porta 3005" -ForegroundColor White
Write-Host "4. Atualizar Nginx para apontar para a porta 3005" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Deseja continuar? (s/n)"
if ($confirm -ne "s") {
    Write-Host "Operacao cancelada." -ForegroundColor Red
    exit
}

$ScriptPath = Join-Path $PSScriptRoot "separar-projetos-vps.sh"
if (-not (Test-Path $ScriptPath)) {
    $ScriptPath = ".\separar-projetos-vps.sh"
}

Write-Host "Carregando scripts de configuracao..." -ForegroundColor Yellow
$shContent = Get-Content -Raw -Path $ScriptPath
$cleanCommand = $shContent -replace "`r", ""

Write-Host "Conectando na VPS e executando a configuracao..." -ForegroundColor Yellow
Write-Host "Forneca a senha da VPS quando solicitado:" -ForegroundColor Yellow
Write-Host ""

Write-Output $cleanCommand | ssh root@212.85.10.239 "bash"

Write-Host ""
Write-Host "------------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "CONFIGURACAO CONCLUIDA COM SUCESSO!" -ForegroundColor Green
Write-Host "------------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host ""
Write-Host "Teste o acesso ao site para verificar se atualizou." -ForegroundColor Yellow
Write-Host ""
