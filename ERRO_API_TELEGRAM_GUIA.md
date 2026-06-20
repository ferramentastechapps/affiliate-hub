# 🚨 Guia Definitivo: Erro de API no Robô (ID do Produto)

Este documento foi criado para ajudar a resolver rapidamente o problema onde o robô de promoções falha ao registrar produtos na API do site.

## 🔍 Sintomas do Problema

Você sabe que está enfrentando esse problema se notar os seguintes comportamentos no seu Telegram:

1. **Sintoma Antigo:** O robô envia o produto para aprovação, mas o ID do produto aparece como `ERRO-API-Nome_do_Produto`.
2. **Sintoma Atual:** O robô envia apenas a mensagem de Resumo ("Busca de Promoções Concluída - Produtos encontrados: X"), mas **nenhum produto** chega para você aprovar individualmente.

## ⚙️ A Causa Raiz

Esses sintomas ocorrem porque o robô (o scraper Python) tentou enviar as promoções encontradas para o seu site Next.js, mas o seu site **bloqueou a requisição**. 

Na grande maioria das vezes, o bloqueio acontece por causa de uma **Chave de API (API Key) incorreta**. O site usa uma chave segura (`f6c684a...`), mas por algum motivo de cache ou configuração, o robô tenta se comunicar usando a chave padrão de testes (`mude-esta-chave-por-uma-segura-123456789`). Quando isso acontece, o site retorna o erro `401 Unauthorized`.

Para não poluir o seu Telegram com comandos de `/aprovar` quebrados, o robô automaticamente corta o envio dos produtos até que ele consiga salvar no banco de dados.

## 🛠️ Como Diagnosticar (Ter Certeza)

Se os produtos pararem de chegar, verifique os logs para confirmar se é o erro `401 Unauthorized`:

1. No seu PowerShell local, rode o script de captura de logs:
   ```powershell
   .\buscar-logs-erro.ps1
   ```
2. Abra o arquivo `logs_vps.txt` que foi gerado na sua pasta.
3. Se você encontrar a seguinte linha, o problema é exatamente a Chave de API:
   ```text
   [API] Status: 401 | Body: {"error":"Não autorizado. API key inválida."}
   ```

## ✅ Como Resolver Imediatamente

Não se preocupe, a solução já foi programada dentro do seu script de deploy (`ship.ps1`)!

O script de deploy já conta com travas de segurança que:
1. Injetam a Chave de API correta nos arquivos `.env` do robô e do site.
2. Forçam o pacote Python a sobrescrever qualquer chave antiga em memória (`override=True`).
3. Limpam processos "fantasmas" no servidor (`nohup`) e reiniciam os robôs pelo **PM2** da forma correta.

**Passo a passo da solução:**

1. No seu PowerShell, faça o deploy novamente:
   ```powershell
   .\ship.ps1
   ```
2. Digite a senha da VPS quando solicitado e espere o final.
3. Para testar se voltou a funcionar, force uma busca imediata rodando:
   ```powershell
   .\forcar-busca.ps1
   ```

*(Se produtos chegarem no seu Telegram logo após rodar o `forcar-busca.ps1`, o problema está 100% resolvido!)*
