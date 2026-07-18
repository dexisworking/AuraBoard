import crypto from 'node:crypto';
import http from 'node:http';
import { BrowserWindow, safeStorage } from 'electron';

// CLIENT_ID is public by design in the PKCE flow — no secret is shipped.
const CLIENT_ID = 'bea9ffd201a14c5ead7af3d26915655e';
const REDIRECT_URI = 'http://127.0.0.1:8888/callback';
const SCOPES = 'user-read-playback-state user-modify-playback-state user-read-currently-playing';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const AUTH_URL = 'https://accounts.spotify.com/authorize';

/**
 * Per-install encryption key for the token store.
 *
 * This used to be a hardcoded literal, which meant every AuraBoard install
 * shared the same key — obfuscation, not encryption. The key is now random per
 * install and itself sealed with the OS keychain (DPAPI on Windows) via
 * safeStorage, so tokens at rest are only readable by this user on this machine.
 */
const KEY_STORE_NAME = 'auraboard-secure';

async function getEncryptionKey() {
  const { default: Store } = await import('electron-store');
  const keyStore = new Store({ name: KEY_STORE_NAME, defaults: { spotifyKeyEnc: '', spotifyKeyPlain: '' } });

  const sealed = keyStore.get('spotifyKeyEnc', '');
  if (sealed) {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        return safeStorage.decryptString(Buffer.from(sealed, 'base64'));
      }
    } catch { /* regenerate below */ }
  }

  // Fall back to a previously generated unsealed key so tokens survive an
  // OS-keychain outage rather than silently forcing a re-auth.
  const plain = keyStore.get('spotifyKeyPlain', '');
  if (plain && !safeStorage.isEncryptionAvailable()) return plain;

  const fresh = crypto.randomBytes(32).toString('base64');
  if (safeStorage.isEncryptionAvailable()) {
    keyStore.set('spotifyKeyEnc', safeStorage.encryptString(fresh).toString('base64'));
    keyStore.set('spotifyKeyPlain', '');
  } else {
    keyStore.set('spotifyKeyPlain', fresh);
  }
  return fresh;
}

let store = null;

// ── Helpers ──────────────────────────────────────────────────────────────

function generateCodeVerifier() {
  // 96 random bytes → 128-char base64url string
  return crypto.randomBytes(96).toString('base64url').slice(0, 128);
}

async function generateCodeChallenge(verifier) {
  const digest = crypto.createHash('sha256').update(verifier).digest();
  return digest.toString('base64url');
}

// ── Store management ─────────────────────────────────────────────────────

async function getStore() {
  if (store) return store;
  const { default: Store } = await import('electron-store');
  const encryptionKey = await getEncryptionKey();
  try {
    store = new Store({
      name: 'spotify-tokens',
      encryptionKey,
      defaults: { accessToken: '', refreshToken: '', expiresAt: 0 },
    });
  } catch {
    // Tokens written under the old shared key can't be decrypted with the new
    // per-install one; start clean and let the user reconnect.
    store = new Store({
      name: 'spotify-tokens',
      encryptionKey,
      clearInvalidConfig: true,
      defaults: { accessToken: '', refreshToken: '', expiresAt: 0 },
    });
  }
  return store;
}

function getTokens(s) {
  return {
    accessToken: s.get('accessToken', ''),
    refreshToken: s.get('refreshToken', ''),
    expiresAt: s.get('expiresAt', 0),
  };
}

function saveTokens(s, data) {
  s.set('accessToken', data.access_token);
  if (data.refresh_token) {
    s.set('refreshToken', data.refresh_token);
  }
  // expires_in is in seconds
  s.set('expiresAt', Date.now() + data.expires_in * 1000);
}

// ── Token exchange & refresh ─────────────────────────────────────────────

async function exchangeCodeForTokens(code, codeVerifier) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: codeVerifier,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  return res.json();
}

