/**
 * Shared data layer for all widgets.
 *
 * Every screensaver window used to poll third-party APIs independently, so a
 * three-monitor setup made 3× the requests and hit rate limits. This module
 * runs in the MAIN process, so every window shares one cache and one in-flight
 * request per key.
 *
 * Guarantees:
 *  - TTL cache            — repeat reads inside the window are free
 *  - single-flight        — concurrent reads of the same key share one request
 *  - exponential backoff  — a failing source is not hammered
 *  - stale-while-error    — last good value is served (flagged stale) on failure
 */

const cache = new Map(); // key -> { data, fetchedAt, error, failures, nextRetryAt }
const inFlight = new Map(); // key -> Promise

const BACKOFF_BASE_MS = 15_000;
const BACKOFF_MAX_MS = 10 * 60_000;

function backoffFor(failures) {
  return Math.min(BACKOFF_BASE_MS * 2 ** Math.max(0, failures - 1), BACKOFF_MAX_MS);
}

/** Shape returned to the renderer for every data read. */
function envelope(entry, extra = {}) {
  return {
    data: entry?.data ?? null,
    error: entry?.error ?? null,
    fetchedAt: entry?.fetchedAt ?? null,
    isStale: Boolean(entry?.error && entry?.data),
    ...extra,
  };
}

/**
 * Read a value through the cache.
 * @param {string} key      cache identity (include all params that affect the result)
 * @param {() => Promise<any>} loader
 * @param {{ ttlMs?: number, force?: boolean }} opts
 */
export async function readThrough(key, loader, opts = {}) {
  const ttlMs = opts.ttlMs ?? 5 * 60_000;
  const now = Date.now();
  const entry = cache.get(key);

  // Fresh enough — serve immediately.
  if (!opts.force && entry?.data && entry.fetchedAt && now - entry.fetchedAt < ttlMs) {
    return envelope(entry, { cached: true });
  }

  // Backing off after repeated failures — serve last good value if we have one.
  if (!opts.force && entry?.nextRetryAt && now < entry.nextRetryAt) {
    return envelope(entry, { cached: true, backoff: true });
  }

  // Someone else is already fetching this key — join them.
  if (inFlight.has(key)) return inFlight.get(key);

  const task = (async () => {
    try {
      const data = await loader();
      cache.set(key, { data, fetchedAt: Date.now(), error: null, failures: 0, nextRetryAt: 0 });
      return envelope(cache.get(key), { cached: false });
    } catch (err) {
      const failures = (entry?.failures ?? 0) + 1;
      const next = {
        // keep the last good payload so widgets can render stale rather than blank
        data: entry?.data ?? null,
        fetchedAt: entry?.fetchedAt ?? null,
        error: err?.message ? String(err.message) : 'Request failed',
        failures,
        nextRetryAt: Date.now() + backoffFor(failures),
      };
      cache.set(key, next);
      return envelope(next, { cached: false });
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, task);
  return task;
}

/** Fetch JSON with a timeout, throwing a useful message on failure. */
export async function fetchJson(url, { timeoutMs = 12_000, headers } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'AuraBoard/1.0 (ambient display; +https://dexforge.iamdex.codes)', ...headers },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error('Request timed out');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Drop cached values (all, or those whose key starts with `prefix`). */
export function invalidate(prefix) {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
