import { useState, useEffect } from 'react';

const getGreetingWord = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 21) return 'Evening';
  return 'Night';
};

/**
 * GreetingWidget — stacked Anton display lines with sub-1 leading so the
 * words interlock; the user's name takes the signal colour.
 */
export default function GreetingWidget({ userName = '' }) {
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

  return (
    <div
      className={`w-full h-full flex flex-col justify-center transition-opacity duration-1000 ease-in-out ${fadeState}`}
      style={{ padding: '4cqmin 5cqmin', fontSize: 'min(30cqh, 15cqw)' }}
    >
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
