import React from 'react';
import { Radio, Send, HardDrive, RefreshCw, Plus, Video, CheckCircle2, AlertCircle } from 'lucide-react';
import { SystemStatus } from '../types';

interface HeaderProps {
  status: SystemStatus | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenAddModal: () => void;
  onOpenQuickRecordModal: () => void;
  lang: 'id' | 'en';
  setLang: (lang: 'id' | 'en') => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  onRefresh,
  isRefreshing,
  onOpenAddModal,
  onOpenQuickRecordModal,
  lang,
  setLang,
}) => {
  const isTgConfigured = status?.telegram.configured;
  const activeCount = status?.activeRecordingsCount || 0;
  const liveCount = status?.liveUsersCount || 0;
  const freeDisk = status?.freeDiskGb ?? 0;

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-rose-500 text-white shadow-lg shadow-rose-500/20">
              <Video className="w-5 h-5 text-white" />
              {activeCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  TikTok Live <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-rose-400">Telegram Bot</span>
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold bg-zinc-800 text-zinc-300 rounded border border-zinc-700">
                  Auto-Recorder v2.1
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {lang === 'id' ? 'Auto-rekam live TikTok & upload langsung ke Telegram' : 'Auto-record TikTok live streams & direct Telegram upload'}
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Telegram Bot status badge */}
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                isTgConfigured
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                  : 'bg-amber-950/40 text-amber-400 border-amber-800/60'
              }`}
              title={isTgConfigured ? 'Telegram Bot connected & ready' : 'Configure Telegram Bot Token & Chat ID in Telegram tab'}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isTgConfigured ? 'Telegram Connected' : 'Telegram Needs Setup'}</span>
              {isTgConfigured ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              ) : (
                <AlertCircle className="w-3 h-3 text-amber-400" />
              )}
            </div>

            {/* Active Recording status */}
            <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
              activeCount > 0
                ? 'bg-rose-950/50 text-rose-400 border-rose-800 animate-pulse'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800'
            }`}>
              <Radio className="w-3.5 h-3.5 text-rose-400" />
              <span>
                {activeCount > 0
                  ? `${activeCount} ${lang === 'id' ? 'Sedang Merekam' : 'Recording'}`
                  : `${liveCount} ${lang === 'id' ? 'Sedang Live' : 'Live Now'}`}
              </span>
            </div>

            {/* Disk Space indicator */}
            <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs bg-zinc-900 text-zinc-400 border border-zinc-800">
              <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
              <span>{freeDisk.toFixed(1)} GB Free</span>
            </div>

            {/* Quick Record Button */}
            <button
              onClick={onOpenQuickRecordModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium transition shadow-sm cursor-pointer shadow-rose-900/40"
              title={lang === 'id' ? 'Mulai rekam langsung' : 'Start instant recording'}
            >
              <Radio className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === 'id' ? 'Rekam Cepat' : 'Instant Record'}</span>
            </button>

            {/* Add Creator Button */}
            <button
              onClick={onOpenAddModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg text-xs font-medium transition border border-zinc-700 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span>{lang === 'id' ? 'Tambah Akun' : 'Add Creator'}</span>
            </button>

            {/* Refresh */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-800 transition cursor-pointer"
              title={lang === 'id' ? 'Perbarui data' : 'Refresh'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            {/* Language toggle */}
            <button
              onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
              className="px-2 py-1 text-[11px] font-bold uppercase rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 cursor-pointer"
              title="Ganti Bahasa / Switch Language"
            >
              {lang}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
