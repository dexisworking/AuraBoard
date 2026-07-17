import { app, BrowserWindow, Tray, Menu, ipcMain, powerMonitor, nativeImage, dialog, screen } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { startAuth, isAuthenticated, disconnectSpotify, getSpotifyUsername } from './spotify-auth.js';
import * as spotifyApi from './spotify-api.js';
import RssParser from 'rss-parser';
import yahooFinance from 'yahoo-finance2';

const rssParser = new RssParser();

// __dirname and __filename are automatically provided by electron-vite

let store = null;
let screensaverWindows = [];
let settingsWindow = null;
let layoutEditorWindow = null; // Phase 5.1 layout editor window
let tray = null;
let idleCheckInterval = null;
const isDev = !app.isPackaged;
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp']);

// ── Initialize electron-store (ESM module, must use dynamic import) ───
async function initStore() {
  try {
    const { default: Store } = await import('electron-store');
    store = new Store({
      defaults: {
        idleTimeout: 5, // minutes
        slideshowFolder: '',
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
        gnewsApiKey: '',
        alphaVantageApiKey: '',
        stockSymbols: 'AAPL,MSFT,GOOGL,AMZN,TSLA',
        cryptoCoinIds: 'bitcoin,ethereum,solana,binancecoin,cardano',
        sportsLeagues: '4387,4328',
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
    };
    store = {
      get: (key, def) => (key in mem ? mem[key] : def),
      set: (key, val) => { mem[key] = val; },
    };
  }
}

async function scanImageDirectory(folderPath) {
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
      if (IMAGE_EXTENSIONS.has(extension)) {
        images.push(pathToFileURL(fullPath).href);
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
        webSecurity: false, // Allow loading local file:// URIs for user slide backgrounds
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
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f172a',
      symbolColor: '#ffffff',
      height: 48,
    },
    alwaysOnTop: false,
    title: 'AuraBoard Settings',
    backgroundColor: '#0f172a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false, // Allow local file loading
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
    titleBarStyle: 'hidden',
    backgroundColor: '#02050a',
    show: false,
    frame: false,
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false,
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
  const iconPath = path.join(__dirname, '..', '..', 'assets', 'tray-icon.png');
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
      slideshowInterval: store ? store.get('slideshowInterval', 60) : 60,
      slideshowTransition: store ? store.get('slideshowTransition', 'fade') : 'fade',
      slideshowShuffle: store ? store.get('slideshowShuffle', false) : false,
      spotifyPollInterval: store ? store.get('spotifyPollInterval', 3) : 3,
      uiTheme: store ? store.get('uiTheme', 'aurora') : 'aurora',
      uiFont: store ? store.get('uiFont', 'outfit') : 'outfit',
      screensaverUseAllDisplays: store ? store.get('screensaverUseAllDisplays', true) : true,
      screensaverDisplayIds: store ? store.get('screensaverDisplayIds', []) : [],
      useSpotifyArtBackground: store ? store.get('useSpotifyArtBackground', false) : false,
      // Phase 5
      gnewsApiKey: store ? store.get('gnewsApiKey', '') : '',
      alphaVantageApiKey: store ? store.get('alphaVantageApiKey', '') : '',
      stockSymbols: store ? store.get('stockSymbols', 'AAPL,MSFT,GOOGL,AMZN,TSLA') : 'AAPL,MSFT,GOOGL,AMZN,TSLA',
      cryptoCoinIds: store ? store.get('cryptoCoinIds', 'bitcoin,ethereum,solana,binancecoin,cardano') : 'bitcoin,ethereum,solana,binancecoin,cardano',
      sportsLeagues: store ? store.get('sportsLeagues', '4387,4328') : '4387,4328',
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
      store.set('gnewsApiKey', String(data.gnewsApiKey));
    }
    if (data.alphaVantageApiKey !== undefined) {
      store.set('alphaVantageApiKey', String(data.alphaVantageApiKey));
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
    const images = await scanImageDirectory(folderPath);

    if (store) {
      store.set('slideshowFolder', folderPath);
    }

    return images;
  });

  ipcMain.handle('get-folder-images', async () => {
    const folderPath = store ? store.get('slideshowFolder', '') : '';
    console.log('[DEBUG] get-folder-images using path:', folderPath);
    const images = await scanImageDirectory(folderPath);
    console.log('[DEBUG] found', images.length, 'images in', folderPath);
    return images;
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

  // Set app to start on Windows login
  if (!isDev) {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: app.getPath('exe'),
    });
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
