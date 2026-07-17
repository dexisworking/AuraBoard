import { useCallback, useEffect, useState } from 'react';
import SlideshowBackground from './slideshow/SlideshowBackground';
import WidgetGrid from './layout/WidgetGrid';
import { getFontPreset, getThemePreset } from './theme/presets';

export default function App() {
  const [isActive, setIsActive] = useState(false);
  const [images, setImages] = useState([]);
  const [slideshowInterval, setSlideshowInterval] = useState(60);
  const [slideshowTransition, setSlideshowTransition] = useState('fade');
  const [slideshowShuffle, setSlideshowShuffle] = useState(false);

  const [spotifyTrack, setSpotifyTrack] = useState(null);
  const [useSpotifyArtBackground, setUseSpotifyArtBackground] = useState(false);
  const [uiTheme, setUiTheme] = useState('aurora');
  const [uiFont, setUiFont] = useState('outfit');

  // Phase 5: edit mode + enabled widgets
  const [editMode, setEditMode] = useState(false);
  const [enabledWidgets, setEnabledWidgets] = useState([
    'clock', 'date', 'greeting', 'weather', 'spotify',
  ]);

  useEffect(() => {
    let cleanup = null;

    if (window.electronAPI?.onScreensaverActivate) {
      cleanup = window.electronAPI.onScreensaverActivate(() => {
        setIsActive(true);
      });

      // Also set active immediately in case we missed the event
      setIsActive(true);
    } else {
      const timer = window.setTimeout(() => setIsActive(true), 300);
      return () => window.clearTimeout(timer);
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Load slideshow settings + enabled widgets
  useEffect(() => {
    let isMounted = true;

    async function loadSlideshow() {
      try {
        const [settings, folderImages, savedWidgets] = await Promise.all([
          window.electronAPI?.getSettings?.() ?? Promise.resolve({}),
          window.electronAPI?.getFolderImages?.() ?? Promise.resolve([]),
          window.electronAPI?.getEnabledWidgets?.() ?? Promise.resolve(null),
        ]);

        if (!isMounted) return;

        setSlideshowInterval(settings.slideshowInterval ?? 60);
        setSlideshowTransition(settings.slideshowTransition ?? 'fade');
        setSlideshowShuffle(Boolean(settings.slideshowShuffle));
        setImages(Array.isArray(folderImages) ? folderImages : []);
        setUseSpotifyArtBackground(Boolean(settings.useSpotifyArtBackground));
        setUiTheme(settings.uiTheme ?? 'aurora');
        setUiFont(settings.uiFont ?? 'outfit');

        if (Array.isArray(savedWidgets) && savedWidgets.length > 0) {
          setEnabledWidgets(savedWidgets);
        }
      } catch (error) {
        console.error('Failed to load slideshow settings:', error);
      }
    }

    loadSlideshow();

    // Reload slideshow when screensaver is activated again
    let cleanup = null;
    if (window.electronAPI?.onScreensaverActivate) {
      cleanup = window.electronAPI.onScreensaverActivate(() => {
        if (isMounted) loadSlideshow();
      });
    }

    return () => {
      isMounted = false;
      if (cleanup) cleanup();
    };
  }, []);

  const handleDismiss = useCallback(() => {
    if (window.electronAPI?.dismissScreensaver) {
      window.electronAPI.dismissScreensaver();
    }
    setIsActive(false);
  }, []);

  const handleOpenSettings = (e) => {
    e.stopPropagation();
    if (window.electronAPI?.openSettings) {
      window.electronAPI.openSettings();
      handleDismiss();
    }
  };

  // Handle removing a widget from the grid (edit mode)
  const handleRemoveWidget = useCallback((widgetId) => {
    setEnabledWidgets((prev) => {
      const updated = prev.filter((id) => id !== widgetId);
      window.electronAPI?.saveEnabledWidgets?.(updated);
      return updated;
    });
  }, []);

  // Keyboard handler: Alt+E for edit mode, dismiss on other keys
  useEffect(() => {
    let initialTouchY = null;
    let initialTouchX = null;

    const handleMouseMove = (e) => {
      if (e.clientY <= 10) {
        handleDismiss();
      }
    };

    const handleTouchStart = (e) => {
      if (e.touches.length > 0) {
        initialTouchY = e.touches[0].clientY;
        initialTouchX = e.touches[0].clientX;
      }
    };

    const handleTouchMove = (e) => {
      if (initialTouchY === null || e.touches.length === 0) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const dy = currentY - initialTouchY;
      const dx = Math.abs(currentX - initialTouchX);

      if (initialTouchY <= 50 && dy > 50 && dy > dx) {
        handleDismiss();
      }
    };

    const handleKeyDown = (e) => {
      // Alt+E toggles edit mode
      if (e.altKey && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        setEditMode((prev) => !prev);
        return;
      }
      // In edit mode, don't dismiss on keypress
      if (editMode) return;
      // Any other keypress dismisses the screensaver
      handleDismiss();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleDismiss, editMode]);

  const backgroundImages = (useSpotifyArtBackground && spotifyTrack?.albumArt)
    ? [spotifyTrack.albumArt]
    : images;
  const themePreset = getThemePreset(uiTheme);
  const fontPreset = getFontPreset(uiFont);

  return (
    <div
      className={`
        fixed inset-0 flex
        transition-opacity duration-1000 ease-in-out
        ${isActive ? 'opacity-100' : 'opacity-0'}
      `}
      style={{
        cursor: editMode ? 'default' : 'none',
        backgroundColor: themePreset.background,
        fontFamily: fontPreset.stack,
        '--ab-font-family': fontPreset.stack,
        '--ab-accent': themePreset.accent,
        '--ab-widget-surface': themePreset.widgetSurface,
        '--ab-widget-border': themePreset.widgetBorder,
        '--ab-edit-surface': themePreset.editSurface,
        '--ab-edit-border': themePreset.editBorder,
      }}
    >
      <SlideshowBackground
        images={backgroundImages}
        interval={slideshowInterval}
        transition={slideshowTransition}
        shuffle={slideshowShuffle}
      />

      <div className="relative z-10 w-full h-full">
        <WidgetGrid
          editMode={editMode}
          enabledWidgets={enabledWidgets}
          onRemoveWidget={handleRemoveWidget}
          spotifyProps={{ onTrackUpdate: setSpotifyTrack }}
          reloadTrigger={isActive ? 1 : 0}
        />

        <button
          onClick={handleOpenSettings}
          className="absolute bottom-6 right-6 z-20 p-2 text-white/30 hover:text-white/80 transition-colors pointer-events-auto"
          title="Open Settings"
          style={{ cursor: 'default' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
      </div>
    </div>
  );
}
