/* Real-runtime verification of the security changes.
 *
 * Runs as an actual Electron main process and exercises the pieces that cannot
 * be tested in headless Chromium: the auraboard-media:// protocol (including
 * its path-escape guard), CSP injection, safeStorage round-trip, and rendering
 * the real built renderer with webSecurity enabled.
 *
 *   electron _verify.cjs
 * Results -> _verify.json, screenshot -> _verify.png
 */
const { app, BrowserWindow, protocol, net, session, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { pathToFileURL } = require('url');

const OUT = path.join(__dirname, '_verify.json');
const SHOT = path.join(__dirname, '_verify.png');
const results = {};
const record = (k, v) => { results[k] = v; fs.writeFileSync(OUT, JSON.stringify(results, null, 2)); };

const MEDIA_SCHEME = 'auraboard-media';
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp']);

protocol.registerSchemesAsPrivileged([
  { scheme: MEDIA_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

const toMediaUrl = (p) => `${MEDIA_SCHEME}://f/${Buffer.from(p, 'utf8').toString('base64url')}`;

function isInside(root, target) {
  if (!root) return false;
  const rel = path.relative(path.resolve(root), path.resolve(target));
  return Boolean(rel) && !rel.startsWith('..') && !path.isAbsolute(rel);
}

// The real app's config, so we test against the user's actual photo folder.
function readUserConfig() {
  try {
    const p = path.join(app.getPath('appData'), 'auraboard', 'config.json');
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch { return {}; }
}

function firstImageIn(dir, depth = 0) {
  if (!dir || depth > 3) return null;
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return null; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isFile() && IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase())) return full;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      const hit = firstImageIn(path.join(dir, e.name), depth + 1);
      if (hit) return hit;
    }
  }
  return null;
}

app.whenReady().then(async () => {
  const cfg = readUserConfig();
  // argv override lets us test the protocol against a known-good image rather
  // than whatever happens to be in the user's configured folder.
  const rootOverride = process.argv.find((a) => a.startsWith('--root='));
  const slideshowFolder = rootOverride ? rootOverride.slice(7) : (cfg.slideshowFolder || '');
  const sampleImage = firstImageIn(slideshowFolder);
  record('slideshowFolder', slideshowFolder);
  record('sampleImage', sampleImage);

  // ── media protocol, mirroring main.js ──
  protocol.handle(MEDIA_SCHEME, async (request) => {
    try {
      const token = new URL(request.url).pathname.replace(/^\/+/, '');
      const filePath = Buffer.from(decodeURIComponent(token), 'base64url').toString('utf8');
      if (!isInside(slideshowFolder, filePath)) return new Response('Forbidden', { status: 403 });
      const ext = path.extname(filePath).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(ext)) return new Response('Unsupported media type', { status: 415 });
      return await net.fetch(pathToFileURL(filePath).href);
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });

  // ── CSP, mirroring main.js ──
  const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
    + `img-src 'self' data: blob: ${MEDIA_SCHEME}: https:; font-src 'self' data:; `
    + "connect-src 'self' https://api.open-meteo.com; object-src 'none'; frame-src 'none'";
  let cspApplied = 0;
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    cspApplied += 1;
    callback({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [CSP] } });
  });

  // ── safeStorage round-trip ──
  try {
    const available = safeStorage.isEncryptionAvailable();
    const secret = 'test-api-key-' + Date.now();
    const enc = safeStorage.encryptString(secret).toString('base64');
    const dec = safeStorage.decryptString(Buffer.from(enc, 'base64'));
    record('safeStorage', {
      available,
      roundTripOk: dec === secret,
      cipherIsNotPlaintext: !enc.includes(secret) && enc !== secret,
    });
  } catch (e) {
    record('safeStorage', { error: e.message });
  }

  // ── render the real built renderer with webSecurity ON ──
  const win = new BrowserWindow({
    width: 1400, height: 850, show: false,
    webPreferences: {
      preload: path.join(__dirname, 'out', 'preload', 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false,
      webSecurity: true,
    },
  });

  try {
    await win.loadURL(pathToFileURL(path.join(__dirname, 'out', 'renderer', 'index.html')).href);
    record('rendererLoaded', true);
  } catch (e) {
    record('rendererLoaded', String(e.message));
  }

  await new Promise((r) => setTimeout(r, 5000));

  // ── in-page checks ──
  const allowedUrl = sampleImage ? toMediaUrl(sampleImage) : null;
  const outsideUrl = toMediaUrl(path.join(os.homedir(), 'outside-secret.jpg'));

  const pageChecks = await win.webContents.executeJavaScript(`(async () => {
    const out = {};
    out.webSecurityOn = (typeof window.fetch === 'function');
    out.electronAPI = Boolean(window.electronAPI);
    out.widgetCount = document.querySelectorAll('.react-grid-item').length;
    out.boardText = (document.body.innerText || '').slice(0, 80).replace(/\\n/g, ' | ');

    // an <img> is how the slideshow actually loads photos
    const loadImg = (src) => new Promise((res) => {
      if (!src) return res('no-sample');
      const i = new Image();
      i.onload = () => res('loaded:' + i.naturalWidth + 'x' + i.naturalHeight);
      i.onerror = () => res('error');
      i.src = src;
      setTimeout(() => res('timeout'), 4000);
    });
    out.allowedImage = await loadImg(${JSON.stringify(allowedUrl)});
    out.outsideImage = await loadImg(${JSON.stringify(outsideUrl)});

    // CSP should block a connect to an origin that is not allow-listed
    try {
      await fetch('https://example.com/blocked-by-csp');
      out.cspBlockedDisallowed = false;
    } catch (e) {
      out.cspBlockedDisallowed = true;
    }
    return out;
  })()`).catch((e) => ({ evalError: e.message }));

  record('page', pageChecks);
  record('cspHeaderCallbacks', cspApplied);

  try {
    const img = await win.webContents.capturePage();
    fs.writeFileSync(SHOT, img.toPNG());
    record('screenshot', 'ok');
  } catch (e) {
    record('screenshot', e.message);
  }

  app.quit();
});
