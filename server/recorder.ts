import fs from 'node:fs';
import path from 'node:path';
import { spawn, ChildProcess } from 'node:child_process';
import { storage } from './storage.js';
import { telegram } from './telegram.js';
import { ActiveJob, RecordingItem } from './types.js';

export interface LiveResolutionResult {
  isLive: boolean;
  roomId?: string;
  title?: string;
  flvUrl?: string;
  hlsUrl?: string;
  streamUrl?: string;
  streamCandidates?: Array<{ quality: string; url: string; type: 'flv' | 'hls' | 'rtmp' }>;
  nickname?: string;
  avatarThumb?: string;
  source: 'michele0303_tikrec' | 'michele0303_euler' | 'webcast_api' | 'html_sigi' | 'html_uni' | 'ytdlp' | 'none';
}

interface CachedStreamInfo {
  streamUrl?: string;
  roomId?: string;
  title?: string;
  flvUrl?: string;
  hlsUrl?: string;
  candidates?: Array<{ quality: string; url: string; type: 'flv' | 'hls' | 'rtmp' }>;
  expiresAt: number;
}

/**
 * Standard HTTP headers matching Michele0303/tiktok-live-recorder
 */
export function getMicheleHeaders(cookiesStr?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.127 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,application/json,text/plain,*/*;q=0.8',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-User': '?1',
    'Sec-Fetch-Dest': 'document',
    'Referer': 'https://www.tiktok.com/',
    'Origin': 'https://www.tiktok.com',
  };

  if (cookiesStr && cookiesStr.trim()) {
    try {
      if (cookiesStr.trim().startsWith('{')) {
        const parsed = JSON.parse(cookiesStr);
        const cookiePairs = Object.entries(parsed).map(([k, v]) => `${k}=${v}`).join('; ');
        if (cookiePairs) headers['Cookie'] = cookiePairs;
      } else {
        headers['Cookie'] = cookiesStr.trim();
      }
    } catch {
      headers['Cookie'] = cookiesStr.trim();
    }
  }

  return headers;
}

/**
 * Extracts candidate CDN stream URLs directly from room data
 * using the Michele0303 Core SDK quality sorting methodology
 */
export function extractStreamCandidatesMichele(roomData: any): Array<{ quality: string; url: string; type: 'flv' | 'hls' | 'rtmp' }> {
  const candidates: Array<{ quality: string; url: string; type: 'flv' | 'hls' | 'rtmp' }> = [];
  const addedUrls = new Set<string>();

  const add = (quality: string, url: string | undefined, type: 'flv' | 'hls' | 'rtmp') => {
    if (!url || typeof url !== 'string' || !url.startsWith('http') || addedUrls.has(url)) return;
    addedUrls.add(url);
    candidates.push({ quality, url, type });
  };

  const streamUrlObj = roomData?.stream_url || {};
  const sdkStreamDataStr = streamUrlObj.live_core_sdk_data?.pull_data?.stream_data;
  const qualities = streamUrlObj.live_core_sdk_data?.pull_data?.options?.qualities || [];

  if (sdkStreamDataStr && typeof sdkStreamDataStr === 'string') {
    try {
      const sdkData = JSON.parse(sdkStreamDataStr).data || {};
      const levelMap: Record<string, number> = {};
      if (Array.isArray(qualities)) {
        for (const q of qualities) {
          if (q && q.sdk_key) {
            levelMap[q.sdk_key] = typeof q.level === 'number' ? q.level : 0;
          }
        }
      }

      const orderedKeys = Object.keys(sdkData).sort((a, b) => (levelMap[b] ?? -1) - (levelMap[a] ?? -1));

      for (const sdkKey of orderedKeys) {
        const entry = sdkData[sdkKey];
        if (entry && entry.main) {
          if (entry.main.flv) {
            add(sdkKey, entry.main.flv, 'flv');
          }
          if (entry.main.hls || entry.main.m3u8) {
            add(sdkKey, entry.main.hls || entry.main.m3u8, 'hls');
          }
        }
      }
    } catch {}
  }

  // Legacy FLV pull URLs (FULL_HD1, HD1, SD2, SD1)
  const flvPull = streamUrlObj.flv_pull_url;
  if (flvPull && typeof flvPull === 'object') {
    for (const key of ['FULL_HD1', 'HD1', 'SD2', 'SD1']) {
      if (flvPull[key]) {
        add(key, flvPull[key], 'flv');
      }
    }
    for (const [k, val] of Object.entries(flvPull)) {
      if (typeof val === 'string') {
        add(k, val, 'flv');
      }
    }
  }

  if (streamUrlObj.hls_pull_url) {
    add('hls-default', streamUrlObj.hls_pull_url, 'hls');
  }
  if (streamUrlObj.rtmp_pull_url) {
    add('rtmp-default', streamUrlObj.rtmp_pull_url, 'rtmp');
  }

  return candidates;
}

export class RecorderService {
  private activeJobs: Map<string, ActiveJob> = new Map();
  private checkIntervalTimer: NodeJS.Timeout | null = null;
  private isCheckingCycle = false;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private resolvedStreamCache: Map<string, CachedStreamInfo> = new Map();
  private cooldownMap: Map<string, number> = new Map();

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Check remaining disk space in GB
   */
  public getFreeDiskGb(): number {
    try {
      const stats = fs.statfsSync ? fs.statfsSync(storage.getRecordingsDir()) : null;
      if (stats) {
        const freeBytes = stats.bavail * stats.bsize;
        return freeBytes / (1024 * 1024 * 1024);
      }
    } catch {
      // Ignore or fallback
    }
    return 50; // default safe assumption
  }

  /**
   * Resolve live stream status and direct stream URLs accurately
   * TikTok status codes:
   * status === 2: LIVE (Broadcasting)
   * status === 4: OFFLINE / ENDED (Stale previous broadcast)
   */
  /**
   * Resolve live stream status and direct stream URLs accurately
   * Implements the engine algorithm from Michele0303/tiktok-live-recorder:
   * 1. TikRec Signing Service (bypasses TikTok WAF & room bot-check)
   * 2. EulerStream signed webcast endpoint (fallback)
   * 3. Direct HTML scraping (SIGI_STATE & __UNIVERSAL_DATA_FOR_REHYDRATION__)
   * 4. Webcast check_alive & Webcast room info Core SDK stream data extraction
   * 5. Fallback HTML page regex scraping (_or4 / _sd FLV & HLS)
   */
  public async resolveLiveStatus(username: string): Promise<LiveResolutionResult> {
    const cleanUser = username.trim().replace(/^@/, '').toLowerCase();
    const recConfig = storage.getRecorderConfig();
    const cookiesStr = recConfig.cookies || '';
    const headers = getMicheleHeaders(cookiesStr);

    let roomId: string | undefined;
    let title = '';
    let nickname = cleanUser;
    let avatarThumb = '';
    let resolutionSource: LiveResolutionResult['source'] = 'webcast_api';

    // -------------------------------------------------------------
    // Step 1: TikRec Signing Service (Michele0303 Primary Engine)
    // -------------------------------------------------------------
    if (recConfig.useTikRecSigning !== false) {
      try {
        const signUrl = `https://tikrec.com/tiktok/room/api/sign?unique_id=${encodeURIComponent(cleanUser)}`;
        const signRes = await fetch(signUrl, {
          headers: {
            'User-Agent': headers['User-Agent'],
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(6000),
        });

        if (signRes.ok) {
          const signData = await signRes.json();
          const signedPath = signData.signed_path;
          if (signedPath) {
            const tiktokApiUrl = `https://www.tiktok.com${signedPath}`;
            const roomRes = await fetch(tiktokApiUrl, {
              headers,
              signal: AbortSignal.timeout(6000),
            });

            if (roomRes.ok) {
              const roomJson = await roomRes.json();
              const uData = roomJson?.data?.user;
              if (uData && uData.roomId) {
                roomId = String(uData.roomId);
                nickname = uData.nickname || cleanUser;
                avatarThumb = uData.avatarLarger || uData.avatarThumb || avatarThumb;
                resolutionSource = 'michele0303_tikrec';
                storage.log('info', 'checker', `[Michele0303 TikRec] Resolved Room ID for @${cleanUser}: ${roomId}`);
              }
            }
          }
        }
      } catch (err: any) {
        // Tikrec failed or timed out, seamlessly proceed to next level
      }
    }

    // -------------------------------------------------------------
    // Step 2: EulerStream Fallback (Michele0303 Fallback API)
    // -------------------------------------------------------------
    if (!roomId && recConfig.useEulerStreamFallback !== false) {
      try {
        const eulerUrl = `https://tiktok.eulerstream.com/webcast/room_info?uniqueId=${encodeURIComponent(cleanUser)}&giftInfo=false`;
        const eulerRes = await fetch(eulerUrl, {
          headers: {
            'x-api-key': '',
            'User-Agent': headers['User-Agent'],
          },
          signal: AbortSignal.timeout(6000),
        });

        if (eulerRes.ok) {
          const eulerData = await eulerRes.json();
          const rInfo = eulerData?.data?.room_info;
          if (rInfo && rInfo.id) {
            roomId = String(rInfo.id);
            resolutionSource = 'michele0303_euler';
            storage.log('info', 'checker', `[Michele0303 EulerStream] Resolved Room ID for @${cleanUser}: ${roomId}`);
          }
        }
      } catch (err: any) {
        // Continue to HTML scraping
      }
    }

    // -------------------------------------------------------------
    // Step 3: Direct Web Scraping (SIGI_STATE & Universal Data)
    // -------------------------------------------------------------
    if (!roomId) {
      try {
        const livePageUrl = `https://www.tiktok.com/@${cleanUser}/live`;
        const res = await fetch(livePageUrl, {
          headers,
          signal: AbortSignal.timeout(6000),
        });

        if (res.ok) {
          const html = await res.text();

          // 3a. Inspect SIGI_STATE
          const sigiMatch = html.match(/<script id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/);
          if (sigiMatch) {
            try {
              const data = JSON.parse(sigiMatch[1]);
              const liveRoom = data.LiveRoom?.liveRoomUserInfo?.liveRoom;
              const user = data.LiveRoom?.liveRoomUserInfo?.user;
              if (liveRoom) {
                title = liveRoom.title || title;
              }
              if (user) {
                roomId = user.roomId || liveRoom?.roomId;
                nickname = user.nickname || cleanUser;
                avatarThumb = user.avatarThumb || avatarThumb;
                if (roomId) resolutionSource = 'html_sigi';
              }
            } catch {}
          }

          // 3b. Inspect __UNIVERSAL_DATA_FOR_REHYDRATION__
          if (!roomId) {
            const uniMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/);
            if (uniMatch) {
              try {
                const data = JSON.parse(uniMatch[1]);
                const liveDetail = data['__DEFAULT_SCOPE__']?.['webapp.live-detail'];
                const userDetail = data['__DEFAULT_SCOPE__']?.['webapp.user-detail'];
                if (liveDetail) {
                  const liveRoom = liveDetail.liveRoomUserInfo?.liveRoom;
                  if (liveRoom) title = liveRoom.title || title;
                  const user = liveDetail.liveRoomUserInfo?.user;
                  if (user) {
                    roomId = user.roomId || liveRoom?.roomId;
                    nickname = user.nickname || cleanUser;
                    avatarThumb = user.avatarThumb || avatarThumb;
                    if (roomId) resolutionSource = 'html_uni';
                  }
                }
                if (!roomId && userDetail) {
                  roomId = userDetail.userInfo?.user?.roomId;
                  nickname = userDetail.userInfo?.user?.nickname || cleanUser;
                  avatarThumb = userDetail.userInfo?.user?.avatarThumb || avatarThumb;
                  if (roomId) resolutionSource = 'html_uni';
                }
              } catch {}
            }
          }
        }
      } catch {}
    }

    // -------------------------------------------------------------
    // Step 4: Webcast API Room Alive & Stream Candidates Extraction
    // -------------------------------------------------------------
    if (roomId) {
      // 4a. Check Webcast Room Check Alive (Michele0303 method)
      try {
        const aliveUrl = `https://webcast.tiktok.com/webcast/room/check_alive/?aid=1988&region=CH&room_ids=${roomId}&user_is_login=true`;
        const aliveRes = await fetch(aliveUrl, {
          headers,
          signal: AbortSignal.timeout(5000),
        });

        if (aliveRes.ok) {
          const aliveJson = await aliveRes.json();
          const alive = aliveJson.data?.[0]?.alive;
          if (alive === false) {
            return {
              isLive: false,
              roomId,
              title: title || '',
              nickname,
              avatarThumb,
              source: resolutionSource,
            };
          }
        }
      } catch {}

      // 4b. Fetch Room Info & Parse Core SDK Stream Data
      try {
        const roomInfoUrl = `https://webcast.tiktok.com/webcast/room/info/?aid=1988&room_id=${roomId}`;
        const roomInfoRes = await fetch(roomInfoUrl, {
          headers,
          signal: AbortSignal.timeout(6000),
        });

        if (roomInfoRes.ok) {
          const infoJson = await roomInfoRes.json();
          const statusCode = infoJson.status_code;
          const roomData = infoJson.data || {};

          // WAF block code 4003110 -> Try Michele0303 HTML stream URL regex scraping fallback
          if (statusCode === 4003110) {
            storage.log('warn', 'checker', `[Michele0303] Webcast API WAF 4003110 detected for @${cleanUser}. Invoking HTML regex fallback...`);
            try {
              const livePageRes = await fetch(`https://www.tiktok.com/@${cleanUser}/live`, {
                headers,
                signal: AbortSignal.timeout(6000),
              });
              if (livePageRes.ok) {
                const liveHtml = await livePageRes.text();
                const flvMatches = liveHtml.match(/https?:\/\/[^\s"'<>]+\.flv[^\s"'<>]*/g);
                let fallbackUrl: string | undefined;
                if (flvMatches && flvMatches.length > 0) {
                  for (const candidate of flvMatches) {
                    const cleanCandidate = candidate.replace(/\\/g, '');
                    if (cleanCandidate.includes('_or4') || cleanCandidate.includes('_sd')) {
                      fallbackUrl = cleanCandidate;
                      break;
                    }
                  }
                  if (!fallbackUrl) fallbackUrl = flvMatches[0].replace(/\\/g, '');
                }

                if (!fallbackUrl) {
                  const hlsMatches = liveHtml.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/g);
                  if (hlsMatches && hlsMatches.length > 0) {
                    fallbackUrl = hlsMatches[0].replace(/\\/g, '');
                  }
                }

                if (fallbackUrl) {
                  return {
                    isLive: true,
                    roomId,
                    title: title || `@${cleanUser} TikTok Live`,
                    streamUrl: fallbackUrl,
                    flvUrl: fallbackUrl.includes('.flv') ? fallbackUrl : undefined,
                    hlsUrl: fallbackUrl.includes('.m3u8') ? fallbackUrl : undefined,
                    streamCandidates: [{ quality: 'fallback_page', url: fallbackUrl, type: fallbackUrl.includes('.flv') ? 'flv' : 'hls' }],
                    nickname,
                    avatarThumb,
                    source: resolutionSource,
                  };
                }
              }
            } catch {}

            return {
              isLive: false,
              roomId,
              title: title || '',
              nickname,
              avatarThumb,
              source: resolutionSource,
            };
          }

          // If TikTok explicitly indicates room status is not live (status != 2)
          if (roomData.status !== undefined && String(roomData.status) !== '2') {
            return {
              isLive: false,
              roomId,
              title: roomData.title || title || '',
              nickname,
              avatarThumb,
              source: resolutionSource,
            };
          }

          if (roomData.status === 2 || (!roomData.status && statusCode === 0)) {
            if (roomData.title) title = roomData.title;
            if (roomData.owner?.nickname) nickname = roomData.owner.nickname;
            if (roomData.owner?.avatar_thumb?.url_list?.[0]) avatarThumb = roomData.owner.avatar_thumb.url_list[0];

            // Extract all candidate CDN streams via Michele0303 method
            const candidates = extractStreamCandidatesMichele(roomData);

            if (candidates.length > 0) {
              // Determine preferred candidate based on user quality setting
              const preferred = recConfig.preferredQuality || 'best';
              let selected = candidates[0];

              if (preferred === '720p') {
                const hdCandidate = candidates.find(c => c.quality.toLowerCase().includes('hd') || c.quality.includes('720'));
                if (hdCandidate) selected = hdCandidate;
              } else if (preferred === '480p') {
                const sdCandidate = candidates.find(c => c.quality.toLowerCase().includes('sd') || c.quality.includes('480'));
                if (sdCandidate) selected = sdCandidate;
              }

              const flvCandidate = candidates.find(c => c.type === 'flv');
              const hlsCandidate = candidates.find(c => c.type === 'hls');

              return {
                isLive: true,
                roomId,
                title: title || `@${cleanUser} TikTok Live`,
                streamUrl: selected.url,
                flvUrl: flvCandidate?.url,
                hlsUrl: hlsCandidate?.url,
                streamCandidates: candidates,
                nickname,
                avatarThumb,
                source: resolutionSource,
              };
            }
          }
        }
      } catch (err: any) {
        // Proceed to fallback
      }
    }

    // -------------------------------------------------------------
    // Step 5: Fallback yt-dlp check (if direct web resolution was inconclusive)
    // -------------------------------------------------------------
    if (!roomId) {
      return {
        isLive: false,
        title: '',
        nickname,
        avatarThumb,
        source: 'none',
      };
    }

    return new Promise((resolve) => {
      const liveUrl = `https://www.tiktok.com/@${cleanUser}/live`;
      const targetUrl = roomId ? `https://m.tiktok.com/share/live/${roomId}` : liveUrl;
      const args = [
        '--dump-json',
        '--skip-download',
        '--no-warnings',
        '--ignore-errors',
        '--no-check-certificates',
        '--referer', 'https://www.tiktok.com/',
        '--add-header', 'Origin:https://www.tiktok.com',
        '--add-header', `User-Agent:${headers['User-Agent']}`,
        targetUrl,
      ];

      const proc = spawn('yt-dlp', args);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (d) => stdout += d.toString());
      proc.stderr.on('data', (d) => stderr += d.toString());

      const timeout = setTimeout(() => {
        try { proc.kill('SIGKILL'); } catch {}
        resolve({
          isLive: false,
          roomId,
          title: '',
          nickname,
          avatarThumb,
          source: 'none',
        });
      }, 10000);

      proc.on('close', (code) => {
        clearTimeout(timeout);
        const combined = (stdout + stderr).toLowerCase();
        let isLive = false;
        let ytTitle = '';

        if (code === 0 && stdout.trim()) {
          try {
            const lines = stdout.trim().split('\n');
            for (const line of lines) {
              if (!line.trim()) continue;
              const info = JSON.parse(line);
              if (info.is_live === true || info.live_status === 'is_live') {
                isLive = true;
                ytTitle = info.title || info.fulltitle || '';
                break;
              }
            }
          } catch {}
        }

        // Explicit offline markers
        if (
          combined.includes('is not currently live') ||
          combined.includes('channel is not currently live') ||
          combined.includes('not currently live') ||
          combined.includes('room does not exist') ||
          combined.includes('livestream has ended')
        ) {
          isLive = false;
        }

        resolve({
          isLive,
          roomId,
          title: ytTitle || title || '',
          nickname,
          avatarThumb,
          source: 'ytdlp',
        });
      });

      proc.on('error', () => {
        clearTimeout(timeout);
        resolve({
          isLive: false,
          roomId,
          title: '',
          nickname,
          avatarThumb,
          source: 'none',
        });
      });
    });
  }

  /**
   * Check if a TikTok creator is currently live and update storage state
   */
  public async checkUser(username: string): Promise<boolean> {
    const cleanUser = username.trim().replace(/^@/, '').toLowerCase();
    const now = new Date().toISOString();

    // Check cooldown to avoid rapid checking loops on failed/ended streams
    const cooldownUntil = this.cooldownMap.get(cleanUser);
    if (cooldownUntil && Date.now() < cooldownUntil) {
      const remainingSec = Math.round((cooldownUntil - Date.now()) / 1000);
      storage.log('info', 'checker', `Skipping check for @${cleanUser} (Cooldown: ${remainingSec}s remaining).`);
      return false;
    }

    storage.updateMonitoredUser(cleanUser, { status: 'checking' });
    storage.log('info', 'checker', `Checking live status for @${cleanUser}...`);

    try {
      const res = await this.resolveLiveStatus(cleanUser);

      // Cache valid stream info for fast instant recording
      if (res.isLive) {
        this.resolvedStreamCache.set(cleanUser, {
          streamUrl: res.streamUrl,
          roomId: res.roomId,
          title: res.title,
          flvUrl: res.flvUrl,
          hlsUrl: res.hlsUrl,
          candidates: res.streamCandidates,
          expiresAt: Date.now() + 60000, // 60s validity
        });

        storage.log('success', 'checker', `🔴 @${cleanUser} is LIVE! Title: "${res.title || 'TikTok Live'}" [${res.source}]`);
        storage.updateMonitoredUser(cleanUser, {
          isLive: true,
          status: this.activeJobs.has(cleanUser) ? 'recording' : 'live',
          liveTitle: res.title || 'TikTok Live',
          displayName: res.nickname || cleanUser,
          avatarUrl: res.avatarThumb || undefined,
          lastLiveAt: now,
          lastChecked: now,
          errorMessage: undefined,
        });
        return true;
      } else {
        this.resolvedStreamCache.delete(cleanUser);
        storage.updateMonitoredUser(cleanUser, {
          isLive: false,
          status: this.activeJobs.has(cleanUser) ? 'recording' : 'offline',
          displayName: res.nickname || cleanUser,
          avatarUrl: res.avatarThumb || undefined,
          lastChecked: now,
          errorMessage: undefined,
        });
        return false;
      }
    } catch (err: any) {
      storage.log('error', 'checker', `Error checking @${cleanUser}: ${err.message}`);
      storage.updateMonitoredUser(cleanUser, {
        status: this.activeJobs.has(cleanUser) ? 'recording' : 'offline',
        lastChecked: now,
        errorMessage: err.message,
      });
      return false;
    }
  }

  /**
   * Start recording a TikTok live stream
   * Prioritizes direct ffmpeg recording from CDN stream URL (FLV/HLS) for maximum speed and reliability.
   */
  public async startRecording(username: string, isManual: boolean = false): Promise<{ success: boolean; message?: string; recordingId?: string; isOffline?: boolean; title?: string }> {
    const cleanUser = username.trim().replace(/^@/, '').toLowerCase();

    // Check if already actively recording
    if (this.activeJobs.has(cleanUser)) {
      return { success: false, message: `@${cleanUser} sedang dalam proses perekaman.` };
    }

    // Check storage and host limits
    const freeDisk = this.getFreeDiskGb();
    const minDisk = storage.getRecorderConfig().minFreeDiskGb;
    if (freeDisk < minDisk) {
      const msg = `Penyimpanan penuh (${freeDisk.toFixed(1)}GB tersisa). Minimal dibutuhkan: ${minDisk}GB.`;
      storage.log('error', 'recorder', msg);
      return { success: false, message: msg };
    }

    const maxConcurrent = storage.getRecorderConfig().maxConcurrentRecordings || 3;
    if (this.activeJobs.size >= maxConcurrent) {
      const msg = `Batas maksimal rekaman bersamaan (${maxConcurrent} host) telah tercapai.`;
      storage.log('warn', 'recorder', msg);
      return { success: false, message: msg };
    }

    // Check cache or resolve live status
    let cached = this.resolvedStreamCache.get(cleanUser);
    if (!cached || Date.now() > cached.expiresAt) {
      storage.log('info', 'recorder', `Resolving live stream details for @${cleanUser}...`);
      const res = await this.resolveLiveStatus(cleanUser);
      if (!res.isLive) {
        storage.log('warn', 'recorder', `Cannot record @${cleanUser}: Streamer is currently offline.`);
        storage.updateMonitoredUser(cleanUser, { status: 'offline', isLive: false });
        return {
          success: false,
          isOffline: true,
          message: `@${cleanUser} sedang OFFLINE (tidak ada siaran langsung).`,
        };
      }
      cached = {
        streamUrl: res.streamUrl,
        roomId: res.roomId,
        title: res.title,
        flvUrl: res.flvUrl,
        hlsUrl: res.hlsUrl,
        candidates: res.streamCandidates,
        expiresAt: Date.now() + 60000,
      };
      this.resolvedStreamCache.set(cleanUser, cached);
    }

    const recordingId = 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${cleanUser}_${dateStr}.mp4`;
    const filePath = path.join(storage.getRecordingsDir(), fileName);
    const liveUrl = `https://www.tiktok.com/@${cleanUser}/live`;

    const monitoredUser = storage.getMonitoredUsers().find(u => u.username.toLowerCase() === cleanUser);
    const streamTitle = cached.title || monitoredUser?.liveTitle || `TikTok Live @${cleanUser}`;
    const recConfig = storage.getRecorderConfig();
    const cookiesStr = recConfig.cookies || '';
    const headers = getMicheleHeaders(cookiesStr);

    storage.log('info', 'recorder', `Starting live stream recording for @${cleanUser} -> ${fileName}`);

    // Create recording item in storage
    const newRecording: RecordingItem = {
      id: recordingId,
      username: cleanUser,
      streamTitle,
      fileName,
      filePath,
      fileSizeBytes: 0,
      durationSeconds: 0,
      startedAt: new Date().toISOString(),
      endedAt: '',
      status: 'recording',
      downloadUrl: `/api/recordings/download/${recordingId}`,
    };
    storage.addRecording(newRecording);

    // Spawn recording process: Direct FFmpeg stream copy (if stream URL found) or fallback to yt-dlp
    let child: ChildProcess;
    let engineType = 'michele0303';

    if (cached.streamUrl) {
      engineType = 'michele0303-direct';
      storage.log('info', 'recorder', `Using Michele0303 Direct CDN Stream Pipeline (${cached.candidates?.length || 1} quality candidates) for @${cleanUser}`);

      // Construct FFmpeg header string with User-Agent, Referer, and Cookies
      let headerStr = `User-Agent: ${headers['User-Agent']}\r\nReferer: https://www.tiktok.com/\r\nOrigin: https://www.tiktok.com\r\n`;
      if (headers['Cookie']) {
        headerStr += `Cookie: ${headers['Cookie']}\r\n`;
      }

      // ffmpeg direct stream capture without transcoding: lossless copy, faststart enabled
      const ffmpegArgs = [
        '-y',
        '-hide_banner',
        '-loglevel', 'warning',
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '5',
      ];

      // Proxy support if configured
      if (recConfig.proxy) {
        ffmpegArgs.push('-http_proxy', recConfig.proxy);
      }

      ffmpegArgs.push(
        '-headers', headerStr,
        '-i', cached.streamUrl,
        '-c', 'copy',
        '-movflags', '+frag_keyframe+empty_moov+default_base_moof',
        filePath,
      );

      const spawnEnv: NodeJS.ProcessEnv = { ...process.env };
      if (recConfig.proxy) {
        spawnEnv.http_proxy = recConfig.proxy;
        spawnEnv.https_proxy = recConfig.proxy;
      }

      child = spawn('ffmpeg', ffmpegArgs, { env: spawnEnv });
    } else {
      engineType = 'ytdlp-fallback';
      storage.log('info', 'recorder', `Using yt-dlp fallback engine for @${cleanUser}`);
      const targetUrl = cached.roomId ? `https://m.tiktok.com/share/live/${cached.roomId}` : liveUrl;
      const ytdlpArgs = [
        '--no-part',
        '--no-live-from-start',
        '--retries', 'infinite',
        '--fragment-retries', 'infinite',
        '--concurrent-fragments', '1',
        '-f', 'best/flv-origin/hls-origin/bestvideo+bestaudio',
        '--no-check-certificates',
        '--referer', 'https://www.tiktok.com/',
        '--add-header', 'Origin:https://www.tiktok.com',
        '--add-header', `User-Agent:${headers['User-Agent']}`,
      ];

      if (recConfig.proxy) {
        ytdlpArgs.push('--proxy', recConfig.proxy);
      }

      ytdlpArgs.push('-o', filePath, targetUrl);

      const spawnEnv: NodeJS.ProcessEnv = { ...process.env, PYTHONWARNINGS: 'ignore' };
      if (recConfig.proxy) {
        spawnEnv.http_proxy = recConfig.proxy;
        spawnEnv.https_proxy = recConfig.proxy;
      }

      child = spawn('yt-dlp', ytdlpArgs, {
        env: spawnEnv,
      });
    }

    const activeJob: ActiveJob = {
      recordingId,
      username: cleanUser,
      startedAt: new Date(),
      filePath,
      process: child,
      currentSizeBytes: 0,
      durationSeconds: 0,
      streamTitle,
    };
    this.activeJobs.set(cleanUser, activeJob);

    // Update user status to recording
    storage.updateMonitoredUser(cleanUser, { status: 'recording', isLive: true });

    // Send Live Alert to Telegram
    telegram.sendLiveAlert(cleanUser, streamTitle, liveUrl).catch(() => {});

    // Listen to errors
    let lastError = '';
    child.stderr?.on('data', (data) => {
      const text = data.toString().trim();
      if (text && !text.includes('deprecated') && !text.includes('WARNING:')) {
        lastError = text;
      }
    });

    // Handle process completion
    child.on('close', async (code) => {
      storage.log('info', 'recorder', `Recording process exited for @${cleanUser} (Code: ${code}, Engine: ${engineType})`);
      this.activeJobs.delete(cleanUser);
      this.resolvedStreamCache.delete(cleanUser);

      // Re-verify file
      let finalSize = 0;
      if (fs.existsSync(filePath)) {
        try {
          finalSize = fs.statSync(filePath).size;
        } catch {}
      }

      const endedAt = new Date().toISOString();
      const durationSeconds = Math.max(1, Math.round((new Date().getTime() - activeJob.startedAt.getTime()) / 1000));

      // Less than 100KB: considered empty/failed/ended immediately
      if (finalSize < 100000) {
        storage.log('warn', 'recorder', `Recording file too small (${finalSize} bytes) for @${cleanUser}. Stream ended or connection failed.`);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch {}
        }
        storage.updateRecording(recordingId, {
          status: 'failed',
          endedAt,
          durationSeconds,
          fileSizeBytes: finalSize,
          error: lastError || 'Recorded file was empty or stream was offline',
        });
        storage.updateMonitoredUser(cleanUser, { status: 'offline', isLive: false });

        // Set 60-second cooldown so it doesn't immediately repeat in tight loop
        this.cooldownMap.set(cleanUser, Date.now() + 60000);

        // Only send message if triggered manually
        if (isManual) {
          const tgCfg = storage.getTelegramConfig();
          if (tgCfg.enabled && tgCfg.chatId) {
            telegram.sendMessage(
              `⚠️ <b>Sesi @${cleanUser} berakhir.</b>\nSiaran langsung tidak aktif atau telah ditutup. Bot akan otomatis merekam kembali saat live berikutnya.`
            ).catch(() => {});
          }
        }
        return;
      }

      // Remux into 100% compliant standard MP4 with faststart (video stream on 0, audio on 1)
      const pristinePath = await this.remuxToPristineMp4(filePath);
      if (fs.existsSync(pristinePath)) {
        try {
          finalSize = fs.statSync(pristinePath).size;
          storage.updateRecording(recordingId, {
            filePath: pristinePath,
            fileSizeBytes: finalSize,
          });
        } catch {}
      }

      storage.updateRecording(recordingId, {
        status: 'processing',
        endedAt,
        durationSeconds,
        fileSizeBytes: finalSize,
      });

      storage.log('success', 'recorder', `Recording ready for @${cleanUser}! Total size: ${(finalSize / (1024 * 1024)).toFixed(1)} MB, Duration: ${durationSeconds}s`);

      // Trigger automatic Telegram upload!
      storage.log('info', 'recorder', `Queuing automatic Telegram upload for recording ${recordingId}...`);
      await telegram.uploadRecording(recordingId);

      // Mark user status back to offline
      storage.updateMonitoredUser(cleanUser, { status: 'offline', isLive: false });

      // After-upload setting: check if monitoring should stop for this host
      const recCfg = storage.getRecorderConfig();
      if (recCfg.stopMonitoringAfterUpload) {
        storage.updateMonitoredUser(cleanUser, { autoRecord: false });
        storage.log('info', 'recorder', `Auto-record disabled for @${cleanUser} after upload as configured.`);
      }

      // 60-second cooldown before checking this host again
      this.cooldownMap.set(cleanUser, Date.now() + 60000);
    });

    child.on('error', (err) => {
      storage.log('error', 'recorder', `Failed to spawn recording process for @${cleanUser}: ${err.message}`);
      this.activeJobs.delete(cleanUser);
      this.resolvedStreamCache.delete(cleanUser);
      storage.updateRecording(recordingId, {
        status: 'failed',
        endedAt: new Date().toISOString(),
        error: err.message,
      });
      storage.updateMonitoredUser(cleanUser, { status: 'offline', isLive: false });
      this.cooldownMap.set(cleanUser, Date.now() + 60000);
    });

    return {
      success: true,
      message: `Started recording @${cleanUser}`,
      recordingId,
      title: streamTitle,
    };
  }

  /**
   * Stop an active recording gracefully
   */
  public async stopRecording(username: string): Promise<{ success: boolean; message?: string }> {
    const cleanUser = username.trim().replace(/^@/, '').toLowerCase();
    const job = this.activeJobs.get(cleanUser);

    if (!job) {
      return { success: false, message: `No active recording found for @${cleanUser}` };
    }

    storage.log('info', 'recorder', `Manual stop requested for @${cleanUser}. Finalizing video stream...`);

    try {
      // Send 'q' to stdin or SIGINT so ffmpeg / yt-dlp flushes headers and closes mp4 container
      if (job.process.stdin && job.process.stdin.writable) {
        try { job.process.stdin.write('q\n'); } catch {}
      }
      try { job.process.kill('SIGINT'); } catch {}

      // Set fallback hard-kill if not finished in 15 seconds
      setTimeout(() => {
        if (this.activeJobs.has(cleanUser)) {
          storage.log('warn', 'recorder', `Process still running after SIGINT, sending SIGKILL to @${cleanUser}`);
          try {
            job.process.kill('SIGKILL');
          } catch {}
        }
      }, 15000);

      return { success: true, message: `Stopping recording for @${cleanUser} and preparing Telegram upload...` };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  /**
   * Get all active recording jobs
   */
  public getActiveJobs(): Array<Omit<ActiveJob, 'process'>> {
    const list: Array<Omit<ActiveJob, 'process'>> = [];
    for (const [_, job] of this.activeJobs.entries()) {
      let size = job.currentSizeBytes;
      if (fs.existsSync(job.filePath)) {
        try {
          size = fs.statSync(job.filePath).size;
        } catch {}
      }
      const durationSeconds = Math.round((Date.now() - job.startedAt.getTime()) / 1000);
      list.push({
        recordingId: job.recordingId,
        username: job.username,
        startedAt: job.startedAt,
        filePath: job.filePath,
        currentSizeBytes: size,
        durationSeconds,
        streamTitle: job.streamTitle,
      });
    }
    return list;
  }

  /**
   * Periodic heartbeat to update active recording sizes
   */
  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      for (const [_, job] of this.activeJobs.entries()) {
        try {
          if (fs.existsSync(job.filePath)) {
            const stats = fs.statSync(job.filePath);
            job.currentSizeBytes = stats.size;
            job.durationSeconds = Math.round((Date.now() - job.startedAt.getTime()) / 1000);
            storage.updateRecording(job.recordingId, {
              fileSizeBytes: stats.size,
              durationSeconds: job.durationSeconds,
            });
          }
        } catch {}
      }
    }, 5000);
  }

  /**
   * Remux raw recorded stream into standard MP4 with faststart (video stream on 0, audio on 1)
   */
  public async remuxToPristineMp4(rawFilePath: string): Promise<string> {
    if (!fs.existsSync(rawFilePath)) return rawFilePath;

    const dir = path.dirname(rawFilePath);
    const ext = path.extname(rawFilePath);
    const base = path.basename(rawFilePath, ext);
    const cleanPath = path.join(dir, `${base}_pristine.mp4`);

    storage.log('info', 'recorder', `Remuxing stream into standard MP4 (+faststart): ${path.basename(rawFilePath)}...`);

    // First attempt: Fast lossless stream copy with faststart and stream mapping
    const copySuccess = await new Promise<boolean>((resolve) => {
      const proc = spawn('ffmpeg', [
        '-y',
        '-i', rawFilePath,
        '-map', '0:v:0?',
        '-map', '0:a:0?',
        '-c', 'copy',
        '-movflags', '+faststart',
        cleanPath,
      ]);
      proc.on('close', (code) => {
        resolve(code === 0 && fs.existsSync(cleanPath) && fs.statSync(cleanPath).size > 1000);
      });
      proc.on('error', () => resolve(false));
    });

    if (copySuccess) {
      try {
        fs.unlinkSync(rawFilePath);
        fs.renameSync(cleanPath, rawFilePath);
        storage.log('success', 'recorder', `Lossless MP4 remux successful for ${path.basename(rawFilePath)}!`);
        return rawFilePath;
      } catch {
        return cleanPath;
      }
    }

    // Fallback attempt: If lossless copy fails, re-encode with libx264/aac
    storage.log('warn', 'recorder', `Lossless copy failed, re-encoding to standard H.264/AAC MP4...`);
    const encodeSuccess = await new Promise<boolean>((resolve) => {
      const proc = spawn('ffmpeg', [
        '-y',
        '-i', rawFilePath,
        '-map', '0:v:0?',
        '-map', '0:a:0?',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        cleanPath,
      ]);
      proc.on('close', (code) => {
        resolve(code === 0 && fs.existsSync(cleanPath) && fs.statSync(cleanPath).size > 1000);
      });
      proc.on('error', () => resolve(false));
    });

    if (encodeSuccess) {
      try {
        fs.unlinkSync(rawFilePath);
        fs.renameSync(cleanPath, rawFilePath);
        storage.log('success', 'recorder', `H.264 MP4 encode successful for ${path.basename(rawFilePath)}!`);
        return rawFilePath;
      } catch {
        return cleanPath;
      }
    }

    return rawFilePath;
  }

  /**
   * Monitor check cycle for all tracked users
   */
  public async runCheckCycle() {
    if (this.isCheckingCycle) return;
    this.isCheckingCycle = true;

    try {
      const users = storage.getMonitoredUsers();
      const autoUsers = users.filter(u => u.autoRecord && !this.activeJobs.has(u.username.toLowerCase()));
      const maxConcurrent = storage.getRecorderConfig().maxConcurrentRecordings || 3;

      for (const user of autoUsers) {
        // Enforce maximum concurrent host recordings
        if (this.activeJobs.size >= maxConcurrent) {
          storage.log('info', 'recorder', `Batas maksimal host direcord (${this.activeJobs.size}/${maxConcurrent}) tercapai. Menunggu slot kosong.`);
          break;
        }

        try {
          const isLive = await this.checkUser(user.username);
          if (isLive && !this.activeJobs.has(user.username.toLowerCase())) {
            if (this.activeJobs.size >= maxConcurrent) {
              storage.log('warn', 'recorder', `Tidak dapat merekam @${user.username}: Batas maksimal host (${maxConcurrent}) tercapai.`);
              break;
            }
            storage.log('info', 'recorder', `Auto-record triggered for live streamer @${user.username}!`);
            await this.startRecording(user.username);
          }
        } catch (err: any) {
          storage.log('error', 'checker', `Check error for @${user.username}: ${err.message}`);
        }
        // Small delay between checks to avoid rate-limiting
        await new Promise(r => setTimeout(r, 2000));
      }
    } finally {
      this.isCheckingCycle = false;
    }
  }

  /**
   * Start periodic auto-monitoring daemon
   */
  public startMonitoring() {
    if (this.checkIntervalTimer) return;

    const intervalSec = storage.getRecorderConfig().checkIntervalSeconds || 45;
    storage.log('info', 'system', `Starting auto-monitor daemon (Interval: ${intervalSec}s)`);

    // Run first cycle shortly
    setTimeout(() => this.runCheckCycle(), 3000);

    this.checkIntervalTimer = setInterval(() => {
      this.runCheckCycle();
    }, intervalSec * 1000);
  }

  public stopMonitoring() {
    if (this.checkIntervalTimer) {
      clearInterval(this.checkIntervalTimer);
      this.checkIntervalTimer = null;
      storage.log('info', 'system', 'Auto-monitor daemon stopped.');
    }
  }
}

export const recorder = new RecorderService();
