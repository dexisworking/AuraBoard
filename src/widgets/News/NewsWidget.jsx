/**
 * NewsWidget — scrolling headline ticker with GNews primary + BBC RSS fallback.
 * Refreshes every 15 minutes.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import './NewsWidget.css';

function timeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

export default function NewsWidget() {
  const [headlines, setHeadlines] = useState([]);
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null); // index of expanded headline
  const timerRef = useRef(null);

  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Try GNews if API key is set
      let settings = {};
      try {
        settings = await window.electronAPI?.getSettings?.() ?? {};
      } catch { /* ignore */ }

      const gnewsKey = settings.gnewsApiKey;
      if (gnewsKey) {
        try {
          const res = await fetch(
            `https://gnews.io/api/v4/top-headlines?lang=en&max=10&apikey=${gnewsKey}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.articles && data.articles.length > 0) {
              setHeadlines(data.articles.map((a) => ({
                title: a.title,
                description: a.description,
                source: a.source?.name || 'GNews',
                url: a.url,
                publishedAt: a.publishedAt,
              })));
              setSource('GNews');
              setLoading(false);
              return;
            }
          }
        } catch {
          // Fall through to RSS
        }
      }

      // 2. Fallback: BBC RSS via IPC
      try {
        const rssItems = await window.electronAPI?.fetchRss?.(
          'http://feeds.bbci.co.uk/news/rss.xml'
        );
        if (rssItems && rssItems.length > 0) {
          setHeadlines(rssItems.slice(0, 10).map((item) => ({
            title: item.title,
            description: item.contentSnippet || item.content || '',
            source: 'BBC News',
            url: item.link,
            publishedAt: item.isoDate || item.pubDate || '',
          })));
          setSource('BBC RSS');
          setLoading(false);
          return;
        }
      } catch {
        // RSS also failed
      }

      throw new Error('Unable to fetch news from any source');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
    timerRef.current = setInterval(fetchNews, REFRESH_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchNews]);

  // ── Loading skeleton ──
  if (loading && headlines.length === 0) {
    return (
      <div className="news-widget">
        <div className="news-header">
          <span className="news-title">📰 News</span>
        </div>
        <div className="news-skeleton">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="news-skeleton-line" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error && headlines.length === 0) {
    return (
      <div className="news-widget">
        <div className="news-header">
          <span className="news-title">📰 News</span>
        </div>
        <div className="news-error">
          <span>⚠️ {error}</span>
          <button className="news-retry-btn" onClick={fetchNews}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="news-widget">
      <div className="news-header">
        <span className="news-title">📰 News</span>
        <span className="news-source-badge">{source}</span>
      </div>

      {/* Expanded headline */}
      {expanded !== null && headlines[expanded] && (
        <div
          className="news-expanded"
          onClick={() => setExpanded(null)}
        >
          <h3 className="news-expanded-title">{headlines[expanded].title}</h3>
          <p className="news-expanded-desc">{headlines[expanded].description}</p>
          <div className="news-expanded-meta">
            <span className="news-expanded-source">{headlines[expanded].source}</span>
            <span className="news-expanded-time">
              {headlines[expanded].publishedAt && timeAgo(headlines[expanded].publishedAt)}
            </span>
          </div>
        </div>
      )}

      {/* Scrolling ticker */}
      <div className="news-ticker-container">
        <div className="news-ticker">
          {headlines.map((h, i) => (
            <button
              key={i}
              className="news-ticker-item widget-no-drag"
              onClick={(e) => { e.stopPropagation(); setExpanded(expanded === i ? null : i); }}
            >
              <span className="news-ticker-dot">•</span>
              {h.title}
            </button>
          ))}
          {/* duplicate for seamless loop */}
          {headlines.map((h, i) => (
            <button
              key={`dup-${i}`}
              className="news-ticker-item widget-no-drag"
              onClick={(e) => { e.stopPropagation(); setExpanded(expanded === i ? null : i); }}
            >
              <span className="news-ticker-dot">•</span>
              {h.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
