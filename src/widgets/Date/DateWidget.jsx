import { useState, useEffect } from 'react';

export default function DateWidget({ timeZone }) {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    let timeoutId;

    const scheduleNextMidnight = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0); // Next midnight
      
      const msUntilMidnight = nextMidnight.getTime() - now.getTime();
      
      timeoutId = setTimeout(() => {
        setDate(new Date());
        scheduleNextMidnight(); // Schedule the next one
      }, msUntilMidnight + 100); // add 100ms safety buffer
    };

    scheduleNextMidnight();
    return () => clearTimeout(timeoutId);
  }, []);

  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: timeZone || undefined,
  });

  const parts = formatter.formatToParts(date);
  
  let weekday = '';
  let day = '';
  let month = '';
  let year = '';

  parts.forEach(part => {
    if (part.type === 'weekday') weekday = part.value;
    if (part.type === 'day') day = part.value;
    if (part.type === 'month') month = part.value;
    if (part.type === 'year') year = part.value;
  });

  return (
    <div className="w-full h-full flex items-center justify-center text-white/90 font-light drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]" style={{ fontFamily: 'inherit' }}>
      <span className="text-3xl font-regular">{weekday}</span>
      <div className="mx-4 h-6 w-px bg-white/40 shadow-[0_0_8px_rgba(255,255,255,0.3)]"></div>
      <span className="text-2xl opacity-80">
        {day} {month} {year}
      </span>
    </div>
  );
}
