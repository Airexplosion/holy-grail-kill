module.exports = {
  apps: [
    {
      name: 'holy-grail-kill',
      cwd: './packages/server',
      script: 'src/index.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx/esm',
      env: {
        PORT: 25656,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 25656,
      },
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
