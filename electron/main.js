import { app, BrowserWindow, Tray, Menu, ipcMain, powerMonitor, nativeImage, dialog, screen, protocol, net, session, safeStorage } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import { startAuth, isAuthenticated, disconnectSpotify, getSpotifyUsername } from './spotify-auth.js';
import * as spotifyApi from './spotify-api.js';
import RssParser from 'rss-parser';
import yahooFinance from 'yahoo-finance2';
import * as providers from './services/providers.js';
import { getAllPackDirs, getPackDir, isPackId, listPacks } from './packs.js';
import electronUpdater from 'electron-updater';

const { autoUpdater } = electronUpdater;
const isDev = !app.isPackaged;

const rssParser = new RssParser();

/* ── Secure media protocol ────────────────────────────────────────────────
 * Slideshow photos used to be loaded as file:// URLs, which forced
 * `webSecurity: false` on every window — disabling the same-origin policy for
 * the whole app. Instead we serve them over a custom scheme that only ever
 * resolves paths inside the user's configured slideshow folder.
 */
const MEDIA_SCHEME = 'auraboard-media';

protocol.registerSchemesAsPrivileged([
  {
    scheme: MEDIA_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);

/**
 * Encode an absolute path into a media URL for the renderer.
 *
 * The real extension is appended after the token so the renderer can tell a
 * video from an image and pick <video> vs <img>. base64url's alphabet is
 * [A-Za-z0-9_-], so a trailing ".mp4" is never ambiguous with the token itself.
 */
function toMediaUrl(absolutePath) {
  const token = Buffer.from(absolutePath, 'utf8').toString('base64url');
  return `${MEDIA_SCHEME}://f/${token}${path.extname(absolutePath).toLowerCase()}`;
}

/** True when `target` sits inside `root` (prevents ../ escapes). */
function isInside(root, target) {
  if (!root) return false;
  const rel = path.relative(path.resolve(root), path.resolve(target));
  return Boolean(rel) && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/**
 * Roots the media protocol will serve from: the user's own slideshow folder
 * plus the built-in pack directories. Packs must be listed explicitly — the
 * handler is an allowlist, so without this every pack image would 403.
 */
function getAllowedMediaRoots() {
  const roots = getAllPackDirs({
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
  });
  const userFolder = store ? store.get('slideshowFolder', '') : '';
  if (userFolder) roots.push(userFolder);
  return roots;
}

/**
 * Serve a video with byte-range support. Chromium issues a Range request for
 * <video> and will refuse to play (or refuse to seek) if the response is always
 * a plain 200, so this has to be handled explicitly rather than deferring to
 * net.fetch the way images do.
 */
async function serveVideo(filePath, ext, request) {
  const { size } = await fs.stat(filePath);
  const type = VIDEO_MIME[ext] ?? 'video/mp4';
  const range = request.headers.get('Range');

  if (!range) {
    return new Response(Readable.toWeb(createReadStream(filePath)), {
      status: 200,
      headers: {
        'Content-Type': type,
        'Content-Length': String(size),
        'Accept-Ranges': 'bytes',
      },
    });
  }

  const match = /bytes=(\d*)-(\d*)/.exec(range);
  const start = match?.[1] ? Number.parseInt(match[1], 10) : 0;
  const requestedEnd = match?.[2] ? Number.parseInt(match[2], 10) : size - 1;

  if (!Number.isFinite(start) || start >= size || start < 0) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${size}` },
    });
  }

  const end = Math.min(Number.isFinite(requestedEnd) ? requestedEnd : size - 1, size - 1);
  return new Response(Readable.toWeb(createReadStream(filePath, { start, end })), {
    status: 206,
    headers: {
      'Content-Type': type,
      'Content-Length': String(end - start + 1),
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
    },
  });
}

function registerMediaProtocol() {
  protocol.handle(MEDIA_SCHEME, async (request) => {
    try {
      // toMediaUrl appends the real extension after the token; strip it back off
      // before decoding (base64url never contains a dot).
      const raw = new URL(request.url).pathname.replace(/^\/+/, '');
      const token = raw.replace(/\.[a-z0-9]+$/i, '');
      const filePath = Buffer.from(decodeURIComponent(token), 'base64url').toString('utf8');

      // Only ever serve files from inside an allowed root.
      if (!getAllowedMediaRoots().some((root) => isInside(root, filePath))) {
        return new Response('Forbidden', { status: 403 });
      }
      const ext = path.extname(filePath).toLowerCase();
      if (!MEDIA_EXTENSIONS.has(ext)) {
        return new Response('Unsupported media type', { status: 415 });
      }
      if (VIDEO_EXTENSIONS.has(ext)) {
        return await serveVideo(filePath, ext, request);
      }
      return await net.fetch(pathToFileURL(filePath).href);
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
}

/* ── Content Security Policy ──────────────────────────────────────────────
 * connect-src lists only the data sources the widgets actually use. Anything
 * that moves into the main-process data layer can be dropped from here.
 */
const CSP = [
  "default-src 'self'",
  isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${MEDIA_SCHEME}: https:`,
  // Slideshow videos are served over the media scheme; without an explicit
  // media-src they fall back to default-src 'self' and every <video> is blocked.
  `media-src 'self' blob: ${MEDIA_SCHEME}:`,
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    isDev ? "ws://localhost:5173 ws://127.0.0.1:5173 ws://localhost:5174 ws://127.0.0.1:5174 http://localhost:5173 http://localhost:5174" : "",
    'https://api.open-meteo.com',
    'https://geocoding-api.open-meteo.com',
    'https://air-quality-api.open-meteo.com',
    'https://api.coingecko.com',
    'https://gnews.io',
    'https://www.alphavantage.co',
    'https://www.thesportsdb.com',
    'https://ipapi.co',
    'https://api.spotify.com',
  ].join(' ').trim().replace(/\s+/g, ' '),
  "object-src 'none'",
  "frame-src 'none'",
].join('; ');

/**
 * Only AuraBoard's own documents get our CSP. This hook runs on the whole
 * defaultSession, so without this check it also stamped `default-src 'self'` /
 * `script-src 'self'` onto THIRD-PARTY pages — which rendered the Spotify
 * OAuth window (accounts.spotify.com, scripts + styles on its own CDNs)
 * completely blank. Our CSP describes our renderer, not the whole web.
 */
function isOwnContent(url) {
  if (!url) return false;
  if (url.startsWith('file://')) return true;
  if (url.startsWith(`${MEDIA_SCHEME}://`)) return true;
  if (isDev && /^http:\/\/(localhost|127\.0\.0\.1):517\d/.test(url)) return true;
  return false;
}

function applyCsp() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (!isOwnContent(details.url)) {
      callback({}); // leave third-party responses untouched
      return;
    }
    callback({
      responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [CSP] },
    });
  });
}

