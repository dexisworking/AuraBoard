import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Read a data source through the shared main-process layer.
 *
 * Widgets get a consistent lifecycle instead of each rolling its own
 * setInterval: `status` distinguishes loading / ready / error, and `isStale`
 * means "this is the last good value, the latest refresh failed" — so a
 * flaky network shows slightly old data rather than a blank widget.
 *
 * @param {string} source  provider id ('weather' | 'crypto' | 'sports' | 'calendar' | 'system')
 * @param {object} params  provider params (also forms the refetch identity)
 * @param {{ refreshMs?: number, enabled?: boolean }} opts
 */
export default function useWidgetData(source, params = {}, opts = {}) {
  const { refreshMs = 5 * 60_000, enabled = true } = opts;

  const [state, setState] = useState({
    data: null,
    error: null,
    status: 'loading', // 'loading' | 'ready' | 'error'
    isStale: false,
    fetchedAt: null,
  });

  // Identity for the effect: params are small, plain objects.
  const paramsKey = JSON.stringify(params ?? {});
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async () => {
    if (!enabled) return;
    const api = window.electronAPI?.dataFetch;
    if (!api) {
      if (mountedRef.current) {
        setState((s) => ({ ...s, status: 'error', error: 'Data layer unavailable' }));
      }
      return;
    }
    try {
      const res = await api(source, JSON.parse(paramsKey));
      if (!mountedRef.current) return;
      setState({
        data: res?.data ?? null,
        error: res?.error ?? null,
        // an error with no cached payload is a hard failure; with one it's stale
        status: res?.data ? 'ready' : (res?.error ? 'error' : 'loading'),
        isStale: Boolean(res?.isStale),
        fetchedAt: res?.fetchedAt ?? null,
      });
    } catch (err) {
      if (!mountedRef.current) return;
      setState((s) => ({
        ...s,
        status: s.data ? 'ready' : 'error',
        isStale: Boolean(s.data),
        error: err?.message || 'Request failed',
      }));
    }
  }, [source, paramsKey, enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    load();
    if (!refreshMs) return undefined;
    const id = setInterval(load, refreshMs);
    return () => clearInterval(id);
  }, [load, refreshMs, enabled]);

  return { ...state, refresh: load };
}
