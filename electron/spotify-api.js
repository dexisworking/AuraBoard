import { getValidAccessToken } from './spotify-auth.js';

const BASE_URL = 'https://api.spotify.com/v1/me/player';

// ── Helpers ──────────────────────────────────────────────────────────────

async function spotifyFetch(endpoint, options = {}) {
  const token = await getValidAccessToken();
  if (!token) {
    return { error: 'not_authenticated', message: 'Not authenticated with Spotify' };
  }

  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // 204 = success with no content (common for play/pause/next/prev)
  if (res.status === 204) {
    // For GET requests, 204 means no active device
    if (!options.method || options.method === 'GET') {
      return { error: 'no_device', message: 'No active Spotify device found' };
    }
    return { success: true };
  }

  if (res.status === 401) {
    return { error: 'unauthorized', message: 'Authentication expired. Please reconnect.' };
  }

  if (res.status === 403) {
    return { error: 'premium_required', message: 'Spotify Premium is required for playback control.' };
  }

  if (res.status === 404) {
    return { error: 'no_device', message: 'No active Spotify device found. Open Spotify on a device.' };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { error: 'api_error', message: `Spotify API error (${res.status}): ${text}` };
  }

  // Some endpoints return empty on success
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }

  return { success: true };
}

// ── Public API ───────────────────────────────────────────────────────────

export async function getCurrentTrack() {
  const data = await spotifyFetch('/currently-playing');

  if (data?.error) return data;
  if (!data || !data.item) return null;

  const track = data.item;

  return {
    name: track.name || 'Unknown Track',
    artist: track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist',
    albumArt: track.album?.images?.[0]?.url || null,
    progressMs: data.progress_ms || 0,
    durationMs: track.duration_ms || 0,
    isPlaying: data.is_playing || false,
    shuffleState: false, // Not available on /currently-playing; fetched separately below
    volumePercent: 50,   // Not available on /currently-playing; fetched separately below
  };
}

export async function getPlayerState() {
  const data = await spotifyFetch('');

  if (data?.error) return data;
  if (!data || !data.item) return null;

  const track = data.item;

  return {
    name: track.name || 'Unknown Track',
    artist: track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist',
    albumArt: track.album?.images?.[0]?.url || null,
    progressMs: data.progress_ms || 0,
    durationMs: track.duration_ms || 0,
    isPlaying: data.is_playing || false,
    shuffleState: data.shuffle_state || false,
    volumePercent: data.device?.volume_percent ?? 50,
  };
}

export async function play() {
  return spotifyFetch('/play', { method: 'PUT' });
}

export async function pause() {
  return spotifyFetch('/pause', { method: 'PUT' });
}

export async function next() {
  return spotifyFetch('/next', { method: 'POST' });
}

export async function previous() {
  return spotifyFetch('/previous', { method: 'POST' });
}

export async function setVolume(percent) {
  const vol = Math.max(0, Math.min(100, Math.round(percent)));
  return spotifyFetch(`/volume?volume_percent=${vol}`, { method: 'PUT' });
}

export async function setShuffle(state) {
  return spotifyFetch(`/shuffle?state=${Boolean(state)}`, { method: 'PUT' });
}
