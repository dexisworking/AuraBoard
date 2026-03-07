import { app, BrowserWindow, Tray, Menu, ipcMain, powerMonitor, nativeImage, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { startAuth, isAuthenticated, disconnectSpotify, getSpotifyUsername } from './spotify-auth.js';
import * as spotifyApi from './spotify-api.js';

// __dirname and __filename are automatically provided by electron-vite

let store = null;
let screensaverWindow = null;
let settingsWindow = null;
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
function createScreensaverWindow() {
  if (screensaverWindow && !screensaverWindow.isDestroyed()) {
    screensaverWindow.show();
    screensaverWindow.focus();
    screensaverWindow.webContents.send('screensaver-activate');
    return;
  }

  screensaverWindow = new BrowserWindow({
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

  screensaverWindow.loadURL(getScreensaverURL());

  let blurListenerEnabled = false;

  screensaverWindow.once('ready-to-show', () => {
    screensaverWindow.show();
    screensaverWindow.focus();
    screensaverWindow.webContents.send('screensaver-activate');
    
    // Prevent immediate dismissal caused by focus changes from launching the app
    setTimeout(() => {
      blurListenerEnabled = true;
    }, 500);
  });

  // Dismiss on any significant mouse movement or keypress within the window (handled in renderer)
  // or when the window loses focus entirely (e.g. user hits Alt+Tab)
  screensaverWindow.on('blur', () => {
    if (blurListenerEnabled) {
      dismissScreensaver();
    }
  });

  screensaverWindow.on('closed', () => {
    screensaverWindow = null;
  });
}

function dismissScreensaver() {
  if (screensaverWindow && !screensaverWindow.isDestroyed()) {
    screensaverWindow.hide();
  }
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
      if (!screensaverWindow || screensaverWindow.isDestroyed() || !screensaverWindow.isVisible()) {
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
      useSpotifyArtBackground: store ? store.get('useSpotifyArtBackground', false) : false,
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
    if (data.useSpotifyArtBackground !== undefined) {
      store.set('useSpotifyArtBackground', Boolean(data.useSpotifyArtBackground));
    }
    return { success: true };
  });

  ipcMain.on('open-settings', () => {
    createSettingsWindow();
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
  if (!settingsWindow && !screensaverWindow) {
    createSettingsWindow();
  }
});
