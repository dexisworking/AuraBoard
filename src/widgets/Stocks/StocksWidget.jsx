/**
 * StocksWidget — stock prices with Alpha Vantage primary + yahoo-finance2 fallback.
 * Refreshes every 15 minutes.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import WidgetHeader from '../../ui/WidgetHeader';
import SkeletonRows from '../../ui/Skeleton';
import ErrorState from '../../ui/ErrorState';
import '../../ui/primitives.css';
import './StocksWidget.css';

const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes
const DEFAULT_SYMBOLS = 'AAPL,MSFT,GOOGL,AMZN,TSLA';

/** Check if US stock market is currently open (9:30–16:00 ET, Mon–Fri) */
function isMarketOpen() {
  const now = new Date();
  // Convert to Eastern Time
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay(); // 0 = Sun, 6 = Sat
  if (day === 0 || day === 6) return false;
  const hours = et.getHours();
  const mins = et.getMinutes();
  const totalMins = hours * 60 + mins;
  return totalMins >= 570 && totalMins < 960; // 9:30=570, 16:00=960
}

export default function StocksWidget() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [marketOpen, setMarketOpen] = useState(isMarketOpen());
  const timerRef = useRef(null);
  const cacheRef = useRef({}); // simple in-memory cache for Alpha Vantage

  const fetchStocks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setMarketOpen(isMarketOpen());

      let settings = {};
      try {
        settings = await window.electronAPI?.getSettings?.() ?? {};
      } catch { /* ignore */ }

      const symbolStr = settings.stockSymbols || DEFAULT_SYMBOLS;
      const symbols = symbolStr.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 5);
      const apiKey = settings.alphaVantageApiKey;

      const results = [];

      for (const symbol of symbols) {
        let stockData = null;

        // 1. Try Alpha Vantage
        if (apiKey) {
          try {
            // Check cache (Alpha Vantage has 25/day limit)
            const cached = cacheRef.current[symbol];
            if (cached && Date.now() - cached.ts < REFRESH_INTERVAL) {
              stockData = cached.data;
            } else {
              const res = await fetch(
                `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
              );
              if (res.ok) {
                const json = await res.json();
                const q = json['Global Quote'];
                if (q && q['05. price']) {
                  stockData = {
                    symbol: q['01. symbol'] || symbol,
                    price: parseFloat(q['05. price']),
                    change: parseFloat(q['09. change']),
                    changePercent: parseFloat(q['10. change percent']?.replace('%', '')) || 0,
                    name: symbol, // Alpha Vantage GLOBAL_QUOTE doesn't return company name
                  };
                  cacheRef.current[symbol] = { data: stockData, ts: Date.now() };
                }
              }
            }
          } catch {
            // Fall through to yahoo
          }
        }

        // 2. Fallback: yahoo-finance2 via IPC
        if (!stockData) {
          try {
            const yahooData = await window.electronAPI?.fetchStockQuote?.(symbol);
            if (yahooData) {
              stockData = {
                symbol: yahooData.symbol || symbol,
                price: yahooData.regularMarketPrice ?? 0,
                change: yahooData.regularMarketChange ?? 0,
                changePercent: yahooData.regularMarketChangePercent ?? 0,
                name: yahooData.shortName || yahooData.longName || symbol,
              };
            }
          } catch {
            // skip this symbol
          }
        }

        if (stockData) {
          results.push(stockData);
        } else {
          results.push({
            symbol,
            price: 0,
            change: 0,
            changePercent: 0,
            name: symbol,
            error: true,
          });
        }
      }

      setStocks(results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStocks();
    timerRef.current = setInterval(fetchStocks, REFRESH_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchStocks]);

  // ── Loading skeleton ──
  if (loading && stocks.length === 0) {
    return (
      <div className="ab-widget-root">
        <WidgetHeader title="Stocks" />
        <SkeletonRows rows={5} />
      </div>
    );
  }

  // ── Error state ──
  if (error && stocks.length === 0) {
    return (
      <div className="ab-widget-root">
        <WidgetHeader title="Stocks" />
        <ErrorState message={error} onRetry={fetchStocks} />
      </div>
    );
  }

  return (
    <div className="ab-widget-root">
      <WidgetHeader
        title="Stocks"
        meta={(
          <span className={`stocks-market-status ${marketOpen ? 'open' : 'closed'}`}>
            <span className="stocks-status-dot" />
            {marketOpen ? 'Open' : 'Closed'}
          </span>
        )}
      />

      <div className="stocks-list">
        {stocks.map((s) => {
          const positive = s.change >= 0;

          return (
            <div key={s.symbol} className="ab-row">
              <div className="stocks-sym-col">
                <span className="stocks-symbol">{s.symbol}</span>
                <span className="stocks-name">{s.name}</span>
              </div>
              <div className="stocks-price-col">
                <span className="stocks-price">
                  {s.error ? '—' : `$${s.price.toFixed(2)}`}
                </span>
                {!s.error && (
                  <span className={`stocks-change ${positive ? 'up' : 'down'}`}>
                    {positive ? '+' : '−'}${Math.abs(s.change).toFixed(2)} ({Math.abs(s.changePercent).toFixed(2)}%)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
