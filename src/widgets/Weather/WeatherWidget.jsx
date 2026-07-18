import ErrorState from '../../ui/ErrorState';
import useWidgetData from '../../data/useWidgetData';
import '../../ui/primitives.css';

/* WMO weather codes → text labels. No emoji: condition is typography. */
const WMO_LABELS = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Rime fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle',
  56: 'Freezing drizzle', 57: 'Freezing drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  66: 'Freezing rain', 67: 'Freezing rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
  80: 'Showers', 81: 'Showers', 82: 'Violent showers',
  85: 'Snow showers', 86: 'Snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm',
};

const wmoLabel = (code) => WMO_LABELS[code] || 'Unknown';

/**
 * WeatherWidget — Swiss/Brutalist: one colossal condensed temperature figure,
 * condition and location as tracked-out captions, three-day forecast as a
 * hairline-ruled column row. No icons, no cards, no shadows.
 */
/** "14:00" style label for the next likely rain hour. */
function rainLabel(nextRain) {
  if (!nextRain?.time) return null;
  const d = new Date(nextRain.time);
  if (Number.isNaN(d.getTime())) return null;
  const hh = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return `Rain ${nextRain.probability}% at ${hh}`;
}

export default function WeatherWidget({ city = '', useFahrenheit = false, variant = 'full' }) {
  // Shared main-process data layer: one cache + one request across all windows,
  // with stale-on-error instead of a blank widget.
  const {
    data: payload, status, error, isStale, refresh,
  } = useWidgetData(
    'weather',
    { place: city, useFahrenheit },
    { refreshMs: 10 * 60_000 },
  );

  const data = payload ? { current: payload.current, daily: payload.daily } : null;
  const locationName = payload?.locationName || '';
  const loading = status === 'loading';

  if (loading && !data) {
    return (
      <div className="ab-widget-root justify-center">
        <div className="ab-skeleton-rows" style={{ flex: 'none' }}>
          <div className="ab-skeleton-block" style={{ width: 120, height: 56 }} />
          <div className="ab-skeleton-block" style={{ width: 180, height: 12 }} />
          <div className="ab-skeleton-block" style={{ width: 140, height: 12 }} />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="ab-widget-root">
        <ErrorState message={error} onRetry={refresh} />
      </div>
    );
  }

  if (!data?.current || !data?.daily) return null;

  const { current, daily } = data;
  const rain = rainLabel(payload?.nextRain);
  const uv = current?.uv_index;
  const aqi = payload?.airQuality?.european_aqi;

  const micro = {
    fontFamily: 'var(--ab-font-micro)', fontSize: '0.9em', fontWeight: 600,
    letterSpacing: '0.14em', textTransform: 'uppercase',
  };

  // ── MINIMAL: giant temperature only ──
  if (variant === 'minimal') {
    return (
      <div
        className="w-full h-full flex flex-col justify-center text-ink"
        style={{ padding: '4cqmin 5cqmin', fontSize: 'min(34cqh, 22cqw)' }}
      >
        <span className="ab-numeric" style={{ fontSize: '1em', lineHeight: 0.85 }}>
          {Math.round(current.temperature_2m)}<span className="text-accent">°</span>
        </span>
        <span style={{ ...micro, fontSize: '0.14em', marginTop: '0.2em' }} className="text-ink-tertiary">
          {wmoLabel(current.weathercode)} · {locationName || 'Local area'}
        </span>
      </div>
    );
  }

  // ── COMPACT: temp + condition + location ──
  if (variant === 'compact') {
    return (
      <div
        className="w-full h-full flex flex-col justify-center text-ink"
        style={{ padding: '4cqmin 5cqmin', fontSize: 'min(13cqh, 6cqw)' }}
      >
        <div className="flex items-end" style={{ gap: '0.6em' }}>
          <span className="ab-numeric" style={{ fontSize: '3.4em', lineHeight: 0.85 }}>
            {Math.round(current.temperature_2m)}<span className="text-accent">°</span>
          </span>
        </div>
        <div className="ab-rule-h" style={{ marginTop: '0.5em', paddingTop: '0.5em' }}>
          <span style={micro} className="text-ink">{wmoLabel(current.weathercode)}</span>
          <span style={{ ...micro, marginLeft: '0.6em' }} className="text-ink-tertiary">{locationName || 'Local area'}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full flex flex-col justify-center text-ink"
      style={{ padding: '4cqmin 5cqmin', fontSize: 'min(9cqh, 4cqw)' }}
    >
      {/* current temperature — the figure carries the widget */}
      <div className="flex items-end" style={{ gap: '0.9em' }}>
        <span className="ab-numeric" style={{ fontSize: '5em', lineHeight: 0.9 }}>
          {Math.round(current.temperature_2m)}
          <span className="text-accent">°</span>
        </span>
        <div className="flex flex-col" style={{ paddingBottom: '0.6em' }}>
          <span className="text-ink" style={micro}>{wmoLabel(current.weathercode)}</span>
          <span className="text-ink-tertiary" style={{ ...micro, marginTop: '0.3em' }}>
            {locationName || 'Local area'}{isStale ? ' · stale' : ''}
          </span>
        </div>
      </div>

      {/* rain outlook — only when something is actually expected */}
      {rain && (
        <span className="text-accent" style={{ ...micro, marginTop: '0.5em' }}>{rain}</span>
      )}

      {/* detail strip */}
      <div className="ab-rule-h flex flex-wrap" style={{ marginTop: '0.7em', paddingTop: '0.6em', gap: '0.4em 1.2em' }}>
        <span className="text-ink-secondary" style={micro}>
          Feels {Math.round(current.apparent_temperature)}°
        </span>
        <span className="text-ink-secondary" style={micro}>
          Hum {current.relativehumidity_2m}%
        </span>
        <span className="text-ink-secondary" style={micro}>
          Wind {Math.round(current.windspeed_10m)}
        </span>
        {Number.isFinite(uv) && (
          <span className="text-ink-secondary" style={micro}>UV {Math.round(uv)}</span>
        )}
        {Number.isFinite(aqi) && (
          <span className="text-ink-secondary" style={micro}>AQI {Math.round(aqi)}</span>
        )}
      </div>

      {/* three-day forecast — ruled columns, figures only */}
      <div className="flex" style={{ marginTop: '0.9em' }}>
        {daily.time.slice(1, 4).map((timeStr, index) => {
          const i = index + 1;
          const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
            .format(new Date(daily.time[i] + 'T12:00:00'));

          return (
            <div
              key={timeStr}
              className="flex-1 flex flex-col"
              style={{
                gap: '0.3em',
                borderLeft: index === 0 ? 'none' : 'var(--ab-rule-hairline) solid var(--ab-rule)',
                paddingLeft: index === 0 ? 0 : '0.9em',
              }}
            >
              <span className="text-ink-tertiary" style={micro}>{dayName}</span>
              <span className="ab-figure" style={{ fontSize: '1.6em' }}>
                {Math.round(daily.temperature_2m_max[i])}°
                <span className="text-ink-tertiary" style={{ fontSize: '0.7em' }}>
                  {' '}{Math.round(daily.temperature_2m_min[i])}°
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
