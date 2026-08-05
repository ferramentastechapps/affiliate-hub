const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
app.use(express.json());

const PORT = 3006;

// Variables from env
const GROUP_NAME = process.env.WHATSAPP_GROUP_NAME || "";
const GROUP_ID = process.env.WHATSAPP_GROUP_ID || "";
const DELAY_MINUTES = parseInt(process.env.WHATSAPP_DELAY_MINUTES || "30", 10);

const fs = require('fs');

// Global State
let isReady = false;
let latestQr = null;
let messageQueue = []; // array of { score: number, message: string }
let lastFlushTime = Date.now();

const STATE_FILE = path.join(__dirname, 'state.json');

// Helper to save state to disk
function saveState() {
    try {
        const state = {
            messageQueue,
            lastFlushTime
        };
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
        console.error('❌ Erro ao salvar estado em disco:', err.message);
    }
}

// Helper to load state from disk
function loadState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            const data = fs.readFileSync(STATE_FILE, 'utf-8');
            const state = JSON.parse(data);
            messageQueue = state.messageQueue || [];
            lastFlushTime = state.lastFlushTime || Date.now();
            console.log(`📂 Estado carregado do disco: ${messageQueue.length} oferta(s) pendente(s), último disparo há ${Math.round((Date.now() - lastFlushTime) / 60000)} minutos.`);
        } else {
            messageQueue = [];
            lastFlushTime = Date.now();
        }
    } catch (err) {
        console.error('❌ Erro ao carregar estado do disco:', err.message);
        messageQueue = [];
        lastFlushTime = Date.now();
    }
}

// Carrega o estado salvo imediatamente no início
loadState();

const https = require('https');
const http = require('http');

/**
 * Baixa uma imagem via Node.js nativo (NÃO dentro do Puppeteer).
 * Retorna null se falhar. Evita o erro "Runtime.callFunctionOn timed out".
 */
function downloadImageAsBase64(imageUrl, timeoutMs = 20000) {
    return new Promise((resolve) => {
        try {
            const protocol = imageUrl.startsWith('https') ? https : http;
            const req = protocol.get(imageUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'image/*,*/*'
                },
                timeout: timeoutMs
            }, (res) => {
                // Seguir redirecionamentos (301/302)
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    return resolve(downloadImageAsBase64(res.headers.location, timeoutMs));
                }
                if (res.statusCode !== 200) {
                    console.warn(`⚠️ Download de imagem retornou status ${res.statusCode}: ${imageUrl}`);
                    return resolve(null);
                }
                const contentType = res.headers['content-type'] || 'image/jpeg';
                const mimeType = contentType.split(';')[0].trim();
                const chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    resolve({ base64: buffer.toString('base64'), mimeType });
                });
                res.on('error', (err) => {
                    console.warn('⚠️ Erro ao ler stream da imagem:', err.message);
                    resolve(null);
                });
            });
            req.on('error', (err) => {
                console.warn('⚠️ Erro ao baixar imagem:', err.message);
                resolve(null);
            });
            req.on('timeout', () => {
                req.destroy();
                console.warn('⚠️ Timeout ao baixar imagem:', imageUrl);
                resolve(null);
            });
        } catch (err) {
            console.warn('⚠️ Exceção ao baixar imagem:', err.message);
            resolve(null);
        }
    });
}

// Helper para buscar proxy aleatório da Webshare
function getWebshareProxy(apiKey) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'proxy.webshare.io',
            path: '/api/v2/proxy/list/?mode=direct&page=1&page_size=100&country_code=BR',
            method: 'GET',
            headers: {
                'Authorization': `Token ${apiKey}`
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    return reject(new Error(`Status Code: ${res.statusCode}`));
                }
                try {
                    const json = JSON.parse(data);
                    const results = json.results || [];
                    const validProxies = results.filter(p => p.valid === true);
                    if (validProxies.length === 0) {
                        return resolve(null);
                    }
                    const randomIndex = Math.floor(Math.random() * validProxies.length);
                    const proxy = validProxies[randomIndex];
                    resolve(proxy);
                } catch (err) {
                    reject(err);
                }
            });
        });

        req.on('error', (err) => { reject(err); });
        req.end();
    });
}

// Declarar a variável client globalmente
let client;

