const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
app.use(express.json());

const PORT = 3006;

// Variables from env
const GROUP_NAME = process.env.WHATSAPP_GROUP_NAME || "";
const GROUP_ID = process.env.WHATSAPP_GROUP_ID || "";
const DELAY_MINUTES = parseInt(process.env.WHATSAPP_DELAY_MINUTES || "30", 10);

// Global State
let isReady = false;
let connectionState = 'DISCONNECTED'; // 'DISCONNECTED' | 'INITIALIZING' | 'NEED_QR' | 'CONNECTED'
let latestQr = null; // Raw string QR code for legacy /qr endpoint
let currentQrCode = null; // DataURL string (data:image/png;base64,...) for Admin UI
let messageQueue = []; // array of { score: number, message: string, imageUrl?: string }
let lastFlushTime = Date.now();
let lastError = null;
let readyAt = null;
let flushCount = 0;
let errorCount = 0;
let isFlushing = false;
const logsBuffer = []; // array of { timestamp, level, message, details }

// Ring buffer logger
function addLog(level, message, details = null) {
    const entry = {
        timestamp: new Date().toISOString(),
        level, // 'info' | 'warning' | 'error' | 'critical'
        message,
        details: details ? (typeof details === 'object' ? JSON.stringify(details) : String(details)) : null
    };
    logsBuffer.push(entry);
    if (logsBuffer.length > 50) {
        logsBuffer.shift();
    }
    const icon = level === 'critical' ? '🔴' : level === 'error' ? '❌' : level === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${icon} [${entry.timestamp}] ${message}`, details ? details : '');
}

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
        addLog('error', 'Erro ao salvar estado em disco', err.message);
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
            addLog('info', `Estado carregado do disco: ${messageQueue.length} ofertas pendentes.`);
        } else {
            messageQueue = [];
            lastFlushTime = Date.now();
        }
    } catch (err) {
        console.error('❌ Erro ao carregar estado do disco:', err.message);
        addLog('error', 'Erro ao carregar estado do disco', err.message);
        messageQueue = [];
        lastFlushTime = Date.now();
    }
}

// Carrega o estado salvo imediatamente no início
loadState();

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
let client = null;

// Função assíncrona de inicialização do WhatsApp
async function initWhatsApp() {
    connectionState = 'INITIALIZING';
    addLog('info', 'Inicializando serviço de WhatsApp...');

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
                addLog('info', `Proxy Webshare ativado: ${proxy.proxy_address}:${proxy.port}`);
            } else {
                console.warn('⚠️ Nenhum proxy válido retornado pela Webshare. Iniciando sem proxy.');
            }
        } catch (err) {
            console.error('❌ Erro ao buscar proxy da Webshare. Iniciando sem proxy. Erro:', err.message);
            addLog('warning', 'Falha ao obter proxy da Webshare. Iniciando sem proxy.', err.message);
        }
    } else {
        console.log('ℹ️ Proxy desativado ou API Key não configurada. Iniciando sem proxy.');
    }

    const customChromePath = '/root/.cache/puppeteer/chrome/linux-146.0.7680.31/chrome-linux64/chrome';
    let puppeteerConfig = {
        args: puppeteerArgs,
        headless: true,
        protocolTimeout: 120000
    };

    if (fs.existsSync(customChromePath)) {
        puppeteerConfig.executablePath = customChromePath;
    }

    let clientOptions = {
        authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
        puppeteer: puppeteerConfig,
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/{version}.html'
        }
    };

    if (proxyConfig) {
        clientOptions.proxyAuthentication = {
            username: proxyConfig.username,
            password: proxyConfig.password
        };
    }

    client = new Client(clientOptions);

    client.on('qr', async (qr) => {
        console.log('=========================================');
        console.log('📱 ESCANEIE O QR CODE ABAIXO NO WHATSAPP:');
        qrcodeTerminal.generate(qr, { small: true });
        console.log('=========================================');

        latestQr = qr;
        connectionState = 'NEED_QR';
        isReady = false;
        try {
            currentQrCode = await QRCode.toDataURL(qr);
        } catch (err) {
            console.error('Erro ao converter QR Code para DataURL:', err.message);
        }
        addLog('warning', 'Novo QR Code gerado! Aguardando escaneamento no aplicativo WhatsApp.');
    });

    client.on('ready', () => {
        console.log('🤖 WhatsApp Engine Conectado e Pronto!');
        isReady = true;
        connectionState = 'CONNECTED';
        currentQrCode = null;
        latestQr = null;
        lastError = null;
        readyAt = new Date().toISOString();
        addLog('info', 'WhatsApp Engine conectado e pronto para uso.');
    });

    client.on('authenticated', () => {
        console.log('✅ Autenticado com sucesso!');
        connectionState = 'INITIALIZING';
        currentQrCode = null;
        latestQr = null;
        addLog('info', 'Sessão autenticada com sucesso.');
    });

    client.on('auth_failure', msg => {
        console.error('❌ Falha na autenticação:', msg);
        isReady = false;
        connectionState = 'DISCONNECTED';
        currentQrCode = null;
        latestQr = null;
        lastError = `Falha na autenticação: ${msg}`;
        errorCount++;
        addLog('critical', 'Falha de autenticação do WhatsApp.', msg);
    });

    client.on('disconnected', (reason) => {
        console.log('🔌 WhatsApp desconectado. Motivo:', reason);
        isReady = false;
        connectionState = 'DISCONNECTED';
        currentQrCode = null;
        latestQr = null;
        lastError = `Desconectado: ${reason}`;
        errorCount++;
        addLog('error', `WhatsApp desconectado. Motivo: ${reason}`);
        console.log('♻️ Tentando reconectar em 30 segundos...');
        setTimeout(() => {
            console.log('🔄 Reconectando WhatsApp...');
            try {
                if (client) client.initialize();
            } catch (err) {
                console.error('❌ Erro ao reinicializar cliente WhatsApp:', err.message);
                addLog('error', 'Erro ao reinicializar cliente WhatsApp', err.message);
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

    try {
        client.initialize();
    } catch (err) {
        console.error('❌ Erro durante client.initialize():', err.message);
        addLog('critical', 'Erro ao inicializar cliente WhatsApp', err.message);
    }
}

// Reconexão segura assíncrona sem travar Express
function safeReconnect() {
    addLog('info', 'Solicitação manual de reconexão iniciada...');
    isReady = false;
    connectionState = 'INITIALIZING';
    currentQrCode = null;
    latestQr = null;
    
    setImmediate(async () => {
        try {
            if (client) {
                await Promise.race([
                    client.destroy(),
                    new Promise(r => setTimeout(r, 3000))
                ]).catch(e => console.log('Destroy notice:', e.message));
            }
        } catch (err) {
            console.log('Erro ao destruir cliente:', err.message);
        }
        client = null;
        setTimeout(() => {
            initWhatsApp();
        }, 1000);
    });
}

// Reset de sessão assíncrono (remove credenciais sem travar Express)
function resetSession() {
    addLog('warning', 'Reset completo de sessão solicitado. Apagando credenciais salvas...');
    isReady = false;
    connectionState = 'INITIALIZING';
    currentQrCode = null;
    latestQr = null;

    setImmediate(async () => {
        try {
            if (client) {
                await Promise.race([
                    client.destroy(),
                    new Promise(r => setTimeout(r, 3000))
                ]).catch(e => console.log('Destroy notice:', e.message));
            }
        } catch (err) {
            console.log('Erro ao destruir cliente:', err.message);
        }
        client = null;

        const authPath = path.join(__dirname, '.wwebjs_auth');
        const cachePath = path.join(__dirname, '.wwebjs_cache');
        try {
            if (fs.existsSync(authPath)) {
                fs.rmSync(authPath, { recursive: true, force: true });
            }
            if (fs.existsSync(cachePath)) {
                fs.rmSync(cachePath, { recursive: true, force: true });
            }
            addLog('info', 'Arquivos de sessão antigos removidos do disco.');
        } catch (err) {
            addLog('error', 'Erro ao remover diretório de sessão', err.message);
        }
        setTimeout(() => {
            initWhatsApp();
        }, 1000);
    });
}

// Inicia o processo
initWhatsApp();

// ── Express Endpoints ──────────────────────────────────────────────────

// Endpoint para receber ofertas do bot Python
app.post('/send', (req, res) => {
    const { message, score, imageUrl } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    messageQueue.push({ message, score: score || 0, imageUrl });
    saveState();
    console.log(`📥 Nova oferta recebida no balde (Score: ${score}). Total no balde: ${messageQueue.length}`);
    addLog('info', `Nova oferta recebida no balde (Score: ${score}). Total: ${messageQueue.length}`);
    
    if (isReady) {
        console.log('⚡ Disparando oferta automaticamente para o WhatsApp...');
        setTimeout(() => flushBucket(), 500);
    }

    return res.status(200).json({ success: true, queued: true });
});

// Endpoint legado para exibir o QR Code em HTML
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

// Status detalhado em JSON para o painel Admin
app.get('/status', (req, res) => {
    const brTime = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const currentHour = brTime.getHours();

    return res.status(200).json({
        isReady,
        status: connectionState,
        qrCode: currentQrCode,
        queueLength: messageQueue.length,
        queue: messageQueue.slice(0, 10),
        lastFlushTime: lastFlushTime ? new Date(lastFlushTime).toISOString() : null,
        flushCount,
        errorCount,
        lastError,
        readyAt,
        groupConfigured: {
            name: GROUP_NAME || null,
            id: GROUP_ID || null
        },
        delayMinutes: DELAY_MINUTES,
        outsideSchedule: currentHour < 7,
        logs: logsBuffer.slice(-30).reverse()
    });
});

// Solicita reconexão manual
app.post('/reconnect', (req, res) => {
    safeReconnect();
    return res.status(200).json({ success: true, message: 'Reconexão iniciada' });
});

// Solicita reset da sessão (novo QR Code)
app.post('/reset-session', (req, res) => {
    resetSession();
    return res.status(200).json({ success: true, message: 'Reset de sessão iniciado' });
});

// Retorna histórico de logs
app.get('/logs', (req, res) => {
    return res.status(200).json({ logs: logsBuffer.slice(-50).reverse() });
});

// Diagnóstico: lista os grupos disponíveis
app.get('/groups', async (req, res) => {
    if (!isReady || !client) return res.status(503).json({ error: 'WhatsApp não está pronto ainda' });
    try {
        const chats = await client.getChats();
        const groups = chats.filter(c => c.isGroup).map(c => ({ name: c.name, id: c.id._serialized }));
        return res.status(200).json({ groups });
    } catch (err) {
        addLog('error', 'Erro ao obter grupos do WhatsApp', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// ── Lógica do Balde ───────────────────────────────────────────────────
async function flushBucket() {
    if (isFlushing) {
        console.log('⏳ Disparo do balde já está em andamento. Aguardando...');
        return { skipped: true, reason: 'already_flushing' };
    }
    if (!isReady || !client) {
        console.log('⏳ WhatsApp ainda não está pronto. Pulando verificação do balde...');
        return { skipped: true, reason: 'not_ready' };
    }

    const brTime = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const currentHour = brTime.getHours();

    if (currentHour < 7) {
        console.log(`🌙 Fora do horário de disparo (${currentHour}h em Brasília). Retendo ${messageQueue.length} oferta(s) para enviar às 07h.`);
        return { skipped: true, reason: 'out_of_hours' };
    }

    if (messageQueue.length === 0) {
        console.log('😴 Balde vazio. Nenhuma oferta para enviar agora.');
        return { skipped: true, reason: 'empty' };
    }

    if (!GROUP_NAME && !GROUP_ID) {
        console.log(`⚠️ WHATSAPP_GROUP_NAME e WHATSAPP_GROUP_ID estão vazios no .env. Esvaziando o balde (${messageQueue.length} ofertas) sem enviar.`);
        addLog('warning', `Grupo não configurado no .env. Balde esvaziado (${messageQueue.length} ofertas).`);
        messageQueue = [];
        saveState();
        return { skipped: true, reason: 'no_group_configured' };
    }

    isFlushing = true;
    console.log(`🔄 Analisando ${messageQueue.length} ofertas no balde...`);
    
    messageQueue.sort((a, b) => b.score - a.score);
    const bestOffer = messageQueue.shift();

    saveState();

    const targetLabel = GROUP_ID ? `JID: ${GROUP_ID}` : `grupo '${GROUP_NAME}'`;
    console.log(`🏆 Melhor oferta escolhida! Score: ${bestOffer.score}. Disparando para ${targetLabel}...`);
    addLog('info', `Enviando melhor oferta (Score: ${bestOffer.score}) para ${targetLabel}...`);

    try {
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
            const errStr = `Grupo '${GROUP_NAME}' não encontrado`;
            console.error(`❌ ${errStr}! Tem certeza que este WhatsApp está no grupo?`);
            addLog('error', errStr);
            return { success: false, error: errStr };
        } else {
            if (bestOffer.imageUrl) {
                console.log(`🖼️ Baixando imagem via Node.js: ${bestOffer.imageUrl}`);
                const imgData = await downloadImageAsBase64(bestOffer.imageUrl);
                
                if (imgData) {
                    try {
                        const media = new MessageMedia(imgData.mimeType, imgData.base64, 'promo.jpg');
                        await client.sendMessage(targetChatId, media, { caption: bestOffer.message });
                        console.log('🚀 Mensagem com imagem enviada com sucesso para o grupo!');
                        addLog('info', 'Mensagem com imagem enviada com sucesso!');
                    } catch (imgErr) {
                        console.error('❌ Erro ao enviar mídia via WhatsApp:', imgErr.message);
                        addLog('error', 'Falha ao enviar imagem. Tentando fallback para texto.', imgErr.message);
                        if (imgErr.message && imgErr.message.includes('timed out')) {
                            console.log('🔄 Timeout no Puppeteer detectado. Forçando reconexão antes do fallback...');
                            isReady = false;
                            connectionState = 'INITIALIZING';
                            try { await client.destroy(); } catch (e) { /* ignora */ }
                            setTimeout(() => {
                                console.log('🔄 Reconectando WhatsApp após timeout de envio...');
                                initWhatsApp();
                            }, 5000);
                        }
                        await new Promise(r => setTimeout(r, 8000));
                        try {
                            await client.sendMessage(targetChatId, bestOffer.message);
                            console.log('🚀 Mensagem (somente texto, fallback) enviada com sucesso!');
                            addLog('info', 'Mensagem (fallback texto) enviada com sucesso!');
                        } catch (textErr) {
                            console.error('❌ Falha também no fallback texto:', textErr.message);
                            addLog('error', 'Falha também no fallback de texto', textErr.message);
                        }
                    }
                } else {
                    console.log('⚠️ Imagem não disponível, enviando só texto.');
                    await client.sendMessage(targetChatId, bestOffer.message);
                    console.log('🚀 Mensagem (somente texto) enviada com sucesso para o grupo!');
                    addLog('info', 'Mensagem (somente texto) enviada com sucesso!');
                }
            } else {
                await client.sendMessage(targetChatId, bestOffer.message);
                console.log('🚀 Mensagem (somente texto) enviada com sucesso para o grupo!');
                addLog('info', 'Mensagem (somente texto) enviada com sucesso!');
            }
            
            messageQueue = [];
            saveState();
            flushCount++;
            console.log('🗑️ Balde esvaziado para a próxima rodada.');
            return { success: true };
        }
    } catch (err) {
        console.error('❌ Erro ao enviar mensagem:', err);
        lastError = `Erro ao enviar: ${err.message}`;
        errorCount++;
        addLog('error', 'Erro ao enviar mensagem para o grupo', err.message);
        messageQueue = [];
        saveState();
        return { success: false, error: err.message };
    } finally {
        isFlushing = false;
    }
}

// Ciclo automático do balde
setInterval(async () => {
    const elapsed = Date.now() - lastFlushTime;
    const intervalMs = DELAY_MINUTES * 60 * 1000;
    if (elapsed >= intervalMs) {
        console.log(`⏱️ Janela de ${DELAY_MINUTES} minutos atingida. Processando balde...`);
        lastFlushTime = Date.now();
        saveState();
        await flushBucket();
    }
}, 20 * 1000);

// Health Check periódico
setInterval(async () => {
    if (isReady && client) {
        try {
            const state = await client.getState();
            if (state !== 'CONNECTED') {
                console.log(`⚠️ Health Check: estado do WhatsApp = '${state}'. Forçando reconexão...`);
                addLog('warning', `Health Check: Estado '${state}'. Forçando reconexão...`);
                isReady = false;
                connectionState = 'INITIALIZING';
                try { await client.destroy(); } catch (e) { /* ignora */ }
                setTimeout(() => {
                    console.log('🔄 Reconectando WhatsApp após health check...');
                    initWhatsApp();
                }, 5000);
            }
        } catch (err) {
            console.log('⚠️ Health Check: WhatsApp não responde. Forçando reconexão...', err.message);
            addLog('error', 'Health Check: WhatsApp não respondeu. Forçando reconexão...', err.message);
            isReady = false;
            connectionState = 'INITIALIZING';
            try { await client.destroy(); } catch (e) { /* ignora */ }
            setTimeout(() => {
                console.log('🔄 Reconectando WhatsApp após health check falho...');
                initWhatsApp();
            }, 5000);
        }
    } else {
        console.log('💤 Health Check: WhatsApp não está pronto (isReady=false).');
    }
}, 5 * 60 * 1000);

// Flush manual via HTTP POST
app.post('/flush', async (req, res) => {
    lastFlushTime = Date.now();
    saveState();
    const result = await flushBucket();
    return res.status(200).json(result);
});

app.listen(PORT, () => {
    console.log(`🚀 API interna do WhatsApp rodando na porta ${PORT}`);
    console.log(`⏱️ Tempo de janela (balde): ${DELAY_MINUTES} minutos`);
    addLog('info', `Servidor Express do WhatsApp ativo na porta ${PORT}`);
});
