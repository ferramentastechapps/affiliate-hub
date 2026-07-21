# Script para verificar produtos no banco de dados

Write-Host "🔍 Verificando produtos no banco de dados..." -ForegroundColor Cyan
Write-Host ""

# Verificar produtos pendentes via API
$apiUrl = "http://127.0.0.1:3005/api/webhook/products/status"
$apiKey = "sua-chave-api-aqui"

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method Get -Headers @{
        "x-api-key" = $apiKey
    } -ErrorAction Stop
    
    Write-Host "✅ Produtos encontrados:" -ForegroundColor Green
    Write-Host "   Total: $($response.total)" -ForegroundColor White
    Write-Host "   Ativos: $($response.active)" -ForegroundColor Green
    Write-Host "   Pendentes: $($response.pending)" -ForegroundColor Yellow
    Write-Host "   Rejeitados: $($response.rejected)" -ForegroundColor Red
    Write-Host ""
    
    if ($response.pending -gt 0) {
        Write-Host "⚠️  Você tem $($response.pending) produtos aguardando aprovação!" -ForegroundColor Yellow
        Write-Host "   Use /aprovar [ID] [LINK] no Telegram para aprovar" -ForegroundColor White
    }
    
} catch {
    Write-Host "❌ Erro ao consultar API: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Verificando diretamente no VPS..." -ForegroundColor Cyan
}

Write-Host ""
Write-Host "📋 Para ver os produtos pendentes, execute:" -ForegroundColor Cyan
Write-Host "   ssh root@167.99.238.107" -ForegroundColor White
Write-Host "   cd /root/promoflash" -ForegroundColor White
Write-Host "   python3 bot/diagnostico_completo.py" -ForegroundColor White
