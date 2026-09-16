$commands = @'
echo "=== TOP CPU CONSUMING PROCESSES ==="
ps aux --sort=-%cpu | head -n 12
echo "=== SUPABASE POOLER NETWORK TEST ==="
nc -zv -w 3 aws-1-sa-east-1.pooler.supabase.com 6543 || echo "Supabase connection failed"
'@
$commands | ssh -o StrictHostKeyChecking=no root@212.85.10.239 "tr -d '\r' | bash"