/* ── Secret storage ───────────────────────────────────────────────────────
 * API keys were kept in plaintext in config.json. safeStorage encrypts them
 * with an OS-managed key (DPAPI on Windows). Values are stored under a
 * "<key>Enc" entry; plaintext leftovers are migrated on first read.
 */
const SECRET_KEYS = ['gnewsApiKey', 'alphaVantageApiKey'];

function readSecret(key) {
  if (!store) return '';
  const enc = store.get(`${key}Enc`, '');
  if (enc) {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        return safeStorage.decryptString(Buffer.from(enc, 'base64'));
      }
    } catch { /* fall through to plaintext */ }
  }
  return store.get(key, '');
}

function writeSecret(key, value) {
  if (!store) return;
  const str = String(value ?? '');
  if (str && safeStorage.isEncryptionAvailable()) {
    store.set(`${key}Enc`, safeStorage.encryptString(str).toString('base64'));
    store.set(key, ''); // never leave the plaintext behind
  } else {
    // Encryption unavailable — store as-is rather than silently losing the key.
    store.set(key, str);
    store.set(`${key}Enc`, '');
  }
}

/** Move any plaintext secrets into encrypted storage once, at startup. */
function migrateSecrets() {
  if (!store || !safeStorage.isEncryptionAvailable()) return;
  for (const key of SECRET_KEYS) {
    const plain = store.get(key, '');
    if (plain) writeSecret(key, plain);
  }
}

/* ── Auto-update ──────────────────────────────────────────────────────────
 * An ambient display is rarely watched, so updates download quietly and are
 * installed on quit rather than interrupting whatever is on screen.
 */
let updateStatus = { state: 'idle', version: null, error: null };

function setupAutoUpdate() {
  if (isDev) {
    updateStatus = { state: 'disabled', version: null, error: 'Development build' };
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => { updateStatus = { state: 'checking', version: null, error: null }; });
  autoUpdater.on('update-available', (info) => { updateStatus = { state: 'downloading', version: info?.version ?? null, error: null }; });
  autoUpdater.on('update-not-available', () => { updateStatus = { state: 'current', version: app.getVersion(), error: null }; });
  autoUpdater.on('download-progress', (p) => {
    updateStatus = { state: 'downloading', version: updateStatus.version, error: null, percent: Math.round(p?.percent ?? 0) };
  });
  autoUpdater.on('update-downloaded', (info) => {
    updateStatus = { state: 'ready', version: info?.version ?? null, error: null };
  });
  autoUpdater.on('error', (err) => {
    // Never surface an update failure as a crash — the board keeps running.
    updateStatus = { state: 'error', version: null, error: err?.message || 'Update failed' };
  });

  const check = () => autoUpdater.checkForUpdates().catch(() => { /* handled by 'error' */ });
  setTimeout(check, 30_000);            // shortly after launch
  setInterval(check, 6 * 60 * 60_000);  // and every six hours
}

