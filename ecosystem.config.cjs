module.exports = {
  apps: [
    {
      name: 'holy-grail-kill',
      cwd: './packages/server',
      script: 'dist/index.js',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