async function refreshTokenIfNeeded() {
  const s = await getStore();
  const { refreshToken, expiresAt } = getTokens(s);

  if (!refreshToken) return false;

  // Refresh if token expires within 5 minutes
  const fiveMinutes = 5 * 60 * 1000;
  if (Date.now() < expiresAt - fiveMinutes) return true; // Still valid

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    console.error('Spotify token refresh failed:', res.status);
    return false;
  }

  const data = await res.json();
  saveTokens(s, data);
  return true;
}

// ── Public API ───────────────────────────────────────────────────────────

export async function getValidAccessToken() {
  const refreshed = await refreshTokenIfNeeded();
  if (!refreshed) return null;

  const s = await getStore();
  return s.get('accessToken', '') || null;
}

export async function isAuthenticated() {
  const s = await getStore();
  const { refreshToken } = getTokens(s);
  return Boolean(refreshToken);
}

export async function disconnectSpotify() {
  const s = await getStore();
  s.set('accessToken', '');
  s.set('refreshToken', '');
  s.set('expiresAt', 0);
}

export async function getSpotifyUsername() {
  const token = await getValidAccessToken();
  if (!token) return null;

  try {
    const res = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.display_name || data.id || null;
  } catch {
    return null;
  }
}

export function startAuth() {
  return new Promise((resolve, reject) => {
    const codeVerifier = generateCodeVerifier();
    let authWindow = null;
    let server = null;
    let settled = false;

    function cleanup() {
      if (server) {
        try { server.close(); } catch { /* ignore */ }
        server = null;
      }
      if (authWindow && !authWindow.isDestroyed()) {
        try { authWindow.close(); } catch { /* ignore */ }
        authWindow = null;
      }
    }

    function settle(err, result) {
      if (settled) return;
      settled = true;
      cleanup();
      if (err) reject(err);
      else resolve(result);
    }

    // 1. Spin up temporary HTTP server to catch the redirect
    server = http.createServer(async (req, res) => {
      if (!req.url.startsWith('/callback')) {
        res.writeHead(404);
        res.end();
        return;
      }

      const url = new URL(req.url, 'http://127.0.0.1:8888');
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error || !code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body><h2>Authorization failed.</h2><p>You can close this window.</p></body></html>');
        settle(new Error(error || 'No authorization code received'));
        return;
      }

      // Show success page immediately
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<html><body style="background:#1a1a2e;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
        <div style="text-align:center">
          <h2 style="color:#1DB954">✓ Connected to Spotify</h2>
          <p style="opacity:0.7">This window will close automatically…</p>
        </div>
      </body></html>`);

      try {
        const tokenData = await exchangeCodeForTokens(code, codeVerifier);
        const s = await getStore();
        saveTokens(s, tokenData);
        settle(null, { success: true });
      } catch (err) {
        settle(err);
      }
    });

    server.on('error', (err) => {
      settle(new Error(`Auth server error: ${err.message}`));
    });

    server.listen(8888, '127.0.0.1', async () => {
      try {
        // 2. Build Spotify authorization URL
        const challenge = await generateCodeChallenge(codeVerifier);
        const params = new URLSearchParams({
          client_id: CLIENT_ID,
          response_type: 'code',
          redirect_uri: REDIRECT_URI,
          scope: SCOPES,
          code_challenge_method: 'S256',
          code_challenge: challenge,
        });

        const authUrl = `${AUTH_URL}?${params.toString()}`;

        // 3. Open auth URL in a new BrowserWindow
        authWindow = new BrowserWindow({
          width: 800,
          height: 600,
          show: true,
          alwaysOnTop: true,
          autoHideMenuBar: true,
          title: 'Connect to Spotify',
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        });

        authWindow.loadURL(authUrl);

        authWindow.on('closed', () => {
          authWindow = null;
          // If user closes the window before completing auth
          settle(new Error('Auth window closed by user'));
        });
      } catch (err) {
        settle(err);
      }
    });
  });
}
