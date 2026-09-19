const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const http = require('http');

dotenv.config({ path: path.join(__dirname, '../.env') });

// Process Crash Protection
process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception capturada:', err ? err.message : err);
    try { addLog('critical', 'Uncaught Exception no WhatsApp Engine', err ? err.message : String(err)); } catch (_) {}
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection capturada:', reason);
    try { addLog('error', 'Unhandled Rejection no WhatsApp Engine', String(reason)); } catch (_) {}
});

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
 * Baixa uma imagem via Node.js e salva em arquivo temporário.
 * Usa fromFilePath() para evitar o bug "Data passed to getter" do whatsapp-web.js
 * que ocorre ao serializar base64 em memória para grupos LID.
 * Retorna { filePath, mimeType } ou null se falhar.
 */
function downloadImageToFile(imageUrl, timeoutMs = 20000) {
    return new Promise((resolve) => {
        try {
            if (!imageUrl) return resolve(null);
            if (imageUrl.startsWith('/')) {
                const siteBase = process.env.NEXT_PUBLIC_SITE_URL || process.env.AFFILIATE_HUB_URL || 'https://economizei.ftech-apps.com.br';
                imageUrl = `${siteBase.replace(/\/$/, '')}${imageUrl}`;
            }
            const protocol = imageUrl.startsWith('https') ? https : http;
            const req = protocol.get(imageUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'image/*,*/*'
                },
                timeout: timeoutMs
            }, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    return resolve(downloadImageToFile(res.headers.location, timeoutMs));
                }
                if (res.statusCode !== 200) {
                    console.warn(`⚠️ Download de imagem retornou status ${res.statusCode}: ${imageUrl}`);
                    return resolve(null);
                }
                const contentType = res.headers['content-type'] || 'image/jpeg';
                const mimeType = contentType.split(';')[0].trim();
                const ext = mimeType.includes('png') ? '.png' : mimeType.includes('webp') ? '.webp' : '.jpg';
                const tmpPath = path.join(os.tmpdir(), `wa_promo_${Date.now()}${ext}`);
                const fileStream = fs.createWriteStream(tmpPath);
                res.pipe(fileStream);
                fileStream.on('finish', () => resolve({ filePath: tmpPath, mimeType }));
                fileStream.on('error', (err) => {
                    console.warn('⚠️ Erro ao gravar imagem em disco:', err.message);
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

/** Remove arquivo temporário silenciosamente */
function cleanupTempFile(filePath) {
    try { if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {}
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
        '--no-first-run',
        '--no-zygote',
        '--disable-extensions',
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
        timeout: 300000,
        protocolTimeout: 300000
    };

    if (fs.existsSync(customChromePath)) {
        puppeteerConfig.executablePath = customChromePath;
    }

    let clientOptions = {
        authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
        authTimeoutMs: 0,
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
        console.log('♻️ Reiniciando cliente em 10 segundos...');
        setTimeout(() => {
            safeReconnect();
        }, 10000);
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
        console.log('♻️ Tentando reconectar de forma limpa em 15 segundos...');
        setTimeout(() => {
            safeReconnect();
        }, 15000);
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

    client.initialize().catch((err) => {
        console.error('❌ Erro durante client.initialize():', err.message);
        addLog('critical', 'Erro ao inicializar cliente WhatsApp', err.message);
        isReady = false;
        connectionState = 'DISCONNECTED';
        lastError = err.message;
        console.log('🔄 Tentando reinicializar WhatsApp em 10 segundos...');
        setTimeout(() => {
            safeReconnect();
        }, 10000);
    });
}

// Auxiliar para encerramento limpo do cliente Puppeteer
async function destroyCurrentClient() {
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
}

// Reconexão segura assíncrona sem travar Express
function safeReconnect() {
    addLog('info', 'Solicitação de reconexão iniciada...');
    isReady = false;
    connectionState = 'INITIALIZING';
    currentQrCode = null;
    latestQr = null;

    setImmediate(async () => {
        await destroyCurrentClient();
        setTimeout(() => initWhatsApp(), 1000);
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
        await destroyCurrentClient();

        const authPath = path.join(__dirname, '.wwebjs_auth');
        const cachePath = path.join(__dirname, '.wwebjs_cache');
        try {
            if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });
            if (fs.existsSync(cachePath)) fs.rmSync(cachePath, { recursive: true, force: true });
            addLog('info', 'Arquivos de sessão antigos removidos do disco.');
        } catch (err) {
            addLog('error', 'Erro ao remover diretório de sessão', err.message);
        }
        setTimeout(() => initWhatsApp(), 1000);
    });
}

// Inicia o processo
initWhatsApp();

// ── Express Endpoints ──────────────────────────────────────────────────

// ── Auxiliares de Visualização e Resposta (SRP) ────────────────────────

function renderQrHtmlPage(ready, qrRaw) {
    if (ready) {
        return `<!DOCTYPE html>
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
</html>`;
    }

    if (!qrRaw) {
        return `<!DOCTYPE html>
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
</html>`;
    }

    const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrRaw)}`;
    return `<!DOCTYPE html>
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
</html>`;
}

function buildStatusPayload() {
    return {
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
            id: GROUP_ID || null,
        },
        delayMinutes: DELAY_MINUTES,
        outsideSchedule: false,
        logs: logsBuffer.slice(-30).reverse(),
    };
}

async function resolveTargetChatId(groupId, groupName) {
    if (groupId) return groupId;
    if (!groupName || !client) return null;

    console.log(`🔍 Buscando ID do grupo pelo nome '${groupName}'...`);
    const chats = await client.getChats();
    const group = chats.find((c) => c.isGroup && c.name === groupName);
    return group ? group.id._serialized : null;
}

async function sendOfferMessage(targetChatId, offer) {
    let sentWithMedia = false;
    let tmpFilePath = null;

    if (offer.imageUrl) {
        console.log(`🖼️ Baixando imagem para arquivo temp: ${offer.imageUrl}`);
        const imgData = await downloadImageToFile(offer.imageUrl);

        if (imgData) {
            tmpFilePath = imgData.filePath;
            // Usar fromFilePath evita o bug "Data passed to getter" ao serializar base64 internamente
            // Tentativa 1: foto + legenda juntas
            try {
                const media = MessageMedia.fromFilePath(tmpFilePath);
                await client.sendMessage(targetChatId, media, { caption: offer.message, sendMediaAsDocument: false, linkPreview: false });
                sentWithMedia = true;
                console.log('🚀 Mensagem com imagem enviada com sucesso para o grupo!');
                addLog('info', 'Mensagem com imagem enviada com sucesso!');
            } catch (imgErr) {
                console.warn('⚠️ Falha ao enviar foto com legenda:', imgErr.message);
                // Tentativa 2: foto separada do texto
                try {
                    const media = MessageMedia.fromFilePath(tmpFilePath);
                    await client.sendMessage(targetChatId, media, { sendMediaAsDocument: false, linkPreview: false });
                    await new Promise(r => setTimeout(r, 1500));
                    await client.sendMessage(targetChatId, offer.message, { linkPreview: false });
                    sentWithMedia = true;
                    console.log('🚀 Imagem e texto enviados separadamente com sucesso!');
                    addLog('info', 'Imagem e texto enviados separadamente com sucesso!');
                } catch (sepErr) {
                    console.error('❌ Falha total ao enviar mídia:', sepErr.message);
                    addLog('error', 'Falha ao enviar imagem. Usando fallback texto.', sepErr.message);
                }
            } finally {
                cleanupTempFile(tmpFilePath);
            }
        } else {
            console.log('⚠️ Imagem não disponível, enviando só texto.');
        }
    }

    if (!sentWithMedia) {
        await client.sendMessage(targetChatId, offer.message, { linkPreview: false });
        console.log('🚀 Mensagem (somente texto) enviada com sucesso para o grupo!');
        addLog('info', 'Mensagem (somente texto) enviada com sucesso!');
    }
}

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

// Endpoint para exibir o QR Code em HTML
app.get('/qr', (req, res) => {
    return res.send(renderQrHtmlPage(isReady, latestQr));
});

// Status detalhado em JSON para o painel Admin
app.get('/status', (req, res) => {
    return res.status(200).json(buildStatusPayload());
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
        const groups = chats.filter((c) => c.isGroup).map((c) => ({ name: c.name, id: c.id._serialized }));
        return res.status(200).json({ groups });
    } catch (err) {
        addLog('error', 'Erro ao obter grupos do WhatsApp', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// Diagnóstico detalhado da sessão e do envio de mídia no Puppeteer
app.get('/debug-media', async (req, res) => {
    if (!isReady || !client) return res.status(503).json({ error: 'WhatsApp não está pronto ainda' });
    try {
        const targetChatId = GROUP_ID || (await resolveTargetChatId(GROUP_ID, GROUP_NAME));
        const evalResult = await client.pupPage.evaluate(async (chatId) => {
            const steps = [];
            try {
                steps.push('1. getChat');
                const chat = await window.WWebJS.getChat(chatId, { getAsModel: false });
                steps.push(`1. ok: chat found = ${!!chat}, isGroup = ${chat?.id?.isGroup?.()}`);

                steps.push('2. check MeUser');
                const { getMaybeMeLidUser, getMaybeMePnUser } = window.require('WAWebUserPrefsMeUser');
                const lidUser = getMaybeMeLidUser();
                const meUser = getMaybeMePnUser();
                steps.push(`2. ok: mePn = ${meUser?._serialized || meUser?.$1}, meLid = ${lidUser?._serialized || lidUser?.$1}`);

                steps.push('3. check groupMetadata');
                const isLidMode = chat?.groupMetadata?.isLidAddressingMode;
                steps.push(`3. ok: isLidAddressingMode = ${isLidMode}`);

                steps.push('4. check MsgKey properties');
                const newId = await window.require('WAWebMsgKey').newId();
                const newMsgKey = new (window.require('WAWebMsgKey'))({
                    from: meUser,
                    to: chat.id,
                    id: newId,
                    selfDir: 'out',
                });
                steps.push(`4. ok: newMsgKey _serialized=${newMsgKey._serialized}, $1=${newMsgKey.$1}, toString=${newMsgKey.toString?.()}`);

                steps.push('5. check Msg.get behavior');
                try {
                    const res1 = window.require('WAWebCollections').Msg.get(newMsgKey._serialized);
                    steps.push(`5.1 Msg.get(_serialized) = ${res1}`);
                } catch (e1) {
                    steps.push(`5.1 Msg.get(_serialized) ERROR: ${e1.message}`);
                }
                try {
                    const res2 = window.require('WAWebCollections').Msg.get(newMsgKey.$1);
                    steps.push(`5.2 Msg.get($1) = ${res2}`);
                } catch (e2) {
                    steps.push(`5.2 Msg.get($1) ERROR: ${e2.message}`);
                }

                steps.push('6. test processMediaData');
                try {
                    const dummyMedia = {
                        mimetype: 'image/jpeg',
                        data: '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
                        filename: 'test.jpg'
                    };
                    const mediaOptions = await window.WWebJS.processMediaData(dummyMedia, {
                        forceSticker: false,
                        forceGif: false,
                        forceVoice: false,
                        forceDocument: false,
                        forceMediaHd: false,
                        sendToChannel: false,
                        sendToStatus: false,
                    });
                    steps.push(`6. ok: processMediaData success! type=${mediaOptions.type}, filehash=${mediaOptions.filehash}`);

                    steps.push('7. test message build with lidUser vs meUser');
                    const ephemeralFields = window.require('WAWebGetEphemeralFieldsMsgActionsUtils').getEphemeralFields(chat);

                    // Test with lidUser (what wwebjs currently does)
                    try {
                        const fromLid = chat.groupMetadata?.isLidAddressingMode ? lidUser : meUser;
                        const participantLid = window.require('WAWebWidFactory').asUserWidOrThrow(fromLid);
                        const msgKeyLid = new (window.require('WAWebMsgKey'))({
                            from: fromLid,
                            to: chat.id,
                            id: await window.require('WAWebMsgKey').newId(),
                            participant: participantLid,
                            selfDir: 'out',
                        });
                        const msgLid = {
                            id: msgKeyLid,
                            ack: 0,
                            body: mediaOptions.preview,
                            from: fromLid,
                            to: chat.id,
                            local: true,
                            self: 'out',
                            t: parseInt(new Date().getTime() / 1000),
                            isNewMsg: true,
                            type: 'chat',
                            ...ephemeralFields,
                            ...mediaOptions,
                            ...(mediaOptions.toJSON ? mediaOptions.toJSON() : {}),
                        };
                        steps.push(`7.1 msgLid constructed, calling addAndSendMsgToChat test (dry run or check)`);
                        // Let's see if WAWebSendMsgChatAction or Msg model creation throws:
                        const MsgModel = window.require('WAWebCollections').Msg.modelClass;
                        const testModelLid = new MsgModel(msgLid);
                        steps.push(`7.1.1 MsgModel(msgLid) success: id=${testModelLid.id?.$1 || testModelLid.id?._serialized}`);
                        // Check if serialize throws:
                        try {
                            const serialized = testModelLid.serialize();
                            steps.push(`7.1.2 testModelLid.serialize() success`);
                        } catch (eSer) {
                            steps.push(`7.1.2 testModelLid.serialize() ERROR: ${eSer.message}`);
                        }
                    } catch (eLid) {
                        steps.push(`7.1 msgLid ERROR: ${eLid.message} | stack: ${eLid.stack}`);
                    }

                    // Test with meUser (forcing meUser instead of lidUser)
                    try {
                        const fromPn = meUser;
                        const participantPn = window.require('WAWebWidFactory').asUserWidOrThrow(fromPn);
                        const msgKeyPn = new (window.require('WAWebMsgKey'))({
                            from: fromPn,
                            to: chat.id,
                            id: await window.require('WAWebMsgKey').newId(),
                            participant: participantPn,
                            selfDir: 'out',
                        });
                        const msgPn = {
                            id: msgKeyPn,
                            ack: 0,
                            body: mediaOptions.preview,
                            from: fromPn,
                            to: chat.id,
                            local: true,
                            self: 'out',
                            t: parseInt(new Date().getTime() / 1000),
                            isNewMsg: true,
                            type: 'chat',
                            ...ephemeralFields,
                            ...mediaOptions,
                            ...(mediaOptions.toJSON ? mediaOptions.toJSON() : {}),
                        };
                        const MsgModel = window.require('WAWebCollections').Msg.modelClass;
                        const testModelPn = new MsgModel(msgPn);
                        steps.push(`7.2.1 MsgModel(msgPn) success: id=${testModelPn.id?.$1 || testModelPn.id?._serialized}`);
                        try {
                            const serializedPn = testModelPn.serialize();
                            steps.push(`7.2.2 testModelPn.serialize() success`);
                        } catch (eSerPn) {
                            steps.push(`7.2.2 testModelPn.serialize() ERROR: ${eSerPn.message}`);
                        }
                    } catch (ePn) {
                        steps.push(`7.2 msgPn ERROR: ${ePn.message} | stack: ${ePn.stack}`);
                    }

                    steps.push('8. inspect real message in chat.msgs.last()');
                    try {
                        const lastMsg = chat.msgs.last();
                        if (lastMsg) {
                            steps.push(`8.1 lastMsg keys: ${Object.keys(lastMsg)}`);
                            steps.push(`8.2 lastMsg id: ${JSON.stringify(lastMsg.id)}`);
                            steps.push(`8.3 lastMsg from: ${JSON.stringify(lastMsg.from)}, to: ${JSON.stringify(lastMsg.to)}, author: ${JSON.stringify(lastMsg.author)}`);
                            steps.push(`8.4 lastMsg type: ${lastMsg.type}, isNewMsg: ${lastMsg.isNewMsg}, self: ${lastMsg.self}`);
                            if (lastMsg.mediaObject) {
                                steps.push(`8.5 lastMsg has mediaObject!`);
                            }
                        } else {
                            steps.push(`8.1 no lastMsg in chat.msgs`);
                        }
                    } catch (e8) {
                        steps.push(`8. ERROR: ${e8.message}`);
                    }

                    steps.push('9. pinpoint which media option breaks MsgModel');
                    try {
                        const MsgModel = window.require('WAWebCollections').Msg.modelClass;
                        const baseTextMsg = {
                            id: msgKeyLid,
                            ack: 0,
                            body: 'test text',
                            from: fromLid,
                            to: chat.id,
                            local: true,
                            self: 'out',
                            t: parseInt(new Date().getTime() / 1000),
                            isNewMsg: true,
                            type: 'chat',
                            ...ephemeralFields
                        };
                        try {
                            const testText = new MsgModel(baseTextMsg);
                            steps.push('9.1 baseTextMsg SUCCEEDED without mediaOptions!');
                        } catch (eText) {
                            steps.push(`9.1 baseTextMsg FAILED: ${eText.message}`);
                        }

                        // Test each key of mediaOptions:
                        const mediaJson = mediaOptions.toJSON ? mediaOptions.toJSON() : {};
                        const allMediaKeys = Array.from(new Set([...Object.keys(mediaOptions), ...Object.keys(mediaJson)]));
                        steps.push(`9.2 allMediaKeys: ${allMediaKeys.join(', ')}`);

                        let workingMsg = { ...baseTextMsg };
                        for (const key of allMediaKeys) {
                            const val = mediaOptions[key] !== undefined ? mediaOptions[key] : mediaJson[key];
                            const candidate = { ...workingMsg, [key]: val };
                            try {
                                new MsgModel(candidate);
                                workingMsg[key] = val;
                                steps.push(`key '${key}' OK`);
                            } catch (eKey) {
                                steps.push(`🚨 KEY '${key}' CAUSED CRASH: ${eKey.message}`);
                            }
                        }
                    } catch (e9) {
                        steps.push(`9. ERROR: ${e9.message}`);
                    }
                } catch (eMedia) {
                    steps.push(`6. processMediaData ERROR: ${eMedia.message} | stack: ${eMedia.stack}`);
                }

                return { success: true, steps };
            } catch (err) {
                return { success: false, error: err.message, stack: err.stack, steps };
            }
        }, targetChatId);

        return res.status(200).json(evalResult);
    } catch (err) {
        return res.status(500).json({ error: err.message, stack: err.stack });
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
        const targetChatId = await resolveTargetChatId(GROUP_ID, GROUP_NAME);

        if (!targetChatId) {
            const errStr = `Grupo '${GROUP_NAME}' não encontrado`;
            console.error(`❌ ${errStr}! Tem certeza que este WhatsApp está no grupo?`);
            addLog('error', errStr);
            return { success: false, error: errStr };
        }

        await sendOfferMessage(targetChatId, bestOffer);

        messageQueue = [];
        saveState();
        flushCount++;
        console.log('🗑️ Balde esvaziado para a próxima rodada.');
        return { success: true };
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
    if (!isReady || !client) {
        console.log('💤 Health Check: WhatsApp não está pronto (isReady=false).');
        return;
    }

    try {
        const state = await client.getState();
        if (state !== 'CONNECTED') {
            console.log(`⚠️ Health Check: estado do WhatsApp = '${state}'. Forçando reconexão...`);
            addLog('warning', `Health Check: Estado '${state}'. Forçando reconexão...`);
            safeReconnect();
        }
    } catch (err) {
        console.log('⚠️ Health Check: WhatsApp não responde. Forçando reconexão...', err.message);
        addLog('error', 'Health Check: WhatsApp não respondeu. Forçando reconexão...', err.message);
        safeReconnect();
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
