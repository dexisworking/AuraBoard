import { useMemo, useState } from 'react';
import { getAllWidgets } from '../widgets/registry';
import { THEMES } from '../theme/tokens';
import { applyTheme } from '../theme/applyTheme';

const STEPS = ['Name', 'Theme', 'Widgets', 'Photos'];

const STARTER_WIDGETS = ['clock', 'date', 'greeting', 'weather', 'spotify'];

/**
 * First-run setup. A fresh install otherwise drops you onto an unconfigured
 * board; this walks the four decisions that matter and writes them straight to
 * the store, then hands off to the normal Settings window.
 */
export default function Onboarding({ onComplete }) {
  const allWidgets = useMemo(() => getAllWidgets(), []);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [theme, setTheme] = useState('aurora');
  const [picked, setPicked] = useState(STARTER_WIDGETS);
  const [folder, setFolder] = useState('');
  const [imageCount, setImageCount] = useState(null);
  const [busy, setBusy] = useState(false);

  const setThemeAndPreview = (id) => {
    setTheme(id);
    applyTheme(id); // live preview of the choice
  };

  const toggleWidget = (id) => {
    setPicked((prev) => (prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]));
  };

  const chooseFolder = async () => {
    setBusy(true);
    try {
      const images = await window.electronAPI?.selectImageFolder?.();
      const settings = await window.electronAPI?.getSettings?.();
      setFolder(settings?.slideshowFolder ?? '');
      setImageCount(Array.isArray(images) ? images.length : 0);
    } catch {
      setImageCount(0);
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    setBusy(true);
    try {
      await window.electronAPI?.saveSettings?.({
        userName: name.trim(),
        uiTheme: theme,
        onboardingComplete: true,
      });
      await window.electronAPI?.saveEnabledWidgets?.(picked);
      // a fresh set of widgets deserves a fresh composition
      await window.electronAPI?.resetWidgetLayout?.();
    } catch (err) {
      console.error('Onboarding save failed:', err);
    } finally {
      setBusy(false);
      onComplete?.();
    }
  };

  const canAdvance = step !== 2 || picked.length > 0;

  return (
    <div
      className="fixed inset-0 z-[500] flex flex-col select-none"
      style={{ background: 'var(--ab-bg)', color: 'var(--ab-ink)' }}
    >
      {/* Swiss ground */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute"
          style={{
            top: '-40vh', right: '-12vw', width: '72vh', height: '72vh',
            borderRadius: '50%', background: 'var(--ab-accent)', opacity: 0.13,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'repeating-linear-gradient(90deg, var(--ab-rule) 0 1px, transparent 1px 8.333%)',
            opacity: 0.13,
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col h-full px-12 py-10 max-w-4xl mx-auto w-full">
        {/* step rail */}
        <div className="flex items-center gap-2 mb-10">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span
                className="text-[10px] font-micro font-semibold uppercase tracking-[0.2em]"
                style={{ color: i === step ? 'var(--ab-accent)' : i < step ? 'var(--ab-ink-secondary)' : 'var(--ab-ink-tertiary)' }}
              >
                {i + 1} {s}
              </span>
              {i < STEPS.length - 1 && (
                <span style={{ width: 28, height: 1, background: 'var(--ab-rule)' }} />
              )}
            </div>
          ))}
        </div>

        <div className="flex-1 flex flex-col justify-center min-h-0">
          {step === 0 && (
            <>
              {/* First run is the one moment where establishing provenance is
                  appropriate — seen once per install, never again. */}
              <p className="text-[11px] font-micro font-semibold uppercase tracking-[0.24em] text-accent mb-3">
                AuraBoard — a DexForge product
              </p>
              <h1 className="ab-display" style={{ fontSize: 'min(11vw, 96px)', lineHeight: 0.9 }}>
                Welcome
              </h1>
              <p className="text-[11px] font-micro uppercase tracking-[0.2em] text-ink-tertiary mt-4 mb-8">
                What should the board call you?
              </p>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') setStep(1); }}
                placeholder="Your name"
                className="w-full max-w-lg"
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '3px solid var(--ab-rule-strong)',
                  color: 'var(--ab-ink)',
                  fontFamily: 'var(--ab-font-display)',
                  fontSize: 'min(7vw, 54px)',
                  textTransform: 'uppercase',
                  padding: '0 0 8px',
                  outline: 'none',
                }}
              />
              <p className="text-[10px] font-micro uppercase tracking-[0.16em] text-ink-tertiary mt-3">
                Optional — you can change this later
              </p>
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="ab-display" style={{ fontSize: 'min(9vw, 76px)', lineHeight: 0.9 }}>Pick a theme</h1>
              <p className="text-[11px] font-micro uppercase tracking-[0.2em] text-ink-tertiary mt-4 mb-8">
                One signal colour on a monochrome ground
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-2xl">
                {Object.values(THEMES).map((t) => {
                  const active = t.id === theme;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setThemeAndPreview(t.id)}
                      className="text-left p-4 transition-colors"
                      style={{
                        border: `2px solid ${active ? t.color.accent : 'var(--ab-surface-border)'}`,
                        background: t.color.bg,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span style={{ width: 14, height: 14, background: t.color.accent, display: 'inline-block' }} />
                        <span
                          className="text-[12px] font-semibold uppercase tracking-[0.1em]"
                          style={{ color: t.color.ink }}
                        >
                          {t.label}
                        </span>
                      </div>
                      <p className="text-[10px] font-micro uppercase tracking-[0.1em]" style={{ color: t.color.inkSecondary }}>
                        {t.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="ab-display" style={{ fontSize: 'min(9vw, 76px)', lineHeight: 0.9 }}>Choose widgets</h1>
              <p className="text-[11px] font-micro uppercase tracking-[0.2em] text-ink-tertiary mt-4 mb-6">
                {picked.length} selected — arrange them later in the layout editor
              </p>
              <div className="grid grid-cols-3 gap-2 max-h-[46vh] overflow-y-auto scrollbar-hide pr-1">
                {allWidgets.map((w) => {
                  const on = picked.includes(w.id);
                  return (
                    <button
                      key={w.id}
                      onClick={() => toggleWidget(w.id)}
                      className="text-left p-3 transition-colors"
                      style={{
                        border: `1px solid ${on ? 'var(--ab-accent)' : 'var(--ab-surface-border)'}`,
                        background: on ? 'var(--ab-surface)' : 'transparent',
                      }}
                    >
                      <span
                        className="block text-[11px] font-semibold uppercase tracking-[0.08em]"
                        style={{ color: on ? 'var(--ab-accent)' : 'var(--ab-ink)' }}
                      >
                        {w.name}
                      </span>
                      <span className="block text-[9px] font-micro uppercase tracking-[0.08em] text-ink-tertiary mt-1">
                        {w.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="ab-display" style={{ fontSize: 'min(9vw, 76px)', lineHeight: 0.9 }}>Background</h1>
              <p className="text-[11px] font-micro uppercase tracking-[0.2em] text-ink-tertiary mt-4 mb-8">
                Point AuraBoard at a folder of photos — or skip for a plain ground
              </p>
              <div>
                <button
                  onClick={chooseFolder}
                  disabled={busy}
                  className="border px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] font-micro transition-colors disabled:opacity-50"
                  style={{ borderColor: 'var(--ab-ink)', color: 'var(--ab-ink)' }}
                >
                  {busy ? 'Opening…' : 'Choose folder'}
                </button>
                {folder && (
                  <p className="text-[10px] font-micro uppercase tracking-[0.12em] text-ink-secondary mt-4">
                    {folder}
                    {imageCount != null && <span className="text-accent"> · {imageCount} images</span>}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* actions */}
        <div className="flex items-center justify-between pt-6" style={{ borderTop: '1px solid var(--ab-rule)' }}>
          <button
            onClick={() => (step === 0 ? onComplete?.() : setStep(step - 1))}
            className="text-[11px] font-micro font-semibold uppercase tracking-[0.16em] text-ink-tertiary hover:text-ink transition-colors"
          >
            {step === 0 ? 'Skip setup' : 'Back'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => canAdvance && setStep(step + 1)}
              disabled={!canAdvance}
              className="px-8 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] font-micro transition-opacity disabled:opacity-40"
              style={{ background: 'var(--ab-accent)', color: 'var(--ab-accent-ink)' }}
            >
              Continue
            </button>
          ) : (
            <button
              onClick={finish}
              disabled={busy}
              className="px-8 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] font-micro transition-opacity disabled:opacity-50"
              style={{ background: 'var(--ab-accent)', color: 'var(--ab-accent-ink)' }}
            >
              {busy ? 'Saving…' : 'Finish'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
