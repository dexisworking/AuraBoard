/**
 * DexForge attribution mark.
 *
 * COLOUR: no literal hex anywhere in here, deliberately. AuraBoard has no fixed
 * accent — four themes (signal red, newsprint red on warm paper, cyan, amber)
 * plus a time-of-day drift that shifts the live accent by up to 26%. Hardcoding
 * DexForge's #DC2626 would land ~10 units from the newsprint accent (reading as
 * a rendering bug) and would be the only warm pixel on the cyan theme.
 *
 * So we borrow the FORM of their wordmark, not its hex: DexForge sets "Dex"
 * light and "Forge" red, which maps cleanly onto --ab-ink / --ab-accent and
 * stays recognisable in every theme.
 *
 * TYPE: Inter 800 is DexForge's brand face and is already imported globally in
 * src/styles/index.css, so brand-font fidelity costs nothing here. The micro
 * variant drops to the app's own caption face — at 11px with 0.28em tracking the
 * two-tone split is invisible and the Inter distinction is lost anyway.
 */

const SITE_URL = 'https://dexforge.iamdex.codes';

export default function DexForgeCredit({ variant = 'micro', className = '' }) {
  if (variant === 'micro') {
    return (
      <span
        className={`text-[11px] font-micro font-semibold uppercase tracking-[0.2em] text-ink-tertiary ${className}`}
      >
        By DexForge
      </span>
    );
  }

  // Main validates the URL and refuses anything not https + allowlisted, so a
  // failure here is silent by design rather than something to surface.
  const openSite = () => {
    window.electronAPI?.openExternal?.(SITE_URL);
  };

  return (
    <button
      type="button"
      onClick={openSite}
      title={SITE_URL}
      className={`group inline-flex flex-col items-start gap-1 text-left ${className}`}
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
    >
      <span className="text-[10px] font-micro font-semibold uppercase tracking-[0.22em] text-ink-tertiary">
        A DexForge product
      </span>
      <span
        style={{
          fontFamily: '"Inter Variable", Inter, system-ui, sans-serif',
          fontWeight: 800,
          fontSize: 22,
          lineHeight: 1.1,
          letterSpacing: '-0.01em',
        }}
      >
        <span style={{ color: 'var(--ab-ink)' }}>Dex</span>
        <span style={{ color: 'var(--ab-accent)' }}>Forge</span>
      </span>
      <span
        className="text-[10px] font-micro uppercase tracking-[0.14em] text-ink-tertiary transition-opacity"
        style={{ opacity: 0.7 }}
      >
        dexforge.iamdex.codes
      </span>
    </button>
  );
}