// __dirname and __filename are automatically provided by electron-vite

let store = null;
let screensaverWindows = [];
let settingsWindow = null;
let layoutEditorWindow = null; // Phase 5.1 layout editor window
let tray = null;
let idleCheckInterval = null;
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp']);
/** Formats Chromium plays natively in Electron. .mov is h264 often enough to include. */
const VIDEO_MIME = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/mp4',
};
const VIDEO_EXTENSIONS = new Set(Object.keys(VIDEO_MIME));
const MEDIA_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]);

// ── Initialize electron-store (ESM module, must use dynamic import) ───
async function initStore() {
  try {
    const { default: Store } = await import('electron-store');
    store = new Store({
      defaults: {
        idleTimeout: 5, // minutes
        slideshowFolder: '',
        // Active background source: '' = the user's own slideshowFolder, or a
        // built-in pack id ('cinematic' | 'anime' | 'superheroes').
        slideshowPack: '',
        slideshowInterval: 60,
        slideshowTransition: 'fade',
        slideshowShuffle: false,
        spotifyPollInterval: 3,
        uiTheme: 'aurora',
        uiFont: 'outfit',
        screensaverUseAllDisplays: true,
        screensaverDisplayIds: [],
        // Phase 5 — widget system
        widgetLayout: null,
        enabledWidgets: ['clock', 'date', 'greeting', 'weather', 'spotify'],
        // Per-widget config: variant selection + instance settings, keyed by
        // widget id. Replaces the old hardcoded widget props (incl. 'Dex').
        widgetConfig: {},
        userName: '',
        // Manual weather location. Empty = auto-detect via IP geolocation,
        // which can fail or be rate-limited — hence the manual override.
        weatherLocation: '',
        // Slideshow photo treatment: mono | duotone | none
        photoTreatment: 'mono',
        // Shift the palette through dawn/day/dusk/night
        timeOfDayPalette: false,
        // Periodic full-screen "poster moment" (minutes; 0 = off)
        posterMomentInterval: 0,
        onboardingComplete: false,
        gnewsApiKey: '',
        alphaVantageApiKey: '',
        stockSymbols: 'AAPL,MSFT,GOOGL,AMZN,TSLA',
        cryptoCoinIds: 'bitcoin,ethereum,solana,binancecoin,cardano',
        sportsLeagues: '4387,4328',
        autostart: false,
      },
    });
  } catch (err) {
    console.error('Failed to initialize electron-store:', err);
    // Fallback in-memory store
    const mem = {
      idleTimeout: 5,
      slideshowFolder: '',
      slideshowInterval: 60,
      slideshowTransition: 'fade',
      slideshowShuffle: false,
      spotifyPollInterval: 3,
      uiTheme: 'aurora',
      uiFont: 'outfit',
      screensaverUseAllDisplays: true,
      screensaverDisplayIds: [],
      autostart: false,
      weatherLocation: '',
    };
    store = {
      get: (key, def) => (key in mem ? mem[key] : def),
      set: (key, val) => { mem[key] = val; },
    };
  }
}

/**
 * The folder the slideshow should read from right now: a built-in pack when one
 * is selected, otherwise the user's own folder. A pack id that no longer exists
 * falls back to the user folder rather than showing nothing.
 */
function getActiveSlideshowDir() {
  const packId = store ? store.get('slideshowPack', '') : '';
  if (isPackId(packId)) {
    return getPackDir(packId, {
      isPackaged: app.isPackaged,
      resourcesPath: process.resourcesPath,
    });
  }
  return store ? store.get('slideshowFolder', '') : '';
}

async function scanMediaDirectory(folderPath) {
  if (!folderPath) {
    return [];
  }

  const images = [];

  async function walk(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (MEDIA_EXTENSIONS.has(extension)) {
        images.push(toMediaUrl(fullPath));
      }
    }
  }

  try {
    await walk(folderPath);
  } catch (error) {
    console.error(`Failed to scan image directory "${folderPath}":`, error);
    return [];
  }

  return images;
}

// ── Resolve paths for HTML files ──────────────────────────────────────
function getScreensaverURL() {
  if (isDev) {
    return 'http://localhost:5173/index.html';
  }
  return `file://${path.join(__dirname, '..', 'renderer', 'index.html')}`;
}

