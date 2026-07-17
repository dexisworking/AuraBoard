/**
 * CryptoWidget — live cryptocurrency prices with SVG sparklines from CoinGecko.
 * Refreshes every 5 minutes.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import WidgetHeader from '../../ui/WidgetHeader';
import SkeletonRows from '../../ui/Skeleton';
import ErrorState from '../../ui/ErrorState';
import '../../ui/primitives.css';
import './CryptoWidget.css';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_COINS = 'bitcoin,ethereum,solana,binancecoin,cardano';

/* ── SVG Sparkline ── */
function Sparkline({ data, color, width = 80, height = 28 }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data
    .map((val, i) => `${(i * step).toFixed(1)},${(height - ((val - min) / range) * height).toFixed(1)}`)
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="crypto-sparkline">
      <polyline
        points={points}
        fill="none"
        style={{ stroke: color }}
        strokeWidth="1.5"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

export default function CryptoWidget() {
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [prevPrices, setPrevPrices] = useState({});
  const [flashMap, setFlashMap] = useState({});
  const timerRef = useRef(null);

  const fetchCrypto = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let settings = {};
      try {
        settings = await window.electronAPI?.getSettings?.() ?? {};
      } catch { /* ignore */ }

      const coinIds = settings.cryptoCoinIds || DEFAULT_COINS;

      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds}&order=market_cap_desc&sparkline=true`
      );

      if (!res.ok) throw new Error(`CoinGecko returned ${res.status}`);

      const data = await res.json();

      // Detect price changes for flash animation
      const newFlash = {};
      const newPrev = {};
      data.forEach((coin) => {
        const prev = prevPrices[coin.id];
        newPrev[coin.id] = coin.current_price;
        if (prev !== undefined && prev !== coin.current_price) {
          newFlash[coin.id] = coin.current_price > prev ? 'up' : 'down';
        }
      });
      setPrevPrices(newPrev);
      setFlashMap(newFlash);

      // Clear flashes after animation
      if (Object.keys(newFlash).length > 0) {
        setTimeout(() => setFlashMap({}), 1200);
      }

      setCoins(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [prevPrices]);

  useEffect(() => {
    fetchCrypto();
    timerRef.current = setInterval(fetchCrypto, REFRESH_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading skeleton ──
  if (loading && coins.length === 0) {
    return (
      <div className="ab-widget-root">
        <WidgetHeader title="Crypto" meta="USD" />
        <SkeletonRows rows={5} leading />
      </div>
    );
  }

  // ── Error state ──
  if (error && coins.length === 0) {
    return (
      <div className="ab-widget-root">
        <WidgetHeader title="Crypto" meta="USD" />
        <ErrorState message={error} onRetry={fetchCrypto} />
      </div>
    );
  }

  return (
    <div className="ab-widget-root">
      <WidgetHeader title="Crypto" meta="USD" />
      <div className="crypto-list">
        {coins.slice(0, 5).map((coin) => {
          const changePositive = coin.price_change_percentage_24h >= 0;
          const flash = flashMap[coin.id];

          return (
            <div
              key={coin.id}
              className={`ab-row ${flash === 'up' ? 'crypto-flash-green' : ''} ${flash === 'down' ? 'crypto-flash-red' : ''}`}
            >
              <img
                src={coin.image}
                alt={coin.symbol}
                className="crypto-logo"
                width={22}
                height={22}
              />
              <div className="crypto-info">
                <span className="crypto-symbol">{coin.symbol.toUpperCase()}</span>
                <span className="crypto-name">{coin.name}</span>
              </div>
              <Sparkline
                data={coin.sparkline_in_7d?.price}
                color={changePositive ? 'var(--ab-positive)' : 'var(--ab-negative)'}
              />
              <div className="crypto-price-col">
                <span className="crypto-price">
                  ${coin.current_price >= 1
                    ? coin.current_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : coin.current_price.toFixed(4)}
                </span>
                <span className={`crypto-change ${changePositive ? 'up' : 'down'}`}>
                  {changePositive ? '+' : '−'}
                  {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
