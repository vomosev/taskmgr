module.exports = {
  apps: [
    {
      name: 'taskmgr',
      script: 'server/index.js',
      cwd: '/home/arx-app/backends/taskmgr',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: 4116
      }
    }
  ]
};