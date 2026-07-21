$ErrorActionPreference = "Stop"

Write-Host "Limpando cache e rebuild..." -ForegroundColor Cyan

# Limpar .next
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "Cache .next removido" -ForegroundColor Green
}

# Rebuild
Write-Host "Fazendo build..." -ForegroundColor Yellow
npm run build

Write-Host "Build completo!" -ForegroundColor Green
