import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import WidgetGrid from './layout/WidgetGrid';
import { getAllWidgets } from './widgets/registry';
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
        const [savedWidgets, settings] = await Promise.all([
          window.electronAPI?.getEnabledWidgets?.(),
          window.electronAPI?.getSettings?.(),
        ]);
        if (!isMounted) return;
        if (Array.isArray(savedWidgets) && savedWidgets.length > 0) {
          setEnabledWidgets(savedWidgets);
        }
        setUiTheme(settings?.uiTheme ?? 'aurora');
        setUiFont(settings?.uiFont ?? 'outfit');
      } catch (error) {
        console.error('Failed to load enabled widgets in layout editor:', error);
      }
    }
    loadSettings();
    return () => { isMounted = false; };
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
      
      {/* ── Background Mesh (same as Settings) ── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/20 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/20 rounded-full blur-[120px] mix-blend-screen" />
      </div>

      {/* ── Top Bar ── */}
      <div className="titlebar absolute top-0 left-0 w-full h-16 pointer-events-none z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-300">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
          </div>
          <div>
            <h1 className="text-white font-semibold tracking-wide text-sm">Layout Editor</h1>
            <p className="text-white/50 text-[10px] uppercase tracking-widest font-bold">Drag to move · Resize from borders</p>
          </div>
        </div>

        <div className="no-drag pointer-events-auto flex items-center gap-3">
          <button
            onClick={() => setShowWidgetManager((prev) => !prev)}
            disabled={isClosing}
            className="rounded-full bg-indigo-500/20 border border-indigo-300/30 text-indigo-100 px-4 py-2 text-xs font-semibold tracking-wide transition-colors hover:bg-indigo-500/30 disabled:opacity-50"
          >
            Widgets ({enabledWidgets.length}/{allWidgets.length})
          </button>
          {/* Done / Close Button */}
          <button
            onClick={handleClose}
            disabled={isClosing}
            className="rounded-full bg-white text-black px-6 py-2 text-sm font-semibold transition-transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-60"
          >
            {isClosing ? 'Saving...' : 'Done'}
          </button>
        </div>
      </div>

      {/* ── Grid Container ── */}
      <div className="relative z-10 w-full flex-1 pt-12 pb-4 px-4 overflow-hidden">
        {/* We reuse the exact same WidgetGrid component from App.jsx, forcing editMode to true */}
        <WidgetGrid
          editMode={true}
          enabledWidgets={enabledWidgets}
          onRemoveWidget={handleRemoveWidget}
          onLayoutDraftChange={handleLayoutDraftChange}
        />
      </div>

      {showWidgetManager && (
        <div className="absolute top-20 right-6 z-[70] w-80 max-h-[70vh] overflow-y-auto rounded-2xl border border-white/20 bg-black/60 backdrop-blur-xl p-4 shadow-2xl">
          <p className="text-xs uppercase tracking-widest text-white/50 mb-3 font-semibold">
            Add / Remove Widgets
          </p>
          <div className="space-y-2">
            {allWidgets.map((widget) => {
              const checked = enabledWidgets.includes(widget.id);
              return (
                <label
                  key={widget.id}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 cursor-pointer hover:bg-white/[0.06] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => handleToggleWidget(widget.id, e.target.checked)}
                    className="mt-1 w-4 h-4 accent-indigo-500"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm text-white font-medium">{widget.name}</span>
                    <span className="block text-xs text-white/55">{widget.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
