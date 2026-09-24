import React, { useState } from 'react';
import {
  Send,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  Terminal,
  RefreshCw,
  HelpCircle,
  Sparkles,
  Layers,
  Trash2,
  Info,
  Users,
  Film,
  Sliders,
  Clock,
  HardDrive,
  GitBranch,
  Zap,
  Globe,
  Key,
  ExternalLink,
  Play
} from 'lucide-react';
import { TelegramConfig, RecorderConfig } from '../types';

interface TelegramSettingsTabProps {
  config: TelegramConfig;
  recorderConfig: RecorderConfig;
  onSaveConfig: (updated: Partial<TelegramConfig>) => Promise<boolean>;
  onSaveRecorderConfig: (updated: Partial<RecorderConfig>) => Promise<boolean>;
  onTestConnection: (token?: string, chatId?: string) => Promise<{ success: boolean; message?: string; botInfo?: any }>;
  lang: 'id' | 'en';
}

export const TelegramSettingsTab: React.FC<TelegramSettingsTabProps> = ({
  config,
  recorderConfig,
  onSaveConfig,
  onSaveRecorderConfig,
  onTestConnection,
  lang,
}) => {
  // Telegram Config State
  const [botToken, setBotToken] = useState(config.botToken || '');
  const [chatId, setChatId] = useState(config.chatId || '');
  const [topicId, setTopicId] = useState(config.topicId || '');
  const [sendLiveAlerts, setSendLiveAlerts] = useState(config.sendLiveAlerts ?? true);
  const [autoSplit, setAutoSplit] = useState(config.autoSplit ?? true);
  const [autoDeleteAfterUpload, setAutoDeleteAfterUpload] = useState(config.autoDeleteAfterUpload ?? false);
  const [pollingEnabled, setPollingEnabled] = useState(config.pollingEnabled ?? true);
  const [maxUploadSizeMb, setMaxUploadSizeMb] = useState(config.maxUploadSizeMb || 48);

  // Recorder & Host Limit State
  const [maxConcurrentRecordings, setMaxConcurrentRecordings] = useState(recorderConfig.maxConcurrentRecordings || 3);
  const [checkIntervalSeconds, setCheckIntervalSeconds] = useState(recorderConfig.checkIntervalSeconds || 45);
  const [stopMonitoringAfterUpload, setStopMonitoringAfterUpload] = useState(recorderConfig.stopMonitoringAfterUpload ?? false);
  const [preferredQuality, setPreferredQuality] = useState(recorderConfig.preferredQuality || 'best');

  // Michele0303 Engine State
  const [engine, setEngine] = useState<'michele0303' | 'direct-ffmpeg' | 'ytdlp'>(recorderConfig.engine || 'michele0303');
  const [useTikRecSigning, setUseTikRecSigning] = useState(recorderConfig.useTikRecSigning ?? true);
  const [useEulerStreamFallback, setUseEulerStreamFallback] = useState(recorderConfig.useEulerStreamFallback ?? true);
  const [proxy, setProxy] = useState(recorderConfig.proxy || '');
  const [cookies, setCookies] = useState(recorderConfig.cookies || '');

  // Michele0303 Engine Test State
  const [testUser, setTestUser] = useState('tiktok');
  const [testingMichele, setTestingMichele] = useState(false);
  const [micheleTestResult, setMicheleTestResult] = useState<any>(null);

  const [showToken, setShowToken] = useState(false);
  const [isSavingTg, setIsSavingTg] = useState(false);
  const [isSavingRecorder, setIsSavingRecorder] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; botInfo?: any } | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const handleTestMichele = async () => {
    if (!testUser.trim()) return;
    setTestingMichele(true);
    setMicheleTestResult(null);
    try {
      const res = await fetch('/api/recorder/test-michele', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: testUser.trim() }),
      });
      const data = await res.json();
      setMicheleTestResult(data);
    } catch (err: any) {
      setMicheleTestResult({ ok: false, message: err.message });
    } finally {
      setTestingMichele(false);
    }
  };

  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTg(true);
    await onSaveConfig({
      botToken: botToken.trim(),
      chatId: chatId.trim(),
      topicId: topicId.trim() || undefined,
      sendLiveAlerts,
      autoSplit,
      autoDeleteAfterUpload,
      pollingEnabled,
      maxUploadSizeMb: Number(maxUploadSizeMb),
    });
    setIsSavingTg(false);
  };

  const handleSaveRecorder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRecorder(true);
    await onSaveRecorderConfig({
      maxConcurrentRecordings: Math.max(1, Math.min(30, Number(maxConcurrentRecordings))),
      checkIntervalSeconds: Math.max(10, Number(checkIntervalSeconds)),
      stopMonitoringAfterUpload,
      preferredQuality,
      engine,
      useTikRecSigning,
      useEulerStreamFallback,
      proxy: proxy.trim(),
      cookies: cookies.trim(),
    });
    // Also sync autoDeleteAfterUpload to telegram config if changed here
    await onSaveConfig({
      autoDeleteAfterUpload,
      maxUploadSizeMb: Number(maxUploadSizeMb),
      autoSplit,
    });
    setIsSavingRecorder(false);
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await onTestConnection(botToken.trim(), chatId.trim());
    setTestResult(res);
    setIsTesting(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(text);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const isConfigured = Boolean(botToken && chatId);

  const commandsList = [
    { cmd: '/start', desc: lang === 'id' ? 'Menampilkan panduan bot & ringkasan perintah' : 'Show bot guide & command overview' },
    { cmd: '/status', desc: lang === 'id' ? 'Cek status live, rekaman aktif & konfigurasi batas host' : 'Check active recordings & host limit config' },
    { cmd: '/limit 3', desc: lang === 'id' ? 'Atur batas maksimal host yang bisa direcord bersamaan (1-30 host)' : 'Set max concurrent host recordings limit' },
    { cmd: '/autodelete on', desc: lang === 'id' ? 'Aktifkan hapus video lokal dari disk setelah sukses upload' : 'Enable auto-delete local video after upload' },
    { cmd: '/afterupload continue', desc: lang === 'id' ? 'Host terus dipantau setelah upload (atau gunakan "stop")' : 'Continue monitoring host after upload (or "stop")' },
    { cmd: '/list', desc: lang === 'id' ? 'Daftar semua streamer TikTok yang dipantau' : 'List all monitored TikTok creators' },
    { cmd: '/add username', desc: lang === 'id' ? 'Tambah akun TikTok ke pemantauan auto-record 24/7' : 'Add TikTok creator to auto-record list' },
    { cmd: '/remove username', desc: lang === 'id' ? 'Hapus akun TikTok dari daftar pantauan' : 'Remove TikTok creator from monitor list' },
    { cmd: '/check username', desc: lang === 'id' ? 'Cek apakah streamer sedang LIVE saat ini' : 'Check if creator is currently LIVE' },
    { cmd: '/record username', desc: lang === 'id' ? 'Mulai merekam live streaming sekarang juga' : 'Force start recording right now' },
    { cmd: '/stop username', desc: lang === 'id' ? 'Hentikan rekaman dan langsung kirim MP4 ke Telegram' : 'Stop recording and upload MP4 immediately' },
    { cmd: '/recordings', desc: lang === 'id' ? 'Lihat daftar video rekaman terbaru' : 'List recent recorded live videos' },
    { cmd: '/setchat', desc: lang === 'id' ? 'Jadikan chat/grup ini sebagai tujuan upload video' : 'Set this chat as target for video uploads' },
  ];

  return (
    <div className="space-y-6">
      
      {/* STATUS OVERVIEW CARD */}
      <div className={`rounded-xl border p-5 transition-all ${
        isConfigured
          ? 'bg-gradient-to-r from-emerald-950/20 via-zinc-900 to-zinc-900 border-emerald-800/50'
          : 'bg-gradient-to-r from-amber-950/20 via-zinc-900 to-zinc-900 border-amber-800/50'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isConfigured ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              <Send className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-white text-base">
                  {lang === 'id' ? 'Integrasi Bot Telegram & Recorder' : 'Telegram Bot & Recorder Integration'}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isConfigured ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}>
                  {isConfigured ? 'CONNECTED' : 'SETUP REQUIRED'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {isConfigured
                  ? (lang === 'id'
                      ? `Bot aktif mengirim video MP4 ke Chat ID: ${chatId} • Batas Host: ${maxConcurrentRecordings} bersamaan`
                      : `Bot active & sending MP4 videos to Chat ID: ${chatId} • Host Limit: ${maxConcurrentRecordings} concurrent`)
                  : (lang === 'id'
                      ? 'Konfigurasikan Bot Token & Chat ID untuk mengaktifkan pengiriman otomatis.'
                      : 'Configure Bot Token & Chat ID below to enable auto-uploads.')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting || !botToken}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg text-xs font-semibold border border-zinc-700 transition cursor-pointer self-start sm:self-auto"
          >
            {isTesting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>{lang === 'id' ? 'Tes Koneksi & Kirim Pesan' : 'Test Connection & Send Ping'}</span>
          </button>
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div className={`mt-4 p-3.5 rounded-lg border text-xs flex items-start space-x-2.5 ${
            testResult.success
              ? 'bg-emerald-950/40 text-emerald-200 border-emerald-800'
              : 'bg-rose-950/40 text-rose-200 border-rose-800'
          }`}>
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{testResult.message}</p>
              {testResult.botInfo && (
                <p className="text-[11px] opacity-80 mt-0.5 font-mono">
                  Bot: @{testResult.botInfo.username} ({testResult.botInfo.first_name})
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* SECTION 1: PENGATURAN BATAS HOST & SETELAH UPLOAD (USER REQUEST) */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {lang === 'id' ? 'Batas Maksimal Host & Setelah Upload' : 'Host Limit & After-Upload Settings'}
                </h4>
                <p className="text-[11px] text-zinc-400">
                  {lang === 'id' ? 'Atur batas maksimal rekaman host dan tindakan pasca upload' : 'Configure concurrent host limit & post-upload actions'}
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
              MP4 STREAM
            </span>
          </div>

          <form onSubmit={handleSaveRecorder} className="space-y-4">

            {/* BATAS MAKSIMAL HOST YANG BISA DI-RECORD */}
            <div className="bg-zinc-950/60 p-3.5 rounded-lg border border-zinc-800/80">
              <label className="block text-xs font-semibold text-zinc-200 mb-1">
                👥 {lang === 'id' ? 'Batas Maksimal Host yang Bisa di-Record Bersamaan' : 'Max Concurrent Host Recordings'}
              </label>
              <div className="flex items-center space-x-3 mt-2">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={maxConcurrentRecordings}
                  onChange={(e) => setMaxConcurrentRecordings(Number(e.target.value))}
                  className="w-24 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-mono font-bold text-white text-center focus:outline-none focus:border-cyan-500 transition"
                />
                <span className="text-xs text-zinc-400">Host / Streamer</span>

                {/* Quick preset buttons */}
                <div className="flex items-center space-x-1.5 ml-auto">
                  {[1, 2, 3, 5, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMaxConcurrentRecordings(num)}
                      className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition cursor-pointer ${
                        maxConcurrentRecordings === num
                          ? 'bg-cyan-600 text-white shadow'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-zinc-400 mt-2">
                {lang === 'id'
                  ? 'Membatasi jumlah host live TikTok yang direkam secara serentak. Jika host live melebihi batas ini, rekaman baru akan antre agar server tetap stabil. Bisa juga diubah lewat Telegram via /limit <angka>.'
                  : 'Limits how many creators are recorded at once. Additional live hosts will queue safely. Can also be set via Telegram command /limit <number>.'}
              </p>
            </div>

            {/* PENGATURAN SETELAH UPLOAD (AFTER-UPLOAD ACTIONS) */}
            <div className="space-y-3 pt-1">
              <h5 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center space-x-1.5">
                <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
                <span>{lang === 'id' ? 'Tindakan Setelah Upload (Post-Upload)' : 'After-Upload Actions'}</span>
              </h5>

              {/* 1. Auto-Delete Local Video File after upload */}
              <label className="flex items-start space-x-3 cursor-pointer bg-zinc-950/40 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 transition">
                <input
                  type="checkbox"
                  checked={autoDeleteAfterUpload}
                  onChange={(e) => setAutoDeleteAfterUpload(e.target.checked)}
                  className="rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-0 w-4 h-4 mt-0.5 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-semibold text-zinc-200 block">
                    🗑 {lang === 'id' ? 'Hapus File Video Lokal Setelah Upload Selesai' : 'Delete Local Video File After Successful Upload'}
                  </span>
                  <span className="text-[11px] text-zinc-400 block mt-0.5">
                    {lang === 'id'
                      ? 'Setelah video MP4 berhasil diunggah ke Telegram, file video di server langsung dihapus untuk menghemat ruang disk penyimpanan.'
                      : 'Automatically deletes the local MP4 file from disk once delivered to Telegram to conserve server disk space.'}
                  </span>
                </div>
              </label>

              {/* 2. Stop Monitoring Host After Upload */}
              <label className="flex items-start space-x-3 cursor-pointer bg-zinc-950/40 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 transition">
                <input
                  type="checkbox"
                  checked={stopMonitoringAfterUpload}
                  onChange={(e) => setStopMonitoringAfterUpload(e.target.checked)}
                  className="rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-0 w-4 h-4 mt-0.5 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-semibold text-zinc-200 block">
                    ⏸ {lang === 'id' ? 'Hentikan Pemantauan Host Setelah Upload Selesai' : 'Stop Monitoring Host After Upload Finishes'}
                  </span>
                  <span className="text-[11px] text-zinc-400 block mt-0.5">
                    {lang === 'id'
                      ? 'Jika dicentang, status auto-record host akan dinonaktifkan setelah 1 sesi selesai diupload. Jika tidak dicentang (default), bot terus memantau host 24/7 untuk live berikutnya.'
                      : 'If enabled, disables auto-record for that host after 1 upload. If disabled (default), continues monitoring 24/7 for future lives.'}
                  </span>
                </div>
              </label>
            </div>

            {/* FORMAT MP4 GUARANTEE INFO */}
            <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-lg flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="text-[11px] text-emerald-300">
                <p className="font-semibold">
                  {lang === 'id' ? 'Format File Upload: Standard Playable MP4' : 'Upload Format: Standard Playable MP4'}
                </p>
                <p className="text-zinc-400 mt-0.5">
                  {lang === 'id'
                    ? 'Semua video live otomatis diremux menggunakan format MPEG-4 Part 14 (.mp4) H.264/AAC dengan FastStart. Video langsung dapat diputar streaming (Playable Video) di chat Telegram tanpa error dokumen.'
                    : 'All recordings are remuxed into pristine H.264/AAC MP4 with FastStart, ensuring instant native playback inside Telegram chats.'}
                </p>
              </div>
            </div>

            {/* Save Button for Host & Recorder Settings */}
            <button
              type="submit"
              disabled={isSavingRecorder}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs rounded-lg shadow transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              {isSavingRecorder ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>{lang === 'id' ? 'Simpan Batas Host & Pengaturan Upload' : 'Save Host Limit & Upload Settings'}</span>
            </button>

          </form>
        </div>

        {/* SECTION 2: TELEGRAM BOT CREDENTIALS & NOTIFICATIONS */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-zinc-800 mb-4">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                {lang === 'id' ? 'Kredensial Bot Telegram' : 'Telegram Bot Credentials'}
              </h4>
              <p className="text-[11px] text-zinc-400">
                {lang === 'id' ? 'Token bot dan Chat ID tujuan upload video' : 'Bot token and destination Chat ID for video uploads'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveTelegram} className="space-y-4">
            
            {/* Bot Token */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>{lang === 'id' ? 'Bot Token (dari @BotFather)' : 'Bot Token (from @BotFather)'}</span>
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="text-[11px] text-cyan-400 hover:underline flex items-center space-x-1"
                >
                  {showToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showToken ? (lang === 'id' ? 'Sembunyikan' : 'Hide') : (lang === 'id' ? 'Tampilkan' : 'Show')}</span>
                </button>
              </label>
              <input
                type={showToken ? 'text' : 'password'}
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                required
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            {/* Chat ID */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>{lang === 'id' ? 'Chat ID / Grup ID Tujuan' : 'Target Chat ID / Group ID'}</span>
                <span className="text-[10px] text-zinc-500 font-normal">
                  {lang === 'id' ? 'Atau kirim /setchat di Telegram' : 'Or send /setchat in Telegram'}
                </span>
              </label>
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="-100xxxxxxxxxx atau ID user Anda"
                required
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            {/* Topic ID */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>{lang === 'id' ? 'Topic / Thread ID (Opsional untuk Supergroup)' : 'Topic / Thread ID (Optional)'}</span>
                <span className="text-[10px] text-zinc-500 font-normal">Opsional</span>
              </label>
              <input
                type="text"
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                placeholder="Contoh: 42 (kosongkan jika chat biasa)"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            {/* Max Upload Size before auto-split */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>{lang === 'id' ? 'Batas Ukuran Upload Sebelum Auto-Split (MB)' : 'Max Upload Size Before Auto-Split (MB)'}</span>
                <span className="text-[10px] text-cyan-400 font-normal">Maks 50MB (Standard Bot API)</span>
              </label>
              <input
                type="number"
                min={10}
                max={2000}
                value={maxUploadSizeMb}
                onChange={(e) => setMaxUploadSizeMb(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500 transition"
              />
              <p className="text-[11px] text-zinc-400 mt-1">
                {lang === 'id'
                  ? '⚡ Server Telegram Cloud (api.telegram.org) membatasi maksimal 50 MB per file. Video yang melebihi batas ini otomatis dipecah menjadi Part 1, Part 2, dst. berkualitas MP4 tanpa error 413.'
                  : '⚡ Standard Telegram Cloud API strictly caps uploads at 50 MB. Videos larger than this are automatically split into seamless MP4 parts without 413 errors.'}
              </p>
            </div>

            {/* Toggles */}
            <div className="pt-2 space-y-3 border-t border-zinc-800">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendLiveAlerts}
                  onChange={(e) => setSendLiveAlerts(e.target.checked)}
                  className="rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-0 w-4 h-4 mt-0.5 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-semibold text-zinc-200 block">
                    {lang === 'id' ? 'Kirim Notifikasi Live Alert' : 'Send Live Start Alert'}
                  </span>
                  <span className="text-[11px] text-zinc-400 block">
                    {lang === 'id'
                      ? 'Kirim notifikasi ke Telegram saat streamer mulai siaran langsung.'
                      : 'Notify Telegram chat immediately when a creator goes live.'}
                  </span>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSplit}
                  onChange={(e) => setAutoSplit(e.target.checked)}
                  className="rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-0 w-4 h-4 mt-0.5 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-semibold text-zinc-200 block">
                    {lang === 'id' ? 'Auto-Split Rekaman Besar (Rekomendasi ON)' : 'Auto-Split Large Videos (Recommended ON)'}
                  </span>
                  <span className="text-[11px] text-zinc-400 block">
                    {lang === 'id'
                      ? 'Jika video live melebihi 48MB, sistem otomatis memotong menjadi beberapa bagian MP4 tanpa gagal upload.'
                      : 'If stream exceeds 48MB, cuts cleanly into MP4 parts so upload never fails.'}
                  </span>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pollingEnabled}
                  onChange={(e) => setPollingEnabled(e.target.checked)}
                  className="rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-0 w-4 h-4 mt-0.5 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-semibold text-zinc-200 block">
                    {lang === 'id' ? 'Aktifkan Bot Polling (Terima Perintah Telegram)' : 'Enable Bot Polling (Telegram Commands)'}
                  </span>
                  <span className="text-[11px] text-zinc-400 block">
                    {lang === 'id'
                      ? 'Bot akan merespons perintah /status, /limit, /add, /record, /stop langsung dari chat Telegram.'
                      : 'Allows bot to listen and respond to commands like /status, /limit, /add, /record directly in Telegram.'}
                  </span>
                </div>
              </label>
            </div>

            {/* Save Button for Telegram Settings */}
            <button
              type="submit"
              disabled={isSavingTg}
              className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-lg shadow transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              {isSavingTg ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>{lang === 'id' ? 'Simpan Pengaturan Telegram' : 'Save Telegram Settings'}</span>
            </button>

          </form>
        </div>

      </div>

      {/* SECTION 2.5: MICHELE0303 TIKTOK ENGINE & ANTI-WAF CONFIGURATION */}
      <div className="bg-zinc-900/80 border border-cyan-500/30 rounded-xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-800 gap-3 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-bold text-white">
                  {lang === 'id' ? 'Engine Michele0303 & Anti-WAF Bypass' : 'Michele0303 Engine & Anti-WAF Bypass'}
                </h4>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                  TIKREC + CORE SDK
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {lang === 'id'
                  ? 'Berdasarkan arsitektur Michele0303/tiktok-live-recorder untuk bypass proteksi WAF TikTok & download stream CDN murni'
                  : 'Powered by Michele0303/tiktok-live-recorder architecture for anti-WAF room signing & lossless CDN stream capture'}
              </p>
            </div>
          </div>

          <a
            href="https://github.com/Michele0303/tiktok-live-recorder"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-medium border border-zinc-700 transition self-start sm:self-auto cursor-pointer"
          >
            <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
            <span>Michele0303/tiktok-live-recorder</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        </div>

        <form onSubmit={handleSaveRecorder} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Engine Selection */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                ⚙️ {lang === 'id' ? 'Engine Perekam Utama' : 'Primary Recording Engine'}
              </label>
              <select
                value={engine}
                onChange={(e) => setEngine(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="michele0303">Michele0303 Engine (TikRec + Core SDK - Recommended)</option>
                <option value="direct-ffmpeg">Direct FFmpeg CDN Engine</option>
                <option value="ytdlp">yt-dlp Engine Fallback</option>
              </select>
              <p className="text-[10px] text-zinc-400 mt-1">
                {lang === 'id' ? 'Engine Michele0303 menggunakan TikRec signing untuk menembus WAF TikTok tanpa bot-block.' : 'Michele0303 uses TikRec signing to bypass WAF room blocking.'}
              </p>
            </div>

            {/* Quality Setting */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                🎞 {lang === 'id' ? 'Kualitas Siaran Prioritas' : 'Preferred Quality'}
              </label>
              <select
                value={preferredQuality}
                onChange={(e) => setPreferredQuality(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="best">Kualitas Asli / Terbaik (Source / Origin / 1080p)</option>
                <option value="1080p">1080p Full HD (FULL_HD1)</option>
                <option value="720p">720p HD (HD1)</option>
                <option value="480p">480p SD (SD1 / SD2)</option>
              </select>
              <p className="text-[10px] text-zinc-400 mt-1">
                {lang === 'id' ? 'Otomatis diurutkan via Core SDK qualities levels.' : 'Auto-sorted via Core SDK quality levels.'}
              </p>
            </div>

            {/* Check Interval */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                ⏱ {lang === 'id' ? 'Interval Cek Siaran (Detik)' : 'Check Interval (Seconds)'}
              </label>
              <input
                type="number"
                min={10}
                max={300}
                value={checkIntervalSeconds}
                onChange={(e) => setCheckIntervalSeconds(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-cyan-500 transition"
              />
              <p className="text-[10px] text-zinc-400 mt-1">
                {lang === 'id' ? 'Standar: 45 detik. Rekomendasi aman: 30 - 60 detik.' : 'Standard: 45s. Safe range: 30-60s.'}
              </p>
            </div>

          </div>

          {/* Toggles: TikRec Signing & EulerStream */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <label className="flex items-start space-x-3 cursor-pointer bg-zinc-950/60 p-3 rounded-lg border border-zinc-800 hover:border-cyan-500/40 transition">
              <input
                type="checkbox"
                checked={useTikRecSigning}
                onChange={(e) => setUseTikRecSigning(e.target.checked)}
                className="rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-0 w-4 h-4 mt-0.5 cursor-pointer"
              />
              <div>
                <span className="text-xs font-semibold text-zinc-200 block">
                  🛡️ TikRec API Signing Service (Bypass TikTok WAF)
                </span>
                <span className="text-[11px] text-zinc-400 block mt-0.5">
                  {lang === 'id'
                    ? 'Menandatangani request Room ID dengan parameter X-Bogus & X-Gnarly resmi seperti di Michele0303.'
                    : 'Signs Room ID requests with official X-Bogus & X-Gnarly as implemented in Michele0303.'}
                </span>
              </div>
            </label>

            <label className="flex items-start space-x-3 cursor-pointer bg-zinc-950/60 p-3 rounded-lg border border-zinc-800 hover:border-cyan-500/40 transition">
              <input
                type="checkbox"
                checked={useEulerStreamFallback}
                onChange={(e) => setUseEulerStreamFallback(e.target.checked)}
                className="rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-0 w-4 h-4 mt-0.5 cursor-pointer"
              />
              <div>
                <span className="text-xs font-semibold text-zinc-200 block">
                  🔄 EulerStream Webcast Fallback
                </span>
                <span className="text-[11px] text-zinc-400 block mt-0.5">
                  {lang === 'id'
                    ? 'Endpoint cadangan otomatis jika TikRec sedang sibuk atau respons time lambat.'
                    : 'Secondary fallback endpoint if TikRec is undergoing maintenance or slow.'}
                </span>
              </div>
            </label>
          </div>

          {/* Optional: Proxy & Cookies */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>🌐 {lang === 'id' ? 'Proxy HTTP / SOCKS5 (Opsional)' : 'HTTP / SOCKS5 Proxy (Optional)'}</span>
                <span className="text-[10px] text-zinc-500 font-normal">Opsional</span>
              </label>
              <input
                type="text"
                value={proxy}
                onChange={(e) => setProxy(e.target.value)}
                placeholder="http://user:pass@127.0.0.1:8080"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>🍪 {lang === 'id' ? 'Cookies TikTok (Opsional - Follower/Private Live)' : 'TikTok Cookies (Optional)'}</span>
                <span className="text-[10px] text-zinc-500 font-normal">JSON / String</span>
              </label>
              <input
                type="text"
                value={cookies}
                onChange={(e) => setCookies(e.target.value)}
                placeholder='sessionid=...; ttwid=... atau {"sessionid":"..."}'
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingRecorder}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs rounded-lg shadow transition flex items-center space-x-2 cursor-pointer"
            >
              {isSavingRecorder ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>{lang === 'id' ? 'Simpan Pengaturan Engine Michele0303' : 'Save Michele0303 Engine Settings'}</span>
            </button>
          </div>
        </form>

        {/* INTERACTIVE MICHELE0303 LIVE RESOLVER TESTER */}
        <div className="mt-5 pt-4 border-t border-zinc-800">
          <div className="flex items-center space-x-2 mb-2.5">
            <Play className="w-3.5 h-3.5 text-cyan-400" />
            <h5 className="text-xs font-bold text-zinc-200">
              {lang === 'id' ? 'Uji Coba Langsung Resolusi Engine Michele0303' : 'Live Test Michele0303 Resolution Engine'}
            </h5>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-xs text-zinc-500 font-mono">@</span>
              <input
                type="text"
                value={testUser}
                onChange={(e) => setTestUser(e.target.value.replace(/^@/, ''))}
                placeholder="masukkan username TikTok (contoh: tiktok)"
                className="w-full pl-7 pr-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
            <button
              type="button"
              onClick={handleTestMichele}
              disabled={testingMichele || !testUser.trim()}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-cyan-400 font-semibold text-xs rounded-lg border border-zinc-700 transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              {testingMichele ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              <span>{testingMichele ? (lang === 'id' ? 'Menguji...' : 'Resolving...') : (lang === 'id' ? 'Uji Resolusi' : 'Test Resolve')}</span>
            </button>
          </div>

          {/* Test Result Display */}
          {micheleTestResult && (
            <div className="mt-3 p-3.5 bg-zinc-950/80 rounded-lg border border-zinc-800 text-xs font-mono">
              {micheleTestResult.ok ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800 text-[11px]">
                    <span className="text-emerald-400 font-bold flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                      {micheleTestResult.data.isLive ? '🔴 CREATOR IS LIVE' : '⚪ CREATOR IS OFFLINE'}
                    </span>
                    <span className="text-zinc-500">
                      Waktu Respons: <strong className="text-cyan-400">{micheleTestResult.data.durationMs}ms</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-zinc-500">Username: </span>
                      <span className="text-white font-bold">@{testUser}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Room ID: </span>
                      <span className="text-cyan-300">{micheleTestResult.data.roomId || 'Tidak ditemukan'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Metode Resolusi: </span>
                      <span className="text-amber-300 font-bold">{micheleTestResult.data.source}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Judul Live: </span>
                      <span className="text-zinc-300">{micheleTestResult.data.title || '(Tanpa judul siaran)'}</span>
                    </div>
                  </div>

                  {micheleTestResult.data.streamCandidates && micheleTestResult.data.streamCandidates.length > 0 && (
                    <div className="pt-2 border-t border-zinc-800/80 mt-2">
                      <span className="text-zinc-400 font-bold block mb-1">
                        🎯 Stream CDN Candidates ({micheleTestResult.data.streamCandidates.length} ditemukan):
                      </span>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {micheleTestResult.data.streamCandidates.map((c: any, i: number) => (
                          <div key={i} className="text-[10px] text-zinc-400 bg-zinc-900/60 p-1 rounded flex items-center justify-between">
                            <span className="font-bold text-cyan-300">{c.quality.toUpperCase()} [{c.type.toUpperCase()}]</span>
                            <span className="truncate max-w-[280px] opacity-75">{c.url}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-rose-400 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{micheleTestResult.message || 'Gagal menguji resolusi'}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 shadow">
        <div className="flex items-center space-x-2 pb-3 border-b border-zinc-800 mb-4">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h4 className="text-sm font-bold text-white">
            {lang === 'id' ? 'Daftar Perintah Telegram Bot' : 'Telegram Bot Commands Reference'}
          </h4>
          <span className="text-[10px] text-zinc-400 ml-auto">
            {lang === 'id' ? 'Klik perintah untuk menyalin' : 'Click command to copy'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {commandsList.map((item) => (
            <div
              key={item.cmd}
              onClick={() => copyToClipboard(item.cmd)}
              className="group flex items-center justify-between p-2.5 bg-zinc-950/60 hover:bg-zinc-800/60 border border-zinc-800/80 hover:border-cyan-500/50 rounded-lg cursor-pointer transition"
            >
              <div className="space-y-0.5">
                <span className="font-mono text-xs font-semibold text-cyan-400 group-hover:text-cyan-300">
                  {item.cmd}
                </span>
                <p className="text-[11px] text-zinc-400 leading-tight">
                  {item.desc}
                </p>
              </div>
              <div className="pl-2">
                {copiedCmd === item.cmd ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 opacity-60 group-hover:opacity-100 transition" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
