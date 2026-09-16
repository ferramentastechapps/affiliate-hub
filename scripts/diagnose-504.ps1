$commands = @"
echo "=== CPU & MEMORY ==="
top -b -n 1 | head -n 25
echo "=== PM2 STATUS ==="
pm2 list
echo "=== NEXTJS LOGS ==="
tail -n 20 /root/.pm2/logs/nextjs-error.log
tail -n 20 /root/.pm2/logs/nextjs-out.log
echo "=== PORT 3000 TEST ==="
curl -I http://127.0.0.1:3000
"@
$commands | ssh -o StrictHostKeyChecking=no root@212.85.10.239 "tr -d '\r' | bash"
