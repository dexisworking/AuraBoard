import { useState, useEffect } from 'react';

/**
 * DateWidget — Swiss/Brutalist, three distinct styles:
 *  standard — weekday display over date line (default)
 *  numeric  — large day number, month/weekday beside
 *  minimal  — single compact line
 */
export default function DateWidget({ timeZone, variant = 'standard' }) {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    let timeoutId;
    const scheduleNextMidnight = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      timeoutId = setTimeout(() => {
        setDate(new Date());
        scheduleNextMidnight();
      }, nextMidnight.getTime() - now.getTime() + 100);
    };
    scheduleNextMidnight();
    return () => clearTimeout(timeoutId);
  }, []);

  const parts = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: timeZone || undefined,
  }).formatToParts(date);

  let weekday = '';
  let day = '';
  let month = '';
  let year = '';
  parts.forEach((p) => {
    if (p.type === 'weekday') weekday = p.value;
    if (p.type === 'day') day = p.value;
    if (p.type === 'month') month = p.value;
    if (p.type === 'year') year = p.value;
  });

  // ── NUMERIC: big day number ──
  if (variant === 'numeric') {
    return (
      <div
        className="w-full h-full flex items-center text-ink"
        style={{ padding: '4cqmin 5cqmin', gap: '0.4em', fontSize: 'min(40cqh, 20cqw)' }}
      >
        <span className="ab-numeric text-accent" style={{ fontSize: '1em', lineHeight: 0.8 }}>{day}</span>
        <div className="flex flex-col" style={{ paddingBottom: '0.06em' }}>
          <span className="ab-display" style={{ fontSize: '0.3em', lineHeight: 0.95 }}>{month}</span>
          <span className="ab-numeric text-ink-tertiary" style={{ fontSize: '0.16em', letterSpacing: '0.14em' }}>{weekday.toUpperCase()} · {year}</span>
        </div>
      </div>
    );
  }

  // ── MINIMAL: single line ──
  if (variant === 'minimal') {
    return (
      <div
        className="w-full h-full flex items-center text-ink"
        style={{ padding: '4cqmin 5cqmin', fontSize: 'min(30cqh, 6cqw)' }}
      >
        <span className="ab-numeric" style={{ fontSize: '1em', letterSpacing: '0.06em' }}>
          <span className="text-accent">{day}</span> {month.toUpperCase()} {year}
        </span>
      </div>
    );
  }

  // ── STANDARD (default) ──
  return (
    <div
      className="w-full h-full flex flex-col justify-center text-ink"
      style={{ padding: '4cqmin 5cqmin', fontSize: 'min(34cqh, 11cqw)' }}
    >
      <span className="ab-display" style={{ fontSize: '1em', lineHeight: 0.9 }}>{weekday}</span>
      <div className="ab-rule-h" style={{ marginTop: '0.35em', paddingTop: '0.3em' }}>
        <span className="ab-numeric text-ink-secondary" style={{ fontSize: '0.28em', letterSpacing: '0.14em' }}>
          <span className="text-accent">{day}</span> {month.toUpperCase()} {year}
        </span>
      </div>
    </div>
  );
}
