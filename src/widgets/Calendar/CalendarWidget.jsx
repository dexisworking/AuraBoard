import WidgetHeader from '../../ui/WidgetHeader';
import SkeletonRows from '../../ui/Skeleton';
import ErrorState from '../../ui/ErrorState';
import useWidgetData from '../../data/useWidgetData';
import useNow from '../../data/useNow';
import '../../ui/primitives.css';
import './CalendarWidget.css';

const DAY = 86_400_000;

function relativeDay(date, now) {
  const d0 = new Date(date); d0.setHours(0, 0, 0, 0);
  const n0 = new Date(now); n0.setHours(0, 0, 0, 0);
  const diff = Math.round((d0 - n0) / DAY);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff > 1 && diff < 7) return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(d0);
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).format(d0);
}

const fmtTime = (d, use24hr) => new Intl.DateTimeFormat('en-US', {
  hour: '2-digit', minute: '2-digit', hour12: !use24hr,
}).format(d);

/**
 * CalendarWidget — next events from a subscribed .ics URL (Google Calendar's
 * "secret address in iCal format", Outlook's published calendar, etc). Three
 * styles:
 *  next   — the next event, poster-sized (default)
 *  agenda — a short ruled list
 *  countdown — time remaining until the next event
 */
export default function CalendarWidget({ icsUrl = '', use24hr = false, variant = 'next' }) {
  const { data, status, error, isStale, refresh } = useWidgetData(
    'calendar',
    { icsUrl },
    { refreshMs: 15 * 60_000 },
  );
  const now = useNow(60_000);

  if (status === 'loading') {
    return (
      <div className="ab-widget-root">
        <WidgetHeader title="Calendar" />
        <SkeletonRows rows={3} />
      </div>
    );
  }

  if (status === 'error' || !Array.isArray(data)) {
    return (
      <div className="ab-widget-root">
        <WidgetHeader title="Calendar" />
        <ErrorState message={error || 'No calendar data'} onRetry={refresh} />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="ab-widget-root">
        <WidgetHeader title="Calendar" />
        <div className="ab-state">
          <p className="ab-state-message">Nothing scheduled</p>
        </div>
      </div>
    );
  }

  const meta = isStale ? 'Stale' : `${data.length} upcoming`;
  const first = data[0];
  const firstDate = new Date(first.start);

  // ── COUNTDOWN: time until the next event ──
  if (variant === 'countdown') {
    const diff = Math.max(0, firstDate.getTime() - now);
    const days = Math.floor(diff / DAY);
    const hours = Math.floor((diff % DAY) / 3_600_000);
    const mins = Math.floor((diff % 3_600_000) / 60_000);
    return (
      <div className="ab-widget-root">
        <WidgetHeader title="Next" meta={relativeDay(firstDate, now)} />
        <div className="flex-1 flex flex-col justify-center min-h-0">
          <span className="ab-figure text-ink" style={{ fontSize: '2.4em', lineHeight: 1 }}>
            {days > 0 ? <>{days}<span className="text-accent">d</span> {hours}<span className="text-accent">h</span></>
              : <>{hours}<span className="text-accent">h</span> {String(mins).padStart(2, '0')}<span className="text-accent">m</span></>}
          </span>
          <span className="cal-title" style={{ marginTop: '0.4em' }}>{first.summary}</span>
        </div>
      </div>
    );
  }

  // ── AGENDA: ruled list ──
  if (variant === 'agenda') {
    return (
      <div className="ab-widget-root">
        <WidgetHeader title="Calendar" meta={meta} />
        <div className="cal-list">
          {data.slice(0, 5).map((ev, i) => {
            const d = new Date(ev.start);
            return (
              <div key={`${ev.start}-${i}`} className="cal-row">
                <span className="cal-when">
                  {relativeDay(d, now)}
                  {!ev.allDay && <span className="cal-time"> {fmtTime(d, use24hr)}</span>}
                </span>
                <span className="cal-summary">{ev.summary}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── NEXT (default): the next event, poster-sized ──
  return (
    <div className="ab-widget-root">
      <WidgetHeader title="Next Up" meta={meta} />
      <div className="flex-1 flex flex-col justify-center min-h-0" style={{ gap: '0.4em' }}>
        <span className="cal-when-lead">
          {relativeDay(firstDate, now)}
          {!first.allDay && <span className="text-accent"> · {fmtTime(firstDate, use24hr)}</span>}
        </span>
        <span className="cal-title-lead">{first.summary}</span>
        {first.location && <span className="ab-widget-meta">{first.location}</span>}
      </div>
    </div>
  );
}
