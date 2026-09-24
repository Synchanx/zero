export interface TelegramConfig {
  botToken: string;
  chatId: string;
  topicId?: string;
  enabled: boolean;
  sendLiveAlerts: boolean;
  sendUploadProgress: boolean;
  maxUploadSizeMb: number; // default 48 for standard Bot API, up to 2000 for Local API
  autoSplit: boolean;
  autoDeleteAfterUpload: boolean;
  apiBaseUrl: string; // default https://api.telegram.org
  pollingEnabled: boolean;
}

export interface RecorderConfig {
  checkIntervalSeconds: number; // default 45
  maxConcurrentRecordings: number; // default 3 - Batas maksimal host yang bisa direcord bersamaan
  minFreeDiskGb: number; // default 2
  preferredQuality: 'best' | '1080p' | '720p' | '480p';
  stopMonitoringAfterUpload?: boolean; // Tindakan setelah upload: hentikan auto-record untuk host tersebut jika true
  engine?: 'michele0303' | 'direct-ffmpeg' | 'ytdlp'; // default 'michele0303'
  proxy?: string; // e.g. http://127.0.0.1:8080
  cookies?: string; // cookies.json content or cookie string
  useTikRecSigning?: boolean; // default true (TikRec API sign for room ID)
  useEulerStreamFallback?: boolean; // default true (EulerStream fallback)
  cookiesFile?: string;
}

export interface MonitoredUser {
  id: string;
  username: string; // e.g. "khaby.lame" (without @)
  displayName?: string;
  avatarUrl?: string;
  autoRecord: boolean;
  isLive: boolean;
  liveTitle?: string;
  roomUrl?: string;
  streamUrl?: string;
  lastChecked?: string;
  lastLiveAt?: string;
  status: 'offline' | 'checking' | 'live' | 'recording' | 'error';
  errorMessage?: string;
}

export interface RecordingPart {
  partIndex: number;
  totalParts: number;
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  telegramMessageId?: number;
  uploaded: boolean;
  uploadError?: string;
}

export interface RecordingItem {
  id: string;
  username: string;
  streamTitle?: string;
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  durationSeconds: number;
  startedAt: string;
  endedAt: string;
  status: 'recording' | 'processing' | 'splitting' | 'uploading' | 'uploaded' | 'completed' | 'failed';
  uploadProgress?: number;
  telegramMessageId?: number;
  telegramChatId?: string;
  parts?: RecordingPart[];
  error?: string;
  downloadUrl: string;
  streamThumbnailUrl?: string;
}

export interface ActiveJob {
  recordingId: string;
  username: string;
  startedAt: Date;
  filePath: string;
  process: any; // child_process.ChildProcess
  currentSizeBytes: number;
  durationSeconds: number;
  streamTitle?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  category: 'recorder' | 'telegram' | 'checker' | 'system';
  message: string;
  details?: any;
}

export interface AppState {
  telegram: TelegramConfig;
  recorder: RecorderConfig;
  monitoredUsers: MonitoredUser[];
  recordings: RecordingItem[];
}