// Função assíncrona de inicialização do WhatsApp
async function initWhatsApp() {
    let puppeteerArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
    ];
    let proxyConfig = null;

    const apiKey = process.env.WEBSHARE_API_KEY;
    const disableProxy = process.env.DISABLE_WHATSAPP_PROXY === 'true';
    if (apiKey && !disableProxy) {
        console.log('🌐 Webshare API Key encontrada. Buscando proxy...');
        try {
            const proxy = await getWebshareProxy(apiKey);
            if (proxy) {
                console.log(`✅ Usando proxy Webshare: ${proxy.proxy_address}:${proxy.port}`);
                puppeteerArgs.push(`--proxy-server=http://${proxy.proxy_address}:${proxy.port}`);
                proxyConfig = proxy;
            } else {
                console.warn('⚠️ Nenhum proxy válido retornado pela Webshare. Iniciando sem proxy.');
            }
        } catch (err) {
            console.error('❌ Erro ao buscar proxy da Webshare. Iniciando sem proxy. Erro:', err.message);
        }
    } else {
        console.log('ℹ️ Proxy desativado ou API Key não configurada. Iniciando sem proxy.');
    }

    let clientOptions = {
        authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
        puppeteer: {
            executablePath: '/root/.cache/puppeteer/chrome/linux-146.0.7680.31/chrome-linux64/chrome',
            args: puppeteerArgs,
            headless: true,
            protocolTimeout: 120000
        },
        webVersionCache: {
            type: 'none'
        }
    };

    if (proxyConfig) {
        clientOptions.proxyAuthentication = {
            username: proxyConfig.username,
            password: proxyConfig.password
        };
    }

    client = new Client(clientOptions);

    client.on('qr', (qr) => {
        latestQr = qr;
        console.log('=========================================');
        console.log('📱 ESCANEIE O QR CODE ABAIXO NO WHATSAPP:');
        console.log('👉 Ou abra no navegador: http://212.85.10.239:3006/qr');
        console.log('=========================================');
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        latestQr = null;
        console.log('🤖 WhatsApp Engine Conectado e Pronto!');
        isReady = true;
    });

    client.on('authenticated', () => {
        console.log('✅ Autenticado com sucesso!');
    });

    client.on('auth_failure', msg => {
        console.error('❌ Falha na autenticação:', msg);
    });

    client.on('disconnected', (reason) => {
        console.log('🔌 WhatsApp desconectado. Motivo:', reason);
        isReady = false;
        console.log('♻️ Tentando reconectar em 30 segundos...');
        setTimeout(() => {
            console.log('🔄 Reconectando WhatsApp...');
            try {
                client.initialize();
            } catch (err) {
                console.error('❌ Erro ao reinicializar cliente WhatsApp:', err.message);
            }
        }, 30000);
    });

    client.on('message', async (msg) => {
        if (msg.body === '/grupo') {
            try {
                await msg.reply(`JID deste chat: ${msg.from}`);
                console.log(`ℹ️ Comando /grupo respondido para ${msg.from}`);
            } catch (e) {
                console.error('Erro ao responder /grupo:', e.message);
            }
        }
    });

    client.initialize();
}

// Inicia o processo
initWhatsApp();

// Express Endpoint to receive messages from Python
app.post('/send', (req, res) => {
    const { message, score, imageUrl } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    messageQueue.push({ message, score: score || 0, imageUrl });
    saveState();
    console.log(`📥 Nova oferta recebida no balde (Score: ${score}). Total no balde: ${messageQueue.length}`);

    // Dispara imediatamente se o WhatsApp estiver conectado!
    if (isReady) {
        console.log('⚡ Disparando oferta automaticamente para o WhatsApp...');
        setTimeout(() => flushBucket(), 500);
    }
    
    return res.status(200).json({ success: true, queued: true });
});

