$commands = @'
tail -n 25 /root/.pm2/logs/whatsapp-engine-out.log
'@
$commands | ssh -o StrictHostKeyChecking=no root@212.85.10.239 "tr -d '\r' | bash"
