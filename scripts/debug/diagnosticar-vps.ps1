# ------------------------------------------------------------------------
# DIAGNOSTICO DA VPS
# ------------------------------------------------------------------------

Write-Host "------------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "DIAGNOSTICO: CONECTANDO A VPS" -ForegroundColor Cyan
Write-Host "------------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host ""

$ScriptPath = Join-Path $PSScriptRoot "diagnosticar-vps.sh"
if (-not (Test-Path $ScriptPath)) {
    $ScriptPath = ".\diagnosticar-vps.sh"
}

Write-Host "Carregando comandos de diagnostico..." -ForegroundColor Yellow
$shContent = Get-Content -Raw -Path $ScriptPath
$cleanCommand = $shContent -replace "`r", ""

Write-Host "Conectando na VPS e executando diagnostico..." -ForegroundColor Yellow
Write-Host "Forneca a senha da VPS quando solicitado:" -ForegroundColor Yellow
Write-Host ""

$OutputPath = Join-Path $PSScriptRoot "diagnostico-vps-output.txt"
if (-not $PSScriptRoot) {
    $OutputPath = ".\diagnostico-vps-output.txt"
}

# Iniciar conexão SSH com a chave id_ed25519 se ela existir
$sshKeyPath = "$env:USERPROFILE\.ssh\id_ed25519"
if (Test-Path $sshKeyPath) {
    Write-Host "Conectando com a chave SSH..." -ForegroundColor Yellow
    Write-Output $cleanCommand | ssh -i "$sshKeyPath" root@212.85.10.239 "bash" | Tee-Object -FilePath $OutputPath
} else {
    Write-Host "Chave SSH não encontrada em $sshKeyPath. Tentando conexão padrão..." -ForegroundColor Yellow
    Write-Output $cleanCommand | ssh root@212.85.10.239 "bash" | Tee-Object -FilePath $OutputPath
}


Write-Host ""
Write-Host "------------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "DIAGNOSTICO SALVO EM: diagnostico-vps-output.txt" -ForegroundColor Green
Write-Host "------------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host ""
Write-Host "Analise o arquivo diagnostico-vps-output.txt para identificar o problema." -ForegroundColor Yellow
Write-Host ""
