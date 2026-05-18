export default () => ({
  port: parseInt(process.env.PORT ?? '3346', 10) || 3346,
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'super-secret-key',
    // Access token berumur pendek (misal: 1 jam)
    accessExpires: process.env.JWT_ACCESS_EXPIRES_IN ?? '1d',
    // Refresh token berumur panjang (misal: 7 hari)
    refreshExpires: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
});