function getSettingsURL() {
  if (isDev) {
    return 'http://localhost:5173/settings.html';
  }
  return `file://${path.join(__dirname, '..', 'renderer', 'settings.html')}`;
}

// ── Screensaver Window ────────────────────────────────────────────────
function getAvailableDisplays() {
  const displays = screen.getAllDisplays();
  const primaryId = screen.getPrimaryDisplay()?.id;

  return displays.map((display, index) => ({
    id: Number(display.id),
    label: `Display ${index + 1}${display.id === primaryId ? ' (Primary)' : ''}`,
    primary: display.id === primaryId,
    scaleFactor: display.scaleFactor,
    bounds: {
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
    },
  }));
}

function getConfiguredScreensaverDisplays() {
  const allDisplays = screen.getAllDisplays();
  if (!allDisplays.length) return [];

  const useAllDisplays = store ? store.get('screensaverUseAllDisplays', true) : true;
  if (useAllDisplays) return allDisplays;

  const rawIds = store ? store.get('screensaverDisplayIds', []) : [];
  const selectedIds = new Set((Array.isArray(rawIds) ? rawIds : []).map((id) => Number(id)));
  const selected = allDisplays.filter((display) => selectedIds.has(Number(display.id)));

  return selected.length > 0 ? selected : [screen.getPrimaryDisplay()];
}

function cleanupScreensaverWindows() {
  screensaverWindows = screensaverWindows.filter((win) => win && !win.isDestroyed());
}

function hideScreensaverWindows() {
  cleanupScreensaverWindows();
  for (const win of screensaverWindows) {
    win.hide();
  }
}

function closeScreensaverWindows() {
  cleanupScreensaverWindows();
  for (const win of screensaverWindows) {
    win.removeAllListeners('closed');
    win.close();
  }
  screensaverWindows = [];
}

function createScreensaverWindow() {
  const targetDisplays = getConfiguredScreensaverDisplays();
  if (!targetDisplays.length) return;

  closeScreensaverWindows();

  const primaryDisplayId = screen.getPrimaryDisplay()?.id;

  for (const display of targetDisplays) {
    const win = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      fullscreen: true,
      frame: false,
      alwaysOnTop: true,
      transparent: false,
      backgroundColor: '#000000',
      show: false,
      skipTaskbar: true,
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload', 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        webSecurity: true, // media now served via the auraboard-media:// scheme
      },
    });

    win.__displayId = Number(display.id);
    win.loadURL(getScreensaverURL());

    let blurListenerEnabled = false;
    win.once('ready-to-show', () => {
      if (win.isDestroyed()) return;
      win.show();
      if (win.__displayId === Number(primaryDisplayId)) {
        win.focus();
      }
      win.webContents.send('screensaver-activate');

      setTimeout(() => {
        blurListenerEnabled = true;
      }, 500);
    });

    win.on('blur', () => {
      if (!blurListenerEnabled) return;
      const focusedWindow = BrowserWindow.getFocusedWindow();
      const focusedIsScreensaver = focusedWindow && screensaverWindows.includes(focusedWindow);
      if (!focusedIsScreensaver) {
        dismissScreensaver();
      }
    });

    win.on('closed', () => {
      cleanupScreensaverWindows();
    });

    screensaverWindows.push(win);
  }
}

function dismissScreensaver() {
  hideScreensaverWindows();
}

// ── Settings Window ───────────────────────────────────────────────────
function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 920,
    height: 860,
    resizable: true,
    frame: false,
    icon: path.join(__dirname, '..', '..', 'assets', 'icon.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0A0A0A',
      symbolColor: '#ffffff',
      height: 48,
    },
    alwaysOnTop: false,
    title: 'AuraBoard Settings',
    backgroundColor: '#0A0A0A',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  settingsWindow.setMenuBarVisibility(false);
  settingsWindow.loadURL(getSettingsURL());

  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
    settingsWindow.focus();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// ── Phase 5.1: Layout Editor Window ──────────────────────────────────────

function createLayoutEditorWindow() {
  if (layoutEditorWindow && !layoutEditorWindow.isDestroyed()) {
    layoutEditorWindow.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  layoutEditorWindow = new BrowserWindow({
    width,
    height,
    title: 'AuraBoard Layout Editor',
    icon: path.join(__dirname, '..', '..', 'assets', 'icon.png'),
    titleBarStyle: 'hidden',
    backgroundColor: '#0A0A0A',
    show: false,
    frame: false,
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  if (isDev) {
    layoutEditorWindow.loadURL('http://localhost:5173/layout.html');
  } else {
    layoutEditorWindow.loadURL(`file://${path.join(__dirname, '..', 'renderer', 'layout.html')}`);
  }

  layoutEditorWindow.once('ready-to-show', () => {
    layoutEditorWindow.show();
  });

  layoutEditorWindow.on('closed', () => {
    layoutEditorWindow = null;
    // Tell Settings window to reload or refresh if open, so changes are reflected
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.webContents.send('layout-editor-closed');
    }
  });
}

function notifyDisplaysChanged() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send('displays-changed', getAvailableDisplays());
  }
}

