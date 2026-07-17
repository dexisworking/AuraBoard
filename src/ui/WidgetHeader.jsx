import './primitives.css';

/**
 * WidgetHeader — the Swiss caption strip every data widget shares:
 * accent micro-caps title, optional right-aligned meta, hairline rule below.
 */
export default function WidgetHeader({ title, meta }) {
  return (
    <div className="ab-widget-header">
      <span className="ab-widget-title">{title}</span>
      {meta != null && <span className="ab-widget-meta">{meta}</span>}
    </div>
  );
}
