/**
 * PM2 Ecosystem Configuration — Production
 *
 * Cara pakai:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 save
 *   pm2 startup
 *
 * Catatan: SINGLE INSTANCE (instances: 1) karena TeltonikaTcpService
 * menjalankan TCP server di port 5550 yang tidak bisa di-cluster.
 * Jika ingin scale HTTP, pisahkan TCP server ke proses terpisah.
 */
module.exports = {
  apps: [
    {
      name: 'fms-backend',
      script: 'dist/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      time: true,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      merge_logs: true,
      kill_timeout: 10000, // Graceful shutdown: beri waktu 10 detik
      listen_timeout: 10000,
      // Hapus log lama otomatis (max 10 file @ 10MB)
      max_logs: 10,
      max_size: '10M',
    },
  ],
};
