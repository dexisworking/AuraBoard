/**
 * Data providers. Each returns plain JSON for a widget; all go through the
 * shared cache in fetcher.js, so TTLs here are per-source politeness limits.
 */

import os from 'node:os';
import { readThrough, fetchJson } from './fetcher.js';

/* ── Location ──────────────────────────────────────────────────────────────
 * A manual place name is geocoded via Open-Meteo's own geocoder (free, no key,
 * no User-Agent rules — unlike Nominatim). Falls back to IP geolocation.
 */
export async function resolveLocation(place) {
  const wanted = (place || '').trim();

  if (wanted) {
    return readThrough(`geo:${wanted.toLowerCase()}`, async () => {
      const geo = await fetchJson(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(wanted)}&count=1&language=en&format=json`
      );
      const hit = geo?.results?.[0];
      if (!hit) throw new Error(`"${wanted}" not found`);
      return {
        latitude: hit.latitude,
        longitude: hit.longitude,
        name: hit.name + (hit.country_code ? `, ${hit.country_code}` : ''),
        timezone: hit.timezone,
      };
    }, { ttlMs: 24 * 60 * 60_000 });
  }

  return readThrough('geo:auto', async () => {
    const ip = await fetchJson('https://ipapi.co/json/');
    if (!Number.isFinite(ip?.latitude) || !Number.isFinite(ip?.longitude)) {
      throw new Error('Auto-location unavailable — set a Weather Location in Settings');
    }
    return {
      latitude: ip.latitude,
      longitude: ip.longitude,
      name: ip.city || 'Local area',
      timezone: ip.timezone,
    };
  }, { ttlMs: 6 * 60 * 60_000 });
}

/* ── Weather ───────────────────────────────────────────────────────────────
 * One Open-Meteo call now also carries sunrise/sunset, UV, precipitation
 * probability and daylight duration; air quality comes from their AQI API.
 */
export async function getWeather({ place = '', useFahrenheit = false } = {}) {
  const loc = await resolveLocation(place);
  if (!loc.data) return loc; // propagate the location error envelope

  const { latitude, longitude, name } = loc.data;
  const unit = useFahrenheit ? '&temperature_unit=fahrenheit' : '';
  const key = `weather:${latitude.toFixed(2)},${longitude.toFixed(2)}:${useFahrenheit ? 'f' : 'c'}`;

  return readThrough(key, async () => {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      '&current=temperature_2m,weathercode,windspeed_10m,relativehumidity_2m,apparent_temperature,is_day,uv_index,precipitation' +
      '&hourly=precipitation_probability,temperature_2m' +
      '&daily=temperature_2m_max,temperature_2m_min,weathercode,sunrise,sunset,uv_index_max,precipitation_probability_max,daylight_duration' +
      `&forecast_days=4&timezone=auto${unit}`;

    const [forecast, air] = await Promise.all([
      fetchJson(url),
      // Air quality is best-effort: never fail the whole widget over it.
      fetchJson(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=european_aqi,pm2_5&timezone=auto`
      ).catch(() => null),
    ]);

    // Next hour (from now) where rain is likely — powers "rain expected 14:00".
    let nextRain = null;
    const times = forecast?.hourly?.time || [];
    const probs = forecast?.hourly?.precipitation_probability || [];
    const now = Date.now();
    for (let i = 0; i < times.length; i += 1) {
      const t = new Date(times[i]).getTime();
      if (t >= now && probs[i] >= 50) {
        nextRain = { time: times[i], probability: probs[i] };
        break;
      }
    }

    return {
      locationName: name,
      current: forecast.current,
      daily: forecast.daily,
      hourly: forecast.hourly,
      airQuality: air?.current ?? null,
      nextRain,
      units: useFahrenheit ? 'F' : 'C',
    };
  }, { ttlMs: 10 * 60_000 });
}

/* ── Crypto / Stocks / News / Sports ───────────────────────────────────── */

