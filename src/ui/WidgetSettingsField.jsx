import './primitives.css';

/* A short, useful timezone list — the full IANA set is overwhelming on a
   wall-display config panel. "" means follow the system zone. */
const TIME_ZONES = [
  { value: '', label: 'System default' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/Los_Angeles', label: 'Los Angeles' },
  { value: 'America/Denver', label: 'Denver' },
  { value: 'America/Chicago', label: 'Chicago' },
  { value: 'America/New_York', label: 'New York' },
  { value: 'America/Sao_Paulo', label: 'São Paulo' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Europe/Moscow', label: 'Moscow' },
  { value: 'Asia/Dubai', label: 'Dubai' },
  { value: 'Asia/Kolkata', label: 'Kolkata' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Australia/Sydney', label: 'Sydney' },
  { value: 'Pacific/Auckland', label: 'Auckland' },
];

const inputStyle = {
  width: '100%',
  background: 'var(--ab-bg)',
  border: 'var(--ab-rule-hairline) solid var(--ab-surface-border)',
  borderRadius: 0,
  color: 'var(--ab-ink)',
  fontFamily: 'var(--ab-font-micro)',
  fontSize: 11,
  letterSpacing: '0.06em',
  padding: '6px 8px',
  outline: 'none',
};

/**
 * One control from a widget's `settings` schema. Kept deliberately small — the
 * editor panel is narrow, so every field is a single full-width row.
 */
export default function WidgetSettingsField({ field, value, onChange }) {
  const id = `ws-${field.key}`;
  const current = value ?? field.default ?? '';

  const label = (
    <label
      htmlFor={id}
      className="block"
      style={{
        fontFamily: 'var(--ab-font-micro)',
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: 'var(--ab-ink-tertiary)',
        marginBottom: 4,
      }}
    >
      {field.label}
    </label>
  );

  if (field.type === 'boolean') {
    const checked = Boolean(value ?? field.default);
    return (
      <div className="flex items-center justify-between" style={{ gap: 10, marginBottom: 10 }}>
        <span
          style={{
            fontFamily: 'var(--ab-font-micro)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--ab-ink-secondary)',
          }}
        >
          {field.label}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          style={{
            position: 'relative',
            width: 34,
            height: 18,
            flexShrink: 0,
            border: 'var(--ab-rule-hairline) solid var(--ab-rule-strong)',
            background: checked ? 'var(--ab-accent)' : 'transparent',
            cursor: 'pointer',
            transition: 'background 180ms',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 1,
              left: checked ? 'calc(100% - 15px)' : 1,
              width: 12,
              height: 12,
              background: checked ? 'var(--ab-accent-ink)' : 'var(--ab-ink)',
              transition: 'left 180ms',
            }}
          />
        </button>
      </div>
    );
  }

  if (field.type === 'timezone') {
    return (
      <div style={{ marginBottom: 10 }}>
        {label}
        <select
          id={id}
          value={current}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle, textTransform: 'uppercase', cursor: 'pointer' }}
        >
          {TIME_ZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === 'number') {
    return (
      <div style={{ marginBottom: 10 }}>
        {label}
        <input
          id={id}
          type="number"
          min={field.min}
          max={field.max}
          value={current}
          onChange={(e) => onChange(Number(e.target.value))}
          style={inputStyle}
        />
      </div>
    );
  }

  if (field.type === 'date') {
    return (
      <div style={{ marginBottom: 10 }}>
        {label}
        <input
          id={id}
          type="date"
          value={current}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle, colorScheme: 'dark' }}
        />
      </div>
    );
  }

  // text (default)
  return (
    <div style={{ marginBottom: 10 }}>
      {label}
      <input
        id={id}
        type="text"
        value={current}
        placeholder={field.placeholder || ''}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}
