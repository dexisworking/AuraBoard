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
});
