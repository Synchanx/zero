import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { storage } from './storage.js';
import { RecordingItem, RecordingPart } from './types.js';

export class TelegramService {
  private isPolling = false;
  private pollAbortController: AbortController | null = null;
  private lastUpdateId = 0;
  private recorderRef: any = null; // reference to RecorderService

  public setRecorderReference(recorder: any) {
    this.recorderRef = recorder;
  }

  private getBaseUrl(): string {
    const config = storage.getTelegramConfig();
    return (config.apiBaseUrl || 'https://api.telegram.org').replace(/\/$/, '');
  }

  private getBotUrl(token?: string): string {
    const activeToken = token || storage.getTelegramConfig().botToken;
    if (!activeToken) throw new Error('Telegram Bot Token not configured');
    return `${this.getBaseUrl()}/bot${activeToken}`;
  }

  /**
   * Test Bot Token and optional Chat ID
   */
  public async testConnection(customToken?: string, customChatId?: string): Promise<{ success: boolean; botInfo?: any; chatSuccess?: boolean; message?: string }> {
    const token = customToken || storage.getTelegramConfig().botToken;
    if (!token) {
      return { success: false, message: 'Bot Token is required.' };
    }

    try {
      const resp = await fetch(`${this.getBaseUrl()}/bot${token}/getMe`);
      const data = await resp.json() as any;
      if (!data.ok) {
        return { success: false, message: `Telegram API error: ${data.description || 'Invalid token'}` };
      }

      let chatSuccess = false;
      const targetChat = customChatId || storage.getTelegramConfig().chatId;

      if (targetChat) {
        try {
          const sendTest = (cid: string) => fetch(`${this.getBaseUrl()}/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: cid,
              text: `🟢 <b>TikTok Live Recorder Bot Connected!</b>\n\n` +
                    `✅ Bot: @${data.result.username} (${data.result.first_name})\n` +
                    `⏱ Time: ${new Date().toLocaleString()}\n` +
                    `🤖 Status: Ready to monitor and auto-record streams.`,
              parse_mode: 'HTML',
            }),
          });

          let testMsg = await sendTest(targetChat);
          let chatData = await testMsg.json() as any;

          // Auto-migrate if group was upgraded to supergroup
          if (!chatData.ok && chatData.parameters?.migrate_to_chat_id) {
            const newChatId = String(chatData.parameters.migrate_to_chat_id);
            storage.updateTelegramConfig({ chatId: newChatId });
            storage.log('success', 'telegram', `Group upgraded to supergroup! Auto-migrated Chat ID from ${targetChat} to ${newChatId}`);
            testMsg = await sendTest(newChatId);
            chatData = await testMsg.json() as any;
          }

          chatSuccess = !!chatData.ok;
          if (!chatSuccess) {
            storage.log('warn', 'telegram', `Bot token valid, but failed sending to Chat ID ${targetChat}: ${chatData.description}`);
          }
        } catch (chatErr: any) {
          storage.log('warn', 'telegram', `Error testing Chat ID: ${chatErr.message}`);
        }
      }

      storage.log('success', 'telegram', `Telegram bot verified: @${data.result.username}`);
      return {
        success: true,
        botInfo: data.result,
        chatSuccess,
        message: chatSuccess
          ? `Connected to @${data.result.username} and test message delivered to chat!`
          : `Connected to @${data.result.username}. (Chat ID test pending or check permissions)`,
      };
    } catch (err: any) {
      storage.log('error', 'telegram', `Failed testing connection: ${err.message}`);
      return { success: false, message: `Network error: ${err.message}` };
    }
  }

  /**
   * Send a text message to configured channel/chat
   */
  public async sendMessage(text: string, options?: { parseMode?: 'HTML' | 'Markdown'; disableWebPagePreview?: boolean }): Promise<any> {
    const config = storage.getTelegramConfig();
    if (!config.botToken || !config.chatId || !config.enabled) {
      return null;
    }

    try {
      const payload: any = {
        chat_id: config.chatId,
        text,
        parse_mode: options?.parseMode || 'HTML',
        disable_web_page_preview: options?.disableWebPagePreview ?? false,
      };

      if (config.topicId) {
        payload.message_thread_id = parseInt(config.topicId, 10);
      }

      let res = await fetch(`${this.getBotUrl()}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data = await res.json() as any;

      if (!data.ok && data.parameters?.migrate_to_chat_id) {
        const newChatId = String(data.parameters.migrate_to_chat_id);
        storage.updateTelegramConfig({ chatId: newChatId });
        storage.log('success', 'telegram', `Group upgraded to supergroup! Auto-migrated Chat ID from ${payload.chat_id} to ${newChatId}`);
        payload.chat_id = newChatId;
        res = await fetch(`${this.getBotUrl()}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        data = await res.json() as any;
      }

      if (!data.ok) {
        storage.log('error', 'telegram', `Failed to send Telegram message: ${data.description}`);
      }
      return data;
    } catch (err: any) {
      storage.log('error', 'telegram', `Error sending Telegram message: ${err.message}`);
      return null;
    }
  }

  /**
   * Send Live Alert when streamer goes live
   */
  public async sendLiveAlert(username: string, title?: string, liveUrl?: string): Promise<void> {
    const config = storage.getTelegramConfig();
    if (!config.sendLiveAlerts || !config.enabled || !config.chatId) return;

    const streamLink = liveUrl || `https://www.tiktok.com/@${username}/live`;
    const message = `🔴 <b>LIVE DETECTED: @${username}</b>\n\n` +
      `<b>Streamer:</b> <a href="${streamLink}">@${username}</a>\n` +
      (title ? `<b>Title:</b> ${escapeHtml(title)}\n` : '') +
      `<b>Status:</b> ⏺ Auto-recording stream now...\n` +
      `<b>Time:</b> ${new Date().toLocaleTimeString()}\n\n` +
      `<i>The recorded video will be automatically uploaded here when the live stream ends.</i>`;

    await this.sendMessage(message);
    storage.log('info', 'telegram', `Sent LIVE alert for @${username}`);
  }

  /**
   * Generate video thumbnail using ffmpeg (compact size < 35KB to avoid bloating multipart body)
   */
  private async generateThumbnail(videoPath: string, outputPath: string): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn('ffmpeg', [
        '-y',
        '-ss', '00:00:02',
        '-i', videoPath,
        '-vframes', '1',
        '-vf', 'scale=320:-2',
        '-q:v', '5',
        outputPath,
      ]);
      proc.on('close', (code) => {
        resolve(code === 0 && fs.existsSync(outputPath));
      });
      proc.on('error', () => resolve(false));
    });
  }

  /**
   * Split a large video into smaller segments (guaranteed strictly <= 43MB for Telegram Cloud Bot API)
   */
  public async splitVideo(
    filePath: string,
    targetChunkSizeMb: number = 38,
    fallbackDurationSeconds: number = 0,
  ): Promise<string[]> {
    if (!fs.existsSync(filePath)) {
      return [filePath];
    }

    const stats = fs.statSync(filePath);
    const totalSizeMb = stats.size / (1024 * 1024);
    // Target chunk size should never exceed 43MB to guarantee safe buffer under Telegram's 50MB HTTP limit
    const safeTargetMb = Math.min(targetChunkSizeMb || 38, 43);

    if (totalSizeMb <= safeTargetMb) {
      return [filePath];
    }

    // Get duration via ffprobe or fallbacks
    let duration = await this.getVideoDuration(filePath);
    if (duration <= 0 && fallbackDurationSeconds > 0) {
      duration = fallbackDurationSeconds;
    }
    if (duration <= 0) {
      // Estimate duration assuming 2 Mbps typical TikTok live stream bitrate
      duration = Math.max(30, Math.round((stats.size * 8) / (2 * 1024 * 1024)));
    }

    const numChunks = Math.max(2, Math.ceil(totalSizeMb / safeTargetMb));
    const chunkDuration = Math.max(5, Math.ceil(duration / numChunks));
    const outputParts: string[] = [];
    const dir = path.dirname(filePath);
    const baseName = path.basename(filePath, path.extname(filePath));

    storage.log('info', 'recorder', `Splitting ${totalSizeMb.toFixed(1)}MB file into ${numChunks} parts (~${chunkDuration}s each, target <${safeTargetMb}MB)...`);

    for (let i = 0; i < numChunks; i++) {
      const startTime = i * chunkDuration;
      const partPath = path.join(dir, `${baseName}_part${i + 1}.mp4`);

      await new Promise<void>((resolve, reject) => {
        const proc = spawn('ffmpeg', [
          '-y',
          '-ss', `${startTime}`,
          '-i', filePath,
          '-t', `${chunkDuration}`,
          '-map', '0:v:0?',
          '-map', '0:a:0?',
          '-c', 'copy',
          '-movflags', '+faststart',
          partPath,
        ]);
        proc.on('close', (code) => {
          if (code === 0 && fs.existsSync(partPath) && fs.statSync(partPath).size > 1000) {
            outputParts.push(partPath);
            resolve();
          } else {
            // Fallback: transcode this chunk if copy failed
            const transProc = spawn('ffmpeg', [
              '-y',
              '-ss', `${startTime}`,
              '-i', filePath,
              '-t', `${chunkDuration}`,
              '-c:v', 'libx264',
              '-preset', 'ultrafast',
              '-crf', '26',
              '-c:a', 'aac',
              '-b:a', '96k',
              '-movflags', '+faststart',
              partPath,
            ]);
            transProc.on('close', (tCode) => {
              if (tCode === 0 && fs.existsSync(partPath) && fs.statSync(partPath).size > 1000) {
                outputParts.push(partPath);
                resolve();
              } else {
                reject(new Error(`FFmpeg split failed on chunk ${i + 1}`));
              }
            });
            transProc.on('error', reject);
          }
        });
        proc.on('error', reject);
      });
    }

    // Verify each generated part strictly does not exceed 43MB (Telegram Cloud Bot API limit)
    const verifiedParts: string[] = [];
    for (const part of outputParts) {
      if (!fs.existsSync(part)) continue;
      const partSizeMb = fs.statSync(part).size / (1024 * 1024);
      if (partSizeMb > 43) {
        storage.log('warn', 'recorder', `Part ${path.basename(part)} is ${partSizeMb.toFixed(1)}MB (>43MB). Splitting into sub-parts...`);
        const subParts = await this.splitVideo(part, 22, chunkDuration);
        verifiedParts.push(...subParts);
        try { fs.unlinkSync(part); } catch {}
      } else {
        verifiedParts.push(part);
      }
    }

    // If for any unexpected reason verifiedParts is empty, return original
    return verifiedParts.length > 0 ? verifiedParts : [filePath];
  }

  /**
   * Get video dimensions and duration using ffprobe
   */
  public async getVideoInfo(filePath: string): Promise<{ duration: number; width: number; height: number }> {
    return new Promise((resolve) => {
      const proc = spawn('ffprobe', [
        '-v', 'error',
        '-show_entries', 'stream=width,height,duration:format=duration',
        '-of', 'json',
        filePath,
      ]);
      let output = '';
      proc.stdout.on('data', (d) => output += d.toString());
      proc.on('close', () => {
        try {
          const data = JSON.parse(output);
          let duration = parseFloat(data.format?.duration || '0');
          let width = 0;
          let height = 0;
          if (data.streams) {
            for (const s of data.streams) {
              if (s.width && s.height) {
                width = s.width;
                height = s.height;
                if (!duration && s.duration) {
                  duration = parseFloat(s.duration);
                }
                break;
              }
            }
          }
          resolve({
            duration: isNaN(duration) ? 0 : Math.round(duration),
            width: width || 720,
            height: height || 1280,
          });
        } catch {
          resolve({ duration: 0, width: 720, height: 1280 });
        }
      });
      proc.on('error', () => resolve({ duration: 0, width: 720, height: 1280 }));
    });
  }

  /**
   * Get video duration in seconds using ffprobe
   */
  public async getVideoDuration(filePath: string): Promise<number> {
    const info = await this.getVideoInfo(filePath);
    return info.duration;
  }

  /**
   * Upload video file directly to Telegram channel/chat
   */
  public async uploadRecording(recordingId: string): Promise<boolean> {
    const config = storage.getTelegramConfig();
    const recording = storage.getRecordings().find(r => r.id === recordingId);
    if (!recording) {
      storage.log('error', 'telegram', `Recording ${recordingId} not found`);
      return false;
    }

    if (!config.botToken || !config.chatId || !config.enabled) {
      storage.log('warn', 'telegram', 'Telegram not fully configured or disabled. Video saved locally.');
      storage.updateRecording(recordingId, { status: 'completed' });
      return false;
    }

    if (!fs.existsSync(recording.filePath)) {
      storage.log('error', 'telegram', `File does not exist: ${recording.filePath}`);
      storage.updateRecording(recordingId, { status: 'failed', error: 'File missing from disk' });
      return false;
    }

    try {
      storage.updateRecording(recordingId, { status: 'uploading', uploadProgress: 10 });
      
      const fileStats = fs.statSync(recording.filePath);
      const actualFileBytes = fileStats.size;
      const actualFileMb = actualFileBytes / (1024 * 1024);

      if (recording.fileSizeBytes !== actualFileBytes) {
        storage.updateRecording(recordingId, { fileSizeBytes: actualFileBytes });
        recording.fileSizeBytes = actualFileBytes;
      }

      storage.log('info', 'telegram', `Starting Telegram upload for @${recording.username} (${actualFileMb.toFixed(1)} MB)...`);

      const isStandardCloudApi = !config.apiBaseUrl || config.apiBaseUrl.includes('api.telegram.org');
      // Standard Telegram Cloud Bot API strictly enforces 50MB max per HTTP request.
      // 43MB is the safe ceiling allowing margin for multipart boundaries, metadata, and thumbnail.
      const maxAllowedPartMb = isStandardCloudApi
        ? 43
        : (config.maxUploadSizeMb || 2000);

      const targetSplitChunkMb = isStandardCloudApi ? 36 : Math.max(10, maxAllowedPartMb - 10);

      // Handle file splitting if file exceeds safe limit
      let filesToUpload = [recording.filePath];
      let isSplit = false;

      if (actualFileMb > maxAllowedPartMb) {
        storage.updateRecording(recordingId, { status: 'splitting' });
        storage.log('info', 'telegram', `File size (${actualFileMb.toFixed(1)}MB) exceeds Telegram safe limit (${maxAllowedPartMb}MB). Splitting into streamable parts (~${targetSplitChunkMb}MB)...`);
        filesToUpload = await this.splitVideo(recording.filePath, targetSplitChunkMb, recording.durationSeconds);
        isSplit = filesToUpload.length > 1;
      }

      const totalParts = filesToUpload.length;
      const partsData: RecordingPart[] = [];

      // Helper function to upload an individual video file with automatic retry and 413 emergency split
      const uploadSingleFile = async (
        currentPath: string,
        partNum: number,
        totalPartCount: number,
      ): Promise<RecordingPart[]> => {
        const partStats = fs.statSync(currentPath);
        const partSizeMb = (partStats.size / (1024 * 1024)).toFixed(1);

        // Generate compact thumbnail
        const thumbPath = path.join(path.dirname(currentPath), `thumb_${partNum}_${path.basename(currentPath, '.mp4')}.jpg`);
        await this.generateThumbnail(currentPath, thumbPath);

        const videoInfo = await this.getVideoInfo(currentPath);
        const effectiveDuration = videoInfo.duration || recording.durationSeconds;
        const durationFormatted = formatDuration(effectiveDuration);

        // Build caption
        const partLabel = (totalPartCount > 1 || isSplit) ? ` [Part ${partNum}/${totalPartCount}]` : '';
        const caption =
          `📹 <b>TikTok Live Recording${partLabel}</b>\n\n` +
          `👤 <b>Streamer:</b> @${recording.username}\n` +
          (recording.streamTitle ? `📝 <b>Title:</b> ${escapeHtml(recording.streamTitle)}\n` : '') +
          `⏱ <b>Duration:</b> ${durationFormatted}\n` +
          `📦 <b>Size:</b> ${partSizeMb} MB\n` +
          `📅 <b>Recorded:</b> ${new Date(recording.startedAt).toLocaleString()}\n\n` +
          `🔗 <a href="https://www.tiktok.com/@${recording.username}">TikTok Profile</a>`;

        storage.log('info', 'telegram', `Uploading part ${partNum}/${totalPartCount} (${partSizeMb} MB) as streamable MP4 to Telegram...`);

        const fileBuffer = fs.readFileSync(currentPath);
        const rawFileName = path.basename(currentPath);
        const mp4FileName = rawFileName.endsWith('.mp4') ? rawFileName : `${rawFileName}.mp4`;

        // Helper to post media and auto-retry if chat was upgraded to supergroup
        const postMediaWithRetry = async (
          useDocument: boolean,
          cid: string,
        ): Promise<{ ok: boolean; data: any; usedChatId: string }> => {
          const form = new FormData();
          form.append('chat_id', cid);
          if (config.topicId) {
            form.append('message_thread_id', config.topicId);
          }
          form.append('caption', caption);
          form.append('parse_mode', 'HTML');

          if (!useDocument) {
            form.append('supports_streaming', 'true');
            form.append('duration', effectiveDuration.toString());
            if (videoInfo.width > 0) {
              form.append('width', videoInfo.width.toString());
            }
            if (videoInfo.height > 0) {
              form.append('height', videoInfo.height.toString());
            }
            form.append('video', new Blob([fileBuffer], { type: 'video/mp4' }), mp4FileName);
            if (fs.existsSync(thumbPath)) {
              const thumbBuffer = fs.readFileSync(thumbPath);
              form.append('thumb', new Blob([thumbBuffer], { type: 'image/jpeg' }), 'thumb.jpg');
            }
          } else {
            form.append('document', new Blob([fileBuffer], { type: 'video/mp4' }), mp4FileName);
          }

          const endpoint = useDocument ? 'sendDocument' : 'sendVideo';
          let res: Response;
          try {
            res = await fetch(`${this.getBotUrl()}/${endpoint}`, {
              method: 'POST',
              body: form,
            });
          } catch (netErr: any) {
            return { ok: false, data: { description: `Network error: ${netErr.message}` }, usedChatId: cid };
          }

          let resData: any = {};
          try {
            resData = await res.json();
          } catch {
            resData = {
              ok: false,
              description: res.status === 413 ? 'Request Entity Too Large (exceeded Telegram 50MB limit)' : `HTTP ${res.status} ${res.statusText || 'Error'}`,
            };
          }

          // Check if chat upgraded to supergroup
          if (!resData.ok && resData.parameters?.migrate_to_chat_id) {
            const migratedId = String(resData.parameters.migrate_to_chat_id);
            storage.updateTelegramConfig({ chatId: migratedId });
            config.chatId = migratedId;
            storage.log('success', 'telegram', `Group upgraded to supergroup! Auto-migrated Chat ID from ${cid} to ${migratedId}. Retrying upload...`);
            return postMediaWithRetry(useDocument, migratedId);
          }

          return { ok: !!resData.ok, data: resData, usedChatId: cid };
        };

        let uploadResult = await postMediaWithRetry(false, config.chatId);

        // Cleanup thumb
        if (fs.existsSync(thumbPath)) {
          try { fs.unlinkSync(thumbPath); } catch {}
        }

        // Automatic emergency recovery: If Telegram rejected file with 413 Request Entity Too Large
        const isEntityTooLarge =
          uploadResult.data.description?.includes('Too Large') ||
          uploadResult.data.description?.includes('413') ||
          uploadResult.data.error_code === 413;

        if (!uploadResult.ok && isEntityTooLarge) {
          storage.log('warn', 'telegram', `Telegram rejected ${path.basename(currentPath)} (${partSizeMb} MB): Request Entity Too Large. Auto-splitting into ~20MB sub-parts and retrying...`);
          const emergencyParts = await this.splitVideo(currentPath, 20, effectiveDuration);
          if (emergencyParts.length > 1) {
            const subResults: RecordingPart[] = [];
            for (let subIdx = 0; subIdx < emergencyParts.length; subIdx++) {
              const subFile = emergencyParts[subIdx];
              const uploadedSub = await uploadSingleFile(subFile, subIdx + 1, emergencyParts.length);
              subResults.push(...uploadedSub);
              if (subFile !== currentPath && fs.existsSync(subFile)) {
                try { fs.unlinkSync(subFile); } catch {}
              }
            }
            return subResults;
          }
        }

        if (!uploadResult.ok) {
          // If sendVideo fails (e.g. format issues), fallback to sendDocument
          storage.log('warn', 'telegram', `sendVideo returned: ${uploadResult.data.description}. Retrying as sendDocument...`);
          uploadResult = await postMediaWithRetry(true, config.chatId);

          // If document upload also failed with Request Entity Too Large
          const docEntityTooLarge =
            uploadResult.data.description?.includes('Too Large') ||
            uploadResult.data.description?.includes('413') ||
            uploadResult.data.error_code === 413;

          if (!uploadResult.ok && docEntityTooLarge) {
            storage.log('warn', 'telegram', `Document upload also too large (${partSizeMb} MB). Auto-splitting into ~20MB parts...`);
            const emergencyParts = await this.splitVideo(currentPath, 20, effectiveDuration);
            if (emergencyParts.length > 1) {
              const subResults: RecordingPart[] = [];
              for (let subIdx = 0; subIdx < emergencyParts.length; subIdx++) {
                const subFile = emergencyParts[subIdx];
                const uploadedSub = await uploadSingleFile(subFile, subIdx + 1, emergencyParts.length);
                subResults.push(...uploadedSub);
                if (subFile !== currentPath && fs.existsSync(subFile)) {
                  try { fs.unlinkSync(subFile); } catch {}
                }
              }
              return subResults;
            }
          }
        }

        if (uploadResult.ok) {
          const msgId = uploadResult.data.result?.message_id;
          storage.log('success', 'telegram', `Uploaded part ${partNum}/${totalPartCount} successfully! Message ID: ${msgId}`);
          return [{
            partIndex: partNum,
            totalParts: totalPartCount,
            filePath: currentPath,
            fileName: mp4FileName,
            fileSizeBytes: partStats.size,
            telegramMessageId: msgId,
            uploaded: true,
          }];
        } else {
          throw new Error(`Telegram upload failed: ${uploadResult.data.description || 'Unknown error'}`);
        }
      };

      for (let i = 0; i < totalParts; i++) {
        const currentPath = filesToUpload[i];
        const uploadedItems = await uploadSingleFile(currentPath, i + 1, totalParts);
        partsData.push(...uploadedItems);

        const overallProgress = Math.round(((i + 1) / totalParts) * 100);
        storage.updateRecording(recordingId, { uploadProgress: overallProgress });
      }

      // Mark uploaded
      storage.updateRecording(recordingId, {
        status: 'uploaded',
        uploadProgress: 100,
        parts: partsData,
        telegramMessageId: partsData[0]?.telegramMessageId,
        telegramChatId: config.chatId,
        error: undefined,
      });

      storage.log('success', 'telegram', `All ${totalParts} part(s) uploaded to Telegram for @${recording.username}!`);

      // Clean up temporary split files if generated
      for (const p of partsData) {
        if (p.filePath !== recording.filePath && fs.existsSync(p.filePath)) {
          try { fs.unlinkSync(p.filePath); } catch {}
        }
      }

      // Auto delete main recording file if configured
      if (config.autoDeleteAfterUpload) {
        storage.log('info', 'recorder', `Auto-delete enabled. Cleaning up local recording: ${recording.filePath}`);
        if (fs.existsSync(recording.filePath)) {
          try { fs.unlinkSync(recording.filePath); } catch {}
        }
      }

      // After upload action: check if monitoring should stop for this host
      const recCfg = storage.getRecorderConfig();
      if (recCfg.stopMonitoringAfterUpload) {
        storage.updateMonitoredUser(recording.username, { autoRecord: false });
        storage.log('info', 'recorder', `Auto-record disabled for @${recording.username} after upload as configured.`);
      }

      return true;
    } catch (err: any) {
      storage.log('error', 'telegram', `Upload error for @${recording.username}: ${err.message}`);
      storage.updateRecording(recordingId, {
        status: 'failed',
        error: `Upload failed: ${err.message}`,
      });
      return false;
    }
  }

  /**
   * Start Telegram Bot Long-Polling for commands (/start, /status, /add, /record, etc.)
   */
  public startPolling() {
    const config = storage.getTelegramConfig();
    if (this.isPolling || !config.botToken || !config.pollingEnabled) {
      return;
    }

    this.isPolling = true;
    this.pollAbortController = new AbortController();
    storage.log('info', 'telegram', 'Telegram bot polling loop started.');

    this.pollLoop();
  }

  public stopPolling() {
    this.isPolling = false;
    if (this.pollAbortController) {
      this.pollAbortController.abort();
      this.pollAbortController = null;
    }
    storage.log('info', 'telegram', 'Telegram bot polling stopped.');
  }

  private async pollLoop() {
    while (this.isPolling) {
      const config = storage.getTelegramConfig();
      if (!config.botToken || !config.pollingEnabled) {
        this.isPolling = false;
        break;
      }

      try {
        const url = `${this.getBotUrl()}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=20`;
        const res = await fetch(url, { signal: this.pollAbortController?.signal });
        const data = await res.json() as any;

        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);
            await this.handleUpdate(update);
          }
        } else if (data.error_code === 409) {
          // Conflict (e.g. another instance is polling or webhook set)
          storage.log('warn', 'telegram', 'Polling conflict (another instance may be active). Retrying in 10s...');
          await new Promise(r => setTimeout(r, 10000));
        }
      } catch (err: any) {
        if (err.name === 'AbortError') break;
        // Wait a few seconds before retry
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }

  /**
   * Handle incoming messages & commands from Telegram
   */
  private async handleUpdate(update: any) {
    const msg = update.message || update.channel_post;
    if (!msg) return;

    // Detect chat migration update (when a group upgrades to supergroup)
    if (msg.migrate_to_chat_id) {
      const newChatId = String(msg.migrate_to_chat_id);
      storage.updateTelegramConfig({ chatId: newChatId });
      storage.log('success', 'telegram', `Group upgraded to supergroup! Auto-migrated Chat ID to ${newChatId}`);
      return;
    }

    if (!msg.text) return;

    const text = msg.text.trim();
    const chatId = msg.chat.id.toString();
    const fromUser = msg.from ? `@${msg.from.username || msg.from.first_name}` : 'User';

    // Auto-populate chat ID if not set
    const currentConfig = storage.getTelegramConfig();
    if (!currentConfig.chatId) {
      storage.updateTelegramConfig({ chatId });
      storage.log('success', 'telegram', `Auto-configured Chat ID to ${chatId} from message by ${fromUser}`);
    }

    if (!text.startsWith('/')) return;

    const parts = text.split(/\s+/);
    const commandWithBot = parts[0].toLowerCase();
    const command = commandWithBot.split('@')[0]; // strip bot username e.g. /start@MyBot
    const args = parts.slice(1);

    storage.log('info', 'telegram', `Received Telegram command: ${text} from ${fromUser} (Chat: ${chatId})`);

    const reply = async (replyText: string) => {
      try {
        await fetch(`${this.getBotUrl()}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: replyText,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          }),
        });
      } catch (e: any) {
        storage.log('error', 'telegram', `Failed to reply to command: ${e.message}`);
      }
    };

    switch (command) {
      case '/start':
      case '/help': {
        const recCfg = storage.getRecorderConfig();
        const welcome =
          `🤖 <b>TikTok Live Recorder & Auto-Uploader Bot</b>\n\n` +
          `Bot ini memantau live streaming TikTok secara otomatis, merekam video berkualitas MP4, dan langsung mengunggahnya ke Telegram!\n\n` +
          `<b>Daftar Perintah Streamer:</b>\n` +
          `• <code>/status</code> - Cek status bot, rekaman aktif & pengaturan\n` +
          `• <code>/list</code> - Daftar akun TikTok yang dipantau\n` +
          `• <code>/add &lt;username&gt;</code> - Tambah streamer baru ke daftar auto-record\n` +
          `• <code>/remove &lt;username&gt;</code> - Hapus streamer dari daftar\n` +
          `• <code>/check &lt;username&gt;</code> - Cek apakah streamer sedang LIVE saat ini\n` +
          `• <code>/record &lt;username&gt;</code> - Mulai rekam sekarang\n` +
          `• <code>/stop &lt;username&gt;</code> - Hentikan rekaman dan langsung upload MP4\n` +
          `• <code>/recordings</code> - Riwayat rekaman terbaru\n` +
          `• <code>/setchat</code> - Atur chat ini sebagai tujuan upload video\n\n` +
          `<b>Pengaturan Rekaman & Batas Host:</b>\n` +
          `• <code>/limit &lt;1-20&gt;</code> - Atur batas maksimal host yang direkam bersamaan (saat ini: <b>${recCfg.maxConcurrentRecordings} host</b>)\n` +
          `• <code>/autodelete &lt;on|off&gt;</code> - Hapus video lokal dari disk setelah sukses upload\n` +
          `• <code>/afterupload &lt;continue|stop&gt;</code> - Lanjut pantau host atau stop auto-record setelah upload\n\n` +
          `<i>💡 Kamu juga bisa mengatur semuanya melalui Web Control Panel!</i>`;
        await reply(welcome);
        break;
      }

      case '/setchat': {
        storage.updateTelegramConfig({ chatId });
        await reply(`✅ <b>Sukses!</b> Chat ini (<code>${chatId}</code>) sekarang disimpan sebagai tujuan upload rekaman.`);
        break;
      }

      case '/status': {
        const users = storage.getMonitoredUsers();
        const activeJobs = this.recorderRef ? this.recorderRef.getActiveJobs() : [];
        const liveCount = users.filter(u => u.isLive).length;
        const recCfg = storage.getRecorderConfig();
        const msgText =
          `📊 <b>STATUS BOT & PEREKAMAN</b>\n\n` +
          `👥 <b>Dipantau:</b> ${users.length} akun\n` +
          `🔴 <b>Sedang Live:</b> ${liveCount} akun\n` +
          `⏺ <b>Sedang Merekam:</b> ${activeJobs.length}/${recCfg.maxConcurrentRecordings} host\n` +
          (activeJobs.length > 0
            ? activeJobs.map((j: any) => `  • @${j.username} (${formatDuration(j.durationSeconds)}, ${(j.currentSizeBytes / (1024 * 1024)).toFixed(1)} MB)`).join('\n') + '\n'
            : '') +
          `\n⚙️ <b>PENGATURAN HOST & REKAMAN:</b>\n` +
          `• 👥 <b>Batas Maksimal Host:</b> ${recCfg.maxConcurrentRecordings} host (Ubah: <code>/limit &lt;angka&gt;</code>)\n` +
          `• 🗑 <b>Hapus Lokal Usai Upload:</b> ${currentConfig.autoDeleteAfterUpload ? 'ON (Hemat Disk)' : 'OFF (Simpan di Server)'} (Ubah: <code>/autodelete on|off</code>)\n` +
          `• 🔄 <b>Tindakan Host Pasca Upload:</b> ${recCfg.stopMonitoringAfterUpload ? 'STOP Pemantauan' : 'CONTINUE (Lanjut Pantau)'} (Ubah: <code>/afterupload continue|stop</code>)\n` +
          `• ⏱ <b>Interval Pengecekan:</b> ${recCfg.checkIntervalSeconds} detik\n` +
          `• 📦 <b>Maks Ukuran Upload:</b> ${currentConfig.maxUploadSizeMb} MB (Auto-Split: ${currentConfig.autoSplit ? 'ON' : 'OFF'})\n` +
          `• 🎬 <b>Format Output:</b> Standard MP4 H.264 (+FastStart Playable)`;
        await reply(msgText);
        break;
      }

      case '/limit':
      case '/maxhosts': {
        const num = parseInt(args[0], 10);
        if (isNaN(num) || num < 1 || num > 30) {
          const currentLimit = storage.getRecorderConfig().maxConcurrentRecordings;
          await reply(
            `👥 <b>Batas Maksimal Host yang Direcord Bersamaan:</b> ${currentLimit} host\n\n` +
            `Untuk mengubah batas, ketik: <code>/limit &lt;1-30&gt;</code>\nContoh: <code>/limit 5</code>`
          );
          return;
        }
        storage.updateRecorderConfig({ maxConcurrentRecordings: num });
        await reply(
          `✅ <b>Batas Maksimal Host Berhasil Diubah!</b>\n\n` +
          `• Sekarang sistem dapat merekam maksimal <b>${num} host secara bersamaan</b>.\n` +
          `• Jika ada lebih dari ${num} host yang live di waktu bersamaan, perekaman baru akan menunggu antrean agar server tetap stabil.`
        );
        break;
      }

      case '/autodelete': {
        const arg = (args[0] || '').toLowerCase();
        if (arg !== 'on' && arg !== 'off') {
          const current = storage.getTelegramConfig().autoDeleteAfterUpload;
          await reply(
            `🗑 <b>Hapus File Lokal Setelah Upload:</b> ${current ? 'ON (Aktif - Hemat Ruang Disk)' : 'OFF (Nonaktif - File Tersimpan di Server)'}\n\n` +
            `Untuk mengubah, ketik:\n` +
            `• <code>/autodelete on</code> (Hapus file lokal setelah terkirim ke Telegram)\n` +
            `• <code>/autodelete off</code> (Simpan file lokal di server)`
          );
          return;
        }
        const val = arg === 'on';
        storage.updateTelegramConfig({ autoDeleteAfterUpload: val });
        await reply(
          val
            ? `✅ <b>Hapus Lokal Diaktifkan (ON):</b> File video MP4 akan otomatis dibersihkan dari server setelah sukses diunggah ke Telegram. Penyimpanan disk lebih hemat!`
            : `✅ <b>Hapus Lokal Dinonaktifkan (OFF):</b> File video MP4 akan tetap disimpan di server dan bisa didownload kapan saja.`
        );
        break;
      }

      case '/afterupload': {
        const arg = (args[0] || '').toLowerCase();
        if (arg !== 'continue' && arg !== 'stop') {
          const current = storage.getRecorderConfig().stopMonitoringAfterUpload;
          await reply(
            `🔄 <b>Tindakan Host Setelah Upload:</b> ${current ? 'STOP (Auto-record berhenti setelah 1x live)' : 'CONTINUE (Host terus dipantau untuk live berikutnya)'}\n\n` +
            `Untuk mengubah, ketik:\n` +
            `• <code>/afterupload continue</code> (Host terus dipantau 24/7)\n` +
            `• <code>/afterupload stop</code> (Matikan auto-record setelah video berhasil diunggah)`
          );
          return;
        }
        const stop = arg === 'stop';
        storage.updateRecorderConfig({ stopMonitoringAfterUpload: stop });
        await reply(
          stop
            ? `✅ <b>Setelah Upload: STOP</b>. Auto-record untuk host tersebut akan otomatis dimatikan setelah videonya sukses diunggah ke Telegram.`
            : `✅ <b>Setelah Upload: CONTINUE</b>. Bot akan terus memantau host tersebut 24/7 untuk siaran live berikutnya!`
        );
        break;
      }

      case '/list': {
        const users = storage.getMonitoredUsers();
        if (users.length === 0) {
          await reply(`Belum ada akun TikTok yang dipantau.\nGunakan <code>/add &lt;username&gt;</code> untuk menambahkan.`);
          return;
        }

        const lines = users.map((u, i) => {
          const badge = u.isLive ? '🔴 <b>LIVE!</b>' : '⚪ Offline';
          const auto = u.autoRecord ? '⚡ Auto' : '⏸ Manual';
          return `${i + 1}. <b>@${u.username}</b> - ${badge} [${auto}]`;
        });

        await reply(`📋 <b>DAFTAR AKUN TIKTOK (${users.length}):</b>\n\n${lines.join('\n')}\n\nGunakan <code>/add &lt;username&gt;</code> atau <code>/remove &lt;username&gt;</code>`);
        break;
      }

      case '/add': {
        if (!args[0]) {
          await reply('Format salah. Contoh: <code>/add khaby.lame</code>');
          return;
        }
        const username = args[0].replace(/^@/, '').toLowerCase();
        const user = storage.addMonitoredUser(username, true);
        await reply(`🔍 Berhasil menambahkan <b>@${user.username}</b> ke pemantauan Auto-Record! Memeriksa status live sekarang...`);

        // Check if currently live
        if (this.recorderRef) {
          const isLive = await this.recorderRef.checkUser(user.username);
          if (isLive) {
            await reply(`🔴 <b>@${user.username} SEDANG LIVE SEKARANG!</b>\n⏺ Memulai perekaman otomatis... Video akan langsung dikirim ke Telegram.`);
            await this.recorderRef.startRecording(user.username);
          } else {
            await reply(
              `⚪ <b>@${user.username}</b> saat ini sedang Offline.\n\n` +
              `🤖 <b>Status:</b> Auto-Record AKTIF. Bot akan terus memantau 24/7 dan otomatis merekam saat siaran langsung dimulai!`
            );
          }
        }
        break;
      }

      case '/remove': {
        if (!args[0]) {
          await reply('Format salah. Contoh: <code>/remove khaby.lame</code>');
          return;
        }
        const username = args[0].replace(/^@/, '').toLowerCase();
        const removed = storage.removeMonitoredUser(username);
        if (removed) {
          await reply(`🗑 <b>@${username}</b> telah dihapus dari daftar pantauan.`);
        } else {
          await reply(`Akun <b>@${username}</b> tidak ditemukan dalam daftar.`);
        }
        break;
      }

      case '/check': {
        if (!args[0]) {
          await reply('Format salah. Contoh: <code>/check username</code>');
          return;
        }
        const target = args[0].replace(/^@/, '').toLowerCase();
        await reply(`🔍 Memeriksa status LIVE <b>@${target}</b> via TikTok stream engine...`);

        if (this.recorderRef) {
          const isLive = await this.recorderRef.checkUser(target);
          if (isLive) {
            const user = storage.getMonitoredUsers().find(u => u.username.toLowerCase() === target);
            await reply(
              `🔴 <b>@${target} SEDANG LIVE!</b>\n` +
              `📌 Judul: <i>${user?.liveTitle || 'TikTok Live'}</i>\n` +
              `🔗 Link: https://www.tiktok.com/@${target}/live\n\n` +
              `Kirim <code>/record @${target}</code> untuk merekam sekarang!`
            );
          } else {
            await reply(`⚪ <b>@${target}</b> saat ini sedang Offline.\n\nGunakan <code>/add @${target}</code> agar bot merekam otomatis saat live dimulai.`);
          }
        } else {
          await reply('Recorder engine belum siap.');
        }
        break;
      }

      case '/record': {
        if (!args[0]) {
          await reply('Format salah. Contoh: <code>/record username</code>');
          return;
        }
        const target = args[0].replace(/^@/, '').toLowerCase();

        // Auto add to monitored list with autoRecord enabled
        const existingUsers = storage.getMonitoredUsers();
        if (!existingUsers.some(u => u.username.toLowerCase() === target)) {
          storage.addMonitoredUser(target, true);
        }

        await reply(`🔍 Memeriksa siaran langsung untuk <b>@${target}</b>...`);

        if (this.recorderRef) {
          const res = await this.recorderRef.startRecording(target, true);
          if (res.success) {
            await reply(
              `⏺ <b>Rekaman LIVE dimulai untuk @${target}!</b>\n\n` +
              `📌 Judul: <i>${res.title || 'TikTok Live'}</i>\n` +
              `📦 Video akan otomatis diunggah ke Telegram setelah live selesai atau setelah perintah <code>/stop @${target}</code>.`
            );
          } else if (res.isOffline) {
            await reply(
              `⚪ <b>@${target} saat ini sedang OFFLINE (tidak ada siaran langsung).</b>\n\n` +
              `✅ Akun telah otomatis didaftarkan ke <b>Auto-Record</b>!\n` +
              `🤖 Bot akan terus memantau @${target}. Begitu @${target} mulai LIVE, bot akan <b>langsung otomatis merekam</b> dan mengunggah videonya ke chat ini.`
            );
          } else {
            await reply(`❌ Gagal memulai rekaman: ${res.message || 'Stream offline atau error.'}`);
          }
        }
        break;
      }

      case '/stop': {
        if (!args[0]) {
          await reply('Format salah. Contoh: <code>/stop username</code>');
          return;
        }
        const target = args[0].replace(/^@/, '').toLowerCase();
        if (this.recorderRef) {
          const res = await this.recorderRef.stopRecording(target);
          if (res.success) {
            await reply(`⏹ Rekaman <b>@${target}</b> dihentikan! Memproses video dan mengunggah ke Telegram...`);
          } else {
            await reply(`❌ ${res.message || 'Tidak ada sesi rekaman aktif untuk akun ini.'}`);
          }
        }
        break;
      }

      case '/recordings': {
        const list = storage.getRecordings().slice(0, 5);
        if (list.length === 0) {
          await reply('Belum ada riwayat rekaman tersimpan.');
          return;
        }
        const textList = list.map((r, i) => {
          const statusIcon = r.status === 'uploaded' ? '✅ Terupload' : r.status === 'uploading' ? '⬆ Uploading' : '💾 Tersimpan';
          const sizeMb = (r.fileSizeBytes / (1024 * 1024)).toFixed(1);
          return `${i + 1}. <b>@${r.username}</b> - ${sizeMb} MB (${formatDuration(r.durationSeconds)})\n   Status: ${statusIcon} | ${new Date(r.startedAt).toLocaleDateString()}`;
        }).join('\n\n');

        await reply(`📁 <b>5 Rekaman Terakhir:</b>\n\n${textList}`);
        break;
      }

      default:
        break;
    }
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}j ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

export const telegram = new TelegramService();
