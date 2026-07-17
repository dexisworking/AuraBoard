import { useState, useEffect } from 'react';

const ONES = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'];
const TEENS = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty'];

function hourWord(h24) {
  const h = h24 % 12;
  return ONES[h];
}

function minuteWords(m) {
  if (m === 0) return "o'clock";
  if (m < 10) return `oh ${ONES[m]}`;
  if (m < 20) return TEENS[m - 10];
  const t = Math.floor(m / 10);
  const o = m % 10;
  return o === 0 ? TENS[t] : `${TENS[t]} ${ONES[o]}`;
}

/**
 * ClockWidget — Swiss/Brutalist, three distinct styles:
 *  numeric — condensed HH:MM with a seconds/meridiem column (default)
 *  stack   — hours over minutes, poster style
 *  words   — the time spelled out in display type
 */
export default function ClockWidget({ use24hr = false, timeZone, variant = 'numeric' }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const parts = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: !use24hr, timeZone: timeZone || undefined,
  }).formatToParts(time);

  let hours = '';
  let minutes = '';
  let ampm = '';
  parts.forEach((p) => {
    if (p.type === 'hour') hours = p.value;
    if (p.type === 'minute') minutes = p.value;
    if (p.type === 'dayPeriod') ampm = p.value;
  });

  const seconds = new Intl.DateTimeFormat('en-US', {
    second: '2-digit', timeZone: timeZone || undefined,
  }).format(time);

  const colon = (
    <span className="text-accent" style={{ animation: 'ab-colon-blink 2s steps(2, end) infinite' }}>:</span>
  );
  const blinkStyle = (
    <style>{'@keyframes ab-colon-blink{0%,100%{opacity:1}50%{opacity:0.25}}'}</style>
  );

  // ── STACK: hours over minutes ──
  if (variant === 'stack') {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center text-ink"
        style={{ fontSize: 'min(40cqh, 40cqw)', lineHeight: 0.82 }}
      >
        <span className="ab-numeric" style={{ fontSize: '1em' }}>{hours}</span>
        <span className="ab-numeric text-accent" style={{ fontSize: '1em' }}>{minutes}</span>
        {!use24hr && ampm && (
          <span className="ab-numeric text-ink-tertiary" style={{ fontSize: '0.18em', letterSpacing: '0.1em', marginTop: '0.15em' }}>{ampm}</span>
        )}
        {blinkStyle}
      </div>
    );
  }

  // ── WORDS: spelled out ──
  if (variant === 'words') {
    const h24 = time.getHours();
    return (
      <div
        className="w-full h-full flex flex-col justify-center text-ink"
        style={{ padding: '5cqmin', fontSize: 'min(20cqh, 11cqw)', lineHeight: 0.9 }}
      >
        <span className="ab-display" style={{ fontSize: '1em' }}>{hourWord(h24)}</span>
        <span className="ab-display text-accent" style={{ fontSize: '1em' }}>{minuteWords(time.getMinutes())}</span>
        <span className="ab-numeric text-ink-tertiary" style={{ fontSize: '0.34em', letterSpacing: '0.14em', marginTop: '0.4em' }}>
          {use24hr ? `${hours}:${minutes}` : `${hours}:${minutes} ${ampm}`}
        </span>
      </div>
    );
  }

  // ── NUMERIC (default) ──
  return (
    <div
      className="w-full h-full flex items-center justify-center text-ink"
      style={{ fontSize: 'min(46cqh, 21cqw)' }}
    >
      <div className="ab-numeric" style={{ fontSize: '1em' }}>{hours}{colon}{minutes}</div>
      <div className="flex flex-col justify-end" style={{ marginLeft: '0.12em', gap: '0.05em', paddingBottom: '0.08em' }}>
        <span className="ab-numeric text-ink-secondary" style={{ fontSize: '0.3em' }}>{seconds}</span>
        {!use24hr && ampm && (
          <span className="ab-numeric text-ink-tertiary" style={{ fontSize: '0.16em', letterSpacing: '0.1em' }}>{ampm}</span>
        )}
      </div>
      {blinkStyle}
    </div>
  );
}
