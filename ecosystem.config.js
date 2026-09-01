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
    }
  ]
};

