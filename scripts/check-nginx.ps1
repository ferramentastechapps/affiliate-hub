$commands = @'
echo "=== TESTING NGINX LOCALHOST ==="
curl -I -k https://localhost || curl -I http://localhost
echo "=== TESTING EXTERNAL DOMAIN ==="
curl -I https://economizei.ftech-apps.com.br || true
echo "=== WHATSAPP ENGINE STATUS ==="
curl -s http://127.0.0.1:3006/status | head -c 250
echo ""
'@
$commands | ssh -o StrictHostKeyChecking=no root@212.85.10.239 "tr -d '\r' | bash"
