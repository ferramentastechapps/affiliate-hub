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

// Initialize WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        headless: true
    },
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
    }
});

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
        console.log(`🌙 Fora do horário de disparo (${currentHour}h em Brasília). Descartando ${messageQueue.length} oferta(s) do balde.`);
        messageQueue = []; // Esvazia o balde para não acumular velhas
        saveState();
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
