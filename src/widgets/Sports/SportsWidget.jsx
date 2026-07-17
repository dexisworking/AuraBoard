/**
 * SportsWidget — upcoming fixtures, recent results, and ESPN headline ticker.
 * Data from TheSportsDB + ESPN RSS fallback.
 * Refreshes every 30 minutes.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import WidgetHeader from '../../ui/WidgetHeader';
import SkeletonRows from '../../ui/Skeleton';
import ErrorState from '../../ui/ErrorState';
import '../../ui/primitives.css';
import './SportsWidget.css';

const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

// TheSportsDB league IDs
const LEAGUE_MAP = {
  4387: 'NBA',
  4391: 'NFL',
  4328: 'EPL',
  4335: 'LaLiga',
};

const DEFAULT_LEAGUES = '4387,4328'; // NBA + EPL

function formatMatchDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMatchTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export default function SportsWidget() {
  const [fixtures, setFixtures] = useState([]);
  const [espnHeadlines, setEspnHeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const fetchSports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let settings = {};
      try {
        settings = await window.electronAPI?.getSettings?.() ?? {};
      } catch { /* ignore */ }

      const leagueStr = settings.sportsLeagues || DEFAULT_LEAGUES;
      const leagueIds = leagueStr.split(',').map((s) => s.trim()).filter(Boolean);

      // 1. Fetch next events for each league from TheSportsDB
      const allFixtures = [];
      for (const leagueId of leagueIds) {
        try {
          const res = await fetch(
            `https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=${leagueId}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.events) {
              const leagueName = LEAGUE_MAP[leagueId] || `League ${leagueId}`;
              const events = data.events.slice(0, 3).map((ev) => ({
                id: ev.idEvent,
                league: leagueName,
                homeTeam: ev.strHomeTeam,
                awayTeam: ev.strAwayTeam,
                date: formatMatchDate(ev.dateEvent),
                time: formatMatchTime(ev.strTime),
                homeScore: ev.intHomeScore,
                awayScore: ev.intAwayScore,
                status: ev.strStatus,
              }));
              allFixtures.push(...events);
            }
          }
        } catch {
          // skip this league
        }
      }
      setFixtures(allFixtures);

      // 2. ESPN RSS headlines via IPC
      try {
        const rssItems = await window.electronAPI?.fetchRss?.(
          'https://www.espn.com/espn/rss/news'
        );
        if (rssItems && rssItems.length > 0) {
          setEspnHeadlines(rssItems.slice(0, 8).map((item) => item.title));
        }
      } catch {
        // ESPN RSS failed, not critical
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSports();
    timerRef.current = setInterval(fetchSports, REFRESH_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchSports]);

  // ── Loading skeleton ──
  if (loading && fixtures.length === 0) {
    return (
      <div className="ab-widget-root">
        <WidgetHeader title="Sports" />
        <SkeletonRows rows={3} />
      </div>
    );
  }

  // ── Error state ──
  if (error && fixtures.length === 0) {
    return (
      <div className="ab-widget-root">
        <WidgetHeader title="Sports" />
        <ErrorState message={error} onRetry={fetchSports} />
      </div>
    );
  }

  return (
    <div className="ab-widget-root">
      <WidgetHeader title="Sports" />

      {/* Fixtures */}
      <div className="sports-fixtures">
        {fixtures.length === 0 && (
          <div className="sports-empty">No upcoming fixtures</div>
        )}
        {fixtures.map((f) => {
          const hasScore = f.homeScore !== null && f.awayScore !== null;
          return (
            <div key={f.id} className="sports-fixture-row">
              <span className="sports-league-badge">{f.league}</span>
              <div className="sports-teams">
                <span className={`sports-team ${hasScore && Number(f.homeScore) > Number(f.awayScore) ? 'winner' : ''}`}>
                  {f.homeTeam}
                </span>
                <span className="sports-vs">
                  {hasScore ? `${f.homeScore} – ${f.awayScore}` : 'vs'}
                </span>
                <span className={`sports-team ${hasScore && Number(f.awayScore) > Number(f.homeScore) ? 'winner' : ''}`}>
                  {f.awayTeam}
                </span>
              </div>
              <div className="sports-fixture-meta">
                {f.date} {f.time && `· ${f.time}`}
              </div>
            </div>
          );
        })}
      </div>

      {/* ESPN headline ticker */}
      {espnHeadlines.length > 0 && (
        <div className="sports-ticker-container">
          <div className="sports-ticker">
            {espnHeadlines.map((h, i) => (
              <span key={i} className="sports-ticker-item">
                <span className="sports-ticker-dot">•</span> {h}
              </span>
            ))}
            {espnHeadlines.map((h, i) => (
              <span key={`dup-${i}`} className="sports-ticker-item">
                <span className="sports-ticker-dot">•</span> {h}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
