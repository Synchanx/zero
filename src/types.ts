export interface TelegramConfig {
  botToken: string;
  botTokenMasked?: string;
  chatId: string;
  topicId?: string;
  enabled: boolean;
  sendLiveAlerts: boolean;
  sendUploadProgress: boolean;
  maxUploadSizeMb: number;
  autoSplit: boolean;
  autoDeleteAfterUpload: boolean;
  apiBaseUrl: string;
  pollingEnabled: boolean;
}

export interface RecorderConfig {
  checkIntervalSeconds: number;
  maxConcurrentRecordings: number;
  minFreeDiskGb: number;
  preferredQuality: 'best' | '1080p' | '720p' | '480p';
  stopMonitoringAfterUpload?: boolean;
  engine?: 'michele0303' | 'direct-ffmpeg' | 'ytdlp';
  proxy?: string;
  cookies?: string;
  useTikRecSigning?: boolean;
  useEulerStreamFallback?: boolean;
}

export interface MonitoredUser {
  id: string;
  username: string;
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
  startedAt: string;
  filePath: string;
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

export interface SystemStatus {
  uptimeSeconds: number;
  freeDiskGb: number;
  activeRecordingsCount: number;
  activeJobs: ActiveJob[];
  totalMonitoredUsers: number;
  liveUsersCount: number;
  telegram: {
    configured: boolean;
    enabled: boolean;
    hasBotToken: boolean;
    chatId: string;
    pollingEnabled: boolean;
    autoSplit: boolean;
    maxUploadSizeMb: number;
  };
  recorder: RecorderConfig;
  binaries: {
    ytdlp: boolean;
    ffmpeg: boolean;
  };
}
