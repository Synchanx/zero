import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Info,
  Server,
  HardDrive,
  Cpu,
  Radio,
  ArrowDown
} from 'lucide-react';
import { LogEntry, SystemStatus } from '../types';

interface LogsConsoleTabProps {
  logs: LogEntry[];
  status: SystemStatus | null;
  onClearLogs: () => Promise<void>;
  onRefreshLogs: () => Promise<void>;
  lang: 'id' | 'en';
}

export const LogsConsoleTab: React.FC<LogsConsoleTabProps> = ({
  logs,
  status,
  onClearLogs,
  onRefreshLogs,
  lang,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(log => {
    const matchCategory = selectedCategory === 'all' || log.category === selectedCategory;
    const matchLevel = selectedLevel === 'all' || log.level === selectedLevel;
    const matchSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchLevel && matchSearch;
  });

  const getLevelBadge = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return <span className="text-emerald-400 font-bold">[OK]</span>;
      case 'warn':
        return <span className="text-amber-400 font-bold">[WARN]</span>;
      case 'error':
        return <span className="text-rose-400 font-bold">[ERR]</span>;
      case 'info':
      default:
        return <span className="text-cyan-400 font-bold">[INFO]</span>;
    }
  };

  const getCategoryColor = (category: LogEntry['category']) => {
    switch (category) {
      case 'telegram':
        return 'text-sky-400';
      case 'recorder':
        return 'text-rose-400';
      case 'checker':
        return 'text-purple-400';
      case 'system':
      default:
        return 'text-zinc-400';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* SYSTEM METRICS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        {/* Binary Engine Status */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5">
          <div className="flex items-center space-x-2 text-zinc-400 text-xs mb-1">
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            <span>Binaries Engine</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white text-sm">yt-dlp + ffmpeg</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-0.5">Installed &amp; Verified</p>
        </div>

        {/* Free Storage */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5">
          <div className="flex items-center space-x-2 text-zinc-400 text-xs mb-1">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span>{lang === 'id' ? 'Sisa Disk Server' : 'Free Storage'}</span>
          </div>
          <span className="font-mono font-bold text-white text-sm">
            {(status?.freeDiskGb ?? 0).toFixed(1)} GB
          </span>
          <p className="text-[10px] text-zinc-500 mt-0.5">Min required: {status?.recorder.minFreeDiskGb || 2} GB</p>
        </div>

        {/* Check Cycle Interval */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5">
          <div className="flex items-center space-x-2 text-zinc-400 text-xs mb-1">
            <Radio className="w-3.5 h-3.5 text-purple-400" />
            <span>{lang === 'id' ? 'Siklus Cek' : 'Check Interval'}</span>
          </div>
          <span className="font-mono font-bold text-white text-sm">
            {status?.recorder.checkIntervalSeconds || 45}s
          </span>
          <p className="text-[10px] text-zinc-500 mt-0.5">Auto-Daemon Active</p>
        </div>

        {/* Active Recordings */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5">
          <div className="flex items-center space-x-2 text-zinc-400 text-xs mb-1">
            <Cpu className="w-3.5 h-3.5 text-rose-400" />
            <span>{lang === 'id' ? 'Sesi Aktif' : 'Active Sessions'}</span>
          </div>
          <span className="font-mono font-bold text-white text-sm">
            {status?.activeRecordingsCount || 0} / {status?.recorder.maxConcurrentRecordings || 3}
          </span>
          <p className="text-[10px] text-zinc-500 mt-0.5">Concurrent max</p>
        </div>

      </div>

      {/* CONSOLE CONTROLS */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        
        {/* Category Filters */}
        <div className="flex items-center flex-wrap gap-1.5 text-xs">
          <span className="text-zinc-500 mr-1 text-[11px] font-semibold uppercase">Category:</span>
          {['all', 'recorder', 'telegram', 'checker', 'system'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md capitalize transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-cyan-600 text-white font-semibold'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center space-x-2">
          <div className="relative w-48 sm:w-60">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs..."
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>

          <label className="flex items-center space-x-1.5 text-xs text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded bg-zinc-800 border-zinc-700 text-cyan-500 w-3.5 h-3.5"
            />
            <span className="text-[11px]">Auto-scroll</span>
          </label>

          <button
            onClick={onRefreshLogs}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClearLogs}
            className="p-1.5 bg-zinc-800 hover:bg-rose-900/30 text-zinc-400 hover:text-rose-400 rounded-lg transition cursor-pointer"
            title="Clear logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* TERMINAL LOG OUTPUT */}
      <div className="bg-black/90 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl font-mono text-xs">
        <div className="bg-zinc-900/90 px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
            </div>
            <span className="text-zinc-400 text-xs ml-2 font-mono flex items-center space-x-1">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>daemon.log — {filteredLogs.length} events</span>
            </span>
          </div>
          <span className="text-[11px] text-zinc-500">Live Stream Output</span>
        </div>

        <div
          ref={logContainerRef}
          className="p-4 h-[450px] overflow-y-auto space-y-1.5 select-text"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-zinc-500 text-center py-20 italic">
              No logs captured yet. Check activity will appear here as the daemon monitors live streams.
            </div>
          ) : (
            filteredLogs.map(log => (
              <div key={log.id} className="flex items-start space-x-2 leading-relaxed hover:bg-zinc-900/40 p-0.5 rounded">
                <span className="text-zinc-600 flex-shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className="flex-shrink-0">
                  {getLevelBadge(log.level)}
                </span>
                <span className={`font-semibold flex-shrink-0 ${getCategoryColor(log.category)}`}>
                  [{log.category.toUpperCase()}]
                </span>
                <span className="text-zinc-300 break-all">
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};
