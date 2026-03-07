import { useState, useEffect } from 'react';

const getInitialGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  if (hour >= 17 && hour < 21) return 'Good Evening';
  return 'Good Night';
};

export default function GreetingWidget({ userName = '' }) {
  const [greeting, setGreeting] = useState(getInitialGreeting);
  const [fadeState, setFadeState] = useState('opacity-100'); // Smooth transitions when greeting changes

  useEffect(() => {
    let timeoutId;

    const updateGreeting = () => {
      const newGreeting = getInitialGreeting();

      if (greeting !== newGreeting) {
        // Trigger fade out
        setFadeState('opacity-0');
        timeoutId = setTimeout(() => {
          setGreeting(newGreeting);
          setFadeState('opacity-100'); // Fade back in
        }, 500); // 500ms fade transition
      }
    };

    // Check every hour (or more frequently) to see if greeting needs to change
    const interval = setInterval(updateGreeting, 60000); // check every minute

    return () => {
      clearInterval(interval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [greeting]);

  return (
    <div 
      className={`transition-opacity duration-1000 ease-in-out ${fadeState}`}
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <h2 className="text-6xl font-extralight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)] tracking-wide">
        {greeting}
        {userName && <span className="font-light">, {userName}</span>}
      </h2>
    </div>
  );
}
