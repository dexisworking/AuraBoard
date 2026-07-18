import { useEffect, useMemo, useState } from 'react';
import SlideshowBackground from './slideshow/SlideshowBackground';
import { getAllWidgets } from './widgets/registry';
import { FONT_PRESETS, THEME_PRESETS } from './theme/presets';
import { applyTheme } from './theme/applyTheme';
import Onboarding from './app/Onboarding';

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

/* ── Toggle Switch component — Swiss/Brutalist: square track, accent fill ── */
function ToggleSwitch({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink">
          {label}
        </p>
        {description && (
          <p className="mt-0.5 text-[11px] uppercase tracking-[0.1em] text-ink-tertiary font-micro">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative h-6 w-12 shrink-0 border transition-colors duration-200"
        style={{
          borderColor: 'var(--ab-rule-strong)',
          background: checked ? 'var(--ab-accent)' : 'transparent',
        }}
      >
        <span
          className="absolute top-[2px] h-[18px] w-[18px] transition-all duration-200"
          style={{
            left: checked ? 'calc(100% - 20px)' : '2px',
            background: checked ? 'var(--ab-accent-ink)' : 'var(--ab-ink)',
          }}
        />
      </button>
    </div>
  );
}

/* ── Layout preset definitions ── */
const PRESETS = {
  full: {
    label: 'Full Board',
    description: 'All widgets visible',
    widgets: [
      'clock',
      'date',
      'greeting',
      'weather',
      'spotify',
      'news',
      'crypto',
      'stocks',
      'sports',
    ],
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
  // '' = the user's own folder is active; otherwise a built-in pack id.
  const [slideshowPack, setSlideshowPack] = useState('');
  const [packs, setPacks] = useState([]);
  const [switchingPack, setSwitchingPack] = useState('');
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
    'clock',
    'date',
    'greeting',
    'weather',
    'spotify',
  ]);
  const [gnewsApiKey, setGnewsApiKey] = useState('');
  const [alphaVantageApiKey, setAlphaVantageApiKey] = useState('');
  const [stockSymbols, setStockSymbols] = useState('AAPL,MSFT,GOOGL,AMZN,TSLA');
  const [cryptoCoinIds, setCryptoCoinIds] = useState(
    'bitcoin,ethereum,solana,binancecoin,cardano',
  );
  const [sportsLeagues, setSportsLeagues] = useState('4387,4328');
  const [availableDisplays, setAvailableDisplays] = useState([]);
  const [screensaverUseAllDisplays, setScreensaverUseAllDisplays] =
    useState(true);
  const [screensaverDisplayIds, setScreensaverDisplayIds] = useState([]);
  const [autostart, setAutostart] = useState(false);
  const [weatherLocation, setWeatherLocation] = useState('');
  // Calendar's .ics URL is per-widget config, not a top-level setting. We keep
  // the whole widgetConfig map so saving here can't clobber other widgets'
  // settings (or Calendar's own variant/use24hr) written by the Layout Editor.
  const [widgetConfig, setWidgetConfig] = useState({});
  const [calendarIcsUrl, setCalendarIcsUrl] = useState('');
  const [photoTreatment, setPhotoTreatment] = useState('mono');
  const [timeOfDayPalette, setTimeOfDayPalette] = useState(false);
  const [posterMomentInterval, setPosterMomentInterval] = useState(0);
  // null until settings load, so we don't flash onboarding at returning users
  const [showOnboarding, setShowOnboarding] = useState(null);

  const allWidgets = useMemo(() => getAllWidgets(), []);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      try {
        const [settings, folderImages, savedWidgets, displays, savedWidgetConfig, packList] =
          await Promise.all([
            window.electronAPI?.getSettings?.() ?? Promise.resolve({}),
            window.electronAPI?.getFolderImages?.() ?? Promise.resolve([]),
            window.electronAPI?.getEnabledWidgets?.() ?? Promise.resolve(null),
            window.electronAPI?.getDisplays?.() ?? Promise.resolve([]),
            window.electronAPI?.getWidgetConfig?.() ?? Promise.resolve({}),
            window.electronAPI?.listSlideshowPacks?.() ?? Promise.resolve([]),
          ]);

        if (!isMounted) {
          return;
        }

        setIdleTimeout(settings.idleTimeout ?? 5);
        setSlideshowFolder(settings.slideshowFolder ?? '');
        setSlideshowPack(settings.slideshowPack ?? '');
        setPacks(Array.isArray(packList) ? packList : []);
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
        setCryptoCoinIds(
          settings.cryptoCoinIds ??
            'bitcoin,ethereum,solana,binancecoin,cardano',
        );
        setSportsLeagues(settings.sportsLeagues ?? '4387,4328');
        setScreensaverUseAllDisplays(
          settings.screensaverUseAllDisplays ?? true,
        );
        setScreensaverDisplayIds(
          Array.isArray(settings.screensaverDisplayIds)
            ? settings.screensaverDisplayIds
                .map((id) => Number(id))
                .filter((id) => Number.isFinite(id))
            : [],
        );
        setAvailableDisplays(Array.isArray(displays) ? displays : []);
        setAutostart(Boolean(settings.autostart));
        setWeatherLocation(settings.weatherLocation ?? '');

        // Same source of truth the Layout Editor writes, so the two windows
        // never disagree. loadSettings() also re-runs when the editor closes.
        const cfg = savedWidgetConfig && typeof savedWidgetConfig === 'object'
          ? savedWidgetConfig
          : {};
        setWidgetConfig(cfg);
        setCalendarIcsUrl(cfg.calendar?.icsUrl ?? '');
        setPhotoTreatment(settings.photoTreatment ?? 'mono');
        setTimeOfDayPalette(Boolean(settings.timeOfDayPalette));
        setPosterMomentInterval(Number(settings.posterMomentInterval) || 0);
        setShowOnboarding(!settings.onboardingComplete);

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

  const imageCountLabel = useMemo(
    () => `Found ${images.length} images`,
    [images.length],
  );

  /**
   * Switch the background source. Passing the already-active pack id turns it
   * off, falling back to the user's own folder — so the row acts as a toggle
   * and there is always a way back without re-browsing.
   */
  const handleSelectPack = async (packId) => {
    const next = packId === slideshowPack ? '' : packId;
    setSwitchingPack(packId);
    setSaveMessage('');
    try {
      const nextImages = await window.electronAPI?.setSlideshowPack?.(next);
      setSlideshowPack(next);
      setImages(Array.isArray(nextImages) ? nextImages : []);
      if (!next) {
        setSaveMessage(slideshowFolder ? 'Using your own folder.' : 'No folder selected yet.');
      } else if (!nextImages?.length) {
        setSaveMessage('That pack has no images in this build.');
      }
    } catch (error) {
      console.error('Failed to switch slideshow pack:', error);
      setSaveMessage('Failed to switch background pack.');
    } finally {
      setSwitchingPack('');
      window.setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleChooseFolder = async () => {
    setIsSelectingFolder(true);
    setSaveMessage('');

    try {
      const selectedImages = await window.electronAPI?.selectImageFolder?.();
      const settings = await window.electronAPI?.getSettings?.();

      setImages(Array.isArray(selectedImages) ? selectedImages : []);
      setSlideshowFolder(settings?.slideshowFolder ?? '');
      // Main clears the active pack when a folder is picked; mirror that here so
      // the pack row stops showing as selected.
      setSlideshowPack(settings?.slideshowPack ?? '');

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

      const primaryDisplay = availableDisplays.find(
        (display) => display.primary,
      );
      const fallbackDisplayIds = primaryDisplay
        ? [Number(primaryDisplay.id)]
        : [];
      const selectedDisplayIds = screensaverDisplayIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id));
      const displayIdsToSave = screensaverUseAllDisplays
        ? []
        : selectedDisplayIds.length > 0
          ? selectedDisplayIds
          : fallbackDisplayIds;

      console.log('[React SaveSettings payload]:', {
        weatherLocation,
        uiTheme,
        autostart,
      });
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
        autostart,
        weatherLocation,
        photoTreatment,
        timeOfDayPalette,
        posterMomentInterval,
      });

      // Save enabled widgets separately
      await window.electronAPI?.saveEnabledWidgets?.(enabledWidgets);

      // Calendar URL lives in widgetConfig, not settings. Merge so we preserve
      // Calendar's other keys (variant, use24hr) and every other widget's config.
      const nextWidgetConfig = {
        ...widgetConfig,
        calendar: { ...(widgetConfig.calendar ?? {}), icsUrl: calendarIcsUrl.trim() },
      };
      await window.electronAPI?.saveWidgetConfig?.(nextWidgetConfig);
      setWidgetConfig(nextWidgetConfig);

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
      const primaryDisplay = availableDisplays.find(
        (display) => display.primary,
      );
      if (primaryDisplay) {
        setScreensaverDisplayIds([Number(primaryDisplay.id)]);
      }
    }
  };

  // Keep :root tokens in sync so the settings chrome and live previews render
  // in the theme being edited.
  useEffect(() => {
    applyTheme(uiTheme);
  }, [uiTheme]);

  const activeThemePreset = THEME_PRESETS[uiTheme] || THEME_PRESETS.aurora;
  const activeFontPreset = FONT_PRESETS[uiFont] || FONT_PRESETS.outfit;

  // First run: take over the settings window with the setup flow.
  if (showOnboarding) {
    return (
      <Onboarding
        onComplete={async () => {
          setShowOnboarding(false);
          // pick up whatever onboarding just wrote
          try {
            const s = await window.electronAPI?.getSettings?.();
            if (s) {
              setUiTheme(s.uiTheme ?? 'aurora');
              setSlideshowFolder(s.slideshowFolder ?? '');
            }
            const w = await window.electronAPI?.getEnabledWidgets?.();
            if (Array.isArray(w) && w.length) setEnabledWidgets(w);
          } catch { /* non-fatal */ }
        }}
      />
    );
  }

  return (
    <div
      className="min-h-screen text-ink relative overflow-hidden select-none"
      style={{ fontFamily: activeFontPreset.stack, background: 'var(--ab-bg)' }}
    >
      {/* Swiss ground: one hard-edged accent disc cropped top-right, faint grid */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="absolute"
          style={{
            top: '-40vh',
            right: '-12vw',
            width: '70vh',
            height: '70vh',
            borderRadius: '50%',
            background: 'var(--ab-accent)',
            opacity: 0.14,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, var(--ab-rule) 0 1px, transparent 1px 8.333%)',
            opacity: 0.14,
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col h-screen">
        {/* Draggable Titlebar */}
        <div
          className="h-12 w-full flex items-center justify-between px-6 shrink-0 border-b"
          style={{ WebkitAppRegion: 'drag', borderColor: 'var(--ab-rule)' }}
        >
          <p className="text-[11px] font-micro font-semibold uppercase tracking-[0.28em] text-accent">
            AuraBoard
          </p>
          <p className="text-[11px] font-micro font-semibold uppercase tracking-[0.2em] text-ink-tertiary">
            Configuration
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-12 pt-4 scrollbar-hide">
          <div className="mx-auto w-full max-w-3xl space-y-6">
            <div className="mb-10 pt-6">
              <h1
                className="ab-display text-ink"
                style={{ fontSize: 88, lineHeight: 0.9 }}
              >
                Settings
              </h1>
              <div className="ab-rule-strong mt-4 pt-3">
                <p className="text-[11px] font-micro font-semibold uppercase tracking-[0.2em] text-ink-tertiary">
                  Configure your ambient display
                </p>
              </div>
            </div>

            {/* General Section */}
            <section className="border border-surface-border bg-surface p-7 ab-reveal ab-reveal-d1">
              <div className="mb-6">
                <h2 className="text-xl font-bold uppercase tracking-[0.02em] text-ink font-ui">
                  General
                </h2>
                <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-ink-tertiary font-micro">
                  Idle activation timing for the screensaver shell.
                </p>
              </div>

              <div className="flex items-center justify-between gap-6">
                <div className="flex-1">
                  <label
                    htmlFor="idle-timeout"
                    className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-ink mb-1"
                  >
                    Idle Timeout
                  </label>
                  <p className="text-xs text-ink-tertiary">
                    Minutes before screensaver activates.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    id="idle-timeout"
                    type="range"
                    min="1"
                    max="60"
                    value={idleTimeout}
                    onChange={(event) => setIdleTimeout(event.target.value)}
                    className="w-32 accent-[color:var(--ab-accent)] h-1.5 bg-[color:var(--ab-rule)] appearance-none cursor-pointer"
                  />
                  <span className="w-12 text-right text-sm font-medium text-ink">
                    {idleTimeout}m
                  </span>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <ToggleSwitch
                  checked={screensaverUseAllDisplays}
                  onChange={handleUseAllDisplaysToggle}
                  label="Run on all displays"
                  description="Disable to target specific monitors."
                />

                <ToggleSwitch
                  checked={autostart}
                  onChange={setAutostart}
                  label="Launch at startup"
                  description="Start AuraBoard automatically when your computer turns on."
                />

                {!screensaverUseAllDisplays && (
                  <div className="bg-ground border border-[color:var(--ab-rule)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-tertiary mb-3">
                      Target Displays
                    </p>
                    {availableDisplays.length === 0 && (
                      <p className="text-sm text-ink-secondary">
                        No displays detected.
                      </p>
                    )}
                    <div className="grid sm:grid-cols-2 gap-3">
                      {availableDisplays.map((display) => (
                        <label
                          key={display.id}
                          className="flex items-center gap-3 bg-ground px-4 py-3 border border-[color:var(--ab-rule)] cursor-pointer transition-all hover:bg-transparent"
                        >
                          <input
                            type="checkbox"
                            checked={screensaverDisplayIds.includes(
                              Number(display.id),
                            )}
                            onChange={(e) =>
                              handleDisplayToggle(
                                Number(display.id),
                                e.target.checked,
                              )
                            }
                            className="w-4 h-4 accent-[color:var(--ab-accent)]"
                          />
                          <span className="text-sm text-ink">
                            {display.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Appearance Section */}
            <section className="border border-surface-border bg-surface p-7 ab-reveal ab-reveal-d2">
              <div className="mb-6">
                <h2 className="text-xl font-bold uppercase tracking-[0.02em] text-ink font-ui">
                  Appearance
                </h2>
                <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-ink-tertiary font-micro">
                  Choose theme colors and typography for widgets.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-ink mb-2">
                    Theme
                  </label>
                  <select
                    value={uiTheme}
                    onChange={(e) => setUiTheme(e.target.value)}
                    className="w-full border border-surface-border bg-ground px-4 py-2.5 text-[13px] uppercase tracking-[0.08em] text-ink outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
                  >
                    {Object.values(THEME_PRESETS).map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        {theme.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-ink mb-2">
                    Font
                  </label>
                  <select
                    value={uiFont}
                    onChange={(e) => setUiFont(e.target.value)}
                    className="w-full border border-surface-border bg-ground px-4 py-2.5 text-[13px] uppercase tracking-[0.08em] text-ink outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
                  >
                    {Object.values(FONT_PRESETS).map((font) => (
                      <option key={font.id} value={font.id}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Photo treatment + ambient behaviour */}
              <div className="grid sm:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-ink mb-1">
                    Photo Treatment
                  </label>
                  <p className="text-xs text-ink-tertiary mb-2">
                    How slideshow photos are rendered behind the board.
                  </p>
                  <select
                    value={photoTreatment}
                    onChange={(e) => setPhotoTreatment(e.target.value)}
                    className="w-full border border-surface-border bg-ground px-4 py-2.5 text-[13px] uppercase tracking-[0.08em] text-ink outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
                  >
                    <option value="mono">Monochrome</option>
                    <option value="duotone">Duotone (accent)</option>
                    <option value="none">Full colour</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-ink mb-1">
                    Poster Moment
                  </label>
                  <p className="text-xs text-ink-tertiary mb-2">
                    Briefly fill the screen with one giant element. 0 = off.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="60"
                      step="5"
                      value={posterMomentInterval}
                      onChange={(e) => setPosterMomentInterval(Number(e.target.value))}
                      className="flex-1 accent-[color:var(--ab-accent)] h-[3px] bg-[color:var(--ab-rule)] appearance-none cursor-pointer"
                    />
                    <span className="w-16 text-right text-[12px] font-micro uppercase tracking-[0.1em] text-ink">
                      {posterMomentInterval ? `${posterMomentInterval} min` : 'Off'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <ToggleSwitch
                  checked={timeOfDayPalette}
                  onChange={setTimeOfDayPalette}
                  label="Time-of-day palette"
                  description="Drift the palette through dawn, day, dusk and night."
                />
              </div>

              <div
                className="mt-6 border p-5"
                style={{
                  background: activeThemePreset.widgetSurface,
                  borderColor: activeThemePreset.widgetBorder,
                }}
              >
                <p className="text-xs uppercase tracking-widest text-ink-tertiary mb-2">
                  Live Preview
                </p>
                <p
                  className="text-lg text-ink"
                  style={{ fontFamily: activeFontPreset.stack }}
                >
                  The quick brown fox jumps over the lazy dog.
                </p>
                <p
                  className="text-xs mt-2"
                  style={{ color: activeThemePreset.accent }}
                >
                  Accent color preview
                </p>
              </div>
            </section>

            {/* Widgets Section — Phase 5 */}
            <section className="border border-surface-border bg-surface p-7 ab-reveal ab-reveal-d3">
              <div className="mb-6">
                <h2 className="text-xl font-bold uppercase tracking-[0.02em] text-ink font-ui">
                  Widgets
                </h2>
                <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-ink-tertiary font-micro">
                  Toggle which widgets appear on the screensaver.
                </p>
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
            <section className="border border-surface-border bg-surface p-7 ab-reveal ab-reveal-d4">
              <div className="mb-6">
                <h2 className="text-xl font-bold uppercase tracking-[0.02em] text-ink font-ui">
                  Layout Presets
                </h2>
                <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-ink-tertiary font-micro">
                  Quick widget presets or customize your layout.
                </p>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                {Object.entries(PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => handleApplyPreset(key)}
                    className="border border-surface-border bg-ground p-4 text-left transition-colors hover:border-accent group"
                  >
                    <p className="text-[13px] font-bold uppercase tracking-[0.06em] text-ink mb-1 group-hover:text-accent">
                      {preset.label}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.1em] text-ink-tertiary font-micro">
                      {preset.description}
                    </p>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleEditLayout}
                  className="flex-1 border border-accent text-accent px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] font-micro transition-colors hover:bg-accent hover:text-[color:var(--ab-accent-ink)]"
                >
                  Edit Layout
                </button>
                <button
                  onClick={handleResetLayout}
                  className="flex-1 border border-ink text-ink px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] font-micro transition-colors hover:bg-ink hover:text-ground"
                >
                  Reset Layout
                </button>
              </div>
            </section>

            {/* Background Section */}
            <section className="border border-surface-border bg-surface p-7 ab-reveal ab-reveal-d5">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold uppercase tracking-[0.02em] text-ink font-ui">
                    Background
                  </h2>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-ink-tertiary font-micro">
                    Pick a built-in pack, or point at your own folder.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Built-in packs */}
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-accent mb-3 font-micro font-semibold">
                    Built-in Packs
                  </p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {packs.map((pack) => {
                      const active = pack.id === slideshowPack;
                      const empty = pack.count === 0;
                      const busy = switchingPack === pack.id;
                      return (
                        <button
                          key={pack.id}
                          onClick={() => handleSelectPack(pack.id)}
                          disabled={empty || Boolean(switchingPack)}
                          title={empty
                            ? 'This build ships without images for this pack. Run "npm run packs:sync" and rebuild.'
                            : pack.description}
                          className="text-left border p-4 transition-colors disabled:cursor-not-allowed"
                          style={{
                            borderColor: active ? 'var(--ab-accent)' : 'var(--ab-surface-border)',
                            background: active ? 'var(--ab-accent)' : 'transparent',
                            color: active ? 'var(--ab-accent-ink)' : 'var(--ab-ink)',
                            opacity: empty ? 0.45 : 1,
                          }}
                        >
                          <span className="block text-[12px] font-semibold uppercase tracking-[0.1em]">
                            {pack.name}
                          </span>
                          <span
                            className="block text-[10px] uppercase tracking-[0.1em] font-micro mt-1"
                            style={{ color: active ? 'var(--ab-accent-ink)' : 'var(--ab-ink-tertiary)' }}
                          >
                            {busy
                              ? 'Switching…'
                              : empty
                                ? 'Not in this build'
                                : `${pack.count} image${pack.count === 1 ? '' : 's'}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {slideshowPack && (
                    <p className="text-xs text-ink-tertiary mt-2">
                      Click the active pack again to go back to your own folder.
                    </p>
                  )}
                </div>

                <hr className="border-[color:var(--ab-rule)]" />

                {/* Folder Selection */}
                <div
                  className="bg-ground p-5 border border-[color:var(--ab-surface-border)]"
                  style={{ opacity: slideshowPack ? 0.5 : 1 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 truncate pr-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-ink-tertiary mb-1">
                        Source Folder
                      </p>
                      <p className="text-sm text-ink truncate">
                        {slideshowFolder || 'No folder selected'}
                      </p>
                      <p className="text-xs text-ink-tertiary mt-1">
                        {slideshowPack ? 'Overridden by the selected pack' : imageCountLabel}
                      </p>
                    </div>
                    <button
                      onClick={handleChooseFolder}
                      disabled={isSelectingFolder}
                      className="shrink-0 border border-ink text-ink px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] font-micro transition-colors hover:bg-ink hover:text-ground disabled:opacity-50"
                    >
                      {isSelectingFolder ? 'Opening...' : 'Browse'}
                    </button>
                  </div>
                </div>

                {/* Slideshow Settings Grid */}
                <div className="grid sm:grid-cols-2 gap-6">
                  {/* Interval */}
                  <div>
                    <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-ink mb-1">
                      Interval
                    </label>
                    <p className="text-xs text-ink-tertiary mb-3">
                      Time between slides.
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="10"
                        max="600"
                        step="10"
                        value={slideshowInterval}
                        onChange={(event) =>
                          setSlideshowInterval(Number(event.target.value))
                        }
                        className="flex-1 accent-[color:var(--ab-accent)] h-1.5 bg-[color:var(--ab-rule)] appearance-none cursor-pointer"
                      />
                      <span className="w-16 text-right text-sm font-medium text-ink">
                        {formatInterval(Number(slideshowInterval))}
                      </span>
                    </div>
                  </div>

                  {/* Transition Style */}
                  <div>
                    <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-ink mb-1">
                      Transition Style
                    </label>
                    <p className="text-xs text-ink-tertiary mb-3">
                      Animation between images.
                    </p>
                    <select
                      value={slideshowTransition}
                      onChange={(event) =>
                        setSlideshowTransition(event.target.value)
                      }
                      className="w-full border border-surface-border bg-ground px-4 py-2.5 text-[13px] uppercase tracking-[0.08em] text-ink outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
                    >
                      <option value="fade">Crossfade Effect</option>
                      <option value="zoom">Slow Zoom &amp; Fade</option>
                      <option value="slide">Smooth Slide</option>
                    </select>
                  </div>
                </div>

                <hr className="border-[color:var(--ab-rule)]" />

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
                    className="border border-ink text-ink px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] font-micro transition-colors hover:bg-ink hover:text-ground"
                  >
                    Preview Slideshow
                  </button>
                </div>
              </div>
            </section>

            {/* Spotify Section */}
            <section className="border border-surface-border bg-surface p-7 ab-reveal ab-reveal-d6">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-ink text-[var(--ab-accent)]">
                    Spotify Integration
                  </h2>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-ink-tertiary font-micro">
                    Control playback natively on your screen.
                  </p>
                </div>
                {spotifyAuthed ? (
                  <button
                    onClick={async () => {
                      await window.electronAPI?.spotify?.disconnect();
                      setSpotifyAuthed(false);
                      setSpotifyUsername('');
                    }}
                    className="border border-[color:var(--ab-negative)] text-[color:var(--ab-negative)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] font-micro transition-colors hover:bg-[color:var(--ab-negative)] hover:text-ground"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      setSpotifyConnecting(true);
                      try {
                        const result =
                          await window.electronAPI?.spotify?.auth();
                        if (result?.success) {
                          setSpotifyAuthed(true);
                          const name =
                            await window.electronAPI?.spotify?.getUsername();
                          setSpotifyUsername(name || '');
                        }
                      } catch {
                        /* ignore */
                      }
                      setSpotifyConnecting(false);
                    }}
                    disabled={spotifyConnecting}
                    className="border border-ink bg-ink text-ground px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] font-micro transition-colors hover:bg-transparent hover:text-ink disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {spotifyConnecting
                      ? 'Authenticating...'
                      : 'Connect to Spotify'}
                  </button>
                )}
              </div>

              {spotifyAuthed && (
                <div className="space-y-6">
                  <div className="bg-ground p-4 border border-[color:var(--ab-surface-border)] flex items-center gap-4">
                    <div className="h-10 w-10 bg-[color:var(--ab-accent)]/15 flex items-center justify-center shrink-0">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="var(--ab-accent)"
                      >
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-ink-tertiary mb-0.5">
                        Connected Account
                      </p>
                      <p className="text-sm font-medium text-ink">
                        {spotifyUsername || 'Spotify User'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-6">
                    <div className="flex-1">
                      <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-ink mb-1">
                        Polling Interval
                      </label>
                      <p className="text-xs text-ink-tertiary">
                        Refresh rate for current track info.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={spotifyPollInterval}
                        onChange={(e) =>
                          setSpotifyPollInterval(Number(e.target.value))
                        }
                        className="w-32 accent-[color:var(--ab-accent)] h-1.5 bg-[color:var(--ab-rule)] appearance-none cursor-pointer"
                      />
                      <span className="w-12 text-right text-sm font-medium text-ink">
                        {spotifyPollInterval}s
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* API Keys & Data Section — Phase 5 */}
            <section className="border border-surface-border bg-surface p-7 ab-reveal ab-reveal-d7">
              <div className="mb-6">
                <h2 className="text-xl font-bold uppercase tracking-[0.02em] text-ink font-ui">
                  API Keys &amp; Data
                </h2>
                <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-ink-tertiary font-micro">
                  Configure data sources for your widgets.
                </p>
              </div>

              <div className="space-y-6">
                {/* Weather Location */}
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-ink mb-1">
                    Weather Location
                  </label>
                  <p className="text-xs text-ink-tertiary mb-2">
                    City name or location (e.g. "Paris", "New York", "Cuttack"). Falls back to auto IP-detection if empty.
                  </p>
                  <input
                    type="text"
                    value={weatherLocation}
                    onChange={(e) => setWeatherLocation(e.target.value)}
                    placeholder="Enter city or location"
                    className="w-full border border-surface-border bg-ground px-4 py-2.5 text-[13px] text-ink outline-none focus:border-accent transition-colors placeholder:text-ink-tertiary"
                  />
                </div>

                <hr className="border-[color:var(--ab-rule)]" />

                {/* Calendar .ics URL — mirrors the Layout Editor's Calendar
                    field; both write widgetConfig.calendar.icsUrl. */}
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-ink mb-1">
                    Calendar URL
                  </label>
                  <p className="text-xs text-ink-tertiary mb-2">
                    Secret address in iCal format (.ics) for a subscribed calendar. Google Calendar: Settings → your calendar → "Secret address in iCal format".
                  </p>
                  <input
                    type="text"
                    value={calendarIcsUrl}
                    onChange={(e) => setCalendarIcsUrl(e.target.value)}
                    placeholder="https://…/basic.ics"
                    className="w-full border border-surface-border bg-ground px-4 py-2.5 text-[13px] text-ink outline-none focus:border-accent transition-colors placeholder:text-ink-tertiary"
                  />
                  {!enabledWidgets.includes('calendar') && (
                    <p className="text-xs text-ink-tertiary mt-2">
                      The Calendar widget is currently off — enable it in the Layout Editor to see this on the board.
                    </p>
                  )}
                </div>

                <hr className="border-[color:var(--ab-rule)]" />

                {/* GNews API Key */}
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-ink mb-1">
                    GNews API Key
                  </label>
                  <p className="text-xs text-ink-tertiary mb-2">
                    For the News widget. Falls back to BBC RSS if empty.
                  </p>
                  <input
                    type="text"
                    value={gnewsApiKey}
                    onChange={(e) => setGnewsApiKey(e.target.value)}
                    placeholder="Enter your GNews API key"
                    className="w-full border border-surface-border bg-ground px-4 py-2.5 text-[13px] text-ink outline-none focus:border-accent transition-colors placeholder:text-ink-tertiary"
                  />
                </div>

                {/* Alpha Vantage API Key */}
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-ink mb-1">
                    Alpha Vantage API Key
                  </label>
                  <p className="text-xs text-ink-tertiary mb-2">
                    For the Stocks widget. Falls back to Yahoo Finance if empty.
                  </p>
                  <input
                    type="text"
                    value={alphaVantageApiKey}
                    onChange={(e) => setAlphaVantageApiKey(e.target.value)}
                    placeholder="Enter your Alpha Vantage API key"
                    className="w-full border border-surface-border bg-ground px-4 py-2.5 text-[13px] text-ink outline-none focus:border-accent transition-colors placeholder:text-ink-tertiary"
                  />
                </div>

                <hr className="border-[color:var(--ab-rule)]" />

                {/* Stock Symbols */}
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-ink mb-1">
                    Stock Symbols
                  </label>
                  <p className="text-xs text-ink-tertiary mb-2">
                    Comma-separated. Max 5 symbols.
                  </p>
                  <input
                    type="text"
                    value={stockSymbols}
                    onChange={(e) => setStockSymbols(e.target.value)}
                    placeholder="AAPL,MSFT,GOOGL,AMZN,TSLA"
                    className="w-full border border-surface-border bg-ground px-4 py-2.5 text-[13px] text-ink outline-none focus:border-accent transition-colors placeholder:text-ink-tertiary font-micro tracking-[0.06em]"
                  />
                </div>

                {/* Crypto Coin IDs */}
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-ink mb-1">
                    Crypto Coin IDs
                  </label>
                  <p className="text-xs text-ink-tertiary mb-2">
                    CoinGecko coin IDs, comma-separated.
                  </p>
                  <input
                    type="text"
                    value={cryptoCoinIds}
                    onChange={(e) => setCryptoCoinIds(e.target.value)}
                    placeholder="bitcoin,ethereum,solana,binancecoin,cardano"
                    className="w-full border border-surface-border bg-ground px-4 py-2.5 text-[13px] text-ink outline-none focus:border-accent transition-colors placeholder:text-ink-tertiary font-micro tracking-[0.06em]"
                  />
                </div>

                <hr className="border-[color:var(--ab-rule)]" />

                {/* Sports Leagues */}
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-ink mb-2">
                    Sports Leagues
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {LEAGUE_OPTIONS.map((league) => (
                      <label
                        key={league.id}
                        className="flex items-center gap-3 bg-ground px-4 py-3 border border-[color:var(--ab-surface-border)] cursor-pointer transition-all hover:bg-transparent"
                      >
                        <input
                          type="checkbox"
                          checked={sportsLeagues.split(',').includes(league.id)}
                          onChange={(e) =>
                            handleSportsLeagueToggle(
                              league.id,
                              e.target.checked,
                            )
                          }
                          className="w-4 h-4 accent-[color:var(--ab-accent)]"
                        />
                        <span className="text-sm font-medium text-ink">
                          {league.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between p-2">
              <p
                className={`text-sm font-medium transition-opacity duration-300 ${saveMessage ? 'opacity-100' : 'opacity-0'} ${saveMessage.includes('saved') || saveMessage.includes('selected') || saveMessage.includes('reset') ? 'text-[color:var(--ab-positive)]' : 'text-[color:var(--ab-warning)]'}`}
              >
                {saveMessage || ' '}
              </p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    handleSave();
                    window.electronAPI?.startScreensaver?.();
                  }}
                  className="border border-ink text-ink px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] font-micro transition-colors hover:bg-ink hover:text-ground"
                >
                  Start Screensaver
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-accent text-[color:var(--ab-accent-ink)] px-8 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] font-micro transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isPreviewing && (
        <div className="fixed inset-0 z-50 bg-[color:var(--ab-bg)]/90 backdrop-blur-md flex items-center justify-center p-12">
          <div className="relative w-full h-full max-w-6xl overflow-hidden border border-[color:var(--ab-rule)]">
            <SlideshowBackground
              key={previewSeed}
              images={images}
              interval={1}
              transition={slideshowTransition}
              shuffle={slideshowShuffle}
            />
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-[color:var(--ab-bg)] via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-8 left-8 z-20">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-tertiary">
                Preview Mode
              </p>
              <p className="mt-1 text-3xl font-light text-ink">
                {slideshowTransition === 'fade'
                  ? 'Crossfade'
                  : slideshowTransition === 'zoom'
                    ? 'Zoom'
                    : 'Slide'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
