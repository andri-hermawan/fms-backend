export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3346', 10) || 3346,
  teltonikaTcpPort:
    parseInt(process.env.TELTONIKA_TCP_PORT ?? '5550', 10) || 5550,
  corsOrigin: process.env.CORS_ORIGIN,
  database: {
    url: process.env.DATABASE_URL,
  },
  mail: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587', 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM,
  },
  report: {
    // Alamat frontend yang dibuka headless browser untuk render PDF.
    frontendUrl: process.env.FRONTEND_URL,
    // Opsional: path Chromium/Chrome sistem (kosong = pakai bawaan puppeteer).
    chromiumPath: process.env.PUPPETEER_EXECUTABLE_PATH,
  },
  whatsapp: {
    // Endpoint server WhatsApp (kosong = notifikasi WA alert tidak dikirim).
    apiUrl: process.env.WHATSAPP_API_URL,
    timeoutMs:
      parseInt(process.env.WHATSAPP_TIMEOUT_MS ?? '10000', 10) || 10000,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    // Access token berumur pendek (misal: 1 jam)
    accessExpires: process.env.JWT_ACCESS_EXPIRES_IN ?? '1d',
    // Refresh token berumur panjang (misal: 7 hari)
    refreshExpires: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
});
