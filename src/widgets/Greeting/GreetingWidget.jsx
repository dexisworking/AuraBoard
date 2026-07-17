import { useState, useEffect } from 'react';

const getGreetingWord = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 21) return 'Evening';
  return 'Night';
};

/**
 * GreetingWidget — Swiss/Brutalist, three distinct styles:
 *  stack   — "Good / Night" stacked, name in accent (default)
 *  inline  — one big line
 *  minimal — name huge, greeting as a small label
 */
export default function GreetingWidget({ userName = '', variant = 'stack' }) {
  const [word, setWord] = useState(getGreetingWord);
  const [fadeState, setFadeState] = useState('opacity-100');

  useEffect(() => {
    let timeoutId;
    const interval = setInterval(() => {
      const next = getGreetingWord();
      if (next !== word) {
        setFadeState('opacity-0');
        timeoutId = setTimeout(() => {
          setWord(next);
          setFadeState('opacity-100');
        }, 500);
      }
    }, 60000);
    return () => {
      clearInterval(interval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [word]);

  const wrap = `w-full h-full flex flex-col justify-center transition-opacity duration-1000 ease-in-out ${fadeState}`;

  // ── MINIMAL: name huge, greeting as label ──
  if (variant === 'minimal') {
    return (
      <div className={wrap} style={{ padding: '4cqmin 5cqmin', fontSize: 'min(34cqh, 17cqw)' }}>
        <span className="ab-micro text-ink-tertiary" style={{ fontSize: '0.2em', letterSpacing: '0.24em' }}>
          Good {word}
        </span>
        <h2 className="ab-display text-accent" style={{ fontSize: '1em', marginTop: '0.1em' }}>
          {userName || word}
        </h2>
      </div>
    );
  }

  // ── INLINE: one big line ──
  if (variant === 'inline') {
    return (
      <div className={wrap} style={{ padding: '4cqmin 5cqmin', fontSize: 'min(20cqh, 8cqw)' }}>
        <h2 className="ab-display text-ink" style={{ fontSize: '1em', lineHeight: 0.95 }}>
          Good {word}{userName && <span className="text-accent"> — {userName}</span>}
        </h2>
      </div>
    );
  }

  // ── STACK (default) ──
  return (
    <div className={wrap} style={{ padding: '4cqmin 5cqmin', fontSize: 'min(30cqh, 15cqw)' }}>
      <h2 className="ab-display text-ink" style={{ fontSize: '1em' }}>
        Good<br />
        {word}
        {userName && (
          <>
            <br />
            <span className="text-accent">{userName}</span>
          </>
        )}
      </h2>
    </div>
  );
}
