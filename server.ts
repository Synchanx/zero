import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { storage } from './server/storage.js';
import { telegram } from './server/telegram.js';
import { recorder } from './server/recorder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect circular references
telegram.setRecorderReference(recorder);

const app = express();
const PORT: number = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- API ROUTES ---

// System & Bot Status
app.get('/api/status', (req, res) => {
  const telegramConfig = storage.getTelegramConfig();
  const freeDisk = recorder.getFreeDiskGb();
  const activeJobs = recorder.getActiveJobs();
  const users = storage.getMonitoredUsers();
  const liveUsers = users.filter(u => u.isLive);

  res.json({
    ok: true,
    data: {
      uptimeSeconds: Math.round(process.uptime()),
      freeDiskGb: Number(freeDisk.toFixed(2)),
      activeRecordingsCount: activeJobs.length,
      activeJobs,
      totalMonitoredUsers: users.length,
      liveUsersCount: liveUsers.length,
      telegram: {
        configured: Boolean(telegramConfig.botToken && telegramConfig.chatId),
        enabled: telegramConfig.enabled,
        hasBotToken: Boolean(telegramConfig.botToken),
        chatId: telegramConfig.chatId,
        pollingEnabled: telegramConfig.pollingEnabled,
        autoSplit: telegramConfig.autoSplit,
        maxUploadSizeMb: telegramConfig.maxUploadSizeMb,
      },
      recorder: storage.getRecorderConfig(),
      binaries: {
        ytdlp: true,
        ffmpeg: true,
      },
    },
  });
});

// Settings
app.get('/api/config', (req, res) => {
  const tg = { ...storage.getTelegramConfig() };
  // Mask token slightly for security if viewed
  const maskedTg = {
    ...tg,
    botTokenMasked: tg.botToken ? `${tg.botToken.substring(0, 6)}...${tg.botToken.substring(tg.botToken.length - 4)}` : '',
  };
  res.json({
    ok: true,
    data: {
      telegram: maskedTg,
      recorder: storage.getRecorderConfig(),
    },
  });
});

app.post('/api/config/telegram', (req, res) => {
  const updates = req.body;
  // If user passed masked token back or didn't change it, preserve existing
  if (updates.botToken && updates.botToken.includes('...')) {
    delete updates.botToken;
  }
  const updated = storage.updateTelegramConfig(updates);
  storage.log('info', 'telegram', 'Telegram settings updated via Web UI.');

  if (updated.pollingEnabled && updated.botToken) {
    telegram.startPolling();
  } else {
    telegram.stopPolling();
  }

  res.json({ ok: true, data: updated });
});

app.post('/api/config/recorder', (req, res) => {
  const updates = req.body;
  const updated = storage.updateRecorderConfig(updates);
  storage.log('info', 'system', 'Recorder settings updated.');
  res.json({ ok: true, data: updated });
});

// Test Michele0303 Resolution Engine
app.post('/api/recorder/test-michele', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ ok: false, message: 'Username is required' });
  }

  const clean = username.trim().replace(/^@/, '').replace(/https?:\/\/(www\.)?tiktok\.com\/@/i, '').split('/')[0];
  const startTime = Date.now();

  try {
    const result = await recorder.resolveLiveStatus(clean);
    const durationMs = Date.now() - startTime;

    res.json({
      ok: true,
      data: {
        ...result,
        durationMs,
        engine: 'Michele0303 / TikRec Core SDK',
      },
    });
  } catch (err: any) {
    res.json({
      ok: false,
      message: err.message || 'Error executing Michele0303 resolution engine',
    });
  }
});

// Test Telegram Connection
app.post('/api/telegram/test', async (req, res) => {
  const { botToken, chatId } = req.body;
  const result = await telegram.testConnection(botToken, chatId);
  res.json(result);
});

// Toggle Telegram Polling
app.post('/api/telegram/polling/toggle', (req, res) => {
  const { enabled } = req.body;
  storage.updateTelegramConfig({ pollingEnabled: !!enabled });
  if (enabled) {
    telegram.startPolling();
  } else {
    telegram.stopPolling();
  }
  res.json({ ok: true, pollingEnabled: !!enabled });
});

// Monitored Users
app.get('/api/users', (req, res) => {
  res.json({ ok: true, data: storage.getMonitoredUsers() });
});

