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
      className={`w-full h-full flex flex-col justify-center px-2 transition-opacity duration-1000 ease-in-out ${fadeState}`}
    >
      <h2 className="ab-display text-ink" style={{ fontSize: 58 }}>
        Good<br />
        {word}
        {userName && (
          <>
            <span className="text-accent">,</span>
            <br />
            <span className="text-accent">{userName}</span>
          </>
        )}
      </h2>
    </div>
  );
}
