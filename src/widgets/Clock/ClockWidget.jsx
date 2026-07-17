import { useState, useEffect } from 'react';

export default function ClockWidget({ use24hr = false, timeZone }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format hours and minutes
  const formatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24hr,
    timeZone: timeZone || undefined,
  };
  
  // Intl.DateTimeFormat does not easily split the colon perfectly across all locales to allow for blinking animation,
  // so we will extract the parts manually or use a specific format and string replacement.
  const formatter = new Intl.DateTimeFormat('en-US', formatOptions);
  const parts = formatter.formatToParts(time);
  
  let hours = '';
  let minutes = '';
  let ampm = '';

  parts.forEach(part => {
    if (part.type === 'hour') hours = part.value;
    if (part.type === 'minute') minutes = part.value;
    if (part.type === 'dayPeriod') ampm = part.value;
  });

  // Handle seconds separately
  const secondsFormatter = new Intl.DateTimeFormat('en-US', {
    second: '2-digit',
    timeZone: timeZone || undefined,
  });
  const seconds = secondsFormatter.format(time);

  return (
    <div className="w-full h-full flex items-center justify-center text-white" style={{ fontFamily: 'inherit' }}>
      <div 
        className="text-8xl tabular-nums tracking-tight font-light drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
      >
        {hours}
        <span className="animate-[pulse_1s_ease-in-out_infinite] opacity-80 mx-1">:</span>
        {minutes}
      </div>
      <div className="ml-4 flex flex-col justify-end pb-2">
        <span 
          className="text-3xl tabular-nums opacity-60 font-light drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
        >
          {seconds}
        </span>
        {!use24hr && ampm && (
          <span className="text-xl uppercase opacity-80 font-medium tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] mt-1">
            {ampm}
          </span>
        )}
      </div>
    </div>
  );
}
