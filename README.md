git# 🚀 FMS Backend — Fleet Management System API

Backend untuk Fleet Management System (FMS) berbasis **NestJS**, **Prisma ORM**, **PostgreSQL**, dan **Socket.IO**. Menerima data dari GPS tracker **Teltonika** via TCP, memproses log peralatan, status, geofence, fuel calibration, dan mengirim real-time update ke frontend via WebSocket.

---

## 📋 Prasyarat

Sebelum mulai, pastikan yang berikut sudah tersedia:

| Kebutuhan | Keterangan |
|-----------|------------|
| **Node.js** | Versi 20+ (disarankan 22 LTS) |
| **npm** | Versi 10+ |
| **PostgreSQL** | Database production (bisa di VPS sendiri atau terpisah) |
| **PM2** | Process manager (install global di VPS) |
| **Git** | Untuk clone repository |
| **Port** | `3346` (HTTP API) & `5550` (TCP Teltonika) sudah dibuka di firewall |

> ⚠️ **Catatan penting**: Project ini menjalankan **TCP server Teltonika di port `5550`** yang harus diakses langsung oleh GPS tracker. Pastikan port ini terbuka dan **tidak di-block** oleh firewall/security group.

---

## 🚀 Step-by-Step Deploy ke VPS Baru

### Step 1 — Clone Repository

SSH ke VPS Anda, lalu clone repository:

```bash
cd /var/www
git clone https://github.com/<username>/<repository-name>.git fms-backend
cd fms-backend
```

> Ganti `<username>` dan `<repository-name>` dengan repository GitHub Anda.

---

### Step 2 — Buat File Environment (`.env`)

File `.env` **tidak ikut ter-commit** ke git, jadi harus dibuat manual di server:

```bash
cp .env.example .env
```

Kemudian edit file tersebut:

```bash
nano .env
```

Isi sesuai environment production Anda:

```env
# --- Environment ---
NODE_ENV=production

# --- Server ---
PORT=3346
TELTONIKA_TCP_PORT=5550

# --- Database (PostgreSQL) ---
DATABASE_URL=postgresql://user:password@IP_VPS_ATAU_HOST:5432/fms_db?schema=public

# --- JWT ---
# Generate secret yang kuat:  openssl rand -base64 64
JWT_SECRET=GantiDenganSecretYangSangatPanjangDanAcak1234567890
JWT_ACCESS_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# --- CORS ---
# Origin frontend Anda, dipisah koma jika lebih dari satu
CORS_ORIGIN=https://fms.example.com,https://admin.fms.example.com
```

> 🔑 **Wajib ganti `JWT_SECRET`** dengan string acak yang panjang! Generate dengan:
> ```bash
> openssl rand -base64 64
> ```
> Secret ini menjaga keamanan token login. Jangan pernah pakai nilai default.

---

### Step 3 — Install Dependencies & Build

```bash
npm ci
npx prisma generate
npm run build
```

- `npm ci` → install dependency sesuai versi yang terkunci di `package-lock.json`
- `npx prisma generate` → generate Prisma Client
- `npm run build` → kompilasi TypeScript ke folder `dist/`

---

### Step 4 — (Opsional) Sinkronkan Skema Database

Jika database sudah pernah dibuat sebelumnya dengan skema yang sama, bisa langsung pakai. Jika perlu sinkronisasi skema:

```bash
npx prisma db push
```

> ⚠️ **Untuk production yang sudah berjalan**, sebaiknya gunakan `prisma migrate deploy` jika project sudah punya folder `prisma/migrations/`. `db push` hanya disarankan untuk skema awal.

---

### Step 5 — Install & Setup PM2

Install PM2 secara global (sekali saja):

```bash
npm install -g pm2
```

---

### Step 6 — Jalankan Aplikasi dengan PM2

```bash
pm2 start ecosystem.config.js --env production
```

**Atau** gunakan script yang sudah disediakan:

```bash
npm run start:prod:pm2
```

Perintah ini akan menjalankan aplikasi dari hasil build (`dist/src/main.js`) dengan environment `production`:

- ✅ Auto-restart jika crash
- ✅ Log rotation (maks 10 file × 10MB)
- ✅ Restart otomatis jika memory melebihi 1GB
- ✅ Single instance (karena TCP server Teltonika)

---

