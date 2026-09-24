#!/usr/bin/env bash
# ==============================================================================
# TikTok Live Recorder & Telegram Uploader - VPS Auto Installer Script
# Dibuat khusus untuk pemula (Ubuntu 20.04/22.04/24.04 & Debian 11/12)
# ==============================================================================

set -e

# Warna output terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}================================================================${NC}"
echo -e "${GREEN}   TIKTOK LIVE RECORDER & TELEGRAM BOT - VPS AUTO INSTALLER    ${NC}"
echo -e "${CYAN}================================================================${NC}"
echo -e "${YELLOW}Menyiapkan dependensi sistem untuk perekaman live 24/7...${NC}\n"

# 1. Pastikan script dijalankan sebagai root / sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Harap jalankan script ini sebagai root atau dengan 'sudo bash setup-vps.sh'${NC}"
  exit 1
fi

# 2. Update sistem apt
echo -e "${CYAN}[1/6] Memperbarui package repository sistem (apt update)...${NC}"
apt-get update -y

# 3. Install paket dasar, Python 3, & FFmpeg
echo -e "${CYAN}[2/6] Menginstal dependensi dasar (curl, git, ffmpeg, python3, build-essential)...${NC}"
apt-get install -y curl wget git ffmpeg build-essential ufw python3 python3-pip python3-venv

# 4. Install Node.js 20 LTS (NodeSource)
echo -e "${CYAN}[3/6] Memeriksa & Menginstal Node.js 20 LTS...${NC}"
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d'.' -f1)" != "v20" ]; then
  echo -e "${YELLOW}Mengunduh NodeSource Node.js 20.x repo...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  echo -e "${GREEN}Node.js $(node -v) sudah terpasang.${NC}"
fi

# 5. Install yt-dlp versi terbaru secara mandiri
echo -e "${CYAN}[4/6] Memasang versi terbaru yt-dlp binary...${NC}"
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
chmod a+rx /usr/local/bin/yt-dlp

# 6. Install PM2 (Process Manager agar aplikasi online 24/7 di background)
echo -e "${CYAN}[5/6] Memasang PM2 Process Manager secara global...${NC}"
npm install -g pm2

# 7. Setup 2GB Swap Memory jika RAM VPS <= 2GB untuk mencegah kehabisan memory
TOTAL_RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
if [ "$TOTAL_RAM_MB" -lt 2100 ] && [ ! -f /swapfile ]; then
  echo -e "${YELLOW}RAM VPS terdeteksi ${TOTAL_RAM_MB}MB. Menambahkan 2GB Swap Memory untuk stabilitas...${NC}"
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo -e "${GREEN}2GB Swap Memory berhasil diaktifkan!${NC}"
fi

# 8. Buka port firewall (UFW)
echo -e "${CYAN}[6/6] Menyiapkan port firewall (SSH: 22, Web App: 3000, HTTP: 80, HTTPS: 443)...${NC}"
ufw allow 22/tcp || true
ufw allow 3000/tcp || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true

echo -e "\n${GREEN}================================================================${NC}"
echo -e "${GREEN}   SELURUH DEPENDENSI BERHASIL DIPASANG DENGAN SUKSES!         ${NC}"
echo -e "${GREEN}================================================================${NC}"
echo -e "Versi terinstal di VPS Anda:"
echo -e "  • Node.js : $(node -v)"
echo -e "  • NPM     : v$(npm -v)"
echo -e "  • FFmpeg  : $(ffmpeg -version | head -n 1 | awk '{print $3}')"
echo -e "  • yt-dlp  : $(/usr/local/bin/yt-dlp --version)"
echo -e "  • PM2     : v$(pm2 -v)"
echo -e "----------------------------------------------------------------"
echo -e "${CYAN}Langkah berikutnya untuk menjalankan aplikasi:${NC}"
echo -e "  1. Masuk ke direktori aplikasi: ${YELLOW}cd /path/ke/folder-aplikasi${NC}"
echo -e "  2. Install paket project:      ${YELLOW}npm install${NC}"
echo -e "  3. Build frontend:             ${YELLOW}npm run build${NC}"
echo -e "  4. Jalankan 24/7 dengan PM2:   ${YELLOW}pm2 start npm --name 'tiktok-recorder' -- run dev${NC}"
echo -e "  5. Simpan service PM2:         ${YELLOW}pm2 startup && pm2 save${NC}"
echo -e "\nAplikasi Anda siap diakses di: ${GREEN}http://IP_VPS_ANDA:3000${NC}\n"
