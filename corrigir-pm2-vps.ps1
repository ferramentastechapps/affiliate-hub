# ------------------------------------------------------------------------
# SCRIPT PARA CORRIGIR DIRETORIO DO PM2 NA VPS
# ------------------------------------------------------------------------

Write-Host "------------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "CORRECAO DO PM2: DEFININDO DIRETORIO CORRETO NA VPS" -ForegroundColor Cyan
Write-Host "------------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host ""

$ScriptPath = Join-Path $PSScriptRoot "corrigir-pm2-vps.sh"
if (-not (Test-Path $ScriptPath)) {
    $ScriptPath = ".\corrigir-pm2-vps.sh"
}

Write-Host "Carregando comandos de correcao..." -ForegroundColor Yellow
$shContent = Get-Content -Raw -Path $ScriptPath
$cleanCommand = $shContent -replace "`r", ""

Write-Host "Conectando na VPS e executando a correcao..." -ForegroundColor Yellow
Write-Host "Forneca a senha da VPS quando solicitado:" -ForegroundColor Yellow
Write-Host ""

$OutputPath = Join-Path $PSScriptRoot "corrigir-pm2-output.txt"
if (-not $PSScriptRoot) {
    $OutputPath = ".\corrigir-pm2-output.txt"
}

Write-Output $cleanCommand | ssh root@212.85.10.239 "bash" | Tee-Object -FilePath $OutputPath

Write-Host ""
Write-Host "------------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "PROCESSO CONCLUIDO!" -ForegroundColor Green
Write-Host "Verifique a saida acima e acesse o site novamente." -ForegroundColor Yellow
Write-Host "------------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host ""
