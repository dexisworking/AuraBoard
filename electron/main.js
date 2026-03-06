import { app, BrowserWindow, Tray, Menu, ipcMain, powerMonitor, nativeImage } from 'electron';
import path from 'node:path';

// __dirname and __filename are automatically provided by electron-vite

let store = null;
let screensaverWindow = null;
let settingsWindow = null;
let tray = null;
let idleCheckInterval = null;
const isDev = !app.isPackaged;

// ── Initialize electron-store (ESM module, must use dynamic import) ───
async function initStore() {
  try {
    const { default: Store } = await import('electron-store');
    store = new Store({
      defaults: {
        idleTimeout: 5, // minutes
      },
    });
  } catch (err) {
    console.error('Failed to initialize electron-store:', err);
    // Fallback in-memory store
    const mem = { idleTimeout: 5 };
    store = {
      get: (key, def) => (key in mem ? mem[key] : def),
      set: (key, val) => { mem[key] = val; },
    };
  }
}

// ── Resolve paths for HTML files ──────────────────────────────────────
function getScreensaverURL() {
  if (isDev) {
    return 'http://localhost:5173/index.html';
  }
  return `file://${path.join(__dirname, '..', 'renderer', 'screensaver.html')}`;
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
    },
  });

  screensaverWindow.loadURL(getScreensaverURL());

  screensaverWindow.once('ready-to-show', () => {
    screensaverWindow.show();
    screensaverWindow.focus();
    screensaverWindow.webContents.send('screensaver-activate');
  });

  // Dismiss on any mouse movement or keypress within the window
  screensaverWindow.on('blur', () => {
    dismissScreensaver();
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
    width: 480,
    height: 360,
    resizable: false,
    frame: true,
    alwaysOnTop: false,
    title: 'AuraBoard Settings',
    backgroundColor: '#1a1a2e',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
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
    };
  });

  ipcMain.handle('save-settings', async (_event, data) => {
    if (!store) return { success: false };
    if (data.idleTimeout !== undefined) {
      const timeout = Math.max(1, Math.min(60, Number(data.idleTimeout)));
      store.set('idleTimeout', timeout);
    }
    return { success: true };
  });

  ipcMain.on('dismiss-screensaver', () => {
    dismissScreensaver();
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
