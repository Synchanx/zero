# 🚀 Panduan Lengkap Deploy TikTok Live Recorder di VPS (Pemula)

Aplikasi ini dapat dijalankan secara online 24 jam non-stop (24/7) di VPS (Virtual Private Server) murah, sehingga laptop atau PC Anda dapat dimatikan sementara bot tetap otomatis memantau live TikTok, merekam, dan mengirim video ke Telegram.

---

## 📋 Spesifikasi VPS yang Disarankan
- **Sistem Operasi**: Ubuntu 22.04 LTS atau Ubuntu 24.04 LTS (Sangat disarankan)
- **CPU**: 1 Core / 2 Core
- **RAM**: 1 GB atau 2 GB (Disarankan buat Swap 2GB jika RAM 1GB)
- **Penyimpanan**: 25 GB – 50 GB SSD/NVMe
- **Rekomendasi Provider VPS Murah**:
  - DigitalOcean ($4 - $6 / bulan)
  - DomaiNesia / IdCloudHost (Mulai Rp 50.000 / bulan)
  - Contabo (RAM besar, murah)
  - Linode / Akamai ($5 / bulan)
  - AWS Lightsail ($3.5 - $5 / bulan)
  - Biznet Gio / Vultr / Hetzner

---

## ⚡ Cara Cepat: 1-Click Auto Install

Jalankan perintah ini di terminal VPS Anda untuk menginstal semua dependensi (Node.js 20, FFmpeg, yt-dlp terbaru, PM2, dan Swap Memory):

```bash
curl -fsSL https://raw.githubusercontent.com/your-repo/setup-vps.sh | sudo bash
```
*(Atau gunakan perintah manual di bawah ini)*

---

## 🛠️ Langkah Demi Langkah Manual

### Langkah 1: Login ke VPS via SSH
Buka Terminal (Mac/Linux) atau PowerShell / CMD / PuTTY (Windows):
```bash
ssh root@IP_VPS_ANDA
```
Masukkan password VPS yang diberikan oleh provider.

---

### Langkah 2: Update Sistem & Pasang Dependensi
Salin dan jalankan perintah berikut:
```bash
apt update && apt upgrade -y
apt install -y curl wget git ffmpeg build-essential ufw
```

---

### Langkah 3: Pasang Node.js 20 LTS & PM2
```bash
# Pasang Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Pasang PM2 (Process Manager agar aplikasi jalan di latar belakang)
npm install -g pm2
```

---

### Langkah 4: Pasang yt-dlp Versi Terbaru
```bash
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
chmod a+rx /usr/local/bin/yt-dlp
```

---

### Langkah 5: Masukkan Proyek & Jalankan
Pindahkan file proyek ke folder `/var/www/tiktok-recorder` atau folder home Anda:

```bash
mkdir -p /var/www/tiktok-recorder
cd /var/www/tiktok-recorder

# Salin/clone file proyek Anda ke sini, lalu:
npm install
npm run build
```

---

### Langkah 6: Jalankan Aplikasi 24/7 dengan PM2
PM2 memastikan bot tetap berjalan saat terminal Anda ditutup, dan otomatis restart jika VPS di-reboot.

```bash
# Jalankan service
pm2 start npm --name "tiktok-recorder" -- run dev

# Agar otomatis jalan saat VPS baru menyala (Auto start on boot):
pm2 startup
pm2 save
```

**Perintah Pengelolaan PM2 yang Sering Digunakan:**
- Cek status: `pm2 status`
- Lihat log rekaman langsung: `pm2 logs tiktok-recorder`
- Restart aplikasi: `pm2 restart tiktok-recorder`
- Stop aplikasi: `pm2 stop tiktok-recorder`

---

### Langkah 7: Buka Port Firewall (UFW)
```bash
ufw allow 22/tcp
ufw allow 3000/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

Buka browser Anda dan akses:
👉 **`http://IP_VPS_ANDA:3000`**

---

## 🌐 Opsional: Menghubungkan Domain & SSL HTTPS Gratis (Nginx)

Jika Anda punya domain (misal `tiktok.domainku.com`):

1. **Arahkan DNS Record**: Buat **A Record** di Cloudflare / registrar yang mengarah ke `IP_VPS_ANDA`.
2. **Pasang Nginx & Certbot**:
   ```bash
   apt install -y nginx certbot python3-certbot-nginx
   ```
3. **Buat file konfigurasi Nginx**:
   ```bash
   nano /etc/nginx/sites-available/tiktok-recorder
   ```
   Isi dengan:
   ```nginx
   server {
       server_name tiktok.domainku.com;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           client_max_body_size 500M;
       }
   }
   ```
4. **Aktifkan & Pasang SSL**:
   ```bash
   ln -s /etc/nginx/sites-available/tiktok-recorder /etc/nginx/sites-enabled/
   nginx -t && systemctl reload nginx
   certbot --nginx -d tiktok.domainku.com
   ```
Sekarang web bot Anda bisa diakses dengan aman di **`https://tiktok.domainku.com`**!
