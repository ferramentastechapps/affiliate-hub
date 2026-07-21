#!/bin/bash

# Script para configurar SSL no domínio economizei.ftech-apps.com.br
DOMAIN="economizei.ftech-apps.com.br"
EMAIL="apkassistenciatecnica@gmail.com"  # Coloque seu email aqui

echo "🔧 Configurando SSL para $DOMAIN..."

# 1. Criar configuração do Nginx
cat > /etc/nginx/sites-available/$DOMAIN << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name economizei.ftech-apps.com.br;

    # Redirecionar todo HTTP para HTTPS (será adicionado após o SSL)
    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Aumentar timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# 2. Criar link simbólico para ativar o site
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN

# 3. Remover configuração default se existir
rm -f /etc/nginx/sites-enabled/default

# 4. Testar configuração do Nginx
echo "📝 Testando configuração do Nginx..."
nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Erro na configuração do Nginx!"
    exit 1
fi

# 5. Reiniciar Nginx
echo "🔄 Reiniciando Nginx..."
systemctl restart nginx

# 6. Verificar se o domínio está apontando para o servidor
echo "🔍 Verificando DNS do domínio..."
DIG_RESULT=$(dig +short $DOMAIN @8.8.8.8 | tail -n1)
SERVER_IP=$(curl -4 -s ifconfig.me)

if [ "$DIG_RESULT" != "$SERVER_IP" ]; then
    echo "⚠️  ATENÇÃO: O domínio $DOMAIN não está apontando para este servidor!"
    echo "   DNS aponta para: $DIG_RESULT"
    echo "   IP do servidor: $SERVER_IP"
    echo ""
    echo "   Configure o DNS primeiro:"
    echo "   Tipo: A"
    echo "   Nome: economizei"
    echo "   Valor: $SERVER_IP"
    echo ""
    echo "   Após configurar o DNS, aguarde alguns minutos e execute novamente:"
    echo "   bash ~/affiliate-hub/setup-ssl.sh"
    exit 1
fi

# 7. Obter certificado SSL com Certbot
echo "🔒 Obtendo certificado SSL..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL --redirect

if [ $? -eq 0 ]; then
    echo "✅ SSL configurado com sucesso!"
    echo "🌐 Seu site está disponível em: https://$DOMAIN"
    
    # 8. Configurar renovação automática
    echo "🔄 Configurando renovação automática do SSL..."
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
    
    echo "✅ Renovação automática configurada!"
else
    echo "❌ Erro ao obter certificado SSL"
    echo "Verifique se:"
    echo "1. O domínio está apontando para o servidor"
    echo "2. A porta 80 está aberta no firewall"
    echo "3. O Nginx está rodando: systemctl status nginx"
fi

# 9. Testar configuração final
echo ""
echo "📋 Status dos serviços:"
systemctl status nginx --no-pager | head -n 5
echo ""
echo "🔥 Testando acesso ao site..."
curl -I https://$DOMAIN 2>&1 | head -n 1