export async function getCrypto({ coinIds = 'bitcoin,ethereum' } = {}) {
  return readThrough(`crypto:${coinIds}`, async () => {
    const data = await fetchJson(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(coinIds)}&order=market_cap_desc&sparkline=true`
    );
    if (!Array.isArray(data)) throw new Error('Unexpected response');
    return data;
  }, { ttlMs: 5 * 60_000 });
}

export async function getSports({ leagueIds = '4387,4328', leagueNames = {} } = {}) {
  return readThrough(`sports:${leagueIds}`, async () => {
    const ids = String(leagueIds).split(',').map((s) => s.trim()).filter(Boolean);
    const fixtures = [];
    for (const id of ids) {
      try {
        const data = await fetchJson(`https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=${id}`);
        for (const ev of (data?.events || []).slice(0, 3)) {
          fixtures.push({
            id: ev.idEvent,
            league: leagueNames[id] || ev.strLeague || `League ${id}`,
            homeTeam: ev.strHomeTeam,
            awayTeam: ev.strAwayTeam,
            dateEvent: ev.dateEvent,
            strTime: ev.strTime,
            homeScore: ev.intHomeScore,
            awayScore: ev.intAwayScore,
          });
        }
      } catch { /* one league failing shouldn't sink the widget */ }
    }
    return fixtures;
  }, { ttlMs: 30 * 60_000 });
}

/* ── Calendar (.ics) ───────────────────────────────────────────────────────
 * Minimal iCalendar parse: enough for VEVENT summary + start, which is all an
 * ambient "next event" widget needs. Handles line folding and DATE/DATE-TIME.
 */
function parseIcsDate(value, params = '') {
  if (!value) return null;
  const v = value.trim();
  // All-day: YYYYMMDD
  if (/^\d{8}$/.test(v)) {
    return new Date(Number(v.slice(0, 4)), Number(v.slice(4, 6)) - 1, Number(v.slice(6, 8)));
  }
  // YYYYMMDDTHHMMSS(Z)
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  const isUtc = z === 'Z' || /TZID=UTC/i.test(params);
  return isUtc
    ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s))
    : new Date(+y, +mo - 1, +d, +h, +mi, +s);
}

export function parseIcs(text, { limit = 5, now = Date.now() } = {}) {
  // unfold: continuation lines start with a space or tab
  const lines = String(text).replace(/\r\n[ \t]/g, '').split(/\r?\n/);
  const events = [];
  let cur = null;
  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) { cur = {}; continue; }
    if (line.startsWith('END:VEVENT')) {
      if (cur?.start && cur.start.getTime() >= now) events.push(cur);
      cur = null;
      continue;
    }
    if (!cur) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const rawKey = line.slice(0, idx);
    const value = line.slice(idx + 1);
    const [name, ...paramParts] = rawKey.split(';');
    const params = paramParts.join(';');
    if (name === 'SUMMARY') cur.summary = value.replace(/\\,/g, ',').replace(/\\n/gi, ' ').trim();
    else if (name === 'LOCATION') cur.location = value.replace(/\\,/g, ',').trim();
    else if (name === 'DTSTART') {
      cur.start = parseIcsDate(value, params);
      cur.allDay = /VALUE=DATE(?!-TIME)/i.test(params) || /^\d{8}$/.test(value.trim());
    }
  }
  events.sort((a, b) => a.start - b.start);
  return events.slice(0, limit).map((e) => ({
    summary: e.summary || 'Untitled',
    location: e.location || '',
    start: e.start.toISOString(),
    allDay: Boolean(e.allDay),
  }));
}

export async function getCalendar({ icsUrl = '' } = {}) {
  const url = (icsUrl || '').trim();
  if (!url) {
    return { data: null, error: 'No calendar URL set — add one in Settings', fetchedAt: null, isStale: false };
  }
  return readThrough(`ics:${url}`, async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      // webcal:// is just https:// for fetching purposes
      const res = await fetch(url.replace(/^webcal:\/\//i, 'https://'), { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return parseIcs(await res.text());
    } finally {
      clearTimeout(timer);
    }
  }, { ttlMs: 15 * 60_000 });
}

/* ── System stats ──────────────────────────────────────────────────────────
 * CPU load is sampled by diffing cpus() times between calls, since Windows has
 * no meaningful loadavg().
 */
let lastCpu = null;

function sampleCpu() {
  const cpus = os.cpus() || [];
  let idle = 0;
  let total = 0;
  for (const c of cpus) {
    for (const t of Object.values(c.times)) total += t;
    idle += c.times.idle;
  }
  return { idle, total };
}

export function getSystemStats() {
  const now = sampleCpu();
  let cpuPercent = null;
  if (lastCpu) {
    const idleDelta = now.idle - lastCpu.idle;
    const totalDelta = now.total - lastCpu.total;
    if (totalDelta > 0) cpuPercent = Math.max(0, Math.min(100, Math.round((1 - idleDelta / totalDelta) * 100)));
  }
  lastCpu = now;

  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  return {
    cpuPercent,
    cpuModel: (os.cpus()?.[0]?.model || '').replace(/\s+/g, ' ').trim(),
    cores: (os.cpus() || []).length,
    memUsedBytes: totalMem - freeMem,
    memTotalBytes: totalMem,
    memPercent: totalMem ? Math.round(((totalMem - freeMem) / totalMem) * 100) : null,
    uptimeSec: Math.round(os.uptime()),
    hostname: os.hostname(),
    platform: `${os.type()} ${os.release()}`,
  };
}
