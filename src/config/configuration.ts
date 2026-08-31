export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3346', 10) || 3346,
  teltonikaTcpPort:
    parseInt(process.env.TELTONIKA_TCP_PORT ?? '5550', 10) || 5550,
  corsOrigin: process.env.CORS_ORIGIN,
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    // Access token berumur pendek (misal: 1 jam)
    accessExpires: process.env.JWT_ACCESS_EXPIRES_IN ?? '1d',
    // Refresh token berumur panjang (misal: 7 hari)
    refreshExpires: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
});
