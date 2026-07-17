import { useState, useEffect, useCallback } from 'react';
import ErrorState from '../../ui/ErrorState';
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
export default function WeatherWidget({ city = '', useFahrenheit = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationName, setLocationName] = useState('');

  const fetchWeather = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let lat, lon, locName = city;

      if (!city) {
        const ipRes = await fetch('https://ipapi.co/json/');
        if (!ipRes.ok) throw new Error('Location detection failed');
        const ipData = await ipRes.json();
        lat = ipData.latitude;
        lon = ipData.longitude;
        locName = ipData.city;
      } else {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`);
        if (!geoRes.ok) throw new Error('Geocoding failed');
        const geoData = await geoRes.json();
        if (geoData.length === 0) throw new Error(`City "${city}" not found`);
        lat = geoData[0].lat;
        lon = geoData[0].lon;
      }

      setLocationName(locName);

      const tempUnit = useFahrenheit ? '&temperature_unit=fahrenheit' : '';
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m,relativehumidity_2m,apparent_temperature&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto${tempUnit}`;
      const weatherRes = await fetch(weatherUrl);
      if (!weatherRes.ok) throw new Error('Weather data fetch failed');
      setData(await weatherRes.json());
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [city, useFahrenheit]);

  useEffect(() => {
    fetchWeather();
    const intervalId = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [fetchWeather]);

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
        <ErrorState message={error} onRetry={fetchWeather} />
      </div>
    );
  }

  if (!data) return null;

  const { current, daily } = data;

  const micro = {
    fontFamily: 'var(--ab-font-micro)', fontSize: '0.9em', fontWeight: 600,
    letterSpacing: '0.14em', textTransform: 'uppercase',
  };

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
            {locationName || 'Local area'}
          </span>
        </div>
      </div>

      {/* detail strip */}
      <div className="ab-rule-h flex" style={{ marginTop: '0.7em', paddingTop: '0.6em', gap: '1.2em' }}>
        <span className="text-ink-secondary" style={micro}>
          Feels {Math.round(current.apparent_temperature)}°
        </span>
        <span className="text-ink-secondary" style={micro}>
          Hum {current.relativehumidity_2m}%
        </span>
        <span className="text-ink-secondary" style={micro}>
          Wind {Math.round(current.windspeed_10m)}
        </span>
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
