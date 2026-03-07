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
});