app.post('/api/users', async (req, res) => {
  const { username, autoRecord } = req.body;
  if (!username) {
    return res.status(400).json({ ok: false, message: 'Username is required' });
  }

  const clean = username.trim().replace(/^@/, '').replace(/https?:\/\/(www\.)?tiktok\.com\/@/i, '').split('/')[0];
  const user = storage.addMonitoredUser(clean, autoRecord !== false);
  storage.log('info', 'checker', `Added @${clean} to monitored list.`);

  // Trigger non-blocking live check immediately
  recorder.checkUser(clean).catch(() => {});

  res.json({ ok: true, data: user });
});

app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const user = storage.updateMonitoredUser(id, updates);
  if (!user) {
    return res.status(404).json({ ok: false, message: 'User not found' });
  }
  res.json({ ok: true, data: user });
});

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const removed = storage.removeMonitoredUser(id);
  storage.log('info', 'checker', `Removed user ${id} from monitored list.`);
  res.json({ ok: true, removed });
});

// Manual live check
app.post('/api/users/:username/check', async (req, res) => {
  const { username } = req.params;
  const isLive = await recorder.checkUser(username);
  res.json({ ok: true, username, isLive });
});

// Recording controls
app.post('/api/record/start', async (req, res) => {
  let { username } = req.body;
  if (!username) {
    return res.status(400).json({ ok: false, message: 'Username is required' });
  }
  const clean = username.trim().replace(/^@/, '').replace(/https?:\/\/(www\.)?tiktok\.com\/@/i, '').split('/')[0];
  const exists = storage.getMonitoredUsers().some(u => u.username.toLowerCase() === clean);
  if (!exists) {
    storage.addMonitoredUser(clean, true);
  }
  const result = await recorder.startRecording(clean, true);
  res.json(result);
});

app.post('/api/record/stop', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ ok: false, message: 'Username is required' });
  }
  const result = await recorder.stopRecording(username);
  res.json(result);
});

// Recordings history & actions
app.get('/api/recordings', (req, res) => {
  res.json({ ok: true, data: storage.getRecordings() });
});

app.delete('/api/recordings/:id', (req, res) => {
  const { id } = req.params;
  const deleted = storage.deleteRecording(id);
  storage.log('info', 'recorder', `Deleted recording item ${id}.`);
  res.json({ ok: true, deleted });
});

app.post('/api/recordings/:id/upload', async (req, res) => {
  const { id } = req.params;
  // Run asynchronously
  telegram.uploadRecording(id).catch(err => {
    storage.log('error', 'telegram', `Manual upload trigger failed: ${err.message}`);
  });
  res.json({ ok: true, message: 'Telegram upload triggered' });
});

// Download recording MP4
app.get('/api/recordings/download/:id', (req, res) => {
  const { id } = req.params;
  const rec = storage.getRecordings().find(r => r.id === id);
  if (!rec || !fs.existsSync(rec.filePath)) {
    return res.status(404).send('Recording file not found');
  }

  res.download(rec.filePath, rec.fileName);
});

// Download VPS Setup Script
app.get('/api/download/setup-vps.sh', (req, res) => {
  const filePath = path.resolve(__dirname, 'setup-vps.sh');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'text/x-shellscript');
    res.download(filePath, 'setup-vps.sh');
  } else {
    res.status(404).send('Installer script not found');
  }
});

// Download VPS Deployment Guide
app.get('/api/download/deployment-guide', (req, res) => {
  const filePath = path.resolve(__dirname, 'VPS_DEPLOYMENT_GUIDE.md');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.download(filePath, 'PANDUAN_VPS_PEMULA.md');
  } else {
    res.status(404).send('Guide not found');
  }
});

// Stream recording for HTML5 video player
app.get('/api/recordings/stream/:id', (req, res) => {
  const { id } = req.params;
  const rec = storage.getRecordings().find(r => r.id === id);
  if (!rec || !fs.existsSync(rec.filePath)) {
    return res.status(404).send('Recording file not found');
  }

  const stat = fs.statSync(rec.filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(rec.filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(rec.filePath).pipe(res);
  }
});

// Logs
app.get('/api/logs', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  res.json({ ok: true, data: storage.getLogs(limit) });
});

app.delete('/api/logs', (req, res) => {
  storage.clearLogs();
  res.json({ ok: true });
});

// Start services
async function startServer() {
  // Start background monitoring daemon
  recorder.startMonitoring();

  // Start Telegram bot polling if enabled and token present
  const tgConfig = storage.getTelegramConfig();
  if (tgConfig.botToken && tgConfig.pollingEnabled) {
    telegram.startPolling();
  }

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    storage.log('success', 'system', `Server running on http://0.0.0.0:${PORT}`);
    console.log(`🚀 TikTok Live Telegram Bot server ready at http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
