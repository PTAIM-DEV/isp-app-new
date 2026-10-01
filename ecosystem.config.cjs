module.exports = {
  apps: [
    {
      name: 'frontend-dev',
      script: 'npm',
      args: 'run dev',
      cwd: '/home/gastra/projects/isp-app',
      env: {
        NODE_ENV: 'development',
      },
      max_restarts: 5,
      restart_delay: 2000,
    },
    {
      name: 'worker',
      script: 'npm',
      args: 'run worker',
      cwd: '/home/gastra/projects/isp-app',
      env: {
        NODE_ENV: 'development',
      },
      max_restarts: 5,
      restart_delay: 2000,
    },
  ],
};


