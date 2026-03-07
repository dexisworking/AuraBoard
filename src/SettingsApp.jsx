import { useEffect, useMemo, useState } from 'react';
import SlideshowBackground from './slideshow/SlideshowBackground';

function formatInterval(seconds) {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (!remainingSeconds) {
    return `${minutes} min`;
  }

  return `${minutes} min ${remainingSeconds} sec`;
}

export default function SettingsApp() {
  const [idleTimeout, setIdleTimeout] = useState(5);
  const [slideshowFolder, setSlideshowFolder] = useState('');
  const [images, setImages] = useState([]);
  const [slideshowInterval, setSlideshowInterval] = useState(60);
  const [slideshowTransition, setSlideshowTransition] = useState('fade');
  const [slideshowShuffle, setSlideshowShuffle] = useState(false);
  const [useSpotifyArtBackground, setUseSpotifyArtBackground] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSelectingFolder, setIsSelectingFolder] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewSeed, setPreviewSeed] = useState(0);
  const [saveMessage, setSaveMessage] = useState('');
  const [spotifyAuthed, setSpotifyAuthed] = useState(false);
  const [spotifyUsername, setSpotifyUsername] = useState('');
  const [spotifyConnecting, setSpotifyConnecting] = useState(false);
  const [spotifyPollInterval, setSpotifyPollInterval] = useState(3);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      try {
        const [settings, folderImages] = await Promise.all([
          window.electronAPI?.getSettings?.() ?? Promise.resolve({}),
          window.electronAPI?.getFolderImages?.() ?? Promise.resolve([]),
        ]);

        if (!isMounted) {
          return;
        }

        setIdleTimeout(settings.idleTimeout ?? 5);
        setSlideshowFolder(settings.slideshowFolder ?? '');
        setSlideshowInterval(settings.slideshowInterval ?? 60);
        setSlideshowTransition(settings.slideshowTransition ?? 'fade');
        setSlideshowShuffle(Boolean(settings.slideshowShuffle));
        setUseSpotifyArtBackground(Boolean(settings.useSpotifyArtBackground));
        setSpotifyPollInterval(settings.spotifyPollInterval ?? 3);
        setImages(Array.isArray(folderImages) ? folderImages : []);

        // Load Spotify auth state
        if (window.electronAPI?.spotify) {
          const isAuthed = await window.electronAPI.spotify.isAuthed();
          setSpotifyAuthed(isAuthed);
          if (isAuthed) {
            const name = await window.electronAPI.spotify.getUsername();
            setSpotifyUsername(name || '');
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isPreviewing) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setIsPreviewing(false);
    }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isPreviewing, previewSeed]);

  const imageCountLabel = useMemo(() => `Found ${images.length} images`, [images.length]);

  const handleChooseFolder = async () => {
    setIsSelectingFolder(true);
    setSaveMessage('');

    try {
      const selectedImages = await window.electronAPI?.selectImageFolder?.();
      const settings = await window.electronAPI?.getSettings?.();

      setImages(Array.isArray(selectedImages) ? selectedImages : []);
      setSlideshowFolder(settings?.slideshowFolder ?? '');

      if (Array.isArray(selectedImages) && selectedImages.length > 0) {
        setSaveMessage('Folder selected.');
      } else if (settings?.slideshowFolder) {
        setSaveMessage('Folder saved, but no supported images were found.');
      }
    } catch (error) {
      console.error('Failed to select image folder:', error);
      setSaveMessage('Failed to open folder picker.');
    } finally {
      setIsSelectingFolder(false);
      window.setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      if (!window.electronAPI?.saveSettings) {
        setSaveMessage('Electron API not available.');
        return;
      }

      await window.electronAPI.saveSettings({
        idleTimeout: Number(idleTimeout),
        slideshowInterval: Number(slideshowInterval),
        slideshowTransition,
        slideshowShuffle,
        useSpotifyArtBackground,
        spotifyPollInterval: Number(spotifyPollInterval),
      });
      setSaveMessage('Settings saved!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveMessage('Failed to save settings.');
    } finally {
      setIsSaving(false);
      window.setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handlePreview = () => {
    setPreviewSeed((value) => value + 1);
    setIsPreviewing(true);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans relative overflow-hidden select-none">
      {/* Animated Mesh Gradient Background for Glass Effect */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/40 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/40 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-fuchsia-500/30 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      <div className="relative z-10 flex flex-col h-screen">
        {/* Draggable Titlebar Area */}
        <div 
          className="h-12 w-full flex items-center justify-center shrink-0"
          style={{ WebkitAppRegion: 'drag' }}
        >
          <p className="text-sm font-medium text-white/50 tracking-widest">AuraBoard</p>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-12 pt-4 scrollbar-hide">
          <div className="mx-auto w-full max-w-3xl space-y-8">
            
            <div className="text-center mb-10">
              <h1 className="text-4xl font-semibold tracking-tight text-white mb-2">Settings</h1>
              <p className="text-base text-white/60">Customize your screensaver experience</p>
            </div>

            {/* General Section */}
            <section className="rounded-[2.5rem] border border-white/20 bg-white/10 p-8 backdrop-blur-2xl shadow-2xl transition-transform hover:scale-[1.01] duration-500">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white">General</h2>
                <p className="mt-1 text-sm text-white/60">Idle activation timing for the screensaver shell.</p>
              </div>

              <div className="flex items-center justify-between gap-6">
                <div className="flex-1">
                  <label htmlFor="idle-timeout" className="block text-sm font-medium text-white mb-1">
                    Idle Timeout
                  </label>
                  <p className="text-xs text-white/50">Minutes before screensaver activates.</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    id="idle-timeout"
                    type="range"
                    min="1"
                    max="60"
                    value={idleTimeout}
                    onChange={(event) => setIdleTimeout(event.target.value)}
                    className="w-32 accent-white h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="w-12 text-right text-sm font-medium text-white/90">{idleTimeout}m</span>
                </div>
              </div>
            </section>

            {/* Background Section */}
            <section className="rounded-[2.5rem] border border-white/20 bg-white/10 p-8 backdrop-blur-2xl shadow-2xl transition-transform hover:scale-[1.01] duration-500">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">Background</h2>
                  <p className="mt-1 text-sm text-white/60">Configure your local photo slideshow.</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Folder Selection */}
                <div className="rounded-2xl bg-black/20 p-5 border border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 truncate pr-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1">Source Folder</p>
                      <p className="text-sm text-white/90 truncate">{slideshowFolder || 'No folder selected'}</p>
                      <p className="text-xs text-cyan-200/80 mt-1">{imageCountLabel}</p>
                    </div>
                    <button
                      onClick={handleChooseFolder}
                      disabled={isSelectingFolder}
                      className="shrink-0 rounded-full bg-white/20 hover:bg-white/30 px-5 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
                    >
                      {isSelectingFolder ? 'Opening...' : 'Browse'}
                    </button>
                  </div>
                </div>

                {/* Slideshow Settings Grid */}
                <div className="grid sm:grid-cols-2 gap-6">
                  {/* Interval */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Interval</label>
                    <p className="text-xs text-white/50 mb-3">Time between slides.</p>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="10"
                        max="600"
                        step="10"
                        value={slideshowInterval}
                        onChange={(event) => setSlideshowInterval(Number(event.target.value))}
                        className="flex-1 accent-white h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="w-16 text-right text-sm font-medium text-white/90">{formatInterval(Number(slideshowInterval))}</span>
                    </div>
                  </div>

                  {/* Transition Style */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Transition Style</label>
                    <p className="text-xs text-white/50 mb-3">Animation between images.</p>
                    <select
                      value={slideshowTransition}
                      onChange={(event) => setSlideshowTransition(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-white/30 transition-shadow appearance-none cursor-pointer"
                    >
                      <option value="fade">Crossfade Effect</option>
                      <option value="zoom">Slow Zoom & Fade</option>
                      <option value="slide">Smooth Slide</option>
                    </select>
                  </div>
                </div>

                <hr className="border-white/10" />

                {/* Toggles */}
                <div className="space-y-4">
                  {/* Shuffle Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">Shuffle Images</p>
                      <p className="text-xs text-white/50">Randomize slide order.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={slideshowShuffle}
                        onChange={(e) => setSlideshowShuffle(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500 shadow-inner"></div>
                    </label>
                  </div>

                  {/* Spotify Background Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">Use Spotify Album Art</p>
                      <p className="text-xs text-white/50">Replace slideshow with current track's album art.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={useSpotifyArtBackground}
                        onChange={(e) => setUseSpotifyArtBackground(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500 shadow-inner"></div>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handlePreview}
                    className="rounded-full border border-white/30 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-white/10"
                  >
                    Preview Slideshow
                  </button>
                </div>
              </div>
            </section>

            {/* Spotify Section */}
            <section className="rounded-[2.5rem] border border-white/20 bg-white/10 p-8 backdrop-blur-2xl shadow-2xl transition-transform hover:scale-[1.01] duration-500">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white text-[#1DB954]">Spotify Integration</h2>
                  <p className="mt-1 text-sm text-white/60">Control playback natively on your screen.</p>
                </div>
                {spotifyAuthed ? (
                  <button
                    onClick={async () => {
                      await window.electronAPI?.spotify?.disconnect();
                      setSpotifyAuthed(false);
                      setSpotifyUsername('');
                    }}
                    className="rounded-full border border-red-500/50 px-4 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-500/20"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      setSpotifyConnecting(true);
                      try {
                        const result = await window.electronAPI?.spotify?.auth();
                        if (result?.success) {
                          setSpotifyAuthed(true);
                          const name = await window.electronAPI?.spotify?.getUsername();
                          setSpotifyUsername(name || '');
                        }
                      } catch { /* ignore */ }
                      setSpotifyConnecting(false);
                    }}
                    disabled={spotifyConnecting}
                    className="rounded-full bg-[#1DB954] hover:bg-[#1ed760] px-5 py-2 text-sm font-medium text-black transition-colors disabled:opacity-50 shadow-[0_0_15px_rgba(29,185,84,0.3)]"
                  >
                    {spotifyConnecting ? 'Authenticating...' : 'Connect to Spotify'}
                  </button>
                )}
              </div>

              {spotifyAuthed && (
                <div className="space-y-6">
                  <div className="rounded-2xl bg-black/20 p-4 border border-white/5 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-[#1DB954]/20 flex items-center justify-center shrink-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#1DB954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" /></svg>
                    </div>
                    <div>
                      <p className="text-xs text-white/50 mb-0.5">Connected Account</p>
                      <p className="text-sm font-medium text-white">{spotifyUsername || 'Spotify User'}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-6">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-white mb-1">Polling Interval</label>
                      <p className="text-xs text-white/50">Refresh rate for current track info.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={spotifyPollInterval}
                        onChange={(e) => setSpotifyPollInterval(Number(e.target.value))}
                        className="w-32 accent-white h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="w-12 text-right text-sm font-medium text-white/90">{spotifyPollInterval}s</span>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between p-2">
              <p className={`text-sm font-medium transition-opacity duration-300 ${saveMessage ? 'opacity-100' : 'opacity-0'} ${saveMessage.includes('saved') || saveMessage.includes('selected') ? 'text-green-400' : 'text-amber-400'}`}>
                {saveMessage || ' '}
              </p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    handleSave();
                    window.electronAPI?.startScreensaver?.();
                  }}
                  className="rounded-full bg-white/10 border border-white/20 text-white px-6 py-3 text-sm font-semibold transition-transform hover:scale-105 active:scale-95 shadow-lg"
                >
                  Start Screensaver
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded-full bg-white text-black px-8 py-3 text-sm font-semibold transition-transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isSaving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>
            
          </div>
        </div>
      </div>

      {isPreviewing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-12">
          <div className="relative w-full h-full max-w-6xl overflow-hidden rounded-[2.5rem] border border-white/20 shadow-2xl">
            <SlideshowBackground
              key={previewSeed}
              images={images}
              interval={1}
              transition={slideshowTransition}
              shuffle={slideshowShuffle}
            />
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-8 left-8 z-20">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">Preview Mode</p>
              <p className="mt-1 text-3xl font-light text-white">
                {slideshowTransition === 'fade' ? 'Crossfade' : slideshowTransition === 'zoom' ? 'Zoom' : 'Slide'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
