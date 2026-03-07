import { useState, useEffect, useRef, useCallback } from 'react';
import './SpotifyWidget.css';

// ── SVG icon helpers ─────────────────────────────────────────────────────

const SpotifyLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

const PlayIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z"/>
  </svg>
);

const PauseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
  </svg>
);

const PrevIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>
  </svg>
);

const NextIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
  </svg>
);

const ShuffleIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
  </svg>
);

// ── Utilities ────────────────────────────────────────────────────────────

function formatTime(ms) {
  if (!ms || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ── Component ────────────────────────────────────────────────────────────

export default function SpotifyWidget({ pollInterval = 3, onTrackUpdate }) {
  const [authed, setAuthed] = useState(null); // null = loading
  const [track, setTrack] = useState(null);
  const [error, setError] = useState(null);
  const [connecting, setConnecting] = useState(false);

  // Progress interpolation state
  const [displayProgress, setDisplayProgress] = useState(0);
  const lastPollRef = useRef({ progressMs: 0, timestamp: 0, isPlaying: false });

  // Initialize timestamp avoiding purity error on render
  useEffect(() => {
    lastPollRef.current.timestamp = Date.now();
  }, []);
  const animFrameRef = useRef(null);

  const spotify = window.electronAPI?.spotify;

  // ── Check auth on mount ─────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    if (!spotify) {
      setTimeout(() => { if (active) setAuthed(false); }, 0);
      return () => { active = false; };
    }
    spotify.isAuthed().then((v) => { if (active) setAuthed(v); });
    return () => { active = false; };
  }, [spotify]);

  // ── Polling ─────────────────────────────────────────────────────────
  const fetchTrack = useCallback(async () => {
    if (!spotify) return;
    try {
      const data = await spotify.getTrack();
      if (data?.error) {
        setError(data);
        setTrack(null);
        if (onTrackUpdate) onTrackUpdate(null);
        return;
      }
      setError(null);
      setTrack(data);
      if (onTrackUpdate) onTrackUpdate(data);
      if (data) {
        lastPollRef.current = {
          progressMs: data.progressMs,
          timestamp: Date.now(),
          isPlaying: data.isPlaying,
        };
      }
    } catch {
      setTrack(null);
      if (onTrackUpdate) onTrackUpdate(null);
    }
  }, [spotify, onTrackUpdate]);

  useEffect(() => {
    if (!authed) return;
    
    let active = true;
    (async () => {
      if (active) await fetchTrack();
    })();

    const id = setInterval(fetchTrack, pollInterval * 1000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [authed, fetchTrack, pollInterval]);

  // ── Client-side progress interpolation ──────────────────────────────
  useEffect(() => {
    function tick() {
      const { progressMs, timestamp, isPlaying } = lastPollRef.current;
      if (isPlaying) {
        const elapsed = Date.now() - timestamp;
        setDisplayProgress(progressMs + elapsed);
      } else {
        setDisplayProgress(progressMs);
      }
      animFrameRef.current = requestAnimationFrame(tick);
    }
    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────
  const handleConnect = async () => {
    setConnecting(true);
    try {
      const result = await spotify.auth();
      if (result?.success) {
        setAuthed(true);
      }
    } catch { /* ignore */ }
    setConnecting(false);
  };

  const handlePlayPause = async () => {
    if (!track) return;
    if (track.isPlaying) {
      await spotify.pause();
    } else {
      await spotify.play();
    }
    // Optimistic update
    setTrack((prev) => prev ? { ...prev, isPlaying: !prev.isPlaying } : prev);
    lastPollRef.current.isPlaying = !track.isPlaying;
    lastPollRef.current.timestamp = Date.now();
    lastPollRef.current.progressMs = displayProgress;
  };

  const handleNext = async () => {
    await spotify.next();
    setTimeout(fetchTrack, 500);
  };

  const handlePrev = async () => {
    await spotify.previous();
    setTimeout(fetchTrack, 500);
  };

  const handleVolumeChange = (e) => {
    const val = Number(e.target.value);
    setTrack((prev) => prev ? { ...prev, volumePercent: val } : prev);
    spotify.setVolume(val);
  };

  const handleShuffle = () => {
    if (!track) return;
    const newState = !track.shuffleState;
    setTrack((prev) => prev ? { ...prev, shuffleState: newState } : prev);
    spotify.setShuffle(newState);
  };

  // ── Renders ─────────────────────────────────────────────────────────

  // Loading auth check
  if (authed === null) {
    return <div className="spotify-widget" />;
  }

  // Not authenticated
  if (!authed) {
    return (
      <div className="spotify-widget">
        <div className="spotify-empty">
          <span className="spotify-empty-icon"><SpotifyLogo /></span>
          <button
            className="spotify-connect-btn"
            onClick={handleConnect}
            disabled={connecting}
          >
            <SpotifyLogo />
            {connecting ? 'Connecting…' : 'Connect Spotify'}
          </button>
        </div>
      </div>
    );
  }

  // Error: no device
  if (error?.error === 'no_device' || error?.error === 'not_authenticated') {
    return (
      <div className="spotify-widget">
        <div className="spotify-empty">
          <span className="spotify-empty-icon">🎧</span>
          <span className="spotify-empty-text">
            {error.error === 'no_device'
              ? 'Open Spotify on a device to start listening'
              : 'Session expired — reconnect in Settings'}
          </span>
        </div>
      </div>
    );
  }

  // No track
  if (!track) {
    return (
      <div className="spotify-widget">
        <div className="spotify-empty">
          <span className="spotify-empty-icon"><SpotifyLogo /></span>
          <span className="spotify-empty-text">Nothing playing</span>
        </div>
      </div>
    );
  }

  // ── Now playing ─────────────────────────────────────────────────────
  const progress = Math.min(displayProgress, track.durationMs);
  const progressPct = track.durationMs > 0 ? (progress / track.durationMs) * 100 : 0;

  return (
    <div className="spotify-widget">
      <div className="spotify-now-playing">
        {/* Track info */}
        <div className="spotify-track-row">
          {track.albumArt ? (
            <img className="spotify-album-art" src={track.albumArt} alt="Album art" />
          ) : (
            <div className="spotify-album-placeholder">🎵</div>
          )}
          <div className="spotify-track-info">
            <div className="spotify-track-name">{track.name}</div>
            <div className="spotify-track-artist">{track.artist}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="spotify-progress">
          <div className="spotify-progress-bar">
            <div className="spotify-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="spotify-progress-times">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(track.durationMs)}</span>
          </div>
        </div>

        {/* Control buttons */}
        <div className="spotify-controls">
          <button className="spotify-ctrl-btn" onClick={handlePrev} title="Previous">
            <PrevIcon />
          </button>
          <button className="spotify-ctrl-btn play-btn" onClick={handlePlayPause} title={track.isPlaying ? 'Pause' : 'Play'}>
            {track.isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button className="spotify-ctrl-btn" onClick={handleNext} title="Next">
            <NextIcon />
          </button>
        </div>

        {/* Volume */}
        <div className="spotify-volume-row">
          <span className="spotify-volume-icon">{track.volumePercent === 0 ? '🔇' : '🔊'}</span>
          <input
            type="range"
            min="0"
            max="100"
            value={track.volumePercent}
            onChange={handleVolumeChange}
            className="spotify-slider"
            title={`Volume: ${track.volumePercent}%`}
          />
          <span className="spotify-volume-pct">{track.volumePercent}%</span>
        </div>

        {/* Shuffle */}
        <div className="spotify-extras">
          <button
            className={`spotify-shuffle-btn ${track.shuffleState ? 'active' : ''}`}
            onClick={handleShuffle}
            title={track.shuffleState ? 'Shuffle on' : 'Shuffle off'}
          >
            <ShuffleIcon />
            Shuffle
          </button>
        </div>
      </div>
    </div>
  );
}
