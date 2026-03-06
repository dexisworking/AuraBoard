import { useState, useEffect, useCallback } from 'react';

export default function ScreensaverApp() {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    // Listen for activation signal from main process
    let cleanup = null;
    if (window.electronAPI?.onScreensaverActivate) {
      cleanup = window.electronAPI.onScreensaverActivate(() => {
        setIsActive(true);
      });
    } else {
      // If no electron API (e.g. running in browser for dev), auto-activate
      const timer = setTimeout(() => setIsActive(true), 300);
      return () => clearTimeout(timer);
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const handleDismiss = useCallback(() => {
    if (window.electronAPI?.dismissScreensaver) {
      window.electronAPI.dismissScreensaver();
    }
    setIsActive(false);
  }, []);

  // Dismiss on any user interaction
  useEffect(() => {
    const dismiss = () => handleDismiss();
    window.addEventListener('mousemove', dismiss);
    window.addEventListener('keydown', dismiss);
    window.addEventListener('mousedown', dismiss);
    window.addEventListener('touchstart', dismiss);

    return () => {
      window.removeEventListener('mousemove', dismiss);
      window.removeEventListener('keydown', dismiss);
      window.removeEventListener('mousedown', dismiss);
      window.removeEventListener('touchstart', dismiss);
    };
  }, [handleDismiss]);

  return (
    <div
      className={`
        fixed inset-0 bg-black flex items-center justify-center
        transition-opacity duration-1000 ease-in-out
        ${isActive ? 'opacity-100' : 'opacity-0'}
      `}
      style={{ cursor: 'none' }}
    >
      <div className="text-center">
        <h1
          className={`
            text-7xl font-extralight tracking-[0.3em] text-white
            transition-all duration-1500 ease-out
            ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
          style={{
            textShadow: '0 0 40px rgba(100, 100, 255, 0.3), 0 0 80px rgba(100, 100, 255, 0.1)',
          }}
        >
          AuraBoard
        </h1>
        <div
          className={`
            mt-6 h-px w-48 mx-auto
            bg-gradient-to-r from-transparent via-white/30 to-transparent
            transition-all duration-2000 ease-out
            ${isActive ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}
          `}
        />
      </div>
    </div>
  );
}
