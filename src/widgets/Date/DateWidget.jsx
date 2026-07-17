import { useState, useEffect } from 'react';

/**
 * DateWidget — Anton display weekday over a tracked-out mono date line,
 * separated by a hairline rule. Day number carries the signal colour.
 */
export default function DateWidget({ timeZone }) {
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
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: timeZone || undefined,
  }).formatToParts(date);

  let weekday = '';
  let day = '';
  let month = '';
  let year = '';
  parts.forEach((part) => {
    if (part.type === 'weekday') weekday = part.value;
    if (part.type === 'day') day = part.value;
    if (part.type === 'month') month = part.value;
    if (part.type === 'year') year = part.value;
  });

  return (
    <div
      className="w-full h-full flex flex-col justify-center text-ink"
      style={{ padding: '4cqmin 5cqmin', fontSize: 'min(34cqh, 11cqw)' }}
    >
      <span className="ab-display" style={{ fontSize: '1em', lineHeight: 0.9 }}>{weekday}</span>
      <div className="ab-rule-h" style={{ marginTop: '0.35em', paddingTop: '0.3em' }}>
        <span
          className="ab-numeric text-ink-secondary"
          style={{ fontSize: '0.28em', letterSpacing: '0.14em' }}
        >
          <span className="text-accent">{day}</span> {month.toUpperCase()} {year}
        </span>
      </div>
    </div>
  );
}
