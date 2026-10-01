module.exports = {
  apps: [
    {
      name: 'madeirense-api',
      cwd: '/var/www/madeirense/packages/api',
      script: 'node',
      args: '--env-file=.env dist/server.js',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
}
