# Panduan Update & PM2

Repository pada lokal dan server sudah terhubung ke `origin`. Branch production menggunakan `main`.

## 1. Update dari laptop lokal

Sebelum mulai mengubah kode, tarik perubahan terbaru. Setelah itu ubah script, cek build, lalu kirim perubahan ke repository.

```bash
git pull origin main

# Ubah source code
npm run build

git add .
git commit -m "deskripsi perubahan"
git push origin main
```

> Jalankan `git pull` **sebelum** mengubah kode, bukan setelahnya. Ini mencegah conflict atau perubahan lokal tertimpa.

## 2. Update di server

Masuk ke server, buka folder project, lalu tarik source terbaru dan build ulang.

```bash
ssh <user>@<ip-server>
cd /var/www/fms-backend

git pull origin main
npm ci
npx prisma generate
npm run build

# Jalankan jika ada migration database baru
# npx prisma migrate deploy

pm2 startOrReload ecosystem.config.js --env production --update-env
pm2 save
```

Pastikan aplikasi aktif:

```bash
pm2 status
pm2 logs fms-backend --lines 100
```

## 3. Setup PM2 dan auto-start server

Langkah ini cukup dilakukan **sekali** di server. PM2 akan menjalankan `fms-backend`, menghidupkannya kembali jika crash, dan memulihkannya setelah server restart.

```bash
npm install --global pm2
cd /var/www/fms-backend

pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup systemd -u $USER --hp $HOME
```

Setelah menjalankan `pm2 startup`, PM2 menampilkan perintah `sudo ...`. Salin dan jalankan perintah tersebut, lalu jalankan kembali:

```bash
pm2 save
```

Perintah PM2 yang sering dipakai:

```bash
pm2 status                 # Status aplikasi
pm2 logs fms-backend       # Log aplikasi
pm2 restart fms-backend    # Restart aplikasi
```
