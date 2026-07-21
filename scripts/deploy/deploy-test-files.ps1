$ErrorActionPreference = "Stop"

Write-Host "📤 Enviando arquivos de teste para o servidor..." -ForegroundColor Cyan

# Arquivos para enviar
$files = @(
    "bot/test_api_response.py",
    "bot/DIAGNOSTICO_ID.md",
    "bot/CORRIGIR_ID_PRODUTO.md",
    "TESTAR_ID_AGORA.txt"
)

Write-Host "Arquivos que serão enviados:" -ForegroundColor Yellow
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file (não encontrado)" -ForegroundColor Red
    }
}

Write-Host "`nEnviando para root@212.85.10.239..." -ForegroundColor Cyan

# Enviar cada arquivo
foreach ($file in $files) {
    if (Test-Path $file) {
        $remotePath = "/root/affiliate-hub/$file"
        Write-Host "Enviando $file..." -ForegroundColor Gray
        scp $file "root@212.85.10.239:$remotePath"
    }
}

Write-Host "`n✅ Arquivos enviados com sucesso!" -ForegroundColor Green
Write-Host "`nAgora execute no servidor:" -ForegroundColor Yellow
Write-Host "cd /root/affiliate-hub/bot" -ForegroundColor White
Write-Host "python3 test_api_response.py" -ForegroundColor White
