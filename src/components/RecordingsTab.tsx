import React, { useState } from 'react';
import {
  Video,
  Send,
  Download,
  Trash2,
  Play,
  CheckCircle,
  AlertCircle,
  Clock,
  HardDrive,
  RefreshCw,
  Search,
  Filter,
  X,
  ExternalLink,
  Layers
} from 'lucide-react';
import { RecordingItem } from '../types';

interface RecordingsTabProps {
  recordings: RecordingItem[];
  onDeleteRecording: (id: string) => Promise<void>;
  onTriggerUpload: (id: string) => Promise<void>;
  onRefresh: () => void;
  lang: 'id' | 'en';
}

export const RecordingsTab: React.FC<RecordingsTabProps> = ({
  recordings,
  onDeleteRecording,
  onTriggerUpload,
  onRefresh,
  lang,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeVideoPlayer, setActiveVideoPlayer] = useState<RecordingItem | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const filtered = recordings.filter(r => {
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchSearch = r.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.streamTitle && r.streamTitle.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchStatus && matchSearch;
  });

  const handleUploadClick = async (id: string) => {
    setUploadingId(id);
    await onTriggerUpload(id);
    setUploadingId(null);
  };

  const formatDuration = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(1);
  };

  return (
    <div className="space-y-6">
      
      {/* FILTER & STATS BAR */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'id' ? 'Cari rekaman berdasarkan streamer...' : 'Search recordings by creator...'}
            className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <span className="text-zinc-500 flex items-center space-x-1 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>{lang === 'id' ? 'Status:' : 'Status:'}</span>
          </span>

          {[
            { id: 'all', label: lang === 'id' ? 'Semua' : 'All' },
            { id: 'uploaded', label: 'Uploaded to Telegram' },
            { id: 'uploading', label: 'Uploading' },
            { id: 'completed', label: lang === 'id' ? 'Tersimpan Lokal' : 'Local Only' },
            { id: 'failed', label: lang === 'id' ? 'Gagal' : 'Failed' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                filterStatus === f.id
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={onRefresh}
          className="p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition self-end md:self-auto cursor-pointer"
          title="Refresh recordings"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* RECORDINGS LIST */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40">
          <Video className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-zinc-300">
            {recordings.length === 0
              ? (lang === 'id' ? 'Belum ada rekaman live' : 'No stream recordings yet')
              : (lang === 'id' ? 'Tidak ada rekaman sesuai filter' : 'No recordings match filter')}
          </h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
            {recordings.length === 0
              ? (lang === 'id'
                  ? 'Ketika ada streamer yang live, bot akan otomatis merekam dan mengunggah video ke Telegram secara instan.'
                  : 'When a tracked creator goes live, the bot will auto-record and upload to Telegram automatically.')
              : (lang === 'id' ? 'Ubah kata kunci atau pilih filter status lain.' : 'Change search keyword or reset status filter.')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(rec => {
            const isUploadingThis = uploadingId === rec.id || rec.status === 'uploading';
            const sizeMb = formatSize(rec.fileSizeBytes);

            return (
              <div
                key={rec.id}
                className="bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700/80 rounded-xl p-4 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  
                  {/* Left: Info */}
                  <div className="flex items-start space-x-3.5">
                    {/* Video thumbnail / player trigger */}
                    <div
                      onClick={() => setActiveVideoPlayer(rec)}
                      className="relative w-20 h-16 sm:w-24 sm:h-18 rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center cursor-pointer group shadow"
                    >
                      <Video className="w-7 h-7 text-zinc-600 group-hover:scale-110 group-hover:text-cyan-400 transition" />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition">
                        <Play className="w-5 h-5 text-white/90 group-hover:scale-125 transition drop-shadow" />
                      </div>
                      <span className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.2 text-[9px] font-mono text-zinc-300 rounded">
                        {formatDuration(rec.durationSeconds)}
                      </span>
                    </div>

                    {/* Meta info */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-bold text-white text-sm">@{rec.username}</span>
                        <a
                          href={`https://www.tiktok.com/@${rec.username}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-zinc-500 hover:text-zinc-300 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        {/* Status Badge */}
                        {rec.status === 'uploaded' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/50 text-emerald-400 border border-emerald-800 flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            <span>
                              Uploaded to Telegram
                              {rec.parts && rec.parts.length > 1 ? ` (${rec.parts.length} parts)` : ''}
                            </span>
                          </span>
                        )}

                        {rec.status === 'uploading' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950/50 text-cyan-400 border border-cyan-800 flex items-center space-x-1 animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Uploading to Telegram ({rec.uploadProgress || 0}%)</span>
                          </span>
                        )}

                        {rec.status === 'splitting' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/50 text-amber-400 border border-amber-800 flex items-center space-x-1">
                            <Layers className="w-3 h-3 animate-pulse" />
                            <span>Auto-Splitting ({sizeMb} MB &gt; 48 MB)</span>
                          </span>
                        )}

                        {rec.status === 'completed' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                            Saved on Server
                          </span>
                        )}

                        {rec.status === 'failed' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/50 text-rose-400 border border-rose-800 flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3 text-rose-400" />
                            <span>{lang === 'id' ? 'Upload Gagal' : 'Upload Failed'}</span>
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <p className="text-xs text-zinc-300 line-clamp-1">
                        {rec.streamTitle || `Live Stream @${rec.username}`}
                      </p>

                      {/* Sub-details */}
                      <div className="flex items-center space-x-4 text-[11px] text-zinc-400 pt-0.5 flex-wrap">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          <span>{new Date(rec.startedAt).toLocaleString()}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <HardDrive className="w-3 h-3 text-zinc-500" />
                          <span>{sizeMb} MB</span>
                        </span>
                        {rec.telegramMessageId && (
                          <span className="text-emerald-400 font-mono text-[10px]">
                            Msg ID: #{rec.telegramMessageId}
                          </span>
                        )}
                      </div>

                      {/* Error text if any */}
                      {rec.status === 'failed' && rec.error && (
                        <p className="text-[11px] text-rose-400 pt-0.5">
                          ⚠️ {rec.error}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center space-x-2 self-end lg:self-center">
                    
                    {/* Watch button */}
                    <button
                      onClick={() => setActiveVideoPlayer(rec)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium border border-zinc-700 transition cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{lang === 'id' ? 'Tonton' : 'Watch'}</span>
                    </button>

                    {/* Upload to Telegram button */}
                    {rec.status !== 'uploaded' && (
                      <button
                        onClick={() => handleUploadClick(rec.id)}
                        disabled={isUploadingThis}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow transition cursor-pointer disabled:opacity-50 ${
                          rec.status === 'failed'
                            ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                            : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                        }`}
                        title={lang === 'id' ? 'Kirim ke Telegram sekarang' : 'Upload to Telegram now'}
                      >
                        {isUploadingThis ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : rec.status === 'failed' ? (
                          <RefreshCw className="w-3.5 h-3.5" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {rec.status === 'failed'
                            ? (lang === 'id' ? 'Coba Upload Lagi' : 'Retry Upload')
                            : (lang === 'id' ? 'Upload ke Telegram' : 'Send to Telegram')}
                        </span>
                      </button>
                    )}

                    {/* Download MP4 button */}
                    <a
                      href={rec.downloadUrl}
                      download={rec.fileName}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-medium border border-zinc-700 transition"
                      title={lang === 'id' ? 'Download file video MP4' : 'Download video file'}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Download</span>
                    </a>

                    {/* Delete button */}
                    <button
                      onClick={() => onDeleteRecording(rec.id)}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
                      title={lang === 'id' ? 'Hapus rekaman' : 'Delete recording'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* HTML5 VIDEO PLAYER MODAL */}
      {activeVideoPlayer && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950/80">
              <div className="flex items-center space-x-2">
                <Video className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-white text-sm">
                  @{activeVideoPlayer.username} - {activeVideoPlayer.streamTitle || 'TikTok Live'}
                </span>
              </div>
              <button
                onClick={() => setActiveVideoPlayer(null)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-black aspect-video flex items-center justify-center">
              <video
                src={`/api/recordings/stream/${activeVideoPlayer.id}`}
                controls
                autoPlay
                className="w-full h-full max-h-[70vh]"
              />
            </div>

            <div className="p-4 bg-zinc-950 flex items-center justify-between text-xs text-zinc-400">
              <div className="space-x-3">
                <span>{new Date(activeVideoPlayer.startedAt).toLocaleString()}</span>
                <span>•</span>
                <span>{formatSize(activeVideoPlayer.fileSizeBytes)} MB</span>
                <span>•</span>
                <span>{formatDuration(activeVideoPlayer.durationSeconds)}</span>
              </div>
              <a
                href={activeVideoPlayer.downloadUrl}
                download={activeVideoPlayer.fileName}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download MP4</span>
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
