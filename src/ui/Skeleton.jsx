import './primitives.css';

/**
 * SkeletonRows — flat stepped-blink placeholder rows (no gradient shimmer;
 * brutalism doesn't glisten). One row shape fits all list widgets.
 */
export default function SkeletonRows({ rows = 4, leading = false }) {
  return (
    <div className="ab-skeleton-rows">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="ab-skeleton-row">
          {leading && <div className="ab-skeleton-block" style={{ width: '1.8em', height: '1.8em' }} />}
          <div className="ab-skeleton-block" style={{ flex: 2, height: '0.9em' }} />
          <div className="ab-skeleton-block" style={{ flex: 1, height: '0.9em' }} />
        </div>
      ))}
    </div>
  );
}
