import WidgetHeader from '../../ui/WidgetHeader';
import SkeletonRows from '../../ui/Skeleton';
import ErrorState from '../../ui/ErrorState';
import useWidgetData from '../../data/useWidgetData';
import useNow from '../../data/useNow';
import '../../ui/primitives.css';

const fmtTime = (iso, use24hr) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: !use24hr,
  }).format(d);
};

const pad = (n) => String(n).padStart(2, '0');

/**
 * SunWidget — sunrise, sunset and daylight, from the weather data already
 * being fetched (no extra API). Three styles:
 *  arc      — rise/set with a daylight progress rail (default)
 *  times    — the two times, large
 *  daylight — total daylight as the hero figure
 */
export default function SunWidget({ city = '', use24hr = false, variant = 'arc' }) {
  const { data, status, error, isStale, refresh } = useWidgetData(
    'weather',
    { place: city },
    { refreshMs: 15 * 60_000 },
  );
  const now = useNow(60_000);

  if (status === 'loading') {
    return (
      <div className="ab-widget-root">
        <WidgetHeader title="Sun" />
        <SkeletonRows rows={2} />
      </div>
    );
  }

  if (status === 'error' || !data?.daily) {
    return (
      <div className="ab-widget-root">
        <WidgetHeader title="Sun" />
        <ErrorState message={error || 'No sun data'} onRetry={refresh} />
      </div>
    );
  }

  const sunrise = data.daily.sunrise?.[0];
  const sunset = data.daily.sunset?.[0];
  const riseMs = sunrise ? new Date(sunrise).getTime() : null;
  const setMs = sunset ? new Date(sunset).getTime() : null;

  // fraction of daylight elapsed (clamped)
  let progress = 0;
  if (riseMs && setMs && setMs > riseMs) {
    progress = Math.max(0, Math.min(1, (now - riseMs) / (setMs - riseMs)));
  }
  const isDay = data.current?.is_day === 1 || (progress > 0 && progress < 1);

  const daylightSec = data.daily.daylight_duration?.[0]
    ?? (riseMs && setMs ? (setMs - riseMs) / 1000 : 0);
  const dh = Math.floor(daylightSec / 3600);
  const dm = Math.round((daylightSec % 3600) / 60);

  const meta = isStale ? 'Stale' : (isDay ? 'Daylight' : 'Night');

  // ── DAYLIGHT: total daylight as the hero ──
  if (variant === 'daylight') {
    return (
      <div className="ab-widget-root">
        <WidgetHeader title="Daylight" meta={meta} />
        <div className="flex-1 flex flex-col justify-center min-h-0">
          <span className="ab-figure text-ink" style={{ fontSize: '2.8em', lineHeight: 1 }}>
            {dh}<span className="text-accent">h</span> {pad(dm)}<span className="text-accent">m</span>
          </span>
          <span className="ab-widget-meta" style={{ marginTop: '0.5em' }}>
            {fmtTime(sunrise, use24hr)} — {fmtTime(sunset, use24hr)}
          </span>
        </div>
      </div>
    );
  }

  // ── TIMES: the two times, large ──
  if (variant === 'times') {
    return (
      <div className="ab-widget-root">
        <WidgetHeader title="Sun" meta={meta} />
        <div className="flex-1 flex flex-col justify-center min-h-0" style={{ gap: '0.5em' }}>
          <div>
            <span className="ab-widget-meta">Rise</span>
            <div className="ab-figure text-ink" style={{ fontSize: '1.9em', lineHeight: 1 }}>
              {fmtTime(sunrise, use24hr)}
            </div>
          </div>
          <div className="ab-rule-h" style={{ paddingTop: '0.5em' }}>
            <span className="ab-widget-meta">Set</span>
            <div className="ab-figure text-accent" style={{ fontSize: '1.9em', lineHeight: 1 }}>
              {fmtTime(sunset, use24hr)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── ARC (default): rise/set either side of a daylight progress rail ──
  return (
    <div className="ab-widget-root">
      <WidgetHeader title="Sun" meta={meta} />
      <div className="flex-1 flex flex-col justify-center min-h-0" style={{ gap: '0.7em' }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="ab-widget-meta">Rise</div>
            <div className="ab-figure text-ink" style={{ fontSize: '1.5em', lineHeight: 1.1 }}>
              {fmtTime(sunrise, use24hr)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="ab-widget-meta">Set</div>
            <div className="ab-figure text-ink" style={{ fontSize: '1.5em', lineHeight: 1.1 }}>
              {fmtTime(sunset, use24hr)}
            </div>
          </div>
        </div>

        {/* daylight rail — filled portion is elapsed daylight */}
        <div
          style={{
            position: 'relative',
            height: '0.28em',
            minHeight: 3,
            background: 'var(--ab-rule)',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, width: `${progress * 100}%`, background: 'var(--ab-accent)' }} />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: `${progress * 100}%`,
              width: '0.7em',
              height: '0.7em',
              transform: 'translate(-50%, -50%)',
              background: isDay ? 'var(--ab-accent)' : 'var(--ab-ink-tertiary)',
            }}
          />
        </div>

        <span className="ab-widget-meta">{dh}h {pad(dm)}m daylight</span>
      </div>
    </div>
  );
}
