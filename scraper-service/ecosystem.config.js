// PM2 ecosystem - Scrapling Microservice
// Adicione ao ecosystem.config.js principal OU use separado:
//   pm2 start scraper-service/ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'scrapling-service',
      script: 'uvicorn',
      args: 'main:app --host 127.0.0.1 --port 8001 --workers 2',
      cwd: './scraper-service',
      interpreter: 'python3',
      // Não usar interpreter para uvicorn — usar exec_mode direto
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PYTHONUNBUFFERED: '1',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/scrapling-error.log',
      out_file: './logs/scrapling-out.log',
    },
  ],
};
