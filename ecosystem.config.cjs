module.exports = {
  apps: [
    {
      name: 'holy-grail-kill',
      cwd: './packages/server',
      script: 'npx',
      args: 'tsx src/index.ts',
      env_production: {
        NODE_ENV: 'production',
        PORT: 25656,
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
