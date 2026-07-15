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
        '--disable-dev-shm-usage'
    ];
    let proxyConfig = null;

    const apiKey = process.env.WEBSHARE_API_KEY;
    if (apiKey) {
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
        console.log('ℹ️ Webshare API Key não configurada no .env. Iniciando sem proxy.');
    }

    client = new Client({
        authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
        puppeteer: {
            args: puppeteerArgs,
            headless: true
        },
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
        }
    });

    if (proxyConfig) {
        client.on('puppeteer_page', async (page) => {
            console.log(`🔐 Autenticando proxy para a página... (${proxyConfig.username})`);
            try {
                await page.authenticate({
                    username: proxyConfig.username,
                    password: proxyConfig.password
                });
            } catch (authErr) {
                console.error('❌ Falha na autenticação do proxy no Puppeteer:', authErr.message);
            }
        });
    }

    client.on('qr', (qr) => {
        console.log('=========================================');
        console.log('📱 ESCANEIE O QR CODE ABAIXO NO WHATSAPP:');
        qrcode.generate(qr, { small: true });
        console.log('=========================================');
    });

    client.on('ready', () => {
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
    
    return res.status(200).json({ success: true, queued: true });
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


// ── Lógica do Balde (extraída em função reutilizável) ─────────────────────────
async function flushBucket() {
    if (!isReady) {
        console.log('⏳ WhatsApp ainda não está pronto. Pulando verificação do balde...');
        return { skipped: true, reason: 'not_ready' };
    }

    // Horário de Brasília
    const brTime = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const currentHour = brTime.getHours();

    if (currentHour < 7) {
        console.log(`🌙 Fora do horário de disparo (${currentHour}h em Brasília). Retendo ${messageQueue.length} oferta(s) para enviar às 07h.`);
        // NÃO descartar a fila — manter as mensagens para enviar quando amanhecer
        return { skipped: true, reason: 'out_of_hours' };
    }

    if (messageQueue.length === 0) {
        console.log('😴 Balde vazio. Nenhuma oferta para enviar agora.');
        return { skipped: true, reason: 'empty' };
    }

    if (!GROUP_NAME && !GROUP_ID) {
        console.log(`⚠️ WHATSAPP_GROUP_NAME e WHATSAPP_GROUP_ID estão vazios no .env. Esvaziando o balde (${messageQueue.length} ofertas) sem enviar.`);
        messageQueue = [];
        saveState();
        return { skipped: true, reason: 'no_group_configured' };
    }

    console.log(`🔄 Analisando ${messageQueue.length} ofertas no balde...`);
    
    messageQueue.sort((a, b) => b.score - a.score);
    const bestOffer = messageQueue.shift(); // Remove from queue immediately

    // Save state BEFORE sending to prevent poison-pill loop if puppeteer crashes
    saveState();

    const targetLabel = GROUP_ID ? `JID: ${GROUP_ID}` : `grupo '${GROUP_NAME}'`;
    console.log(`🏆 Melhor oferta escolhida! Score: ${bestOffer.score}. Disparando para ${targetLabel}...`);

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
            console.error(`❌ Grupo '${GROUP_NAME}' não encontrado! Tem certeza que este WhatsApp está no grupo?`);
            // We already removed it, no need to put it back.
            return { success: false, error: `Grupo '${GROUP_NAME}' não encontrado` };
        } else {
            if (bestOffer.imageUrl) {
                try {
                    const media = await MessageMedia.fromUrl(bestOffer.imageUrl, { unsafeMime: true });
                    await client.sendMessage(targetChatId, media, { caption: bestOffer.message });
                    console.log('🚀 Mensagem com imagem enviada com sucesso para o grupo!');
                } catch (imgErr) {
                    console.error('❌ Erro ao enviar imagem via WhatsApp, enviando só texto:', imgErr.message);
                    await client.sendMessage(targetChatId, bestOffer.message);
                    console.log('🚀 Mensagem (somente texto) enviada com sucesso para o grupo!');
                }
            } else {
                await client.sendMessage(targetChatId, bestOffer.message);
                console.log('🚀 Mensagem (somente texto) enviada com sucesso para o grupo!');
            }
            
            // Empty the rest of the bucket since we sent one
            messageQueue = [];
            saveState();
            console.log('🗑️ Balde esvaziado para a próxima rodada.');
            return { success: true };
        }
    } catch (err) {
        console.error('❌ Erro ao enviar mensagem:', err);
        // We already popped the bad message. We also empty the rest to be safe.
        messageQueue = [];
        saveState();
        return { success: false, error: err.message };
    }
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
