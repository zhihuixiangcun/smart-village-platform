# PM2 生产环境配置
module.exports = {
  apps: [
    {
      name: 'smart-village-main',
      script: './src/app.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s'
    }
  ]
};