### Step 7 — Cek Status & Log

```bash
# Cek status aplikasi
pm2 status

# Lihat log real-time
pm2 logs fms-backend

# Lihat log error saja
pm2 logs fms-backend --err
```

---

### Step 8 — Auto-Start saat VPS Reboot

Agar aplikasi otomatis berjalan setelah VPS restart:

```bash
pm2 save
pm2 startup
```

`pm2 startup` akan menampilkan perintah yang perlu dijalankan (copy-paste output-nya). Ini membuat PM2 & aplikasi menyala otomatis saat server boot.

---

### Step 9 — Verifikasi

Test API berjalan:

```bash
# Health check
curl http://localhost:3346/fms/api

# Cek response — harusnya menampilkan status server
```

Test TCP Teltonika (dari device/simulator):

```bash
# Simulasi koneksi ke port Teltonika
nc -vz <IP_VPS> 5550
```

Cek di browser:

```
http://<IP_VPS>:3346/fms/api
```

---

## 🛠️ Perintah Harian

### Development (di lokal)

```bash
npm run start:dev        # Mode watch (auto-reload saat edit)
```

### Production (di VPS via PM2)

```bash
npm run start:prod:pm2   # Start aplikasi production
npm run stop:prod:pm2    # Stop aplikasi
npm run restart:prod:pm2 # Restart aplikasi
```

### Deploy Update (setelah ada perubahan code)

```bash
# Di server, dari folder project:
git pull origin main
npm ci
npx prisma generate
npm run build
pm2 restart fms-backend
```

**Atau pakai satu perintah lengkap:**

```bash
npm run deploy
```

Script `deploy` = `npm ci` → `npx prisma generate` → `npm run build` → `pm2 start ecosystem.config.js --env production`.

---

## 📦 Script yang Tersedia (`package.json`)

| Script | Fungsi |
|--------|--------|
| `npm run start:dev` | Jalankan di development (watch mode) |
| `npm run build` | Kompilasi TypeScript ke `dist/` |
| `npm run start:prod` | Jalankan hasil build langsung (`node dist/src/main.js`) |
| `npm run start:prod:pm2` | Start production via PM2 |
| `npm run stop:prod:pm2` | Stop PM2 app |
| `npm run restart:prod:pm2` | Restart PM2 app |
| `npm run deploy` | Full deploy: install → generate → build → start PM2 |
| `npm run lint` | ESLint + auto-fix |
| `npm run test` | Unit test (Jest) |
| `npm run test:e2e` | E2E test |

---

## 🗂️ Struktur Project

```
fms-backend/
├── src/
│   ├── main.ts                 # Entry point (bootstrap)
│   ├── app.module.ts           # Root module
│   ├── config/                 # Konfigurasi environment
│   ├── core/
│   │   ├── database/           # PrismaService & DatabaseModule
│   │   └── decorators/         # Custom decorators
│   ├── common/
│   │   ├── filters/            # Global exception filter
│   │   ├── helpers/            # Helper functions
│   │   ├── interceptors/       # Global response interceptor
│   │   └── websocket/          # Socket.IO gateway
│   └── modules/                # Fitur-fitur (auth, users, devices, dll)
├── prisma/
│   └── schema.prisma           # Skema database
├── ecosystem.config.js         # Konfigurasi PM2
├── .env.example                # Template environment variables
├── package.json
└── tsconfig.json
```

---

## 🔌 Endpoint Utama

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/fms/api` | Health check server |
| `POST` | `/fms/api/auth/login` | Login user |
| `POST` | `/fms/api/auth/refresh` | Refresh token |
| `GET` | `/fms/api/equipment-status/live` | Status peralatan live |
| ... | `/fms/api/*` | Dan modul lainnya |

> 📚 **Swagger** aktif otomatis di environment non-production:
> ```
> http://localhost:3346/fms/api/docs
> ```

---

## 🧰 Tools yang Dipakai

- **NestJS 11** — Framework backend
- **Prisma 6** — ORM PostgreSQL
- **PostgreSQL** — Database
- **Socket.IO** — Real-time communication
- **JWT + Passport** — Autentikasi
- **Helmet & Compression** — Keamanan & performa
- **Throttler** — Rate limiting
- **PM2** — Process manager

---

## 📄 Lisensi

Private / Internal use only.
