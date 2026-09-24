import React, { useState, useEffect } from 'react';
import {
  Radio,
  Search,
  ExternalLink,
  Square,
  Play,
  Trash2,
  CheckCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Video,
  Layers,
  AlertTriangle
} from 'lucide-react';
import { MonitoredUser, ActiveJob, SystemStatus } from '../types';

interface LiveMonitorTabProps {
  users: MonitoredUser[];
  activeJobs: ActiveJob[];
  status: SystemStatus | null;
  onAddUser: (username: string, autoRecord: boolean) => Promise<boolean>;
  onDeleteUser: (id: string) => Promise<void>;
  onToggleAutoRecord: (id: string, currentValue: boolean) => Promise<void>;
  onCheckUser: (username: string) => Promise<void>;
  onStartRecord: (username: string) => Promise<void>;
  onStopRecord: (username: string) => Promise<void>;
  checkingMap: Record<string, boolean>;
  lang: 'id' | 'en';
}

export const LiveMonitorTab: React.FC<LiveMonitorTabProps> = ({
  users,
  activeJobs,
  status,
  onAddUser,
  onDeleteUser,
  onToggleAutoRecord,
  onCheckUser,
  onStartRecord,
  onStopRecord,
  checkingMap,
  lang,
}) => {
  const [newUsername, setNewUsername] = useState('');
  const [autoRecordNew, setAutoRecordNew] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Live ticking timer for active jobs
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    setIsAdding(true);
    const ok = await onAddUser(newUsername.trim(), autoRecordNew);
    if (ok) {
      setNewUsername('');
    }
    setIsAdding(false);
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.displayName && u.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatElapsedTime = (startedAt: string) => {
    const startMs = new Date(startedAt).getTime();
    const diffSec = Math.max(0, Math.floor((now - startMs) / 1000));
    const h = Math.floor(diffSec / 3600);
    const m = Math.floor((diffSec % 3600) / 60);
    const s = diffSec % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatFileSizeMb = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(1);
  };

  return (
    <div className="space-y-6">
      
      {/* ACTIVE RECORDINGS BANNER */}
      {activeJobs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-rose-400">
                {lang === 'id' ? 'Sesi Rekaman Live Aktif' : 'Active Live Recording Sessions'} ({activeJobs.length})
              </h2>
            </div>
            <span className="text-xs text-zinc-400">
              {lang === 'id' ? 'Akan otomatis di-upload ke Telegram setelah selesai' : 'Will auto-upload to Telegram when live ends'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeJobs.map(job => (
              <div
                key={job.recordingId}
                className="relative overflow-hidden bg-gradient-to-br from-zinc-900 to-rose-950/30 border border-rose-800/60 rounded-xl p-4.5 shadow-xl shadow-rose-950/20"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold text-lg">
                      {job.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-base">@{job.username}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider animate-pulse">
                          ● RECORDING
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 line-clamp-1 mt-0.5">
                        {job.streamTitle || `TikTok Live @${job.username}`}
                      </p>
                    </div>
                  </div>

                  <a
                    href={`https://www.tiktok.com/@${job.username}/live`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-zinc-400 hover:text-white rounded bg-zinc-800 hover:bg-zinc-700 transition"
                    title="Buka live di TikTok"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {/* Progress metrics */}
                <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-zinc-800/80">
                  <div className="flex items-center space-x-2 text-xs text-zinc-300">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase font-semibold">
                        {lang === 'id' ? 'Durasi' : 'Duration'}
                      </span>
                      <span className="font-mono font-medium text-white text-sm">
                        {formatElapsedTime(job.startedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-zinc-300">
                    <Layers className="w-4 h-4 text-rose-400" />
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase font-semibold">
                        {lang === 'id' ? 'Ukuran File' : 'File Size'}
                      </span>
                      <span className="font-mono font-medium text-white text-sm">
                        {formatFileSizeMb(job.currentSizeBytes)} MB
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center justify-end space-x-2">
                  <button
                    onClick={() => onStopRecord(job.username)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow transition cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>{lang === 'id' ? 'Stop & Upload Sekarang' : 'Stop & Upload Now'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QUICK ADD CREATOR BAR */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
        <form onSubmit={handleAddSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 font-mono text-sm">
              @
            </span>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder={lang === 'id' ? 'Masukkan username TikTok (contoh: khaby.lame atau URL)' : 'Enter TikTok username or URL (e.g. khaby.lame)'}
              className="w-full pl-8 pr-4 py-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          <label className="flex items-center space-x-2 text-xs text-zinc-300 select-none cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={autoRecordNew}
              onChange={(e) => setAutoRecordNew(e.target.checked)}
              className="rounded bg-zinc-800 border-zinc-700 text-cyan-500 focus:ring-0 w-4 h-4 cursor-pointer"
            />
            <span>{lang === 'id' ? 'Otomatis Rekam Saat Live' : 'Auto-record when live'}</span>
          </label>

          <button
            type="submit"
            disabled={isAdding || !newUsername.trim()}
            className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-rose-600 hover:from-cyan-500 hover:to-rose-500 text-white text-xs font-semibold rounded-lg shadow transition disabled:opacity-50 flex items-center justify-center space-x-1.5 cursor-pointer whitespace-nowrap"
          >
            {isAdding ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>{lang === 'id' ? 'Tambah ke Monitoring' : 'Add to Monitor'}</span>
          </button>
        </form>
      </div>

      {/* MONITORED USERS HEADER & SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <span>{lang === 'id' ? 'Daftar Akun TikTok Dipantau' : 'Monitored TikTok Accounts'}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
              {users.length}
            </span>
          </h2>
          <p className="text-xs text-zinc-400">
            {lang === 'id'
              ? `Pengecekan live otomatis berjalan setiap ${status?.recorder.checkIntervalSeconds || 45} detik.`
              : `Auto-monitoring runs every ${status?.recorder.checkIntervalSeconds || 45} seconds.`}
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'id' ? 'Cari username...' : 'Filter username...'}
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
          />
        </div>
      </div>

      {/* USERS LIST / GRID */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50">
          <Video className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-zinc-300">
            {users.length === 0
              ? (lang === 'id' ? 'Belum ada akun yang dipantau' : 'No monitored accounts yet')
              : (lang === 'id' ? 'Tidak ada akun yang cocok dengan pencarian' : 'No accounts matching your search')}
          </h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
            {users.length === 0
              ? (lang === 'id'
                  ? 'Masukkan username akun TikTok di form di atas atau kirim perintah /add <username> di Telegram!'
                  : 'Add a TikTok username above or send /add <username> directly in Telegram!')
              : (lang === 'id' ? 'Coba cari dengan kata kunci lain.' : 'Try another search keyword.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => {
            const isChecking = checkingMap[user.username];
            const isCurrentlyRecording = activeJobs.some(j => j.username.toLowerCase() === user.username.toLowerCase());

            return (
              <div
                key={user.id}
                className={`flex flex-col justify-between rounded-xl p-4 border transition-all ${
                  user.isLive || isCurrentlyRecording
                    ? 'bg-gradient-to-b from-rose-950/20 to-zinc-900 border-rose-800/60 shadow-lg shadow-rose-950/20'
                    : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div>
                  {/* Top: Avatar, Name, Status Badge */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm border ${
                        user.isLive || isCurrentlyRecording
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                          : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                      }`}>
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-semibold text-white text-sm">@{user.username}</span>
                          <a
                            href={`https://www.tiktok.com/@${user.username}/live`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-zinc-500 hover:text-zinc-300 transition"
                            title="Buka profil live TikTok"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          {user.displayName || `@${user.username}`}
                        </p>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div>
                      {isCurrentlyRecording ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white flex items-center space-x-1 shadow-sm animate-pulse">
                          <span>● RECORDING</span>
                        </span>
                      ) : user.isLive ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                          <span>🔴 LIVE!</span>
                        </span>
                      ) : isChecking ? (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-cyan-950/40 text-cyan-400 border border-cyan-800/40 flex items-center space-x-1">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          <span>Checking</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                          ⚪ Offline
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Live title if any */}
                  {user.isLive && user.liveTitle && (
                    <div className="mt-3 p-2 bg-rose-950/30 border border-rose-800/30 rounded-lg text-xs text-rose-200">
                      <p className="line-clamp-2 italic font-normal">"{user.liveTitle}"</p>
                    </div>
                  )}

                  {/* Metadata info */}
                  <div className="mt-3 space-y-1 text-[11px] text-zinc-400">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">{lang === 'id' ? 'Terakhir dicek:' : 'Last checked:'}</span>
                      <span>
                        {user.lastChecked
                          ? new Date(user.lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                          : '-'}
                      </span>
                    </div>
                    {user.lastLiveAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">{lang === 'id' ? 'Terakhir live:' : 'Last live:'}</span>
                        <span>{new Date(user.lastLiveAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Controls */}
                <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                  {/* Auto-record toggle switch */}
                  <label className="flex items-center space-x-1.5 text-xs text-zinc-300 cursor-pointer select-none" title={lang === 'id' ? 'Aktifkan auto rekam saat live' : 'Enable auto-recording when live'}>
                    <input
                      type="checkbox"
                      checked={user.autoRecord}
                      onChange={() => onToggleAutoRecord(user.id, user.autoRecord)}
                      className="rounded bg-zinc-800 border-zinc-700 text-cyan-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="text-[11px] font-medium">Auto-record</span>
                  </label>

                  {/* Action buttons */}
                  <div className="flex items-center space-x-1.5">
                    {/* Check Now */}
                    <button
                      onClick={() => onCheckUser(user.username)}
                      disabled={isChecking}
                      className="p-1.5 text-zinc-400 hover:text-cyan-400 bg-zinc-800 hover:bg-zinc-750 rounded-lg transition cursor-pointer"
                      title={lang === 'id' ? 'Cek status live sekarang' : 'Check live status now'}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-cyan-400' : ''}`} />
                    </button>

                    {/* Record / Stop button */}
                    {isCurrentlyRecording ? (
                      <button
                        onClick={() => onStopRecord(user.username)}
                        className="flex items-center space-x-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                        title={lang === 'id' ? 'Hentikan rekaman dan langsung upload' : 'Stop and upload now'}
                      >
                        <Square className="w-3 h-3 fill-current" />
                        <span>Stop</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onStartRecord(user.username)}
                        className="flex items-center space-x-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg text-xs font-medium border border-zinc-700 transition cursor-pointer"
                        title={lang === 'id' ? 'Paksa rekam sekarang' : 'Force record now'}
                      >
                        <Play className="w-3 h-3 text-rose-400 fill-current" />
                        <span>{lang === 'id' ? 'Rekam' : 'Record'}</span>
                      </button>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={() => onDeleteUser(user.id)}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
                      title={lang === 'id' ? 'Hapus akun dari daftar pantauan' : 'Remove from monitoring'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
