import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import WidgetGrid from './layout/WidgetGrid';
import { getAllWidgets, getDefaultVariant } from './widgets/registry';
import { getFontPreset, getThemePreset } from './theme/presets';
import { applyTheme } from './theme/applyTheme';

const ENABLED_WIDGET_SAVE_DEBOUNCE_MS = 120;

export default function LayoutEditorApp() {
  const allWidgets = useMemo(() => getAllWidgets(), []);
  const [enabledWidgets, setEnabledWidgets] = useState([
    'clock', 'date', 'greeting', 'weather', 'spotify',
  ]);
  const [uiTheme, setUiTheme] = useState('aurora');
  const [uiFont, setUiFont] = useState('outfit');
  const [userName, setUserName] = useState('');
  const [weatherLocation, setWeatherLocation] = useState('');
  const [widgetConfig, setWidgetConfig] = useState({});
  const [isClosing, setIsClosing] = useState(false);
  const [showWidgetManager, setShowWidgetManager] = useState(false);
  const latestDraftLayoutRef = useRef(null);
  const latestEnabledWidgetsRef = useRef(enabledWidgets);
  const enabledWidgetsSaveTimerRef = useRef(null);

  // Load enabled widgets on mount so the layout engine knows what to render
  useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      try {
        const [savedWidgets, settings, savedConfig] = await Promise.all([
          window.electronAPI?.getEnabledWidgets?.(),
          window.electronAPI?.getSettings?.(),
          window.electronAPI?.getWidgetConfig?.() ?? Promise.resolve({}),
        ]);
        if (!isMounted) return;
        if (Array.isArray(savedWidgets) && savedWidgets.length > 0) {
          setEnabledWidgets(savedWidgets);
        }
        setUiTheme(settings?.uiTheme ?? 'aurora');
        setUiFont(settings?.uiFont ?? 'outfit');
        setUserName(settings?.userName ?? '');
        setWeatherLocation(settings?.weatherLocation ?? '');
        setWidgetConfig(savedConfig && typeof savedConfig === 'object' ? savedConfig : {});
      } catch (error) {
        console.error('Failed to load enabled widgets in layout editor:', error);
      }
    }
    loadSettings();
    return () => { isMounted = false; };
  }, []);

  // Change a widget's variant and persist immediately.
  const handleSetVariant = useCallback((widgetId, variantId) => {
    setWidgetConfig((prev) => {
      const next = { ...prev, [widgetId]: { ...(prev[widgetId] || {}), variant: variantId } };
      void window.electronAPI?.saveWidgetConfig?.(next);
      return next;
    });
  }, []);

  useEffect(() => {
    latestEnabledWidgetsRef.current = enabledWidgets;
  }, [enabledWidgets]);

  // Push theme tokens onto :root so the editor previews exactly what the
  // screensaver will render.
  useEffect(() => {
    applyTheme(uiTheme);
  }, [uiTheme]);

  const persistEnabledWidgets = useCallback((widgets, immediate = false) => {
    const next = Array.isArray(widgets) ? widgets : [];
    latestEnabledWidgetsRef.current = next;

    const save = () => {
      void window.electronAPI?.saveEnabledWidgets?.(latestEnabledWidgetsRef.current);
    };

    if (immediate) {
      if (enabledWidgetsSaveTimerRef.current) {
        clearTimeout(enabledWidgetsSaveTimerRef.current);
        enabledWidgetsSaveTimerRef.current = null;
      }
      save();
      return;
    }

    if (enabledWidgetsSaveTimerRef.current) {
      clearTimeout(enabledWidgetsSaveTimerRef.current);
    }
    enabledWidgetsSaveTimerRef.current = setTimeout(() => {
      enabledWidgetsSaveTimerRef.current = null;
      save();
    }, ENABLED_WIDGET_SAVE_DEBOUNCE_MS);
  }, []);

  useEffect(() => () => {
    if (enabledWidgetsSaveTimerRef.current) {
      clearTimeout(enabledWidgetsSaveTimerRef.current);
    }
  }, []);

  const updateEnabledWidgets = useCallback((updater, immediateSave = false) => {
    setEnabledWidgets((prev) => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      persistEnabledWidgets(updated, immediateSave);
      return updated;
    });
  }, [persistEnabledWidgets]);

  const handleRemoveWidget = useCallback((widgetId) => {
    updateEnabledWidgets((prev) => prev.filter((id) => id !== widgetId));
  }, [updateEnabledWidgets]);

  const handleToggleWidget = useCallback((widgetId, checked) => {
    updateEnabledWidgets((prev) => {
      if (checked) {
        return prev.includes(widgetId) ? prev : [...prev, widgetId];
      }
      return prev.filter((id) => id !== widgetId);
    });
  }, [updateEnabledWidgets]);

  const handleLayoutDraftChange = useCallback((draftLayout) => {
    if (!Array.isArray(draftLayout)) return;
    latestDraftLayoutRef.current = draftLayout;
  }, []);

  const handleClose = useCallback(async () => {
    if (isClosing) return;
    setIsClosing(true);

    try {
      if (enabledWidgetsSaveTimerRef.current) {
        clearTimeout(enabledWidgetsSaveTimerRef.current);
        enabledWidgetsSaveTimerRef.current = null;
      }
      await window.electronAPI?.saveEnabledWidgets?.(latestEnabledWidgetsRef.current);

      if (Array.isArray(latestDraftLayoutRef.current)) {
        await window.electronAPI?.saveWidgetLayout?.(latestDraftLayoutRef.current);
      }
    } catch (error) {
      console.error('Failed to save layout before closing editor:', error);
    } finally {
      window.close(); // Ask Electron to close this window
    }
  }, [isClosing]);

  const themePreset = getThemePreset(uiTheme);
  const fontPreset = getFontPreset(uiFont);

  return (
    <div
      className="w-screen h-screen flex flex-col relative overflow-hidden select-none"
      style={{
        backgroundColor: themePreset.background,
        fontFamily: fontPreset.stack,
        // Theme variables come exclusively from applyTheme() on :root —
        // re-declaring them here would shadow the token channel.
      }}
    >
      
      {/* ── Swiss ground ── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="absolute"
          style={{
            top: '-45vh', right: '-12vw', width: '75vh', height: '75vh',
            borderRadius: '50%', background: 'var(--ab-accent)', opacity: 0.10,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'repeating-linear-gradient(90deg, var(--ab-rule) 0 1px, transparent 1px 8.333%)',
            opacity: 0.12,
          }}
        />
      </div>

      {/* ── Top Bar ── */}
      <div
        className="titlebar absolute top-0 left-0 w-full h-16 pointer-events-none z-50 flex items-center justify-between px-6 border-b"
        style={{ borderColor: 'var(--ab-rule)' }}
      >
        <div>
          <h1 className="ab-display text-ink" style={{ fontSize: 26, lineHeight: 1 }}>Layout Editor</h1>
          <p className="text-ink-tertiary text-[10px] uppercase tracking-[0.22em] font-micro font-semibold mt-0.5">Drag to move · Resize from any edge</p>
        </div>

        <div className="no-drag pointer-events-auto flex items-center gap-3">
          <button
            onClick={() => setShowWidgetManager((prev) => !prev)}
            disabled={isClosing}
            className="border border-accent text-accent px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] font-micro transition-colors hover:bg-accent hover:text-[color:var(--ab-accent-ink)] disabled:opacity-50"
          >
            Widgets {enabledWidgets.length}/{allWidgets.length}
          </button>
          <button
            onClick={handleClose}
            disabled={isClosing}
            className="bg-accent text-[color:var(--ab-accent-ink)] px-6 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] font-micro transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isClosing ? 'Saving…' : 'Done'}
          </button>
        </div>
      </div>

      {/* ── Grid Container ── */}
      <div className="relative z-10 w-full flex-1 pt-12 pb-4 px-4 overflow-hidden">
        {/* We reuse the exact same WidgetGrid component from App.jsx, forcing editMode to true */}
        <WidgetGrid
          editMode={true}
          enabledWidgets={enabledWidgets}
          widgetConfig={widgetConfig}
          userName={userName}
          weatherLocation={weatherLocation}
          onRemoveWidget={handleRemoveWidget}
          onLayoutDraftChange={handleLayoutDraftChange}
        />
      </div>

      {showWidgetManager && (
        <div
          className="absolute top-20 right-6 z-[70] w-80 max-h-[70vh] overflow-y-auto border p-4 scrollbar-hide"
          style={{
            background: 'var(--ab-surface)',
            borderColor: 'var(--ab-rule-strong)',
            animation: 'ab-panel-slide-in 320ms cubic-bezier(0.16, 1, 0.3, 1) both',
          }}
        >
          <p className="text-[10px] uppercase tracking-[0.22em] text-accent mb-3 font-micro font-semibold">
            Add / Remove Widgets
          </p>
          <div className="space-y-2">
            {allWidgets.map((widget) => {
              const checked = enabledWidgets.includes(widget.id);
              return (
                <label
                  key={widget.id}
                  className="flex items-start gap-3 border p-3 cursor-pointer transition-colors"
                  style={{
                    background: 'var(--ab-bg)',
                    borderColor: checked ? 'var(--ab-accent)' : 'var(--ab-surface-border)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => handleToggleWidget(widget.id, e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[color:var(--ab-accent)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-[12px] uppercase tracking-[0.06em] text-ink font-semibold">{widget.name}</span>
                    <span className="block text-[10px] uppercase tracking-[0.08em] text-ink-tertiary font-micro mt-0.5">{widget.description}</span>
                  </span>
                </label>
              );
            })}
          </div>

          {/* ── Variant picker: distinct visual style per enabled widget ── */}
          {enabledWidgets.some((id) => (allWidgets.find((w) => w.id === id)?.variants?.length > 1)) && (
            <div className="mt-5 pt-4 border-t" style={{ borderColor: 'var(--ab-rule)' }}>
              <p className="text-[10px] uppercase tracking-[0.22em] text-accent mb-3 font-micro font-semibold">
                Widget Styles
              </p>
              <div className="space-y-4">
                {allWidgets
                  .filter((w) => enabledWidgets.includes(w.id) && (w.variants?.length > 1))
                  .map((widget) => {
                    const activeVariant = widgetConfig[widget.id]?.variant || getDefaultVariant(widget.id);
                    return (
                      <div key={widget.id}>
                        <p className="text-[10px] uppercase tracking-[0.12em] text-ink-tertiary font-micro mb-1.5">{widget.name}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {widget.variants.map((v) => {
                            const active = v.id === activeVariant;
                            return (
                              <button
                                key={v.id}
                                onClick={() => handleSetVariant(widget.id, v.id)}
                                title={v.description}
                                className="border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] font-micro transition-colors"
                                style={{
                                  borderColor: active ? 'var(--ab-accent)' : 'var(--ab-surface-border)',
                                  background: active ? 'var(--ab-accent)' : 'transparent',
                                  color: active ? 'var(--ab-accent-ink)' : 'var(--ab-ink-secondary)',
                                }}
                              >
                                {v.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
