import { useEffect, useState } from 'react';
import WidgetHeader from '../../ui/WidgetHeader';
import '../../ui/primitives.css';

const SYNODIC_MONTH = 29.530588853; // days
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14); // 2000-01-06 18:14 UTC

const PHASE_NAMES = [
  'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
  'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
];

/** Age of the moon in days (0 … 29.53) and its illuminated fraction. */
function moonState(date = new Date()) {
  const days = (date.getTime() - KNOWN_NEW_MOON) / 86_400_000;
  const age = ((days % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
  const phase = age / SYNODIC_MONTH; // 0..1
  // illuminated fraction follows a cosine through the cycle
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  // 8 named phases, centred on their boundaries
  const index = Math.round(phase * 8) % 8;
  return { age, phase, illumination, name: PHASE_NAMES[index], index };
}

/**
 * Pure-CSS moon disc: a lit circle with a shadow disc offset across it.
 * Waxing lights the right limb, waning the left.
 */
function MoonDisc({ phase, illumination, size = '1em' }) {
  const waxing = phase < 0.5;
  // shadow travels from fully covering (new) to fully clear (full)
  const offset = (1 - illumination) * 100 * (waxing ? 1 : -1);
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--ab-ink)',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '-2%',
          left: `${offset}%`,
          width: '104%',
          height: '104%',
          borderRadius: '50%',
          background: 'var(--ab-bg)',
        }}
      />
    </div>
  );
}

/**
 * MoonWidget — moon phase, computed from the date (no API). Three styles:
 *  disc   — big disc with the phase name (default)
 *  detail — disc beside illumination + age figures
 *  text   — typographic only: phase name large
 */
export default function MoonWidget({ variant = 'disc' }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // the phase moves slowly; hourly is plenty
    const id = setInterval(() => setNow(new Date()), 60 * 60_000);
    return () => clearInterval(id);
  }, []);

  const { phase, illumination, name, age } = moonState(now);
  const pct = Math.round(illumination * 100);

  if (variant === 'text') {
    return (
      <div className="ab-widget-root">
        <WidgetHeader title="Moon" meta={`${pct}%`} />
        <div className="flex-1 flex flex-col justify-center min-h-0">
          <span
            className="ab-display text-ink"
            style={{ fontSize: 'min(26cqh, 13cqw)', lineHeight: 0.9 }}
          >
            {name}
          </span>
          <span className="ab-widget-meta" style={{ marginTop: '0.6em' }}>
            Day {Math.floor(age)} of 29
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div className="ab-widget-root">
        <WidgetHeader title="Moon" />
        <div className="flex-1 flex items-center min-h-0" style={{ gap: '1em' }}>
          <MoonDisc phase={phase} illumination={illumination} size="min(34cqh, 34cqw)" />
          <div style={{ minWidth: 0 }}>
            <div className="ab-figure text-ink" style={{ fontSize: '2em', lineHeight: 1 }}>
              {pct}<span className="text-accent">%</span>
            </div>
            <div className="ab-widget-meta" style={{ marginTop: '0.3em' }}>{name}</div>
            <div className="ab-widget-meta">Day {Math.floor(age)} of 29</div>
          </div>
        </div>
      </div>
    );
  }

  // ── DISC (default) ──
  return (
    <div className="ab-widget-root">
      <WidgetHeader title="Moon" meta={`${pct}%`} />
      <div className="flex-1 flex flex-col items-center justify-center min-h-0" style={{ gap: '0.6em' }}>
        <MoonDisc phase={phase} illumination={illumination} size="min(46cqh, 46cqw)" />
        <span className="ab-widget-meta">{name}</span>
      </div>
    </div>
  );
}
