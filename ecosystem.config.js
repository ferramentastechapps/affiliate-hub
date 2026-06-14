module.exports = {
  apps: [
    {
      name: 'nextjs',
      script: 'npm',
      args: 'start -- -p 3005',
      watch: false,
    },
    {
      name: 'affiliate-hub-listener',
      script: './bot/telegram_listener.py',
      interpreter: 'python3',
      watch: false,
    },
    {
      name: 'affiliate-scraper',
      script: './bot/main.py',
      interpreter: 'python3',
      watch: false,
    }
  ]
};
