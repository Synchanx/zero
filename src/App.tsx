/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Radio,
  Video,
  Send,
  Terminal,
  Activity,
  AlertCircle,
  CheckCircle2,
  HardDrive,
  Server
} from 'lucide-react';
import { Header } from './components/Header';
import { LiveMonitorTab } from './components/LiveMonitorTab';
import { RecordingsTab } from './components/RecordingsTab';
import { TelegramSettingsTab } from './components/TelegramSettingsTab';
import { LogsConsoleTab } from './components/LogsConsoleTab';
import { VpsTutorialTab } from './components/VpsTutorialTab';
import { QuickRecordModal } from './components/QuickRecordModal';
import { AddUserModal } from './components/AddUserModal';
import {
  MonitoredUser,
  RecordingItem,
  TelegramConfig,
  RecorderConfig,
  SystemStatus,
  LogEntry
} from './types';

export default function App() {
  const [lang, setLang] = useState<'id' | 'en'>('id');
  const [activeTab, setActiveTab] = useState<'live' | 'recordings' | 'telegram' | 'logs' | 'vps'>('live');

  // Main state
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [users, setUsers] = useState<MonitoredUser[]>([]);
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>({
    botToken: '',
    chatId: '',
    enabled: true,
    sendLiveAlerts: true,
    sendUploadProgress: true,
    maxUploadSizeMb: 48,
    autoSplit: true,
    autoDeleteAfterUpload: false,
    apiBaseUrl: 'https://api.telegram.org',
    pollingEnabled: true,
  });
  const [recorderConfig, setRecorderConfig] = useState<RecorderConfig>({
    checkIntervalSeconds: 45,
    maxConcurrentRecordings: 3,
    minFreeDiskGb: 2,
    preferredQuality: 'best',
    stopMonitoringAfterUpload: false,
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Modals & UI helpers
  const [isQuickRecordOpen, setIsQuickRecordOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [checkingMap, setCheckingMap] = useState<Record<string, boolean>>({});

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch all core data
  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setIsRefreshing(true);
    try {
      const [statusRes, usersRes, recsRes, configRes, logsRes] = await Promise.all([
        fetch('/api/status').then(r => r.json()),
        fetch('/api/users').then(r => r.json()),
        fetch('/api/recordings').then(r => r.json()),
        fetch('/api/config').then(r => r.json()),
        fetch('/api/logs?limit=150').then(r => r.json()),
      ]);

      if (statusRes.ok && statusRes.data) setStatus(statusRes.data);
      if (usersRes.ok && usersRes.data) setUsers(usersRes.data);
      if (recsRes.ok && recsRes.data) setRecordings(recsRes.data);
      if (configRes.ok && configRes.data?.telegram) setTelegramConfig(configRes.data.telegram);
      if (configRes.ok && configRes.data?.recorder) setRecorderConfig(configRes.data.recorder);
      if (logsRes.ok && logsRes.data) setLogs(logsRes.data);
    } catch (err: any) {
      console.error('Failed to load application data:', err);
    } finally {
      if (!quiet) setIsRefreshing(false);
    }
  }, []);

  // Initial load and periodic polling
  useEffect(() => {
    loadData(false);
    const interval = setInterval(() => {
      loadData(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Handler: Add User
  const handleAddUser = async (username: string, autoRecord: boolean): Promise<boolean> => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, autoRecord }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(
          lang === 'id' ? `Berhasil menambahkan @${data.data.username}!` : `Added @${data.data.username}!`,
          'success'
        );
        loadData(true);
        return true;
      } else {
        showToast(data.message || 'Gagal menambahkan akun', 'error');
        return false;
      }
    } catch (err: any) {
      showToast(err.message, 'error');
      return false;
    }
  };

  // Handler: Delete User
  const handleDeleteUser = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        showToast(lang === 'id' ? 'Akun dihapus dari pemantauan' : 'Account removed', 'info');
        loadData(true);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Handler: Toggle Auto Record
  const handleToggleAutoRecord = async (id: string, currentValue: boolean) => {
    try {
      await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoRecord: !currentValue }),
      });
      loadData(true);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Handler: Manual Check Live Status
  const handleCheckUser = async (username: string) => {
    setCheckingMap(prev => ({ ...prev, [username]: true }));
    try {
      const res = await fetch(`/api/users/${username}/check`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        if (data.isLive) {
          showToast(`🔴 @${username} SEDANG LIVE!`, 'success');
        } else {
          showToast(`⚪ @${username} sedang offline.`, 'info');
        }
      }
      loadData(true);
    } catch (err: any) {
      showToast(`Error checking @${username}: ${err.message}`, 'error');
    } finally {
      setCheckingMap(prev => ({ ...prev, [username]: false }));
    }
  };

  // Handler: Start Record
  const handleStartRecord = async (username: string) => {
    try {
      showToast(
        lang === 'id' ? `Menghubungkan ke stream @${username}...` : `Connecting to stream @${username}...`,
        'info'
      );
      const res = await fetch('/api/record/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          lang === 'id' ? `⏺ Rekaman dimulai untuk @${username}!` : `Recording started for @${username}!`,
          'success'
        );
        loadData(true);
      } else {
        showToast(data.message || 'Gagal memulai rekaman', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Handler: Stop Record
  const handleStopRecord = async (username: string) => {
    try {
      showToast(
        lang === 'id' ? `Menghentikan rekaman & menyiapkan upload...` : `Stopping recording & preparing upload...`,
        'info'
      );
      const res = await fetch('/api/record/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          lang === 'id' ? `Rekaman @${username} dihentikan! Mengunggah ke Telegram...` : `Stopped @${username}! Uploading to Telegram...`,
          'success'
        );
        loadData(true);
      } else {
        showToast(data.message || 'Gagal menghentikan rekaman', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Handler: Delete Recording
  const handleDeleteRecording = async (id: string) => {
    try {
      const res = await fetch(`/api/recordings/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        showToast(lang === 'id' ? 'File rekaman dihapus' : 'Recording deleted', 'info');
        loadData(true);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Handler: Trigger Manual Upload
  const handleTriggerUpload = async (id: string) => {
    try {
      showToast(
        lang === 'id' ? 'Memulai pengiriman video ke Telegram...' : 'Starting Telegram upload...',
        'info'
      );
      const res = await fetch(`/api/recordings/${id}/upload`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        loadData(true);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Handler: Save Telegram Config
  const handleSaveTelegramConfig = async (updated: Partial<TelegramConfig>): Promise<boolean> => {
    try {
      const res = await fetch('/api/config/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(
          lang === 'id' ? 'Pengaturan Telegram berhasil disimpan!' : 'Telegram settings saved successfully!',
          'success'
        );
        setTelegramConfig(data.data);
        loadData(true);
        return true;
      }
      return false;
    } catch (err: any) {
      showToast(err.message, 'error');
      return false;
    }
  };

  // Handler: Save Recorder & Host Limit Config
  const handleSaveRecorderConfig = async (updated: Partial<RecorderConfig>): Promise<boolean> => {
    try {
      const res = await fetch('/api/config/recorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(
          lang === 'id' ? 'Pengaturan perekaman & batas host disimpan!' : 'Recorder & host limit settings saved!',
          'success'
        );
        setRecorderConfig(data.data);
        loadData(true);
        return true;
      }
      showToast(data.message || 'Gagal menyimpan pengaturan', 'error');
      return false;
    } catch (err: any) {
      showToast(err.message, 'error');
      return false;
    }
  };

  // Handler: Test Telegram Connection
  const handleTestTelegram = async (botToken?: string, chatId?: string) => {
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken, chatId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Telegram Bot berhasil diverifikasi!', 'success');
        loadData(true);
      } else {
        showToast(data.message || 'Koneksi Telegram gagal', 'error');
      }
      return data;
    } catch (err: any) {
      const msg = `Network error: ${err.message}`;
      showToast(msg, 'error');
      return { success: false, message: msg };
    }
  };

  // Handler: Clear Logs
  const handleClearLogs = async () => {
    try {
      await fetch('/api/logs', { method: 'DELETE' });
      setLogs([]);
      showToast(lang === 'id' ? 'Log dibersihkan' : 'Logs cleared', 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-rose-500/30 selection:text-white">
      
      {/* HEADER */}
      <Header
        status={status}
        onRefresh={() => loadData(false)}
        isRefreshing={isRefreshing}
        onOpenAddModal={() => setIsAddUserOpen(true)}
        onOpenQuickRecordModal={() => setIsQuickRecordOpen(true)}
        lang={lang}
        setLang={setLang}
      />

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce duration-300">
          <div className={`px-4 py-3 rounded-xl border shadow-2xl flex items-center space-x-2 text-xs font-semibold ${
            toast.type === 'success'
              ? 'bg-emerald-950 border-emerald-700 text-emerald-200'
              : toast.type === 'error'
              ? 'bg-rose-950 border-rose-700 text-rose-200'
              : 'bg-zinc-900 border-zinc-700 text-zinc-200'
          }`}>
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
            {toast.type === 'info' && <Activity className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* NAVIGATION TABS BAR */}
      <div className="border-b border-zinc-800 bg-zinc-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto py-2.5 no-scrollbar">
            
            {/* TAB 1: Live Monitor */}
            <button
              onClick={() => setActiveTab('live')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'live'
                  ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-md shadow-rose-900/30'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{lang === 'id' ? 'Live Stream Monitor' : 'Live Monitor'}</span>
              {status && status.activeRecordingsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              )}
            </button>

            {/* TAB 2: Recordings */}
            <button
              onClick={() => setActiveTab('recordings')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'recordings'
                  ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-md shadow-cyan-900/30'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>{lang === 'id' ? 'Galeri Rekaman & Upload' : 'Recordings & Uploads'}</span>
              {recordings.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-800 text-zinc-300 font-mono">
                  {recordings.length}
                </span>
              )}
            </button>

            {/* TAB 3: Telegram Settings */}
            <button
              onClick={() => setActiveTab('telegram')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'telegram'
                  ? 'bg-gradient-to-r from-sky-600 to-sky-700 text-white shadow-md shadow-sky-900/30'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{lang === 'id' ? 'Pengaturan Bot & Batas Host' : 'Bot & Host Settings'}</span>
              {!status?.telegram.configured && (
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              )}
            </button>

            {/* TAB 4: Logs */}
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md shadow-purple-900/30'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{lang === 'id' ? 'Terminal Log & Sistem' : 'System Logs'}</span>
            </button>

            {/* TAB 5: VPS Tutorial */}
            <button
              onClick={() => setActiveTab('vps')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'vps'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-900/30 ring-1 ring-indigo-400/40'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Server className="w-3.5 h-3.5 text-indigo-400" />
              <span>{lang === 'id' ? 'Panduan Online VPS (24/7)' : 'VPS Deployment Guide'}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/30 text-indigo-300 font-medium">
                {lang === 'id' ? 'Pemula' : 'Guide'}
              </span>
            </button>

          </nav>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'live' && (
          <LiveMonitorTab
            users={users}
            activeJobs={status?.activeJobs || []}
            status={status}
            onAddUser={handleAddUser}
            onDeleteUser={handleDeleteUser}
            onToggleAutoRecord={handleToggleAutoRecord}
            onCheckUser={handleCheckUser}
            onStartRecord={handleStartRecord}
            onStopRecord={handleStopRecord}
            checkingMap={checkingMap}
            lang={lang}
          />
        )}

        {activeTab === 'recordings' && (
          <RecordingsTab
            recordings={recordings}
            onDeleteRecording={handleDeleteRecording}
            onTriggerUpload={handleTriggerUpload}
            onRefresh={() => loadData(false)}
            lang={lang}
          />
        )}

        {activeTab === 'telegram' && (
          <TelegramSettingsTab
            config={telegramConfig}
            recorderConfig={recorderConfig}
            onSaveConfig={handleSaveTelegramConfig}
            onSaveRecorderConfig={handleSaveRecorderConfig}
            onTestConnection={handleTestTelegram}
            lang={lang}
          />
        )}

        {activeTab === 'logs' && (
          <LogsConsoleTab
            logs={logs}
            status={status}
            onClearLogs={handleClearLogs}
            onRefreshLogs={() => loadData(false)}
            lang={lang}
          />
        )}

        {activeTab === 'vps' && (
          <VpsTutorialTab lang={lang} />
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-4 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span>TikTok Live Recorder + Telegram Uploader</span>
            <span>•</span>
            <span className="text-zinc-400">Powered by yt-dlp &amp; Telegram Bot API</span>
          </div>
          <div className="text-[11px] text-zinc-600">
            Auto-Split enabled • Mobile-safe MP4 • 24/7 Background Daemon
          </div>
        </div>
      </footer>

      {/* MODALS */}
      <QuickRecordModal
        isOpen={isQuickRecordOpen}
        onClose={() => setIsQuickRecordOpen(false)}
        onStartRecord={handleStartRecord}
        lang={lang}
      />

      <AddUserModal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        onAddUser={handleAddUser}
        lang={lang}
      />

    </div>
  );
}
