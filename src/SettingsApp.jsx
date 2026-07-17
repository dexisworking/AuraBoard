import { useEffect, useMemo, useState } from 'react';
import SlideshowBackground from './slideshow/SlideshowBackground';
import { getAllWidgets } from './widgets/registry';
import { FONT_PRESETS, THEME_PRESETS } from './theme/presets';

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

/* ── Toggle Switch component ── */
function ToggleSwitch({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-xs text-white/50">{description}</p>}
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500 shadow-inner"></div>
      </label>
    </div>
  );
}

/* ── Layout preset definitions ── */
const PRESETS = {
  full: {
    label: 'Full Board',
    description: 'All widgets visible',
    widgets: ['clock', 'date', 'greeting', 'weather', 'spotify', 'news', 'crypto', 'stocks', 'sports'],
  },
  minimal: {
    label: 'Minimal Clock',
    description: 'Clock + Date + Greeting',
    widgets: ['clock', 'date', 'greeting'],
  },
  focus: {
    label: 'Focus Mode',
    description: 'Clock + Greeting + Weather',
    widgets: ['clock', 'greeting', 'weather'],
  },
};

/* ── Sports league definitions ── */
const LEAGUE_OPTIONS = [
  { id: '4387', name: 'NBA' },
  { id: '4391', name: 'NFL' },
  { id: '4328', name: 'EPL' },
  { id: '4335', name: 'LaLiga' },
];

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
  const [uiTheme, setUiTheme] = useState('aurora');
  const [uiFont, setUiFont] = useState('outfit');

  // Phase 5 state
  const [enabledWidgets, setEnabledWidgets] = useState([
    'clock', 'date', 'greeting', 'weather', 'spotify',
  ]);
  const [gnewsApiKey, setGnewsApiKey] = useState('');
  const [alphaVantageApiKey, setAlphaVantageApiKey] = useState('');
  const [stockSymbols, setStockSymbols] = useState('AAPL,MSFT,GOOGL,AMZN,TSLA');
  const [cryptoCoinIds, setCryptoCoinIds] = useState('bitcoin,ethereum,solana,binancecoin,cardano');
  const [sportsLeagues, setSportsLeagues] = useState('4387,4328');
  const [availableDisplays, setAvailableDisplays] = useState([]);
  const [screensaverUseAllDisplays, setScreensaverUseAllDisplays] = useState(true);
  const [screensaverDisplayIds, setScreensaverDisplayIds] = useState([]);

  const allWidgets = useMemo(() => getAllWidgets(), []);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      try {
        const [settings, folderImages, savedWidgets, displays] = await Promise.all([
          window.electronAPI?.getSettings?.() ?? Promise.resolve({}),
          window.electronAPI?.getFolderImages?.() ?? Promise.resolve([]),
          window.electronAPI?.getEnabledWidgets?.() ?? Promise.resolve(null),
          window.electronAPI?.getDisplays?.() ?? Promise.resolve([]),
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
        setUiTheme(settings.uiTheme ?? 'aurora');
        setUiFont(settings.uiFont ?? 'outfit');
        setImages(Array.isArray(folderImages) ? folderImages : []);

        // Phase 5 settings
        setGnewsApiKey(settings.gnewsApiKey ?? '');
        setAlphaVantageApiKey(settings.alphaVantageApiKey ?? '');
        setStockSymbols(settings.stockSymbols ?? 'AAPL,MSFT,GOOGL,AMZN,TSLA');
        setCryptoCoinIds(settings.cryptoCoinIds ?? 'bitcoin,ethereum,solana,binancecoin,cardano');
        setSportsLeagues(settings.sportsLeagues ?? '4387,4328');
        setScreensaverUseAllDisplays(settings.screensaverUseAllDisplays ?? true);
        setScreensaverDisplayIds(
          Array.isArray(settings.screensaverDisplayIds)
            ? settings.screensaverDisplayIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))
            : []
        );
        setAvailableDisplays(Array.isArray(displays) ? displays : []);

        if (Array.isArray(savedWidgets) && savedWidgets.length > 0) {
          setEnabledWidgets(savedWidgets);
        }

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

    // Listen for layout editor closing to refresh enabled widgets
    let cleanup = null;
    let displayCleanup = null;
    if (window.electronAPI?.onLayoutEditorClosed) {
      cleanup = window.electronAPI.onLayoutEditorClosed(() => {
        if (isMounted) loadSettings();
      });
    }

    if (window.electronAPI?.onDisplaysChanged) {
      displayCleanup = window.electronAPI.onDisplaysChanged((displays) => {
        if (!isMounted) return;
        const nextDisplays = Array.isArray(displays) ? displays : [];
        setAvailableDisplays(nextDisplays);
        setScreensaverDisplayIds((prev) => {
          const validIds = new Set(nextDisplays.map((d) => Number(d.id)));
          const filtered = prev.filter((id) => validIds.has(Number(id)));
          return filtered;
        });
      });
    }

    return () => {
      isMounted = false;
      if (cleanup) cleanup();
      if (displayCleanup) displayCleanup();
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

      const primaryDisplay = availableDisplays.find((display) => display.primary);
      const fallbackDisplayIds = primaryDisplay ? [Number(primaryDisplay.id)] : [];
      const selectedDisplayIds = screensaverDisplayIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id));
      const displayIdsToSave = screensaverUseAllDisplays
        ? []
        : (selectedDisplayIds.length > 0 ? selectedDisplayIds : fallbackDisplayIds);

      await window.electronAPI.saveSettings({
        idleTimeout: Number(idleTimeout),
        slideshowInterval: Number(slideshowInterval),
        slideshowTransition,
        slideshowShuffle,
        useSpotifyArtBackground,
        spotifyPollInterval: Number(spotifyPollInterval),
        uiTheme,
        uiFont,
        screensaverUseAllDisplays,
        screensaverDisplayIds: displayIdsToSave,
        // Phase 5
        gnewsApiKey,
        alphaVantageApiKey,
        stockSymbols,
        cryptoCoinIds,
        sportsLeagues,
      });

      // Save enabled widgets separately
      await window.electronAPI?.saveEnabledWidgets?.(enabledWidgets);

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

  const handleToggleWidget = (widgetId, enabled) => {
    setEnabledWidgets((prev) => {
      if (enabled) {
        return prev.includes(widgetId) ? prev : [...prev, widgetId];
      }
      return prev.filter((id) => id !== widgetId);
    });
  };

  const handleApplyPreset = (presetKey) => {
    const preset = PRESETS[presetKey];
    if (preset) {
      setEnabledWidgets(preset.widgets);
    }
  };

  const handleResetLayout = async () => {
    await window.electronAPI?.resetWidgetLayout?.();
    setSaveMessage('Layout reset to default!');
    window.setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleEditLayout = () => {
    // Open the new dedicated layout editor window
    if (window.electronAPI?.openLayoutEditor) {
      window.electronAPI.openLayoutEditor();
    } else {
      setSaveMessage('Layout Editor API missing');
      window.setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleSportsLeagueToggle = (leagueId, checked) => {
    const currentLeagues = sportsLeagues.split(',').filter(Boolean);
    let updated;
    if (checked) {
      updated = [...new Set([...currentLeagues, leagueId])];
    } else {
      updated = currentLeagues.filter((id) => id !== leagueId);
    }
    setSportsLeagues(updated.join(','));
  };

  const handleDisplayToggle = (displayId, checked) => {
    setScreensaverDisplayIds((prev) => {
      if (checked) {
        return prev.includes(displayId) ? prev : [...prev, displayId];
      }
      return prev.filter((id) => id !== displayId);
    });
  };

  const handleUseAllDisplaysToggle = (checked) => {
    setScreensaverUseAllDisplays(checked);
    if (!checked && screensaverDisplayIds.length === 0) {
      const primaryDisplay = availableDisplays.find((display) => display.primary);
      if (primaryDisplay) {
        setScreensaverDisplayIds([Number(primaryDisplay.id)]);
      }
    }
  };

  const activeThemePreset = THEME_PRESETS[uiTheme] || THEME_PRESETS.aurora;
  const activeFontPreset = FONT_PRESETS[uiFont] || FONT_PRESETS.outfit;

  return (
    <div
      className="min-h-screen bg-slate-900 text-white font-sans relative overflow-hidden select-none"
      style={{ fontFamily: activeFontPreset.stack }}
    >
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

              <div className="mt-8 space-y-4">
                <ToggleSwitch
                  checked={screensaverUseAllDisplays}
                  onChange={handleUseAllDisplaysToggle}
                  label="Run on all displays"
                  description="Disable to target specific monitors."
                />

                {!screensaverUseAllDisplays && (
                  <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">
                      Target Displays
                    </p>
                    {availableDisplays.length === 0 && (
                      <p className="text-sm text-white/60">No displays detected.</p>
                    )}
                    <div className="grid sm:grid-cols-2 gap-3">
                      {availableDisplays.map((display) => (
                        <label
                          key={display.id}
                          className="flex items-center gap-3 rounded-xl bg-black/30 px-4 py-3 border border-white/10 cursor-pointer transition-all hover:bg-white/5"
                        >
                          <input
                            type="checkbox"
                            checked={screensaverDisplayIds.includes(Number(display.id))}
                            onChange={(e) => handleDisplayToggle(Number(display.id), e.target.checked)}
                            className="w-4 h-4 accent-indigo-500 rounded"
                          />
                          <span className="text-sm text-white/90">{display.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Appearance Section */}
            <section className="rounded-[2.5rem] border border-white/20 bg-white/10 p-8 backdrop-blur-2xl shadow-2xl transition-transform hover:scale-[1.01] duration-500">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white">Appearance</h2>
                <p className="mt-1 text-sm text-white/60">Choose theme colors and typography for widgets.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Theme</label>
                  <select
                    value={uiTheme}
                    onChange={(e) => setUiTheme(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-white/30 transition-shadow appearance-none cursor-pointer"
                  >
                    {Object.values(THEME_PRESETS).map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        {theme.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Font</label>
                  <select
                    value={uiFont}
                    onChange={(e) => setUiFont(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-white/30 transition-shadow appearance-none cursor-pointer"
                  >
                    {Object.values(FONT_PRESETS).map((font) => (
                      <option key={font.id} value={font.id}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                className="mt-6 rounded-2xl border p-5"
                style={{
                  background: activeThemePreset.widgetSurface,
                  borderColor: activeThemePreset.widgetBorder,
                }}
              >
                <p className="text-xs uppercase tracking-widest text-white/50 mb-2">Live Preview</p>
                <p
                  className="text-lg text-white"
                  style={{ fontFamily: activeFontPreset.stack }}
                >
                  The quick brown fox jumps over the lazy dog.
                </p>
                <p className="text-xs mt-2" style={{ color: activeThemePreset.accent }}>
                  Accent color preview
                </p>
              </div>
            </section>

            {/* Widgets Section — Phase 5 */}
            <section className="rounded-[2.5rem] border border-white/20 bg-white/10 p-8 backdrop-blur-2xl shadow-2xl transition-transform hover:scale-[1.01] duration-500">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white">Widgets</h2>
                <p className="mt-1 text-sm text-white/60">Toggle which widgets appear on the screensaver.</p>
              </div>

              <div className="space-y-3">
                {allWidgets.map((w) => (
                  <ToggleSwitch
                    key={w.id}
                    checked={enabledWidgets.includes(w.id)}
                    onChange={(checked) => handleToggleWidget(w.id, checked)}
                    label={w.name}
                    description={w.description}
                  />
                ))}
              </div>
            </section>

            {/* Layout Presets & Edit — Phase 5 */}
            <section className="rounded-[2.5rem] border border-white/20 bg-white/10 p-8 backdrop-blur-2xl shadow-2xl transition-transform hover:scale-[1.01] duration-500">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white">Layout Presets</h2>
                <p className="mt-1 text-sm text-white/60">Quick widget presets or customize your layout.</p>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                {Object.entries(PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => handleApplyPreset(key)}
                    className="rounded-2xl bg-black/20 p-4 border border-white/5 text-left transition-all hover:bg-white/10 hover:border-white/20 active:scale-95"
                  >
                    <p className="text-sm font-semibold text-white mb-1">{preset.label}</p>
                    <p className="text-xs text-white/50">{preset.description}</p>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleEditLayout}
                  className="flex-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 px-5 py-2.5 text-sm font-semibold text-indigo-200 transition-all hover:bg-indigo-500/30"
                >
                  ✏️ Edit Layout
                </button>
                <button
                  onClick={handleResetLayout}
                  className="flex-1 rounded-full bg-white/10 border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/80 transition-all hover:bg-white/20"
                >
                  ↺ Reset Layout
                </button>
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
                      <option value="zoom">Slow Zoom &amp; Fade</option>
                      <option value="slide">Smooth Slide</option>
                    </select>
                  </div>
                </div>

                <hr className="border-white/10" />

                {/* Toggles */}
                <div className="space-y-4">
                  <ToggleSwitch
                    checked={slideshowShuffle}
                    onChange={setSlideshowShuffle}
                    label="Shuffle Images"
                    description="Randomize slide order."
                  />
                  <ToggleSwitch
                    checked={useSpotifyArtBackground}
                    onChange={setUseSpotifyArtBackground}
                    label="Use Spotify Album Art"
                    description="Replace slideshow with current track's album art."
                  />
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

            {/* API Keys & Data Section — Phase 5 */}
            <section className="rounded-[2.5rem] border border-white/20 bg-white/10 p-8 backdrop-blur-2xl shadow-2xl transition-transform hover:scale-[1.01] duration-500">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white">API Keys &amp; Data</h2>
                <p className="mt-1 text-sm text-white/60">Configure data sources for your widgets.</p>
              </div>

              <div className="space-y-6">
                {/* GNews API Key */}
                <div>
                  <label className="block text-sm font-medium text-white mb-1">GNews API Key</label>
                  <p className="text-xs text-white/50 mb-2">For the News widget. Falls back to BBC RSS if empty.</p>
                  <input
                    type="text"
                    value={gnewsApiKey}
                    onChange={(e) => setGnewsApiKey(e.target.value)}
                    placeholder="Enter your GNews API key"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-white/30 transition-shadow placeholder:text-white/25"
                  />
                </div>

                {/* Alpha Vantage API Key */}
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Alpha Vantage API Key</label>
                  <p className="text-xs text-white/50 mb-2">For the Stocks widget. Falls back to Yahoo Finance if empty.</p>
                  <input
                    type="text"
                    value={alphaVantageApiKey}
                    onChange={(e) => setAlphaVantageApiKey(e.target.value)}
                    placeholder="Enter your Alpha Vantage API key"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-white/30 transition-shadow placeholder:text-white/25"
                  />
                </div>

                <hr className="border-white/10" />

                {/* Stock Symbols */}
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Stock Symbols</label>
                  <p className="text-xs text-white/50 mb-2">Comma-separated. Max 5 symbols.</p>
                  <input
                    type="text"
                    value={stockSymbols}
                    onChange={(e) => setStockSymbols(e.target.value)}
                    placeholder="AAPL,MSFT,GOOGL,AMZN,TSLA"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-white/30 transition-shadow placeholder:text-white/25 font-mono"
                  />
                </div>

                {/* Crypto Coin IDs */}
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Crypto Coin IDs</label>
                  <p className="text-xs text-white/50 mb-2">CoinGecko coin IDs, comma-separated.</p>
                  <input
                    type="text"
                    value={cryptoCoinIds}
                    onChange={(e) => setCryptoCoinIds(e.target.value)}
                    placeholder="bitcoin,ethereum,solana,binancecoin,cardano"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-white/30 transition-shadow placeholder:text-white/25 font-mono"
                  />
                </div>

                <hr className="border-white/10" />

                {/* Sports Leagues */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Sports Leagues</label>
                  <div className="grid grid-cols-2 gap-3">
                    {LEAGUE_OPTIONS.map((league) => (
                      <label
                        key={league.id}
                        className="flex items-center gap-3 rounded-xl bg-black/20 px-4 py-3 border border-white/5 cursor-pointer transition-all hover:bg-white/5"
                      >
                        <input
                          type="checkbox"
                          checked={sportsLeagues.split(',').includes(league.id)}
                          onChange={(e) => handleSportsLeagueToggle(league.id, e.target.checked)}
                          className="w-4 h-4 accent-indigo-500 rounded"
                        />
                        <span className="text-sm font-medium text-white">{league.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between p-2">
              <p className={`text-sm font-medium transition-opacity duration-300 ${saveMessage ? 'opacity-100' : 'opacity-0'} ${saveMessage.includes('saved') || saveMessage.includes('selected') || saveMessage.includes('reset') ? 'text-green-400' : 'text-amber-400'}`}>
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
