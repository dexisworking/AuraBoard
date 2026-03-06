import { useState, useEffect } from 'react';

export default function SettingsApp() {
  const [idleTimeout, setIdleTimeout] = useState(5);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (window.electronAPI?.getSettings) {
          const settings = await window.electronAPI.getSettings();
          setIdleTimeout(settings.idleTimeout ?? 5);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      if (window.electronAPI?.saveSettings) {
        await window.electronAPI.saveSettings({ idleTimeout: Number(idleTimeout) });
        setSaveMessage('Settings saved!');
      } else {
        setSaveMessage('Electron API not available (running in browser?)');
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      setSaveMessage('Failed to save settings.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-light tracking-[0.2em] text-white/90">
            AuraBoard
          </h1>
          <p className="text-sm text-white/40 mt-1 tracking-wide">
            Settings
          </p>
          <div className="mt-4 h-px w-24 mx-auto bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
        </div>

        {/* Settings Form */}
        <div className="bg-white/5 rounded-2xl p-6 backdrop-blur border border-white/10">
          <label
            htmlFor="idle-timeout"
            className="block text-sm font-medium text-white/70 mb-3"
          >
            Idle timeout (minutes)
          </label>

          <input
            id="idle-timeout"
            type="number"
            min="1"
            max="60"
            value={idleTimeout}
            onChange={(e) => setIdleTimeout(e.target.value)}
            className="
              w-full px-4 py-3 rounded-xl
              bg-white/5 border border-white/10
              text-white text-lg text-center
              focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30
              transition-all duration-200
              [appearance:textfield]
              [&::-webkit-outer-spin-button]:appearance-none
              [&::-webkit-inner-spin-button]:appearance-none
            "
          />

          <p className="text-xs text-white/30 mt-2 text-center">
            How long before the screensaver activates (1–60 min)
          </p>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="
              mt-6 w-full py-3 rounded-xl
              bg-indigo-600 hover:bg-indigo-500
              disabled:bg-indigo-600/50 disabled:cursor-not-allowed
              text-white font-medium text-sm tracking-wide
              transition-all duration-200
              active:scale-[0.98]
            "
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>

          {/* Save feedback */}
          {saveMessage && (
            <p
              className={`
                mt-4 text-center text-sm
                transition-opacity duration-300
                ${saveMessage.includes('saved') ? 'text-emerald-400' : 'text-amber-400'}
              `}
            >
              {saveMessage}
            </p>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-white/20 mt-8">
          AuraBoard v1.0.0
        </p>
      </div>
    </div>
  );
}
