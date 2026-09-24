import React, { useState } from 'react';
import { Radio, X, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

interface QuickRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRecord: (username: string) => Promise<void>;
  lang: 'id' | 'en';
}

export const QuickRecordModal: React.FC<QuickRecordModalProps> = ({
  isOpen,
  onClose,
  onStartRecord,
  lang,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    setLoading(true);
    await onStartRecord(inputVal.trim());
    setLoading(false);
    setInputVal('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950/80">
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-rose-500 animate-pulse" />
            <h3 className="font-bold text-white text-sm">
              {lang === 'id' ? 'Mulai Rekam Live Instan' : 'Start Instant Recording'}
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
              {lang === 'id' ? 'Username TikTok atau URL Live' : 'TikTok Username or Live URL'}
            </label>
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Contoh: @khaby.lame atau https://www.tiktok.com/@.../live"
              className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition"
              autoFocus
              required
            />
            <p className="text-[11px] text-zinc-400 mt-1.5">
              {lang === 'id'
                ? 'Sistem akan langsung menyambung ke live streaming melalui yt-dlp & merekam ke format MP4. Setelah selesai, video langsung di-upload ke Telegram.'
                : 'The system connects directly to the stream via yt-dlp and records in MP4. When ended, it uploads directly to Telegram.'}
            </p>
          </div>

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
              disabled={loading || !inputVal.trim()}
              className="flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Radio className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{lang === 'id' ? 'Mulai Rekam Sekarang' : 'Start Recording'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
