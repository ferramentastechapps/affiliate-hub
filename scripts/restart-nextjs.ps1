$commands = @'
echo "=== RESTARTING NEXTJS PM2 ==="
pm2 restart nextjs
sleep 3
pm2 list
echo "=== TESTING PORT 3000 ==="
curl -I http://127.0.0.1:3000
'@
$commands | ssh -o StrictHostKeyChecking=no root@212.85.10.239 "tr -d '\r' | bash"
