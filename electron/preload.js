const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Retrieve current settings from the main process store.
   * @returns {Promise<{ idleTimeout: number }>}
   */
  getSettings: async () => {
    return await ipcRenderer.invoke('get-settings');
  },

  /**
   * Save settings to the main process store.
   * @param {{ idleTimeout?: number }} data
   * @returns {Promise<{ success: boolean }>}
   */
  saveSettings: async (data) => {
    return await ipcRenderer.invoke('save-settings', data);
  },

  /**
   * Open the native folder picker and return discovered image file URIs.
   * @returns {Promise<string[]>}
   */
  selectImageFolder: async () => {
    return await ipcRenderer.invoke('select-image-folder');
  },

  /**
   * Re-scan the saved slideshow folder and return image file URIs.
   * @returns {Promise<string[]>}
   */
  getFolderImages: async () => {
    return await ipcRenderer.invoke('get-folder-images');
  },

  /**
   * Built-in slideshow packs with their current image counts.
   * @returns {Promise<Array<{id:string,name:string,description:string,count:number}>>}
   */
  listSlideshowPacks: async () => {
    return await ipcRenderer.invoke('list-slideshow-packs');
  },

  /**
   * Activate a built-in pack, or pass '' to return to the user's own folder.
   * @param {string} packId
   * @returns {Promise<string[]>} images for the newly active source
   */
  setSlideshowPack: async (packId) => {
    return await ipcRenderer.invoke('set-slideshow-pack', packId);
  },

  /**
   * Register a callback for when the screensaver should activate.
   * @param {() => void} callback
   * @returns {() => void} cleanup function to remove the listener
   */
  onScreensaverActivate: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('screensaver-activate', handler);
    return () => {
      ipcRenderer.removeListener('screensaver-activate', handler);
    };
  },

  /**
   * Tell the main process to dismiss/hide the screensaver window.
   */
  dismissScreensaver: () => {
    ipcRenderer.send('dismiss-screensaver');
  },

  /**
   * Tell the main process to open the settings window.
   */
  openSettings: () => {
    ipcRenderer.send('open-settings');
  },

  /**
   * Tell the main process to start the screensaver.
   */
  startScreensaver: () => {
    ipcRenderer.send('start-screensaver');
  },

  /**
   * Spotify integration API.
   */
  spotify: {
    auth: () => ipcRenderer.invoke('spotify-auth'),
    getTrack: () => ipcRenderer.invoke('spotify-get-track'),
    play: () => ipcRenderer.invoke('spotify-play'),
    pause: () => ipcRenderer.invoke('spotify-pause'),
    next: () => ipcRenderer.invoke('spotify-next'),
    previous: () => ipcRenderer.invoke('spotify-previous'),
    setVolume: (percent) => ipcRenderer.invoke('spotify-set-volume', percent),
    setShuffle: (state) => ipcRenderer.invoke('spotify-set-shuffle', state),
    isAuthed: () => ipcRenderer.invoke('spotify-is-authed'),
    disconnect: () => ipcRenderer.invoke('spotify-disconnect'),
    getUsername: () => ipcRenderer.invoke('spotify-get-username'),
  },

  // ── Phase 5: Widget system IPC ──

  /** Open the dedicated Layout Editor window */
  openLayoutEditor: () => ipcRenderer.invoke('open-layout-editor'),

  /** Get currently available displays/monitors from Electron's screen API. */
  getDisplays: () => ipcRenderer.invoke('get-displays'),

  /** Event listener for display topology changes (add/remove/metrics). */
  onDisplaysChanged: (callback) => {
    const handler = (_event, displays) => callback(displays);
    ipcRenderer.on('displays-changed', handler);
    return () => ipcRenderer.removeListener('displays-changed', handler);
  },

  /** Event listener for when the layout editor is closed */
  onLayoutEditorClosed: (callback) => {
    ipcRenderer.on('layout-editor-closed', callback);
    return () => ipcRenderer.removeListener('layout-editor-closed', callback);
  },

  /** Get saved widget layout from electron-store. */
  getWidgetLayout: () => ipcRenderer.invoke('get-widget-layout'),

  /** Save widget layout to electron-store. */
  saveWidgetLayout: (layout) => ipcRenderer.invoke('save-widget-layout', layout),

  /** Get list of enabled widget IDs. */
  getEnabledWidgets: () => ipcRenderer.invoke('get-enabled-widgets'),

  /** Save list of enabled widget IDs. */
  saveEnabledWidgets: (list) => ipcRenderer.invoke('save-enabled-widgets', list),

  /** Reset widget layout to default. */
  resetWidgetLayout: () => ipcRenderer.invoke('reset-widget-layout'),

  /** Get per-widget config (variant + instance settings), keyed by widget id. */
  getWidgetConfig: () => ipcRenderer.invoke('get-widget-config'),

  /** Save per-widget config map. */
  saveWidgetConfig: (config) => ipcRenderer.invoke('save-widget-config', config),

  /**
   * Read from the shared main-process data layer (TTL cache + backoff +
   * single-flight across windows).
   * @returns {Promise<{data:any, error:string|null, fetchedAt:number|null, isStale:boolean}>}
   */
  dataFetch: (source, params) => ipcRenderer.invoke('data-fetch', source, params),

  /** Auto-update status: { state, version, current, percent?, error? } */
  getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),

  /** Restart and install a downloaded update. */
  installUpdateNow: () => ipcRenderer.invoke('install-update-now'),

  /** Parse an RSS feed URL in the main process and return items. */
  fetchRss: (url) => ipcRenderer.invoke('fetch-rss', url),

  /** Fetch a stock quote via yahoo-finance2 in the main process. */
  fetchStockQuote: (symbol) => ipcRenderer.invoke('fetch-stock-quote', symbol),

  /**
   * Open an allowlisted https URL in the user's default browser.
   * Main validates the URL; a refused link resolves { success: false }.
   * @param {string} url
   * @returns {Promise<{success:boolean, error?:string}>}
   */
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});
