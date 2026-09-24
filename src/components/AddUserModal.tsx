import React, { useState } from 'react';
import { Plus, X, Sparkles, RefreshCw } from 'lucide-react';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddUser: (username: string, autoRecord: boolean) => Promise<boolean>;
  lang: 'id' | 'en';
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
  onAddUser,
  lang,
}) => {
  const [username, setUsername] = useState('');
  const [autoRecord, setAutoRecord] = useState(true);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    const ok = await onAddUser(username.trim(), autoRecord);
    setLoading(false);
    if (ok) {
      setUsername('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950/80">
          <div className="flex items-center space-x-2">
            <Plus className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-white text-sm">
              {lang === 'id' ? 'Tambah Akun TikTok untuk Dipantau' : 'Add TikTok Account to Monitor'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Username TikTok
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 font-mono text-sm">
                @
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="contoh: khaby.lame"
                className="w-full pl-8 pr-3 py-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition"
                autoFocus
                required
              />
            </div>
            <p className="text-[11px] text-zinc-400 mt-1.5">
              {lang === 'id'
                ? 'Sistem akan mengecek status akun ini secara berkala.'
                : 'The system will periodically check this account for active livestreams.'}
            </p>
          </div>

          <label className="flex items-center space-x-2 text-xs text-zinc-300 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={autoRecord}
              onChange={(e) => setAutoRecord(e.target.checked)}
              className="rounded bg-zinc-800 border-zinc-700 text-cyan-500 focus:ring-0 w-4 h-4 cursor-pointer"
            />
            <span>{lang === 'id' ? 'Otomatis rekam saat live dan upload ke Telegram' : 'Auto-record when live and upload to Telegram'}</span>
          </label>

          <div className="flex items-center justify-end space-x-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition cursor-pointer"
            >
              {lang === 'id' ? 'Batal' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="flex items-center space-x-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{lang === 'id' ? 'Simpan Akun' : 'Save Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