// ── System Tray ───────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, '..', '..', 'assets', 'icon.png');
  let trayIcon;

  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      trayIcon = createFallbackIcon();
    }
  } catch {
    trayIcon = createFallbackIcon();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('AuraBoard');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Settings',
      click: () => createSettingsWindow(),
    },
    {
      label: 'Preview Screensaver',
      click: () => createScreensaverWindow(),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => createSettingsWindow());
}

function createFallbackIcon() {
  // Create a simple 16x16 colored icon as fallback
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const offset = i * 4;
    canvas[offset] = 100;     // R
    canvas[offset + 1] = 100; // G
    canvas[offset + 2] = 255; // B
    canvas[offset + 3] = 255; // A
  }
  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

// ── Idle Detection ────────────────────────────────────────────────────
function startIdleDetection() {
  // Poll every 15 seconds to check idle state
  idleCheckInterval = setInterval(() => {
    if (!store) return;
    const idleTimeoutMinutes = store.get('idleTimeout', 5);
    const idleThresholdSeconds = idleTimeoutMinutes * 60;
    const idleTime = powerMonitor.getSystemIdleTime(); // returns seconds

    if (idleTime >= idleThresholdSeconds) {
      // Only show if not already visible
      const hasVisibleScreensaver = screensaverWindows.some((win) => !win.isDestroyed() && win.isVisible());
      if (!hasVisibleScreensaver) {
        createScreensaverWindow();
      }
    }
  }, 15000);
}

function stopIdleDetection() {
  if (idleCheckInterval) {
    clearInterval(idleCheckInterval);
    idleCheckInterval = null;
  }
}

