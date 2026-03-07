import { useCallback, useEffect, useState } from 'react';
import ClockWidget from './widgets/Clock/ClockWidget';
import DateWidget from './widgets/Date/DateWidget';
import GreetingWidget from './widgets/Greeting/GreetingWidget';
import WeatherWidget from './widgets/Weather/WeatherWidget';
import SpotifyWidget from './widgets/Spotify/SpotifyWidget';
import SlideshowBackground from './slideshow/SlideshowBackground';

export default function App() {
  const [isActive, setIsActive] = useState(false);
  const [images, setImages] = useState([]);
  const [slideshowInterval, setSlideshowInterval] = useState(60);
  const [slideshowTransition, setSlideshowTransition] = useState('fade');
  const [slideshowShuffle, setSlideshowShuffle] = useState(false);

  const [spotifyTrack, setSpotifyTrack] = useState(null);
  const [useSpotifyArtBackground, setUseSpotifyArtBackground] = useState(false);

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

  useEffect(() => {
    let isMounted = true;

    async function loadSlideshow() {
      try {
        const [settings, folderImages] = await Promise.all([
          window.electronAPI?.getSettings?.() ?? Promise.resolve({}),
          window.electronAPI?.getFolderImages?.() ?? Promise.resolve([]),
        ]);

        if (!isMounted) {
          return;
        }

        setSlideshowInterval(settings.slideshowInterval ?? 60);
        setSlideshowTransition(settings.slideshowTransition ?? 'fade');
        setSlideshowShuffle(Boolean(settings.slideshowShuffle));
        setImages(Array.isArray(folderImages) ? folderImages : []);
        setUseSpotifyArtBackground(Boolean(settings.useSpotifyArtBackground));
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

  useEffect(() => {
    let initialTouchY = null;
    let initialTouchX = null;

    const handleMouseMove = (e) => {
      // Dismiss if mouse goes to the very top edge (e.g. top 10 pixels)
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
      const dy = currentY - initialTouchY; // Positive means dragging down
      const dx = Math.abs(currentX - initialTouchX);

      // Dismiss if drag started near the top (e.g. top 50px) 
      // and was dragged down significantly (e.g. > 50px),
      // and wasn't mostly a horizontal swipe
      if (initialTouchY <= 50 && dy > 50 && dy > dx) {
        handleDismiss();
      }
    };

    const handleKeyDown = () => {
      // Any keypress dismisses the screensaver
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
  }, [handleDismiss]);

  const backgroundImages = (useSpotifyArtBackground && spotifyTrack?.albumArt)
    ? [spotifyTrack.albumArt]
    : images;

  return (
    <div
      className={`
        fixed inset-0 flex
        transition-opacity duration-1000 ease-in-out
        ${isActive ? 'opacity-100' : 'opacity-0'}
      `}
      style={{ cursor: 'none', backgroundColor: '#02050a' }}
    >
      <SlideshowBackground
        images={backgroundImages}
        interval={slideshowInterval}
        transition={slideshowTransition}
        shuffle={slideshowShuffle}
      />

      <div className="relative z-10 w-full h-full p-16">
        <div className="absolute top-16 left-16 flex flex-col gap-4 z-10">
          <div
            className={`transition-all duration-1500 ease-out delay-300 transform ${isActive ? 'translate-x-0 opacity-100' : '-translate-x-12 opacity-0'}`}
          >
            <GreetingWidget userName="Dex" />
          </div>
          <div
            className={`transition-all duration-1500 ease-out delay-500 transform ${isActive ? 'translate-x-0 opacity-100' : '-translate-x-12 opacity-0'}`}
          >
            <DateWidget />
          </div>
        </div>

        <div
          className={`absolute top-16 right-16 z-10 transition-all duration-1500 ease-out delay-100 transform ${isActive ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'}`}
        >
          <ClockWidget use24hr={false} />
        </div>

        <div
          className={`absolute bottom-16 left-16 z-10 transition-all duration-1500 ease-out delay-700 transform ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
        >
          <WeatherWidget useFahrenheit={false} />
        </div>

        <div
          className={`absolute bottom-16 right-16 z-10 transition-all duration-1500 ease-out delay-900 transform ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
        >
          <SpotifyWidget pollInterval={3} onTrackUpdate={setSpotifyTrack} />
        </div>

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