// Express Endpoint para exibir o QR Code em página web
app.get('/qr', (req, res) => {
    if (isReady) {
        return res.send(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>WhatsApp Conectado</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: #0b141a; color: #e9edef; margin: 0; padding: 20px; }
                    .card { background: #111b21; padding: 40px; border-radius: 16px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.5); max-width: 420px; width: 100%; border: 1px solid #222d34; }
                    h2 { color: #00a884; margin-top: 0; font-size: 24px; }
                    p { color: #8696a0; font-size: 15px; line-height: 1.5; }
                    .icon { font-size: 48px; margin-bottom: 10px; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="icon">✅</div>
                    <h2>WhatsApp Conectado!</h2>
                    <p>O robô do WhatsApp está ativo e pronto para disparar ofertas no grupo.</p>
                </div>
            </body>
            </html>
        `);
    }

    if (!latestQr) {
        return res.send(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="refresh" content="3">
                <title>Aguardando QR Code</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: #0b141a; color: #e9edef; margin: 0; padding: 20px; }
                    .card { background: #111b21; padding: 40px; border-radius: 16px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.5); max-width: 420px; width: 100%; border: 1px solid #222d34; }
                    h2 { color: #00a884; margin-top: 0; }
                    p { color: #8696a0; font-size: 14px; }
                    .spinner { border: 4px solid rgba(255,255,255,0.1); border-left-color: #00a884; border-radius: 50%; width: 44px; height: 44px; animation: spin 1s linear infinite; margin: 24px auto; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            </head>
            <body>
                <div class="card">
                    <h2>⏳ Gerando QR Code...</h2>
                    <div class="spinner"></div>
                    <p>O robô está iniciando a navegação. Esta página será atualizada automaticamente em 3 segundos.</p>
                </div>
            </body>
            </html>
        `);
    }

    const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(latestQr)}`;
    return res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="refresh" content="8">
            <title>Conectar WhatsApp</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: #0b141a; color: #e9edef; margin: 0; padding: 20px; }
                .card { background: #111b21; padding: 32px 24px; border-radius: 16px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.5); max-width: 440px; width: 100%; border: 1px solid #222d34; }
                img { background: white; padding: 16px; border-radius: 12px; margin: 20px 0; max-width: 100%; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
                h2 { color: #00a884; margin-top: 0; margin-bottom: 12px; font-size: 22px; }
                p { color: #8696a0; font-size: 14px; margin: 6px 0; line-height: 1.4; }
                .step { background: #182229; padding: 12px; border-radius: 8px; font-size: 13px; color: #e9edef; margin-bottom: 16px; border-left: 4px solid #00a884; text-align: left; }
                .warning { font-size: 12px; color: #f7a600; margin-top: 14px; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>📱 Conectar WhatsApp</h2>
                <div class="step">
                    <strong>Como conectar:</strong><br>
                    1. Abra o WhatsApp no celular<br>
                    2. Toque em <strong>Mais opções (⋮)</strong> ou <strong>Configurações</strong><br>
                    3. Toque em <strong>Aparelhos conectados</strong> > <strong>Conectar um aparelho</strong>
                </div>
                <img src="${qrImgUrl}" alt="QR Code WhatsApp" width="300" height="300" />
                <p class="warning">⚠️ O QR Code atualiza a cada 8 segundos automaticamente.</p>
            </div>
        </body>
        </html>
    `);
});

// Diagnóstico: lista os grupos disponíveis
app.get('/groups', async (req, res) => {
    if (!isReady) return res.status(503).json({ error: 'WhatsApp não está pronto ainda' });
    try {
        const chats = await client.getChats();
        const groups = chats.filter(c => c.isGroup).map(c => ({ name: c.name, id: c.id._serialized }));
        return res.status(200).json({ groups });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

let isFlushing = false;

// ── Lógica do Balde (extraída em função reutilizável) ─────────────────────────
async function flushBucket() {
    if (isFlushing) {
        console.log('⏳ Disparo do balde já está em andamento. Aguardando...');
        return { skipped: true, reason: 'already_flushing' };
    }
    if (!isReady) {
        console.log('⏳ WhatsApp ainda não está pronto. Pulando verificação do balde...');
        return { skipped: true, reason: 'not_ready' };
    }

    isFlushing = true;
    try {
        while (messageQueue.length > 0) {
            // Horário de Brasília
            const brTime = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
            const currentHour = brTime.getHours();

            if (currentHour < 7) {
                console.log(`🌙 Fora do horário de disparo (${currentHour}h em Brasília). Retendo ${messageQueue.length} oferta(s) para enviar às 07h.`);
                break;
            }

            if (!GROUP_NAME && !GROUP_ID) {
                console.log(`⚠️ WHATSAPP_GROUP_NAME e WHATSAPP_GROUP_ID estão vazios no .env. Retendo ${messageQueue.length} ofertas.`);
                break;
            }

            console.log(`🔄 Analisando ${messageQueue.length} oferta(s) no balde...`);
            
            messageQueue.sort((a, b) => (b.score || 0) - (a.score || 0));
            const bestOffer = messageQueue.shift(); // Remove from queue immediately
            saveState();

            const targetLabel = GROUP_ID ? `JID: ${GROUP_ID}` : `grupo '${GROUP_NAME}'`;
            console.log(`🏆 Disparando oferta para ${targetLabel}...`);

            let targetChatId = GROUP_ID;

            if (!targetChatId) {
                console.log(`🔍 Buscando ID do grupo pelo nome '${GROUP_NAME}'...`);
                const chats = await client.getChats();
                const group = chats.find(c => c.isGroup && c.name === GROUP_NAME);
                if (group) {
                    targetChatId = group.id._serialized;
                }
            }

            if (!targetChatId) {
                console.error(`❌ Grupo '${GROUP_NAME}' não encontrado!`);
                break;
            }

            if (bestOffer.imageUrl) {
                console.log(`🖼️ Baixando imagem via Node.js: ${bestOffer.imageUrl}`);
                const imgData = await downloadImageAsBase64(bestOffer.imageUrl);
                
                if (imgData) {
                    try {
                        const media = new MessageMedia(imgData.mimeType, imgData.base64, 'promo.jpg');
                        await client.sendMessage(targetChatId, media, { caption: bestOffer.message });
                        console.log('🚀 Mensagem com imagem enviada com sucesso para o WhatsApp!');
                    } catch (imgErr) {
                        console.error('❌ Erro ao enviar mídia via WhatsApp:', imgErr.message);
                        if (imgErr.message && imgErr.message.includes('timed out')) {
                            console.log('🔄 Timeout no Puppeteer detectado. Forçando reconexão...');
                            isReady = false;
                            try { await client.destroy(); } catch (e) { /* ignora */ }
                            setTimeout(() => {
                                console.log('🔄 Reconectando WhatsApp após timeout...');
                                client.initialize();
                            }, 5000);
                        }
                        await new Promise(r => setTimeout(r, 6000));
                        try {
                            await client.sendMessage(targetChatId, bestOffer.message);
                            console.log('🚀 Mensagem (fallback somente texto) enviada com sucesso!');
                        } catch (textErr) {
                            console.error('❌ Falha também no fallback texto:', textErr.message);
                        }
                    }
                } else {
                    await client.sendMessage(targetChatId, bestOffer.message);
                    console.log('🚀 Mensagem (somente texto) enviada com sucesso!');
                }
            } else {
                await client.sendMessage(targetChatId, bestOffer.message);
                console.log('🚀 Mensagem (somente texto) enviada com sucesso!');
            }
            
            saveState();

            if (messageQueue.length > 0) {
                console.log(`⏳ Aguardando 3 segundos para a próxima oferta da fila (${messageQueue.length} restante(s))...`);
                await new Promise(r => setTimeout(r, 3000));
            }
        }
    } catch (err) {
        console.error('❌ Erro ao processar balde:', err);
    } finally {
        isFlushing = false;
    }
    return { success: true };
}

// Ciclo automático com checagem de estado resiliente a reinicializações
setInterval(async () => {
    const elapsed = Date.now() - lastFlushTime;
    const intervalMs = DELAY_MINUTES * 60 * 1000;
    if (elapsed >= intervalMs) {
        console.log(`⏱️ Janela de ${DELAY_MINUTES} minutos atingida. Processando balde...`);
        lastFlushTime = Date.now();
        saveState();
        await flushBucket();
    }
}, 20 * 1000); // Checa a cada 20 segundos

// ── Health Check periódico para detectar Chrome/Puppeteer travado ──────
setInterval(async () => {
    if (isReady) {
        try {
            const state = await client.getState();
            if (state !== 'CONNECTED') {
                console.log(`⚠️ Health Check: estado do WhatsApp = '${state}'. Forçando reconexão...`);
                isReady = false;
                try { await client.destroy(); } catch (e) { /* ignora */ }
                setTimeout(() => {
                    console.log('🔄 Reconectando WhatsApp após health check...');
                    client.initialize();
                }, 5000);
            }
        } catch (err) {
            console.log('⚠️ Health Check: WhatsApp não responde. Forçando reconexão...', err.message);
            isReady = false;
            try { await client.destroy(); } catch (e) { /* ignora */ }
            setTimeout(() => {
                console.log('🔄 Reconectando WhatsApp após health check falho...');
                client.initialize();
            }, 5000);
        }
    } else {
        console.log('💤 Health Check: WhatsApp não está pronto (isReady=false). Aguardando reconexão...');
    }
}, 5 * 60 * 1000); // Health check a cada 5 minutos

// Flush manual (para testes ou admin)
app.post('/flush', async (req, res) => {
    lastFlushTime = Date.now();
    saveState();
    const result = await flushBucket();
    return res.status(200).json(result);
});

app.listen(PORT, () => {
    console.log(`🚀 API interna do WhatsApp rodando na porta ${PORT}`);
    console.log(`⏱️ Tempo de janela (balde): ${DELAY_MINUTES} minutos`);
});