// ── IPC Handlers ──────────────────────────────────────────────────────
function setupIPC() {
  ipcMain.handle('get-settings', async () => {
    return {
      idleTimeout: store ? store.get('idleTimeout', 5) : 5,
      slideshowFolder: store ? store.get('slideshowFolder', '') : '',
      slideshowPack: store ? store.get('slideshowPack', '') : '',
      slideshowInterval: store ? store.get('slideshowInterval', 60) : 60,
      slideshowTransition: store ? store.get('slideshowTransition', 'fade') : 'fade',
      slideshowShuffle: store ? store.get('slideshowShuffle', false) : false,
      spotifyPollInterval: store ? store.get('spotifyPollInterval', 3) : 3,
      uiTheme: store ? store.get('uiTheme', 'aurora') : 'aurora',
      uiFont: store ? store.get('uiFont', 'outfit') : 'outfit',
      userName: store ? store.get('userName', '') : '',
      weatherLocation: store ? store.get('weatherLocation', '') : '',
      photoTreatment: store ? store.get('photoTreatment', 'mono') : 'mono',
      timeOfDayPalette: store ? store.get('timeOfDayPalette', false) : false,
      posterMomentInterval: store ? store.get('posterMomentInterval', 0) : 0,
      onboardingComplete: store ? store.get('onboardingComplete', false) : false,
      screensaverUseAllDisplays: store ? store.get('screensaverUseAllDisplays', true) : true,
      screensaverDisplayIds: store ? store.get('screensaverDisplayIds', []) : [],
      useSpotifyArtBackground: store ? store.get('useSpotifyArtBackground', false) : false,
      // Phase 5
      gnewsApiKey: readSecret('gnewsApiKey'),
      alphaVantageApiKey: readSecret('alphaVantageApiKey'),
      stockSymbols: store ? store.get('stockSymbols', 'AAPL,MSFT,GOOGL,AMZN,TSLA') : 'AAPL,MSFT,GOOGL,AMZN,TSLA',
      cryptoCoinIds: store ? store.get('cryptoCoinIds', 'bitcoin,ethereum,solana,binancecoin,cardano') : 'bitcoin,ethereum,solana,binancecoin,cardano',
      sportsLeagues: store ? store.get('sportsLeagues', '4387,4328') : '4387,4328',
      autostart: store ? store.get('autostart', false) : false,
    };
  });

  ipcMain.handle('save-settings', async (_event, data) => {
    if (!store) return { success: false };
    if (data.idleTimeout !== undefined) {
      const timeout = Math.max(1, Math.min(60, Number(data.idleTimeout)));
      store.set('idleTimeout', timeout);
    }
    if (data.slideshowInterval !== undefined) {
      const interval = Math.max(10, Math.min(600, Number(data.slideshowInterval)));
      store.set('slideshowInterval', interval);
    }
    if (data.slideshowTransition !== undefined) {
      const transition = ['fade', 'zoom', 'slide'].includes(data.slideshowTransition)
        ? data.slideshowTransition
        : 'fade';
      store.set('slideshowTransition', transition);
    }
    if (data.slideshowShuffle !== undefined) {
      store.set('slideshowShuffle', Boolean(data.slideshowShuffle));
    }
    if (data.slideshowFolder !== undefined) {
      store.set('slideshowFolder', data.slideshowFolder);
    }
    if (data.spotifyPollInterval !== undefined) {
      const interval = Math.max(1, Math.min(10, Number(data.spotifyPollInterval)));
      store.set('spotifyPollInterval', interval);
    }
    if (data.uiTheme !== undefined) {
      store.set('uiTheme', String(data.uiTheme));
    }
    if (data.uiFont !== undefined) {
      store.set('uiFont', String(data.uiFont));
    }
    if (data.userName !== undefined) {
      store.set('userName', String(data.userName).slice(0, 40));
    }
    if (data.weatherLocation !== undefined) {
      store.set('weatherLocation', String(data.weatherLocation).slice(0, 80).trim());
    }
    if (data.photoTreatment !== undefined) {
      const t = ['mono', 'duotone', 'none'].includes(data.photoTreatment) ? data.photoTreatment : 'mono';
      store.set('photoTreatment', t);
    }
    if (data.timeOfDayPalette !== undefined) {
      store.set('timeOfDayPalette', Boolean(data.timeOfDayPalette));
    }
    if (data.posterMomentInterval !== undefined) {
      store.set('posterMomentInterval', Math.max(0, Math.min(120, Number(data.posterMomentInterval) || 0)));
    }
    if (data.onboardingComplete !== undefined) {
      store.set('onboardingComplete', Boolean(data.onboardingComplete));
    }
    if (data.screensaverUseAllDisplays !== undefined) {
      store.set('screensaverUseAllDisplays', Boolean(data.screensaverUseAllDisplays));
    }
    if (data.screensaverDisplayIds !== undefined) {
      const displayIds = Array.isArray(data.screensaverDisplayIds)
        ? data.screensaverDisplayIds
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id))
        : [];
      store.set('screensaverDisplayIds', displayIds);
    }
    if (data.useSpotifyArtBackground !== undefined) {
      store.set('useSpotifyArtBackground', Boolean(data.useSpotifyArtBackground));
    }
    // Phase 5 settings
    if (data.gnewsApiKey !== undefined) {
      writeSecret('gnewsApiKey', data.gnewsApiKey);
    }
    if (data.alphaVantageApiKey !== undefined) {
      writeSecret('alphaVantageApiKey', data.alphaVantageApiKey);
    }
    if (data.stockSymbols !== undefined) {
      store.set('stockSymbols', String(data.stockSymbols));
    }
    if (data.cryptoCoinIds !== undefined) {
      store.set('cryptoCoinIds', String(data.cryptoCoinIds));
    }
    if (data.sportsLeagues !== undefined) {
      store.set('sportsLeagues', String(data.sportsLeagues));
    }
    if (data.autostart !== undefined) {
      const autostart = Boolean(data.autostart);
      store.set('autostart', autostart);
      try {
        if (!app.isPackaged) {
          // Dev mode login settings might not work or register electron.exe
          console.log('Skipping login item settings write in development mode');
        } else {
          app.setLoginItemSettings({
            openAtLogin: autostart,
            path: app.getPath('exe'),
          });
        }
      } catch (err) {
        console.error('Failed to set login item settings:', err);
      }
    }
    return { success: true };
  });

  ipcMain.on('open-settings', () => {
    createSettingsWindow();
  });

  ipcMain.handle('open-settings', () => {
    createSettingsWindow();
  });

  ipcMain.handle('open-layout-editor', () => {
    createLayoutEditorWindow();
  });

  ipcMain.handle('get-displays', async () => {
    return getAvailableDisplays();
  });

  ipcMain.on('start-screensaver', () => {
    createScreensaverWindow();
  });

  ipcMain.handle('select-image-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'dontAddToRecent'],
    });

    if (result.canceled || !result.filePaths?.length) {
      return [];
    }

    const folderPath = result.filePaths[0];
    const images = await scanMediaDirectory(folderPath);

    if (store) {
      store.set('slideshowFolder', folderPath);
      // Choosing your own folder switches off any active built-in pack —
      // otherwise the pack would keep winning and the picker would look broken.
      store.set('slideshowPack', '');
    }

    return images;
  });

  ipcMain.handle('get-folder-images', async () => {
    const folderPath = getActiveSlideshowDir();
    return scanMediaDirectory(folderPath);
  });

  // ── Built-in slideshow packs ──────────────────────────────────────────
  ipcMain.handle('list-slideshow-packs', async () => {
    const ctx = { isPackaged: app.isPackaged, resourcesPath: process.resourcesPath };
    return listPacks(ctx, (dir) => scanMediaDirectory(dir));
  });

  /** Select a built-in pack, or pass '' to go back to the user's own folder. */
  ipcMain.handle('set-slideshow-pack', async (_event, packId) => {
    const next = isPackId(packId) ? packId : '';
    if (store) store.set('slideshowPack', next);
    return scanMediaDirectory(getActiveSlideshowDir());
  });

  ipcMain.on('dismiss-screensaver', () => {
    dismissScreensaver();
  });

  // ── Spotify IPC handlers ──────────────────────────────────────────────
  ipcMain.handle('spotify-auth', async () => {
    try {
      await startAuth();
      return { success: true };
    } catch (err) {
      console.error('Spotify auth error:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('spotify-get-track', async () => {
    try {
      return await spotifyApi.getPlayerState();
    } catch (err) {
      console.error('Spotify get track error:', err);
      return null;
    }
  });

  ipcMain.handle('spotify-play', async () => {
    try { return await spotifyApi.play(); }
    catch (err) { return { error: 'api_error', message: err.message }; }
  });

  ipcMain.handle('spotify-pause', async () => {
    try { return await spotifyApi.pause(); }
    catch (err) { return { error: 'api_error', message: err.message }; }
  });

  ipcMain.handle('spotify-next', async () => {
    try { return await spotifyApi.next(); }
    catch (err) { return { error: 'api_error', message: err.message }; }
  });

  ipcMain.handle('spotify-previous', async () => {
    try { return await spotifyApi.previous(); }
    catch (err) { return { error: 'api_error', message: err.message }; }
  });

  ipcMain.handle('spotify-set-volume', async (_event, percent) => {
    try { return await spotifyApi.setVolume(percent); }
    catch (err) { return { error: 'api_error', message: err.message }; }
  });

  ipcMain.handle('spotify-set-shuffle', async (_event, state) => {
    try { return await spotifyApi.setShuffle(state); }
    catch (err) { return { error: 'api_error', message: err.message }; }
  });

  ipcMain.handle('spotify-is-authed', async () => {
    try { return await isAuthenticated(); }
    catch { return false; }
  });

  ipcMain.handle('spotify-disconnect', async () => {
    try { await disconnectSpotify(); return { success: true }; }
    catch (err) { return { success: false, error: err.message }; }
  });

  ipcMain.handle('spotify-get-username', async () => {
    try { return await getSpotifyUsername(); }
    catch { return null; }
  });

  // ── Phase 5: Widget layout & data IPC handlers ─────────────────────────

  ipcMain.handle('get-widget-layout', async () => {
    return store ? store.get('widgetLayout', null) : null;
  });

  ipcMain.handle('save-widget-layout', async (_event, layout) => {
    if (store && Array.isArray(layout)) {
      store.set('widgetLayout', layout);
    }
    return { success: true };
  });

  ipcMain.handle('get-enabled-widgets', async () => {
    return store
      ? store.get('enabledWidgets', ['clock', 'date', 'greeting', 'weather', 'spotify'])
      : ['clock', 'date', 'greeting', 'weather', 'spotify'];
  });

  ipcMain.handle('save-enabled-widgets', async (_event, list) => {
    if (store && Array.isArray(list)) {
      store.set('enabledWidgets', list);
    }
    return { success: true };
  });

  ipcMain.handle('reset-widget-layout', async () => {
    if (store) {
      store.set('widgetLayout', null);
    }
    return { success: true };
  });

  /* ── Shared data layer ────────────────────────────────────────────────
     One cache + one in-flight request per key across ALL screensaver windows,
     so a multi-monitor setup doesn't multiply third-party API calls. */
  ipcMain.handle('data-fetch', async (_event, source, params = {}) => {
    try {
      switch (source) {
        case 'weather':
          return await providers.getWeather({
            place: params.place ?? (store ? store.get('weatherLocation', '') : ''),
            useFahrenheit: Boolean(params.useFahrenheit),
          });
        case 'crypto':
          return await providers.getCrypto({
            coinIds: params.coinIds || (store ? store.get('cryptoCoinIds', 'bitcoin,ethereum') : 'bitcoin,ethereum'),
          });
        case 'sports':
          return await providers.getSports({
            leagueIds: params.leagueIds || (store ? store.get('sportsLeagues', '4387,4328') : '4387,4328'),
            leagueNames: params.leagueNames || {},
          });
        case 'calendar':
          // Single source of truth: widgetConfig.calendar.icsUrl, written by
          // both the Layout Editor and Settings and passed down as a prop. The
          // old `calendarUrl` store fallback here was dead — nothing ever wrote
          // that key, and `??` never fired because the widget passes ''.
          return await providers.getCalendar({ icsUrl: params.icsUrl ?? '' });
        case 'system':
          return { data: providers.getSystemStats(), error: null, fetchedAt: Date.now(), isStale: false };
        default:
          return { data: null, error: `Unknown source "${source}"`, fetchedAt: null, isStale: false };
      }
    } catch (err) {
      return { data: null, error: err?.message || 'Request failed', fetchedAt: null, isStale: false };
    }
  });

  ipcMain.handle('get-update-status', async () => ({ ...updateStatus, current: app.getVersion() }));

  ipcMain.handle('install-update-now', async () => {
    if (updateStatus.state !== 'ready') return { success: false, error: 'No update ready' };
    app.isQuitting = true;
    setImmediate(() => autoUpdater.quitAndInstall());
    return { success: true };
  });

  // Per-widget config (variant + instance settings), keyed by widget id.
  ipcMain.handle('get-widget-config', async () => {
    return store ? store.get('widgetConfig', {}) : {};
  });

  ipcMain.handle('save-widget-config', async (_event, config) => {
    if (store && config && typeof config === 'object') {
      store.set('widgetConfig', config);
    }
    return { success: true };
  });

  // RSS feed parser — runs in main process (Node module)
  ipcMain.handle('fetch-rss', async (_event, url) => {
    try {
      const feed = await rssParser.parseURL(url);
      return feed.items || [];
    } catch (err) {
      console.error('RSS parse error:', err);
      return [];
    }
  });

  // yahoo-finance2 stock quote — runs in main process (Node module)
  ipcMain.handle('fetch-stock-quote', async (_event, symbol) => {
    try {
      // Handle CommonJS vs ESM import mismatch based on yahoo-finance2 version
      const quoteFn = yahooFinance.quote || (yahooFinance.default && yahooFinance.default.quote);
      if (typeof quoteFn !== 'function') {
        throw new Error('yahooFinance.quote is not a function');
      }
      const quote = await quoteFn(symbol);
      return quote || null;
    } catch (err) {
      console.error('Yahoo Finance error:', err.message || err);
      return null;
    }
  });
}

// ── Command-line argument handling for .scr registration ──────────────
function handleScrArguments() {
  const args = process.argv.slice(1).map((a) => a.toLowerCase());

  for (const arg of args) {
    if (arg === '/s' || arg === '-s') {
      app.whenReady().then(() => createScreensaverWindow());
      return 'screensaver';
    }
    if (arg.startsWith('/p') || arg.startsWith('-p')) {
      app.whenReady().then(() => createScreensaverWindow());
      return 'preview';
    }
    if (arg === '/c' || arg === '-c') {
      app.whenReady().then(() => createSettingsWindow());
      return 'configure';
    }
  }
  return null;
}

// ── App Lifecycle ─────────────────────────────────────────────────────
const scrMode = handleScrArguments();

app.whenReady().then(async () => {
  // Initialize the electron-store
  await initStore();

  // Security: serve media over a scoped scheme, lock down CSP, and move any
  // plaintext API keys into OS-encrypted storage.
  registerMediaProtocol();
  applyCsp();
  migrateSecrets();
  setupAutoUpdate();

  // Keep the OS login item in sync with the user's preference. This used to
  // force openAtLogin:true on every launch, which silently undid turning
  // autostart off in Settings.
  if (!isDev) {
    try {
      app.setLoginItemSettings({
        openAtLogin: store ? Boolean(store.get('autostart', false)) : false,
        path: app.getPath('exe'),
      });
    } catch (err) {
      console.error('Failed to sync login item settings:', err);
    }
  }

  setupIPC();
  createTray();
  startIdleDetection();

  screen.on('display-added', notifyDisplaysChanged);
  screen.on('display-removed', notifyDisplaysChanged);
  screen.on('display-metrics-changed', notifyDisplaysChanged);

  // If no .scr argument was provided, just start minimized to tray
  if (!scrMode) {
    if (isDev) {
      createSettingsWindow();
    }
  }
});

app.on('window-all-closed', () => {
  // Don't quit when windows close — keep running in tray
});

app.on('before-quit', () => {
  stopIdleDetection();
});

app.on('activate', () => {
  cleanupScreensaverWindows();
  const hasVisibleScreensaver = screensaverWindows.some((win) => !win.isDestroyed() && win.isVisible());
  if (!settingsWindow && !hasVisibleScreensaver) {
    createSettingsWindow();
  }
});
