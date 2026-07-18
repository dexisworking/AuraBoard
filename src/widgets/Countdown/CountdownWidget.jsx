import { useEffect, useState } from 'react';
import WidgetHeader from '../../ui/WidgetHeader';
import '../../ui/primitives.css';

const DAY = 86_400_000;

function partsUntil(targetMs, now) {
  const diff = targetMs - now;
  const past = diff < 0;
  const abs = Math.abs(diff);
  return {
    past,
    days: Math.floor(abs / DAY),
    hours: Math.floor((abs % DAY) / 3_600_000),
    minutes: Math.floor((abs % 3_600_000) / 60_000),
    seconds: Math.floor((abs % 60_000) / 1000),
    totalMs: abs,
  };
}

/**
 * CountdownWidget — days (or full clock) until a configured date. Poster-shaped
 * by design: one enormous figure, one tiny caption. Three styles:
 *  days  — giant day count (default)
 *  clock — DD : HH : MM segments
 *  bar   — day count with a progress rail from when the countdown was set
 */
export default function CountdownWidget({
  targetDate = '',
  label = '',
  variant = 'days',
}) {
  const [now, setNow] = useState(() => Date.now());

  // seconds only matter for the clock variant; otherwise tick once a minute
  useEffect(() => {
    const period = variant === 'clock' ? 1000 : 60_000;
    const id = setInterval(() => setNow(Date.now()), period);
    return () => clearInterval(id);
  }, [variant]);

  const targetMs = targetDate ? new Date(targetDate).getTime() : NaN;

  if (!targetDate || Number.isNaN(targetMs)) {
    return (
      <div className="ab-widget-root">
        <WidgetHeader title="Countdown" />
        <div className="ab-state">
          <p className="ab-state-message">
            Set a target date for this widget in the layout editor
          </p>
        </div>
      </div>
    );
  }

  const p = partsUntil(targetMs, now);
  const caption = label || new Intl.DateTimeFormat('en-US', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(targetMs));
  const meta = p.past ? 'Elapsed' : 'Remaining';

  if (variant === 'clock') {
    const seg = (v, unit) => (
      <div className="flex flex-col" style={{ alignItems: 'flex-start' }}>
        <span className="ab-figure text-ink" style={{ fontSize: '2.2em', lineHeight: 1 }}>
          {String(v).padStart(2, '0')}
        </span>
        <span className="ab-widget-meta">{unit}</span>
      </div>
    );
    return (
      <div className="ab-widget-root">
        <WidgetHeader title={caption} meta={meta} />
        <div className="flex-1 flex items-center min-h-0" style={{ gap: '1.1em' }}>
          {seg(p.days, 'Days')}
          {seg(p.hours, 'Hrs')}
          {seg(p.minutes, 'Min')}
        </div>
      </div>
    );
  }

  if (variant === 'bar') {
    // progress across the final 100 days, so the rail is meaningful
    const window = 100 * DAY;
    const progress = p.past ? 1 : Math.max(0, Math.min(1, 1 - p.totalMs / window));
    return (
      <div className="ab-widget-root">
        <WidgetHeader title={caption} meta={meta} />
        <div className="flex-1 flex flex-col justify-center min-h-0" style={{ gap: '0.6em' }}>
          <span className="ab-figure text-ink" style={{ fontSize: '2.8em', lineHeight: 1 }}>
            {p.days}<span className="text-accent" style={{ fontSize: '0.4em' }}> DAYS</span>
          </span>
          <div style={{ height: '0.28em', minHeight: 3, background: 'var(--ab-rule)' }}>
            <div style={{ height: '100%', width: `${progress * 100}%`, background: 'var(--ab-accent)' }} />
          </div>
        </div>
      </div>
    );
  }

  // ── DAYS (default): the poster treatment ──
  return (
    <div className="ab-widget-root">
      <WidgetHeader title={caption} meta={meta} />
      <div className="flex-1 flex flex-col justify-center min-h-0">
        <span
          className="ab-numeric text-ink"
          style={{ fontSize: 'min(52cqh, 34cqw)', lineHeight: 0.82 }}
        >
          {p.days}
        </span>
        <span className="ab-widget-meta" style={{ marginTop: '0.4em' }}>
          {p.past ? 'Days since' : 'Days to go'}
        </span>
      </div>
    </div>
  );
}
