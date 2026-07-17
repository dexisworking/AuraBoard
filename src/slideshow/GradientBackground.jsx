/**
 * Fallback ground shown when no slideshow folder is configured.
 * Swiss/Brutalist: a flat token ground, a faint column grid made of hairlines,
 * and one enormous hard-edged accent disc cropped by the viewport — geometry,
 * not blur. Drift is on an ambient timescale (minutes, not seconds).
 */
export default function GradientBackground() {
  return (
    <>
      <style>{`
        @keyframes auraboard-disc-drift {
          0%   { transform: translate3d(0, 0, 0); }
          50%  { transform: translate3d(-3vw, 2vh, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
      `}</style>

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          background: 'var(--ab-bg, #0A0A0A)',
        }}
      >
        {/* 12-column grid made visible as hairlines, barely-there */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'repeating-linear-gradient(90deg, var(--ab-rule, rgba(255,255,255,0.22)) 0 1px, transparent 1px calc(100% / 12))',
            opacity: 0.28,
          }}
        />

        {/* one colossal accent disc, hard-edged, cropped at the top like the
            reference posters — quiet enough to sit behind type */}
        <div
          style={{
            position: 'absolute',
            top: '-58vh',
            right: '-14vw',
            width: '86vh',
            height: '86vh',
            borderRadius: '50%',
            background: 'var(--ab-accent, #FF2B12)',
            opacity: 0.16,
            animation: 'auraboard-disc-drift 240s ease-in-out infinite',
          }}
        />

        {/* baseline rule anchoring the bottom edge */}
        <div
          style={{
            position: 'absolute',
            left: '3vw',
            right: '3vw',
            bottom: '6vh',
            borderTop: 'var(--ab-rule-hairline, 1px) solid var(--ab-rule, rgba(255,255,255,0.22))',
          }}
        />
      </div>
    </>
  );
}
