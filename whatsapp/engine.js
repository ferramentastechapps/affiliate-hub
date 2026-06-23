const { Client, LocalAuth } = require('whatsapp-web.js');
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
const DELAY_MINUTES = parseInt(process.env.WHATSAPP_DELAY_MINUTES || "30", 10);

// Global State
let isReady = false;
let messageQueue = []; // array of { score: number, message: string }

// Initialize WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        headless: true
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

client.initialize();

// Express Endpoint to receive messages from Python
app.post('/send', (req, res) => {
    const { message, score } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    messageQueue.push({ message, score: score || 0 });
    console.log(`📥 Nova oferta recebida no balde (Score: ${score}). Total no balde: ${messageQueue.length}`);
    
    return res.status(200).json({ success: true, queued: true });
});

// Diagnóstico: lista os grupos disponíveis
app.get('/groups', async (req, res) => {
    if (!isReady) return res.status(503).json({ error: 'WhatsApp não está pronto ainda' });
    try {
        const chats = await client.getChats();
        const groups = chats.filter(c => c.isGroup).map(c => c.name);
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

    if (messageQueue.length === 0) {
        console.log('😴 Balde vazio. Nenhuma oferta para enviar agora.');
        return { skipped: true, reason: 'empty' };
    }

    if (!GROUP_NAME) {
        console.log(`⚠️ WHATSAPP_GROUP_NAME está vazio no .env. Esvaziando o balde (${messageQueue.length} ofertas) sem enviar.`);
        messageQueue = [];
        return { skipped: true, reason: 'no_group_name' };
    }

    console.log(`🔄 Analisando ${messageQueue.length} ofertas no balde...`);
    
    messageQueue.sort((a, b) => b.score - a.score);
    const bestOffer = messageQueue[0];

    console.log(`🏆 Melhor oferta escolhida! Score: ${bestOffer.score}. Disparando para o grupo '${GROUP_NAME}'...`);

    try {
        const chats = await client.getChats();
        const group = chats.find(c => c.isGroup && c.name === GROUP_NAME);

        if (!group) {
            console.error(`❌ Grupo '${GROUP_NAME}' não encontrado! Tem certeza que este WhatsApp está no grupo?`);
            messageQueue = [];
            return { success: false, error: `Grupo '${GROUP_NAME}' não encontrado` };
        } else {
            await client.sendMessage(group.id._serialized, bestOffer.message);
            console.log('🚀 Mensagem enviada com sucesso para o grupo!');
            messageQueue = [];
            console.log('🗑️ Balde esvaziado para a próxima rodada.');
            return { success: true };
        }
    } catch (err) {
        console.error('❌ Erro ao enviar mensagem:', err);
        messageQueue = [];
        return { success: false, error: err.message };
    }
}

// Ciclo automático
setInterval(flushBucket, DELAY_MINUTES * 60 * 1000);

// Flush manual (para testes ou admin)
app.post('/flush', async (req, res) => {
    const result = await flushBucket();
    return res.status(200).json(result);
});

app.listen(PORT, () => {
    console.log(`🚀 API interna do WhatsApp rodando na porta ${PORT}`);
    console.log(`⏱️ Tempo de janela (balde): ${DELAY_MINUTES} minutos`);
});
