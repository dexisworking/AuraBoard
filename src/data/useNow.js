import { useEffect, useState } from 'react';

/**
 * A ticking "current time" value.
 *
 * Widgets that derive something from the current moment (progress rails,
 * relative dates, countdowns) need `now` as state rather than a `Date.now()`
 * call during render — reading the clock while rendering is impure and makes
 * output non-deterministic between renders.
 *
 * @param {number} intervalMs how often to re-read the clock
 */
export default function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
