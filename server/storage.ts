import fs from 'node:fs';
import path from 'node:path';
import { AppState, LogEntry, MonitoredUser, RecordingItem, TelegramConfig, RecorderConfig } from './types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const RECORDINGS_DIR = path.resolve(DATA_DIR, 'recordings');
const DATA_FILE = path.resolve(DATA_DIR, 'app-data.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

const DEFAULT_STATE: AppState = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    topicId: process.env.TELEGRAM_TOPIC_ID || '',
    enabled: true,
    sendLiveAlerts: true,
    sendUploadProgress: true,
    maxUploadSizeMb: 48, // safe default for standard Telegram bot API limit (50MB)
    autoSplit: true,
    autoDeleteAfterUpload: false,
    apiBaseUrl: process.env.TELEGRAM_API_BASE_URL || 'https://api.telegram.org',
    pollingEnabled: true,
  },
  recorder: {
    checkIntervalSeconds: 45,
    maxConcurrentRecordings: 3,
    minFreeDiskGb: 2,
    preferredQuality: 'best',
    stopMonitoringAfterUpload: false,
    engine: 'michele0303',
    useTikRecSigning: true,
    useEulerStreamFallback: true,
    proxy: '',
    cookies: '',
  },
  monitoredUsers: [
    {
      id: 'demo-1',
      username: 'tiktok',
      displayName: 'TikTok Official',
      autoRecord: true,
      isLive: false,
      status: 'offline',
      lastChecked: new Date().toISOString(),
    }
  ],
  recordings: [],
};

class StorageService {
  private state: AppState;
  private logs: LogEntry[] = [];
  private maxLogs = 500;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): AppState {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_STATE,
          ...parsed,
          telegram: { ...DEFAULT_STATE.telegram, ...(parsed.telegram || {}) },
          recorder: { ...DEFAULT_STATE.recorder, ...(parsed.recorder || {}) },
          monitoredUsers: parsed.monitoredUsers || DEFAULT_STATE.monitoredUsers,
          recordings: parsed.recordings || [],
        };
      }
    } catch (err) {
      console.error('Error reading storage file, using defaults:', err);
    }
    this.saveStateDirect(DEFAULT_STATE);
    return DEFAULT_STATE;
  }

  private saveStateDirect(state: AppState) {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save state to disk:', err);
    }
  }

  public saveState() {
    this.saveStateDirect(this.state);
  }

  public getState(): AppState {
    return this.state;
  }

  public getRecordingsDir(): string {
    return RECORDINGS_DIR;
  }

  public getTelegramConfig(): TelegramConfig {
    return this.state.telegram;
  }

  public updateTelegramConfig(config: Partial<TelegramConfig>): TelegramConfig {
    this.state.telegram = { ...this.state.telegram, ...config };
    this.saveState();
    return this.state.telegram;
  }

  public getRecorderConfig(): RecorderConfig {
    return this.state.recorder;
  }

  public updateRecorderConfig(config: Partial<RecorderConfig>): RecorderConfig {
    this.state.recorder = { ...this.state.recorder, ...config };
    this.saveState();
    return this.state.recorder;
  }

  public getMonitoredUsers(): MonitoredUser[] {
    return this.state.monitoredUsers;
  }

  public addMonitoredUser(username: string, autoRecord: boolean = true): MonitoredUser {
    const cleanUser = username.trim().replace(/^@/, '').toLowerCase();
    const existing = this.state.monitoredUsers.find(u => u.username.toLowerCase() === cleanUser);
    if (existing) {
      existing.autoRecord = autoRecord;
      this.saveState();
      return existing;
    }

    const newUser: MonitoredUser = {
      id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      username: cleanUser,
      displayName: '@' + cleanUser,
      autoRecord,
      isLive: false,
      status: 'offline',
      lastChecked: undefined,
    };
    this.state.monitoredUsers.push(newUser);
    this.saveState();
    return newUser;
  }

  public removeMonitoredUser(idOrUsername: string): boolean {
    const clean = idOrUsername.trim().replace(/^@/, '').toLowerCase();
    const initialLen = this.state.monitoredUsers.length;
    this.state.monitoredUsers = this.state.monitoredUsers.filter(
      u => u.id !== idOrUsername && u.username.toLowerCase() !== clean
    );
    const removed = this.state.monitoredUsers.length < initialLen;
    if (removed) this.saveState();
    return removed;
  }

  public updateMonitoredUser(id: string, updates: Partial<MonitoredUser>): MonitoredUser | null {
    const user = this.state.monitoredUsers.find(u => u.id === id || u.username.toLowerCase() === id.toLowerCase());
    if (!user) return null;
    Object.assign(user, updates);
    this.saveState();
    return user;
  }

  public getRecordings(): RecordingItem[] {
    return this.state.recordings;
  }

  public addRecording(recording: RecordingItem) {
    this.state.recordings.unshift(recording);
    this.saveState();
  }

  public updateRecording(id: string, updates: Partial<RecordingItem>): RecordingItem | null {
    const rec = this.state.recordings.find(r => r.id === id);
    if (!rec) return null;
    Object.assign(rec, updates);
    this.saveState();
    return rec;
  }

  public deleteRecording(id: string): boolean {
    const rec = this.state.recordings.find(r => r.id === id);
    if (!rec) return false;

    // Delete local files
    try {
      if (fs.existsSync(rec.filePath)) {
        fs.unlinkSync(rec.filePath);
      }
      if (rec.parts && rec.parts.length > 0) {
        for (const p of rec.parts) {
          if (fs.existsSync(p.filePath)) {
            fs.unlinkSync(p.filePath);
          }
        }
      }
    } catch (e) {
      console.error('Error deleting file:', e);
    }

    this.state.recordings = this.state.recordings.filter(r => r.id !== id);
    this.saveState();
    return true;
  }

  // Logs management
  public log(level: LogEntry['level'], category: LogEntry['category'], message: string, details?: any) {
    const entry: LogEntry = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details,
    };
    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
    const color = level === 'error' ? '\x1b[31m' : level === 'warn' ? '\x1b[33m' : level === 'success' ? '\x1b[32m' : '\x1b[36m';
    console.log(`${color}[${entry.timestamp}] [${category.toUpperCase()}] [${level.toUpperCase()}]\x1b[0m ${message}`);
  }

  public getLogs(limit: number = 100): LogEntry[] {
    return this.logs.slice(0, limit);
  }

  public clearLogs() {
    this.logs = [];
  }
}

export const storage = new StorageService();
