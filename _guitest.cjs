/* Feasibility probe: does a real (GUI) Electron process start under this shell?
 * Writes a log immediately, before touching any Electron API, so the absence of
 * a log means the process never started at all. */
const fs = require('fs');
const path = require('path');
const LOG = path.join(__dirname, '_guitest.log');
fs.writeFileSync(LOG, 'PROCESS_STARTED\n');

try {
  const electron = require('electron');
  fs.appendFileSync(LOG, `electron typeof=${typeof electron}\n`);
  fs.appendFileSync(LOG, `has app=${Boolean(electron && electron.app)}\n`);
  if (electron && electron.app) {
    const { app, BrowserWindow, safeStorage, protocol } = electron;
    fs.appendFileSync(LOG, 'MODE=gui\n');
    app.whenReady().then(() => {
      fs.appendFileSync(LOG, 'APP_READY\n');
      fs.appendFileSync(LOG, `safeStorage.isEncryptionAvailable=${safeStorage.isEncryptionAvailable()}\n`);
      fs.appendFileSync(LOG, `protocol.handle=${typeof protocol.handle}\n`);
      try {
        const w = new BrowserWindow({ show: false, width: 300, height: 200 });
        fs.appendFileSync(LOG, `WINDOW_CREATED id=${w.id}\n`);
      } catch (e) {
        fs.appendFileSync(LOG, `WINDOW_ERROR ${e.message}\n`);
      }
      app.quit();
    });
  } else {
    fs.appendFileSync(LOG, 'MODE=node (ELECTRON_RUN_AS_NODE) — no GUI APIs\n');
  }
} catch (e) {
  fs.appendFileSync(LOG, `REQUIRE_ERROR ${e.message}\n`);
}
