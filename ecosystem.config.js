module.exports = {
  apps: [
    {
      name: 'nextjs',
      script: 'npm',
      args: 'start -- -p 3005',
      cwd: '/root/affiliate-hub',
      watch: false,
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 50,
    },
    {
      name: 'affiliate-hub-listener',
      script: './bot/telegram_listener.py',
      interpreter: 'python3',
      cwd: '/root/affiliate-hub',
      watch: false,
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 50,
    },
    {
      name: 'affiliate-scraper',
      script: './bot/main.py',
      interpreter: 'python3',
      cwd: '/root/affiliate-hub',
      watch: false,
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 50,
    },
    {
      name: 'whatsapp-engine',
      script: './whatsapp/engine.js',
      interpreter: 'node',
      cwd: '/root/affiliate-hub',
      watch: false,
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 50,
    },
    {
      name: 'telegram-group-monitor',
      script: './bot/telegram_group_monitor.py',
      interpreter: 'python3',
      cwd: '/root/affiliate-hub',
      watch: false,
      autorestart: true,
      restart_delay: 10000,
      max_restarts: 20,
    },
    {
      // Scrapling Microservice — fallback scraper com bypass de anti-bot
      // Dependências: pip install scrapling fastapi "uvicorn[standard]"
      // Browsers: scrapling install
      name: 'scrapling-service',
      script: 'main.py',
      cwd: '/root/affiliate-hub/scraper-service',
      interpreter: '/root/affiliate-hub/scraper-service/venv/bin/python3',
      watch: false,
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 30,
      env: {
        PYTHONUNBUFFERED: '1',
      },
    },
    {
      // Gerador de Vídeos para Instagram — 3 vídeos/dia (10h, 15h, 20h)
      // Provider configurável via VIDEO_AI_PROVIDER no bot/.env:
      //   ffmpeg   → gratuito, sem API externa (padrão)
      //   heygen   → HeyGen product-launch-video (requer HEYGEN_API_KEY)
      //   genmedia → GenMedia Labs image-to-video (requer RUNCOMFY_API_KEY)
      // Vídeos enviados para TELEGRAM_VIDEO_OUTPUT_CHAT (chat/canal privado)
      name: 'video-generator',
      script: './bot/video_generator.py',
      interpreter: 'python3',
      cwd: '/root/affiliate-hub',
      watch: false,
      autorestart: true,
      restart_delay: 10000,
      max_restarts: 20,
      env: {
        PYTHONUNBUFFERED: '1',
      },
    }
  ]
};

