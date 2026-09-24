import React, { useState } from 'react';
import {
  Server,
  Terminal,
  Copy,
  Check,
  Download,
  ExternalLink,
  Shield,
  Zap,
  Globe,
  HardDrive,
  Cpu,
  RefreshCw,
  HelpCircle,
  Sparkles,
  ChevronRight,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  FileCode,
  FolderGit2
} from 'lucide-react';

interface VpsTutorialTabProps {
  lang: 'id' | 'en';
}

export const VpsTutorialTab: React.FC<VpsTutorialTabProps> = ({ lang }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [customPort, setCustomPort] = useState('3000');
  const [customDomain, setCustomDomain] = useState('tiktok.domainkamu.com');
  const [activeSubTab, setActiveSubTab] = useState<'quick' | 'stepbystep' | 'management' | 'faq'>('quick');

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2500);
  };

  // Full 1-Click install command
  const oneClickCommand = `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash - && \\
sudo apt-get update && sudo apt-get install -y curl wget git ffmpeg build-essential ufw nodejs && \\
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \\
sudo chmod a+rx /usr/local/bin/yt-dlp && \\
sudo npm install -g pm2 && \\
( [ $(free -m | awk '/^Mem:/{print $2}') -lt 2100 ] && [ ! -f /swapfile ] && (sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048) && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile && echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab || true ) && \\
sudo ufw allow 22/tcp && sudo ufw allow ${customPort}/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && \\
echo -e "\\n\\033[0;32m[SUKSES] Semua dependensi VPS (Node.js 20, FFmpeg, yt-dlp, PM2) telah siap!\\033[0m"`;

  const nginxConfig = `server {
    server_name ${customDomain || 'tiktok.domainkamu.com'};

    location / {
        proxy_pass http://127.0.0.1:${customPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 500M;
    }
}`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* HERO BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950/80 via-zinc-900 to-zinc-950 border border-indigo-800/40 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>{lang === 'id' ? 'Panduan Online 24/7 VPS Pemula' : 'Beginner VPS Online 24/7 Deployment'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {lang === 'id'
                ? 'Jalankan Bot di Server VPS (Online Non-Stop Tanpa Laptop Nyala)'
                : 'Run the Bot Online 24/7 on a VPS (Without Leaving Your PC On)'}
            </h1>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {lang === 'id'
                ? 'Dengan VPS murah (mulai Rp 50rb/bulan), bot akan otomatis memantau live TikTok, merekam langsung dari server, dan mengirim file MP4 ke Telegram secara terus-menerus meskipun laptop atau handphone Anda mati.'
                : 'With a cheap VPS, your bot continuously detects live streams, captures video directly on the cloud server, and forwards high-quality MP4 recordings to Telegram 24/7 without consuming your home bandwidth.'}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-md bg-zinc-800/80 text-zinc-300 border border-zinc-700">
                <Cpu className="w-3.5 h-3.5 mr-1.5 text-cyan-400" /> 1-2 Core CPU
              </span>
              <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-md bg-zinc-800/80 text-zinc-300 border border-zinc-700">
                <HardDrive className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> 1 GB - 2 GB RAM
              </span>
              <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-md bg-zinc-800/80 text-zinc-300 border border-zinc-700">
                <Server className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> Ubuntu 22.04 / 24.04 LTS
              </span>
              <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-md bg-zinc-800/80 text-zinc-300 border border-zinc-700">
                <Shield className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> Auto-Restart PM2
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 flex-shrink-0">
            <a
              href="/api/download/setup-vps.sh"
              download="setup-vps.sh"
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold shadow-lg shadow-indigo-900/40 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{lang === 'id' ? 'Unduh Script Installer (.sh)' : 'Download Installer (.sh)'}</span>
            </a>
            <a
              href="/api/download/deployment-guide"
              download="PANDUAN_VPS_PEMULA.md"
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition cursor-pointer"
            >
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span>{lang === 'id' ? 'Unduh Dokumen Panduan (.md)' : 'Download Guide (.md)'}</span>
            </a>
          </div>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="flex border-b border-zinc-800 gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setActiveSubTab('quick')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeSubTab === 'quick'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>{lang === 'id' ? '⚡ Jalur Cepat (1-Klik Install)' : '⚡ Quick Setup (1-Click)'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('stepbystep')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeSubTab === 'stepbystep'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span>{lang === 'id' ? '📖 Langkah Demi Langkah Detail' : '📖 Step-by-Step Guide'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('management')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeSubTab === 'management'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span>{lang === 'id' ? '🛠️ Perintah Kontrol PM2' : '🛠️ PM2 Controls'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('faq')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeSubTab === 'faq'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-rose-400" />
          <span>{lang === 'id' ? '❓ FAQ & Solusi Kendala' : '❓ Troubleshooting & FAQ'}</span>
        </button>
      </div>

      {/* INTERACTIVE CUSTOMIZER BAR */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">
              {lang === 'id' ? 'Kustomisasi Otomatis Script' : 'Custom Script Generator'}
            </h4>
            <p className="text-[11px] text-zinc-400">
              {lang === 'id'
                ? 'Sesuaikan port dan domain Anda, semua perintah di bawah akan otomatis berubah!'
                : 'Adjust your port & domain below, and all terminal commands will adapt in real-time!'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2">
            <label className="text-[11px] font-mono text-zinc-400">Port:</label>
            <input
              type="text"
              value={customPort}
              onChange={(e) => setCustomPort(e.target.value || '3000')}
              className="w-20 px-2.5 py-1 bg-zinc-950 border border-zinc-700 rounded-lg text-xs font-mono text-cyan-300 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-[11px] font-mono text-zinc-400">Domain:</label>
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="tiktok.domainmu.com"
              className="w-48 sm:w-56 px-2.5 py-1 bg-zinc-950 border border-zinc-700 rounded-lg text-xs font-mono text-cyan-300 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SUB-TAB 1: QUICK SETUP (1-CLICK) */}
      {/* ============================================================== */}
      {activeSubTab === 'quick' && (
        <div className="space-y-6">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono tracking-wider uppercase text-amber-400 font-bold bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded">
                  {lang === 'id' ? 'JALUR TERCEPAT & TERMUDAH' : 'FASTEST & EASIEST PATH'}
                </span>
                <h3 className="text-base font-bold text-white mt-2">
                  {lang === 'id'
                    ? '1. Jalankan Script Auto-Install di VPS Anda'
                    : '1. Run the Auto-Install Command on your VPS'}
                </h3>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                  {lang === 'id'
                    ? 'Cukup salin dan tempel perintah ini ke terminal VPS Anda. Script ini akan otomatis memasang Node.js 20, FFmpeg, yt-dlp binary terbaru, PM2 process manager, dan swap memory 2GB.'
                    : 'Simply copy and paste this command into your VPS terminal. It installs Node.js 20, FFmpeg, latest yt-dlp, PM2, and 2GB swap space automatically.'}
                </p>
              </div>

              <button
                onClick={() => copyToClipboard(oneClickCommand, 'oneclick')}
                className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex-shrink-0 cursor-pointer shadow-lg shadow-indigo-900/30"
              >
                {copiedKey === 'oneclick' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>{lang === 'id' ? 'Tersalin!' : 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{lang === 'id' ? 'Salin Perintah 1-Klik' : 'Copy 1-Click Command'}</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <pre className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed select-all">
                {oneClickCommand}
              </pre>
            </div>
          </div>

          {/* Quick Flow: 3 Simple Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-700/60 flex items-center justify-center font-bold text-sm text-indigo-400 font-mono">
                1
              </div>
              <h4 className="text-sm font-bold text-white">
                {lang === 'id' ? 'Masuk ke VPS via SSH' : 'Login to VPS via SSH'}
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {lang === 'id'
                  ? 'Buka terminal di komputer Anda, lalu ketik `ssh root@IP_VPS_ANDA` dan masukkan password VPS.'
                  : 'Open terminal on your computer and connect using `ssh root@YOUR_VPS_IP`.'}
              </p>
              <div className="p-2 bg-zinc-950 rounded border border-zinc-800/80 font-mono text-[11px] text-zinc-300 flex items-center justify-between">
                <span>ssh root@123.45.67.89</span>
                <button
                  onClick={() => copyToClipboard('ssh root@123.45.67.89', 'ssh_quick')}
                  className="text-zinc-500 hover:text-white"
                >
                  {copiedKey === 'ssh_quick' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-700/60 flex items-center justify-center font-bold text-sm text-cyan-400 font-mono">
                2
              </div>
              <h4 className="text-sm font-bold text-white">
                {lang === 'id' ? 'Pasang File Proyek' : 'Deploy Project Files'}
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {lang === 'id'
                  ? 'Pindahkan folder aplikasi ke server VPS atau clone dari repository Git, lalu jalankan instalasi paket.'
                  : 'Transfer your application directory to the VPS or clone it, then install dependencies.'}
              </p>
              <div className="p-2 bg-zinc-950 rounded border border-zinc-800/80 font-mono text-[11px] text-zinc-300 flex items-center justify-between">
                <span>npm install && npm run build</span>
                <button
                  onClick={() => copyToClipboard('npm install && npm run build', 'build_quick')}
                  className="text-zinc-500 hover:text-white"
                >
                  {copiedKey === 'build_quick' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-700/60 flex items-center justify-center font-bold text-sm text-emerald-400 font-mono">
                3
              </div>
              <h4 className="text-sm font-bold text-white">
                {lang === 'id' ? 'Aktifkan 24/7 dengan PM2' : 'Start 24/7 with PM2'}
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {lang === 'id'
                  ? 'Jalankan bot di latar belakang agar tetap beroperasi terus meski Anda menutup laptop.'
                  : 'Run the bot in the background so it never stops when you shut down your PC.'}
              </p>
              <div className="p-2 bg-zinc-950 rounded border border-zinc-800/80 font-mono text-[11px] text-zinc-300 flex items-center justify-between">
                <span>pm2 start "npm run dev" --name "tiktok-recorder"</span>
                <button
                  onClick={() => copyToClipboard('pm2 start "npm run dev" --name "tiktok-recorder" && pm2 startup && pm2 save', 'pm2_quick')}
                  className="text-zinc-500 hover:text-white"
                >
                  {copiedKey === 'pm2_quick' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* Access Your Live Bot Box */}
          <div className="bg-gradient-to-r from-emerald-950/40 to-cyan-950/40 border border-emerald-800/40 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {lang === 'id' ? 'Akses Web UI Bot Anda' : 'Access Your Online Dashboard'}
                </h4>
                <p className="text-xs text-zinc-300">
                  {lang === 'id'
                    ? `Buka browser Anda dan kunjungi http://IP_VPS_ANDA:${customPort}. Bot sudah berjalan 24 jam nonstop!`
                    : `Open your browser and navigate to http://YOUR_VPS_IP:${customPort}. Your bot is now active 24/7!`}
                </p>
              </div>
            </div>
            <div className="font-mono text-xs text-emerald-400 bg-zinc-950 px-3 py-2 rounded-lg border border-emerald-700/40">
              http://IP_VPS_ANDA:{customPort}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 2: STEP BY STEP GUIDE */}
      {/* ============================================================== */}
      {activeSubTab === 'stepbystep' && (
        <div className="space-y-6">
          {/* STEP 1: PILIH VPS */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <span className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                1
              </span>
              <h3 className="text-base font-bold text-white">
                {lang === 'id' ? 'Pilih Provider & Spesifikasi VPS' : 'Choose VPS Provider & Specs'}
              </h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {lang === 'id'
                ? 'Untuk pemula, Anda tidak memerlukan server mahal. VPS dengan 1-2 vCPU dan 1-2 GB RAM sudah sangat cukup untuk merekam stream TikTok berkualitas tinggi.'
                : 'For beginners, you do not need an expensive server. A 1-2 vCPU and 1-2 GB RAM VPS is more than enough.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">IdCloudHost / DomaiNesia</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">Mulai Rp 50rb/bln</span>
                </div>
                <p className="text-[11px] text-zinc-400">Server lokal Indonesia, latensi sangat cepat, pembayaran QRIS/BCA.</p>
              </div>
              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">DigitalOcean / Linode</span>
                  <span className="text-[10px] text-indigo-400 font-semibold">$4 - $6 / bln</span>
                </div>
                <p className="text-[11px] text-zinc-400">Paling stabil, jaringan global cepat, setup instan dalam 55 detik.</p>
              </div>
              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Contabo / Hetzner</span>
                  <span className="text-[10px] text-cyan-400 font-semibold">Mulai €4 - €6 / bln</span>
                </div>
                <p className="text-[11px] text-zinc-400">Spesifikasi RAM besar (4GB - 8GB) dengan harga sangat hemat.</p>
              </div>
            </div>

            <div className="p-3 bg-indigo-950/30 border border-indigo-800/40 rounded-lg text-xs text-indigo-300 flex items-start space-x-2">
              <Shield className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>{lang === 'id' ? 'Pilihan OS Terbaik:' : 'Recommended OS:'}</strong> {lang === 'id' ? 'Pilih ' : 'Select '}
                <strong className="text-white">Ubuntu 22.04 LTS</strong> {lang === 'id' ? 'atau' : 'or'} <strong className="text-white">Ubuntu 24.04 LTS</strong> {lang === 'id' ? 'karena kompatibel dengan semua paket FFmpeg & Node.js.' : 'for optimal FFmpeg and Node.js support.'}
              </span>
            </div>
          </div>

          {/* STEP 2: LOGIN SSH */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <span className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                2
              </span>
              <h3 className="text-base font-bold text-white">
                {lang === 'id' ? 'Login ke VPS Anda Melalui SSH' : 'Connect to your VPS via SSH'}
              </h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {lang === 'id'
                ? 'Gunakan aplikasi Terminal (bawaan Windows: CMD/PowerShell, bawaan Mac/Linux: Terminal) atau aplikasi gratis seperti PuTTY / Bitvise:'
                : 'Use your terminal (Windows PowerShell/CMD, MacOS Terminal) or PuTTY:'}
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>{lang === 'id' ? 'Perintah login SSH:' : 'SSH Login command:'}</span>
                <button
                  onClick={() => copyToClipboard('ssh root@IP_VPS_ANDA', 'ssh_step')}
                  className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer"
                >
                  {copiedKey === 'ssh_step' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'ssh_step' ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
              <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-cyan-300">
                ssh root@IP_VPS_ANDA
              </pre>
              <p className="text-[11px] text-zinc-400">
                * Ganti <code className="text-cyan-400">IP_VPS_ANDA</code> dengan alamat IP publik yang diberikan provider VPS Anda, lalu masukkan password root saat diminta.
              </p>
            </div>
          </div>

          {/* STEP 3: INSTALL DEPENDENCIES */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <span className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                3
              </span>
              <h3 className="text-base font-bold text-white">
                {lang === 'id' ? 'Install Node.js 20, FFmpeg, & yt-dlp' : 'Install Node.js 20, FFmpeg, & yt-dlp'}
              </h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {lang === 'id'
                ? 'Jalankan perintah ini satu per satu di terminal VPS untuk menginstal modul perekam video stream:'
                : 'Execute these commands on your VPS to install the required media modules:'}
            </p>

            <div className="space-y-3">
              {/* Node.js */}
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                  <span>3.1 Install Node.js 20 LTS:</span>
                  <button
                    onClick={() => copyToClipboard('curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash - && sudo apt-get install -y nodejs', 'cmd_node')}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedKey === 'cmd_node' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Salin</span>
                  </button>
                </div>
                <pre className="p-2.5 bg-zinc-950 border border-zinc-800 rounded text-xs font-mono text-emerald-400 overflow-x-auto">
                  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash - && sudo apt-get install -y nodejs
                </pre>
              </div>

              {/* FFmpeg & Tools */}
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                  <span>3.2 Install FFmpeg & Tools:</span>
                  <button
                    onClick={() => copyToClipboard('sudo apt-get update && sudo apt-get install -y ffmpeg git build-essential ufw', 'cmd_ffmpeg')}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedKey === 'cmd_ffmpeg' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Salin</span>
                  </button>
                </div>
                <pre className="p-2.5 bg-zinc-950 border border-zinc-800 rounded text-xs font-mono text-emerald-400 overflow-x-auto">
                  sudo apt-get update && sudo apt-get install -y ffmpeg git build-essential ufw
                </pre>
              </div>

              {/* yt-dlp */}
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                  <span>3.3 Install yt-dlp Versi Terbaru:</span>
                  <button
                    onClick={() => copyToClipboard('sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && sudo chmod a+rx /usr/local/bin/yt-dlp', 'cmd_ytdlp')}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedKey === 'cmd_ytdlp' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Salin</span>
                  </button>
                </div>
                <pre className="p-2.5 bg-zinc-950 border border-zinc-800 rounded text-xs font-mono text-emerald-400 overflow-x-auto">
                  sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && sudo chmod a+rx /usr/local/bin/yt-dlp
                </pre>
              </div>

              {/* PM2 */}
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                  <span>3.4 Install PM2 (Process Manager):</span>
                  <button
                    onClick={() => copyToClipboard('sudo npm install -g pm2', 'cmd_pm2')}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedKey === 'cmd_pm2' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Salin</span>
                  </button>
                </div>
                <pre className="p-2.5 bg-zinc-950 border border-zinc-800 rounded text-xs font-mono text-emerald-400 overflow-x-auto">
                  sudo npm install -g pm2
                </pre>
              </div>
            </div>
          </div>

          {/* STEP 4: PASANG PROYEK & BUILD */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <span className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                4
              </span>
              <h3 className="text-base font-bold text-white">
                {lang === 'id' ? 'Setup Folder Proyek & Build' : 'Setup Project Directory & Build'}
              </h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {lang === 'id'
                ? 'Buat direktori kerja di `/var/www/tiktok-recorder`, masukkan kode proyek (bisa menggunakan Git atau SFTP FileZilla), lalu compile build frontend:'
                : 'Place project files in `/var/www/tiktok-recorder` and build the frontend:'}
            </p>

            <div className="relative">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>{lang === 'id' ? 'Perintah setup & build:' : 'Setup & build commands:'}</span>
                <button
                  onClick={() => copyToClipboard(`mkdir -p /var/www/tiktok-recorder && cd /var/www/tiktok-recorder\nnpm install\nnpm run build`, 'cmd_dir_build')}
                  className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer"
                >
                  {copiedKey === 'cmd_dir_build' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Salin</span>
                </button>
              </div>
              <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed">
{`# Masuk ke folder proyek
mkdir -p /var/www/tiktok-recorder
cd /var/www/tiktok-recorder

# Install pustaka dan compile
npm install
npm run build`}
              </pre>
            </div>
          </div>

          {/* STEP 5: JALANKAN 24/7 DENGAN PM2 */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <span className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                5
              </span>
              <h3 className="text-base font-bold text-white">
                {lang === 'id' ? 'Jalankan Service 24 Jam dengan PM2' : 'Start 24/7 Background Service with PM2'}
              </h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {lang === 'id'
                ? 'PM2 menjaga aplikasi tetap berjalan non-stop di background. Jika server me-restart atau listrik padam sementara, PM2 otomatis menjalankan bot kembali.'
                : 'PM2 keeps the bot running in the background and auto-starts on system reboots.'}
            </p>

            <div className="relative">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>{lang === 'id' ? 'Perintah PM2 startup & simpan:' : 'PM2 startup & save commands:'}</span>
                <button
                  onClick={() => copyToClipboard(`pm2 start npm --name "tiktok-recorder" -- run dev\npm2 startup\npm2 save`, 'cmd_pm2_start')}
                  className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer"
                >
                  {copiedKey === 'cmd_pm2_start' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Salin</span>
                </button>
              </div>
              <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed">
{`# Jalankan bot dengan nama tiktok-recorder
pm2 start npm --name "tiktok-recorder" -- run dev

# Buat auto-start saat reboot
pm2 startup
pm2 save`}
              </pre>
            </div>
          </div>

          {/* STEP 6: FIREWALL */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <span className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                6
              </span>
              <h3 className="text-base font-bold text-white">
                {lang === 'id' ? 'Buka Port Firewall (UFW)' : 'Allow Firewall Ports (UFW)'}
              </h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {lang === 'id'
                ? `Pastikan port ${customPort} dan port web terbuka agar browser Anda bisa mengakses dashboard aplikasi:`
                : `Ensure port ${customPort} and web traffic ports are permitted:`}
            </p>

            <div className="relative">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>{lang === 'id' ? 'Perintah UFW Firewall:' : 'UFW Firewall commands:'}</span>
                <button
                  onClick={() => copyToClipboard(`sudo ufw allow 22/tcp\nsudo ufw allow ${customPort}/tcp\nsudo ufw allow 80/tcp\nsudo ufw allow 443/tcp\nsudo ufw --force enable`, 'cmd_ufw')}
                  className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer"
                >
                  {copiedKey === 'cmd_ufw' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Salin</span>
                </button>
              </div>
              <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed">
{`sudo ufw allow 22/tcp
sudo ufw allow ${customPort}/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable`}
              </pre>
            </div>
          </div>

          {/* BONUS STEP: DOMAIN & SSL */}
          <div className="bg-gradient-to-br from-indigo-950/30 to-zinc-900 border border-indigo-800/40 rounded-xl p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <span className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xs">
                ★
              </span>
              <h3 className="text-base font-bold text-white">
                {lang === 'id' ? 'Bonus: Pasang Domain & SSL HTTPS Gratis (Nginx)' : 'Bonus: Connect Custom Domain & Free SSL (Nginx)'}
              </h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {lang === 'id'
                ? `Agar dashboard bisa dibuka dengan alamat rapi seperti https://${customDomain || 'tiktok.domainkamu.com'}, pasang Nginx Reverse Proxy:`
                : `To access your bot via https://${customDomain || 'tiktok.domainkamu.com'}, configure Nginx reverse proxy:`}
            </p>

            <div className="space-y-3">
              <div>
                <span className="text-xs text-zinc-400">1. Pasang Nginx & Certbot:</span>
                <pre className="p-2 bg-zinc-950 border border-zinc-800 rounded text-xs font-mono text-cyan-300 mt-1">
                  sudo apt-get install -y nginx certbot python3-certbot-nginx
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                  <span>2. Konfigurasi Nginx untuk domain {customDomain}:</span>
                  <button
                    onClick={() => copyToClipboard(nginxConfig, 'nginx_cfg')}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedKey === 'nginx_cfg' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Salin Konfigurasi</span>
                  </button>
                </div>
                <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed">
                  {nginxConfig}
                </pre>
              </div>

              <div>
                <span className="text-xs text-zinc-400">3. Aktifkan & Pasang SSL Let's Encrypt Gratis:</span>
                <pre className="p-2.5 bg-zinc-950 border border-zinc-800 rounded text-xs font-mono text-cyan-300 mt-1">
                  {`sudo certbot --nginx -d ${customDomain || 'tiktok.domainkamu.com'}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 3: MANAGEMENT & PM2 CONTROLS */}
      {/* ============================================================== */}
      {activeSubTab === 'management' && (
        <div className="space-y-6">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>{lang === 'id' ? 'Kumpulan Perintah Penting Pengelolaan VPS' : 'Common VPS Management Commands'}</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {lang === 'id'
                ? 'Simpan contekan perintah ini untuk memeriksa status perekaman, memantau log, atau merestart bot sewaktu-waktu:'
                : 'Keep this cheatsheet to check status, monitor live logs, or restart the bot service:'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* PM2 Status */}
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Cek Status Bot:</span>
                  <button
                    onClick={() => copyToClipboard('pm2 status', 'cmd_status')}
                    className="text-zinc-500 hover:text-white"
                  >
                    {copiedKey === 'cmd_status' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <pre className="p-2 bg-zinc-900 rounded font-mono text-xs text-emerald-400">pm2 status</pre>
                <p className="text-[11px] text-zinc-400">Melihat apakah proses bot aktif, pemakaian RAM, dan uptime.</p>
              </div>

              {/* PM2 Logs */}
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Lihat Log Real-Time:</span>
                  <button
                    onClick={() => copyToClipboard('pm2 logs tiktok-recorder --lines 50', 'cmd_logs')}
                    className="text-zinc-500 hover:text-white"
                  >
                    {copiedKey === 'cmd_logs' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <pre className="p-2 bg-zinc-900 rounded font-mono text-xs text-emerald-400">pm2 logs tiktok-recorder --lines 50</pre>
                <p className="text-[11px] text-zinc-400">Melihat stream ffmpeg dan upload telegram langsung saat sedang berlangsung.</p>
              </div>

              {/* PM2 Restart */}
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Restart Bot:</span>
                  <button
                    onClick={() => copyToClipboard('pm2 restart tiktok-recorder', 'cmd_restart')}
                    className="text-zinc-500 hover:text-white"
                  >
                    {copiedKey === 'cmd_restart' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <pre className="p-2 bg-zinc-900 rounded font-mono text-xs text-cyan-400">pm2 restart tiktok-recorder</pre>
                <p className="text-[11px] text-zinc-400">Me-restart bot secara halus tanpa kehilangan konfigurasi.</p>
              </div>

              {/* Update Code */}
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Update Aplikasi ke Versi Baru:</span>
                  <button
                    onClick={() => copyToClipboard('git pull && npm install && npm run build && pm2 restart tiktok-recorder', 'cmd_update')}
                    className="text-zinc-500 hover:text-white"
                  >
                    {copiedKey === 'cmd_update' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <pre className="p-2 bg-zinc-900 rounded font-mono text-xs text-cyan-400">git pull && npm install && npm run build && pm2 restart tiktok-recorder</pre>
                <p className="text-[11px] text-zinc-400">Mengambil kode terbaru, build ulang, dan restart otomatis.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 4: FAQ & TROUBLESHOOTING */}
      {/* ============================================================== */}
      {activeSubTab === 'faq' && (
        <div className="space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-2">
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">Q</span>
              <span>Apakah laptop atau komputer saya boleh dimatikan?</span>
            </h4>
            <p className="text-xs text-zinc-300 leading-relaxed pl-7">
              <strong>Tentu saja!</strong> Inilah tujuan utama menggunakan VPS. Seluruh proses pemeriksaan akun TikTok live, perekaman video, hingga pengiriman video MP4 ke Telegram dilakukan langsung oleh server VPS di cloud. Laptop, PC, atau HP Anda bisa dimatikan sepenuhnya.
            </p>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-2">
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">Q</span>
              <span>Apakah kuota internet HP atau WiFi rumah saya tersedot saat merekam?</span>
            </h4>
            <p className="text-xs text-zinc-300 leading-relaxed pl-7">
              <strong>Tidak sama sekali.</strong> Server VPS memiliki koneksi internet dan bandwidth-nya sendiri (biasanya 1 Gbps tak terbatas atau bertaraf Terabyte). Kuota internet Anda hanya terpakai sedikit ketika membuka dashboard web bot untuk melihat status.
            </p>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-2">
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">Q</span>
              <span>Bagaimana jika kapasitas harddisk (SSD) VPS saya penuh?</span>
            </h4>
            <p className="text-xs text-zinc-300 leading-relaxed pl-7">
              Di tab <strong>Pengaturan Bot & Batas Host</strong>, pastikan opsi <strong>"Hapus Otomatis File Lokal Setelah Sukses Upload Telegram"</strong> dalam keadaan aktif. Dengan opsi ini, video yang selesai diunggah ke Telegram otomatis dihapus dari harddisk VPS sehingga ruang disk Anda selalu lega.
            </p>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-2">
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">Q</span>
              <span>Saya tidak bisa membuka alamat http://IP_VPS:3000 di browser, kenapa?</span>
            </h4>
            <p className="text-xs text-zinc-300 leading-relaxed pl-7">
              Hal ini biasanya disebabkan oleh <strong>Security Group / Firewall</strong> pada panel kontrol provider VPS Anda (seperti AWS, IdCloudHost, atau Oracle Cloud). Masuk ke web provider VPS Anda, cari menu <em>Firewall / Security Rules</em>, dan tambahkan aturan <em>Inbound Rule</em> untuk membuka Port <code className="text-cyan-400">3000</code> (atau gunakan Nginx di Port 80/443).
            </p>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-2">
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">Q</span>
              <span>Bagaimana jika RAM VPS kecil (misal 1 GB) dan terasa berat saat build?</span>
            </h4>
            <p className="text-xs text-zinc-300 leading-relaxed pl-7">
              Script 1-klik kami sudah otomatis membuat <strong>2 GB Swap Memory</strong>. Swap memory berfungsi menggunakan sebagian harddisk SSD sebagai memori darurat sehingga server tidak pernah mengalami error <em>Out of Memory</em>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
