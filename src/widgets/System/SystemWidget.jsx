import WidgetHeader from '../../ui/WidgetHeader';
import SkeletonRows from '../../ui/Skeleton';
import ErrorState from '../../ui/ErrorState';
import useWidgetData from '../../data/useWidgetData';
import '../../ui/primitives.css';

const GB = 1024 ** 3;
const fmtGb = (bytes) => (bytes / GB).toFixed(1);

function fmtUptime(sec) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Horizontal meter: hairline rail with an accent fill. */
function Meter({ percent }) {
  const pct = Math.max(0, Math.min(100, Number(percent) || 0));
  return (
    <div style={{ height: '0.24em', minHeight: 3, background: 'var(--ab-rule)', width: '100%' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--ab-accent)' }} />
    </div>
  );
}

/**
 * SystemWidget — CPU / memory / uptime from the main process (node:os). Three
 * styles:
 *  meters — labelled meters for CPU and RAM (default)
 *  compact — two figures side by side
 *  cpu    — CPU as a single hero figure
 */
export default function SystemWidget({ variant = 'meters' }) {
  const { data, status, error, refresh } = useWidgetData(
    'system',
    {},
    { refreshMs: 5000 }, // local read, cheap enough to keep live
  );

  if (status === 'loading') {
    return (
      <div className="ab-widget-root">
        <WidgetHeader title="System" />
        <SkeletonRows rows={2} />
      </div>
    );
  }

  if (status === 'error' || !data) {
    return (
      <div className="ab-widget-root">
        <WidgetHeader title="System" />
        <ErrorState message={error || 'No system data'} onRetry={refresh} />
      </div>
    );
  }

  const cpu = data.cpuPercent;
  const mem = data.memPercent;

  if (variant === 'cpu') {
    return (
      <div className="ab-widget-root">
        <WidgetHeader title="CPU" meta={`${data.cores} cores`} />
        <div className="flex-1 flex flex-col justify-center min-h-0">
          <span className="ab-numeric text-ink" style={{ fontSize: 'min(46cqh, 30cqw)', lineHeight: 0.85 }}>
            {cpu == null ? '—' : cpu}<span className="text-accent">%</span>
          </span>
          <span className="ab-widget-meta" style={{ marginTop: '0.4em' }}>
            Up {fmtUptime(data.uptimeSec)}
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="ab-widget-root">
        <WidgetHeader title="System" meta={fmtUptime(data.uptimeSec)} />
        <div className="flex-1 flex items-center min-h-0" style={{ gap: '1.4em' }}>
          <div>
            <div className="ab-figure text-ink" style={{ fontSize: '2em', lineHeight: 1 }}>
              {cpu == null ? '—' : cpu}<span className="text-accent">%</span>
            </div>
            <div className="ab-widget-meta">CPU</div>
          </div>
          <div>
            <div className="ab-figure text-ink" style={{ fontSize: '2em', lineHeight: 1 }}>
              {mem == null ? '—' : mem}<span className="text-accent">%</span>
            </div>
            <div className="ab-widget-meta">RAM</div>
          </div>
        </div>
      </div>
    );
  }

  // ── METERS (default) ──
  return (
    <div className="ab-widget-root">
      <WidgetHeader title="System" meta={fmtUptime(data.uptimeSec)} />
      <div className="flex-1 flex flex-col justify-center min-h-0" style={{ gap: '0.9em' }}>
        <div>
          <div className="flex items-baseline justify-between" style={{ marginBottom: '0.3em' }}>
            <span className="ab-widget-meta">CPU</span>
            <span className="ab-figure text-ink" style={{ fontSize: '1.2em' }}>
              {cpu == null ? '—' : `${cpu}%`}
            </span>
          </div>
          <Meter percent={cpu} />
        </div>
        <div>
          <div className="flex items-baseline justify-between" style={{ marginBottom: '0.3em' }}>
            <span className="ab-widget-meta">Memory</span>
            <span className="ab-figure text-ink" style={{ fontSize: '1.2em' }}>
              {fmtGb(data.memUsedBytes)}/{fmtGb(data.memTotalBytes)}G
            </span>
          </div>
          <Meter percent={mem} />
        </div>
      </div>
    </div>
  );
}
