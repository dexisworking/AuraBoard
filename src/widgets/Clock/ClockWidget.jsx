import { useState, useEffect } from 'react';

/**
 * ClockWidget — Swiss/Brutalist. Colossal condensed tabular numerals
 * (Archivo Variable, wdth 64 / wght 900) with the colon as a signal-colour
 * mark. Seconds and meridiem sit in a tracked-out mono side column.
 */
export default function ClockWidget({ use24hr = false, timeZone }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24hr,
    timeZone: timeZone || undefined,
  });

  let hours = '';
  let minutes = '';
  let ampm = '';
  formatter.formatToParts(time).forEach((part) => {
    if (part.type === 'hour') hours = part.value;
    if (part.type === 'minute') minutes = part.value;
    if (part.type === 'dayPeriod') ampm = part.value;
  });

  const seconds = new Intl.DateTimeFormat('en-US', {
    second: '2-digit',
    timeZone: timeZone || undefined,
  }).format(time);

  return (
    <div
      className="w-full h-full flex items-center justify-center text-ink"
      style={{ fontSize: 'min(46cqh, 21cqw)' }}
    >
      <div className="ab-numeric" style={{ fontSize: '1em' }}>
        {hours}
        <span
          className="text-accent"
          style={{ animation: 'ab-colon-blink 2s steps(2, end) infinite' }}
        >
          :
        </span>
        {minutes}
      </div>
      <div className="flex flex-col justify-end" style={{ marginLeft: '0.12em', gap: '0.05em', paddingBottom: '0.08em' }}>
        <span className="ab-numeric text-ink-secondary" style={{ fontSize: '0.3em' }}>
          {seconds}
        </span>
        {!use24hr && ampm && (
          <span
            className="ab-numeric text-ink-tertiary"
            style={{ fontSize: '0.16em', letterSpacing: '0.1em' }}
          >
            {ampm}
          </span>
        )}
      </div>
      <style>{`
        @keyframes ab-colon-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.25; }
        }
      `}</style>
    </div>
  );
}
