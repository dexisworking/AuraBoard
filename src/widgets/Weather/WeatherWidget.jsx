import { useState, useEffect, useCallback } from 'react';

const WMO_CODES = {
  0: { label: 'Clear sky', icon: '☀️' },
  1: { label: 'Mainly clear', icon: '🌤️' },
  2: { label: 'Partly cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Fog', icon: '🌫️' },
  48: { label: 'Rime fog', icon: '🌫️' },
  51: { label: 'Light drizzle', icon: '🌧️' },
  53: { label: 'Moderate drizzle', icon: '🌧️' },
  55: { label: 'Dense drizzle', icon: '🌧️' },
  56: { label: 'Light freezing drizzle', icon: '🌧️❄️' },
  57: { label: 'Dense freezing drizzle', icon: '🌧️❄️' },
  61: { label: 'Slight rain', icon: '☔' },
  63: { label: 'Moderate rain', icon: '☔' },
  65: { label: 'Heavy rain', icon: '🌧️' },
  66: { label: 'Light freezing rain', icon: '🌧️❄️' },
  67: { label: 'Heavy freezing rain', icon: '🌧️❄️' },
  71: { label: 'Slight snow', icon: '🌨️' },
  73: { label: 'Moderate snow', icon: '🌨️' },
  75: { label: 'Heavy snow', icon: '❄️' },
  77: { label: 'Snow grains', icon: '❄️' },
  80: { label: 'Slight rain showers', icon: '🌦️' },
  81: { label: 'Moderate rain showers', icon: '🌧️' },
  82: { label: 'Violent rain showers', icon: '⛈️' },
  85: { label: 'Slight snow showers', icon: '🌨️' },
  86: { label: 'Heavy snow showers', icon: '❄️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
  96: { label: 'Thunderstorm, slight hail', icon: '⛈️🧊' },
  99: { label: 'Thunderstorm, heavy hail', icon: '⛈️🧊' },
};

const getWmo = (code) => WMO_CODES[code] || { label: 'Unknown', icon: '❓' };

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
        // Auto-location
        const ipRes = await fetch('https://ipapi.co/json/');
        if (!ipRes.ok) throw new Error('Location detection failed');
        const ipData = await ipRes.json();
        lat = ipData.latitude;
        lon = ipData.longitude;
        locName = ipData.city;
      } else {
        // Geocoding
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`);
        if (!geoRes.ok) throw new Error('Geocoding failed');
        const geoData = await geoRes.json();
        if (geoData.length === 0) throw new Error(`City "${city}" not found`);
        lat = geoData[0].lat;
        lon = geoData[0].lon;
      }

      setLocationName(locName);

      // Open-Meteo
      const tempUnit = useFahrenheit ? '&temperature_unit=fahrenheit' : '';
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m,relativehumidity_2m,apparent_temperature&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto${tempUnit}`;
      const weatherRes = await fetch(weatherUrl);
      if (!weatherRes.ok) throw new Error('Weather data fetch failed');
      const weatherData = await weatherRes.json();

      setData(weatherData);
    } catch (err) {
      console.error("Weather fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [city, useFahrenheit]);

  useEffect(() => {
    fetchWeather();
    const intervalId = setInterval(fetchWeather, 15 * 60 * 1000); // 15 mins
    return () => clearInterval(intervalId);
  }, [fetchWeather]); // Re-fetch on prop change

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-4 animate-pulse opacity-80" style={{ fontFamily: "'Outfit', sans-serif" }}>
        <div className="h-16 w-48 bg-white/20 rounded-md"></div>
        <div className="h-8 w-64 bg-white/20 rounded-md"></div>
        <div className="flex gap-4">
          <div className="h-20 w-16 bg-white/20 rounded-md"></div>
          <div className="h-20 w-16 bg-white/20 rounded-md"></div>
          <div className="h-20 w-16 bg-white/20 rounded-md"></div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="text-red-300 drop-shadow-md text-sm font-medium bg-black/40 p-3 rounded" style={{ fontFamily: "'Outfit', sans-serif" }}>
        <span className="mr-2">⚠️</span>{error}
      </div>
    );
  }

  if (!data) return null;

  const { current, daily } = data;
  const currentWmo = getWmo(current.weathercode);
  const tempUnit = useFahrenheit ? '°F' : '°C';

  return (
    <div className="flex flex-col text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* Current Weather */}
      <div className="flex items-center gap-4 mb-2">
        <span className="text-7xl leading-none drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
          {Math.round(current.temperature_2m)}<span className="text-4xl font-light align-top">{tempUnit}</span>
        </span>
        <div className="flex flex-col text-left justify-center">
          <span className="text-4xl filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">{currentWmo.icon}</span>
          <span className="text-xl font-light tracking-wide">{currentWmo.label}</span>
          <span className="text-sm font-medium opacity-80">{locationName || 'Local Area'}</span>
        </div>
      </div>
      
      {/* Details Row */}
      <div className="flex gap-4 text-sm font-light opacity-80 mt-1 mb-4">
        <span>Feels like {Math.round(current.apparent_temperature)}°</span>
        <span>•</span>
        <span>Humidity {current.relativehumidity_2m}%</span>
        <span>•</span>
        <span>Wind {Math.round(current.windspeed_10m)} km/h</span>
      </div>

      {/* 3-Day Forecast */}
      <div className="flex gap-6 mt-2">
        {daily.time.slice(1, 4).map((timeStr, index) => {
          // slice(1, 4) skips today depending on API return, but let's just show next 3 days strictly 
          // timezone=auto returns daily arrays. daily.time[0] is today usually. 
          // So let's show index 1, 2, 3
          const i = index + 1;
          const dayDate = new Date(daily.time[i] + "T12:00:00");
          const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(dayDate);
          const wmo = getWmo(daily.weathercode[i]);
          
          return (
            <div key={timeStr} className="flex flex-col items-center justify-between text-center bg-black/20 rounded-xl p-3 backdrop-blur-sm border border-white/10 shadow-lg">
              <span className="text-base font-semibold mb-1 opacity-90">{dayName}</span>
              <span className="text-2xl filter drop-shadow-md mb-2">{wmo.icon}</span>
              <div className="flex gap-2 text-sm">
                <span className="font-medium text-white">{Math.round(daily.temperature_2m_max[i])}°</span>
                <span className="font-light opacity-60">{Math.round(daily.temperature_2m_min[i])}°</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
