# 🎬 Sistema Automático de Vídeos Diários para Instagram (3x ao Dia)

Este módulo gera automaticamente **3 vídeos verticais (9:16)** por dia com as melhores ofertas e promoções enviadas ao grupo do Telegram, prontos para postar no **Instagram Reels e Stories**.

---

## 🕒 Horários Programados
O serviço roda automaticamente na VPS via **PM2** nos 3 melhores horários de engajamento:
- 🕙 **10:00** — Oferta da manhã (Slot 1)
- 🕒 **15:00** — Destaque da tarde (Slot 2)
- 🕗 **20:00** — Super desconto da noite (Slot 3)

Cada execução busca os produtos mais quentes e com maior desconto da plataforma (`status=active`), gera o vídeo em formato vertical e envia diretamente para o seu Telegram com a legenda formatada pronta para copiar e colar no Instagram.

---

## 🧠 Skills de IA Armazenadas & Como Trocar

Todas as 4 habilidades solicitadas foram baixadas e estão salvas na sua máquina e prontas para uso:

| Skill / Provedor | Tipo | Status | Como Funciona |
| :--- | :--- | :--- | :--- |
| **FFmpeg Local (Ken Burns & Glass)** | Local / Zero Custo | **ATIVO (Padrão)** | Gera vídeos 9:16 full HD em 25s, efeito bokeh desfocado, card do produto, títulos com fade-in, selo de desconto em vermelho `-X% OFF`, selo de cupom em amarelo e áudio AAC estéreo. |
| **HeyGen HyperFrames** (`product-launch-video`) | IA em Nuvem | Armazenada | Gera vídeos de lançamento de produto cinematográficos com motion graphics e voz realista. |
| **RunComfy / GenMedia** (`image-to-video` & `ai-video-generation`) | Modelos Generativos | Armazenada | Transforma a foto do produto em vídeo animado usando **Wan 2.1**, **Kling 3.0**, **Seedance v2** ou **Hailuo 2.3**. |
| **Marketing Video Skills** (`marketingskills@video`) | Copywriting & Estrutura | Armazenada | Estruturas de retenção, roteiros virais e chamadas para ação (CTAs). |

---

## 🔄 Como Trocar a IA dos Vídeos Futuramente?

Você pode trocar de provedor a qualquer momento de duas maneiras:

### Opção 1: Pelo chat com o assistente
Basta dizer:
> *"Troque a IA dos vídeos para HeyGen"* ou  
> *"Troque a IA dos vídeos para Kling / RunComfy"*

O assistente atualizará a configuração e colocará o provedor desejado para rodar imediatamente.

### Opção 2: Pelo arquivo `.env`
Edite a variável `VIDEO_AI_PROVIDER` no arquivo `bot/.env`:
```env
# Opções disponíveis: ffmpeg | heygen | genmedia
VIDEO_AI_PROVIDER=ffmpeg

# Chaves para as IAs externas (quando for utilizar):
HEYGEN_API_KEY=sua_chave_heygen_aqui
RUNCOMFY_API_KEY=sua_chave_runcomfy_aqui

# Onde receber os vídeos prontos para aprovação/postagem:
TELEGRAM_VIDEO_OUTPUT_CHAT=-1003869735710
```

Após editar, reinicie o processo no PM2:
```bash
pm2 restart video-generator
```

---

## 🧪 Como Testar Manualmente a Qualquer Momento

Você pode gerar um vídeo de teste imediato rodando no terminal:

```bash
# Gera o vídeo do Slot 1 (1º produto em alta) e envia no Telegram:
python bot/video_generator.py --test --slot 0

# Gera o vídeo do Slot 2 (2º produto em alta):
python bot/video_generator.py --test --slot 1

# Gera o vídeo do Slot 3 (3º produto em alta):
python bot/video_generator.py --test --slot 2
```

Os arquivos MP4 gerados também ficam salvos localmente na pasta `videos_output/`.
