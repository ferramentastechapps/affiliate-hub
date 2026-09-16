echo "=== CPU & MEMORY ==="
top -b -n 1 | head -n 25
echo "=== PM2 STATUS ==="
pm2 list
echo "=== NEXTJS LOGS ==="
tail -n 30 /root/.pm2/logs/nextjs-error.log /root/.pm2/logs/nextjs-out.log
