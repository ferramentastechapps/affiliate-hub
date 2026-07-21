# Script para autorizar sua chave SSH na VPS (rodar UMA vez)
# Apos isso, ship.ps1 nao pede mais senha!

$VPS = "root@212.85.10.239"
$pubkey = Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub"

Write-Host "Copiando chave SSH para a VPS..." -ForegroundColor Cyan
Write-Host "Digite a senha da VPS UMA ULTIMA VEZ:" -ForegroundColor Yellow

# Envia a chave publica para authorized_keys na VPS
$cmd = "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '$pubkey' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo 'Chave SSH autorizada com sucesso!'"
ssh $VPS $cmd

Write-Host ""
Write-Host "Pronto! A partir de agora ship.ps1 roda sem pedir senha." -ForegroundColor Green
