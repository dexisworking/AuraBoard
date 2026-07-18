import { useEffect, useState } from 'react';

const getGreetingWord = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Morning';
  if (h >= 12 && h < 17) return 'Afternoon';
  if (h >= 17 && h < 21) return 'Evening';
  return 'Night';
};

/**
 * PosterMoment — every `intervalMin` the board briefly collapses to a single
 * enormous element, like the reference posters, then returns. Ambient displays
 * reward variety; this is the punctuation between long static stretches.
 *
 * Renders nothing when disabled (intervalMin = 0).
 */
export default function PosterMoment({
  intervalMin = 0,
  holdMs = 9000,
  userName = '',
  use24hr = false,
}) {
  const [active, setActive] = useState(false);
  const [shown, setShown] = useState(false); // drives the fade
  const [kind, setKind] = useState('time');
  const [tick, setTick] = useState(() => Date.now());

  // Schedule the moment.
  useEffect(() => {
    if (!intervalMin || intervalMin <= 0) return undefined;
    const id = setInterval(() => {
      setKind((k) => (k === 'time' ? 'greeting' : 'time'));
      setActive(true);
    }, intervalMin * 60_000);
    return () => clearInterval(id);
  }, [intervalMin]);

  // Fade in, hold, fade out.
  useEffect(() => {
    if (!active) return undefined;
    const inId = setTimeout(() => setShown(true), 30);
    const outId = setTimeout(() => setShown(false), holdMs);
    const endId = setTimeout(() => setActive(false), holdMs + 1200);
    return () => {
      clearTimeout(inId);
      clearTimeout(outId);
      clearTimeout(endId);
    };
  }, [active, holdMs]);

  // Keep the clock live while the moment is on screen.
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  if (!active) return null;

  const now = new Date(tick);
  const time = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: !use24hr,
  }).format(now);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        background: 'var(--ab-bg)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '5vh 5vw',
        opacity: shown ? 1 : 0,
        transition: 'opacity 1100ms var(--ab-ease-out, ease)',
        pointerEvents: 'none',
        containerType: 'size',
      }}
    >
      {kind === 'time' ? (
        <span
          className="ab-numeric"
          style={{
            color: 'var(--ab-ink)',
            fontSize: 'min(58cqh, 26cqw)',
            lineHeight: 0.82,
          }}
        >
          {time.replace(/\s?[AP]M$/i, '')}
        </span>
      ) : (
        <span
          className="ab-display"
          style={{ color: 'var(--ab-ink)', fontSize: 'min(30cqh, 15cqw)', lineHeight: 0.86 }}
        >
          Good<br />
          {getGreetingWord()}
          {userName && (
            <>
              <br />
              <span style={{ color: 'var(--ab-accent)' }}>{userName}</span>
            </>
          )}
        </span>
      )}

      {/* baseline rule — the poster's structural mark */}
      <div
        style={{
          marginTop: '4vh',
          borderTop: 'var(--ab-rule-bold, 3px) solid var(--ab-rule-strong)',
          paddingTop: '1.4vh',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--ab-font-micro)',
            fontSize: 'min(2.2cqh, 1.1cqw)',
            fontWeight: 600,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'var(--ab-accent)',
          }}
        >
          Auraboard
        </span>
        <span
          style={{
            fontFamily: 'var(--ab-font-micro)',
            fontSize: 'min(2.2cqh, 1.1cqw)',
            fontWeight: 600,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--ab-ink-tertiary)',
          }}
        >
          {new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)}
        </span>
      </div>
    </div>
  );
}
