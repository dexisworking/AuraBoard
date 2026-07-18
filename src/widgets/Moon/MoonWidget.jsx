import { useEffect, useId, useState } from 'react';
import WidgetHeader from '../../ui/WidgetHeader';
import '../../ui/primitives.css';

const SYNODIC_MONTH = 29.530588853; // days
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14); // 2000-01-06 18:14 UTC

const PHASE_NAMES = [
  'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
  'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
];

/** Age of the moon in days (0 … 29.53) and its illuminated fraction. */
function moonState(date = new Date()) {
  const days = (date.getTime() - KNOWN_NEW_MOON) / 86_400_000;
  const age = ((days % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
  const phase = age / SYNODIC_MONTH; // 0..1
  // illuminated fraction follows a cosine through the cycle
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  // 8 named phases, centred on their boundaries
  const index = Math.round(phase * 8) % 8;
  return { age, phase, illumination, name: PHASE_NAMES[index], index };
}

const R = 42;   // disc radius in viewBox units
const C = 50;   // disc centre
const HALO = 50; // outer glow reach

/* Maria — the dark basalt plains, loosely following the real near-side layout
   (Imbrium/Serenitatis upper left, Tranquillitatis centre right, Procellarum
   lower left). Irregular overlapping ELLIPSES, not circles: equal-sized discs
   read as polka dots and flatten the sphere. */
const MARIA = [
  { x: 41, y: 32, rx: 11,  ry: 7.5, a: -22, o: 0.16 },
  { x: 34, y: 39, rx: 6.5, ry: 5,   a: 10,  o: 0.13 },
  { x: 55, y: 26, rx: 6,   ry: 4,   a: 28,  o: 0.12 },
  { x: 59, y: 52, rx: 10,  ry: 7,   a: 16,  o: 0.14 },
  { x: 52, y: 58, rx: 5.5, ry: 4.5, a: -30, o: 0.10 },
  { x: 34, y: 58, rx: 7,   ry: 5,   a: -14, o: 0.11 },
  { x: 29, y: 48, rx: 4.5, ry: 6,   a: 8,   o: 0.08 },
  { x: 66, y: 40, rx: 4,   ry: 2.8, a: 40,  o: 0.09 },
  { x: 47, y: 43, rx: 3.2, ry: 2.4, a: 0,   o: 0.08 },
  { x: 50, y: 67, rx: 5,   ry: 3.2, a: 22,  o: 0.08 },
  { x: 63, y: 64, rx: 3,   ry: 2.2, a: -18, o: 0.06 },
];

/**
 * Moon disc rendered as a shaded sphere.
 *
 * Geometry: the terminator is an ELLIPSE whose horizontal semi-axis is
 * R·cos(θ) — it is not a circle offset across the disc. The previous
 * two-overlapping-circles approach was only correct at new/full/quarter; every
 * crescent and gibbous phase had a visibly wrong curve.
 *
 * Compositing: the widget sits chromeless on a photo, so nothing here paints an
 * opaque background colour. Every layer is `--ab-ink` at varying opacity, and
 * the surface darkening (maria, limb falloff) is done by subtracting from the
 * MASK rather than painting a dark fill — so it composites correctly over any
 * photo instead of stamping `--ab-bg` shapes onto it.
 */
function MoonDisc({ phase, size = '1em' }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const waxing = phase < 0.5;

  // Horizontal semi-axis of the terminator ellipse. +R at new (terminator sits
  // on the lit limb, nothing lit) → 0 at quarter (straight edge) → −R at full.
  // cos is symmetric about phase 0.5, so this holds for waning too; the waning
  // half is drawn by mirroring, which puts the light on the opposite limb.
  const a = R * Math.cos(2 * Math.PI * phase);
  const rx = Math.abs(a).toFixed(3);

  // Lit region: down the terminator from the north pole, back up the lit limb.
  // Sweep flags follow screen orientation (SVG y grows downward).
  const litPath = [
    `M ${C} ${C - R}`,
    `A ${rx} ${R} 0 0 ${a >= 0 ? 1 : 0} ${C} ${C + R}`,
    `A ${R} ${R} 0 0 0 ${C} ${C - R}`,
    'Z',
  ].join(' ');

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ flexShrink: 0, overflow: 'visible', display: 'block' }}
      role="img"
      aria-label={`Moon, ${Math.round((1 - Math.cos(2 * Math.PI * phase)) / 2 * 100)}% illuminated`}
    >
      <defs>
        {/* Sphere shading: bright near the sub-solar point, falling off toward
            the limb. Opacity-only so it works on light and dark themes alike. */}
        <radialGradient id={`${uid}-sphere`} cx="0.70" cy="0.30" r="0.92">
          <stop offset="0" stopColor="var(--ab-ink)" stopOpacity="1" />
          <stop offset="0.40" stopColor="var(--ab-ink)" stopOpacity="0.93" />
          <stop offset="0.72" stopColor="var(--ab-ink)" stopOpacity="0.72" />
          <stop offset="0.90" stopColor="var(--ab-ink)" stopOpacity="0.50" />
          <stop offset="1" stopColor="var(--ab-ink)" stopOpacity="0.33" />
        </radialGradient>

        {/* Earthshine falls off toward the far limb so the unlit side reads as
            a shadowed sphere instead of a flat grey disc. */}
        <radialGradient id={`${uid}-earth`} cx="0.68" cy="0.32" r="0.95">
          <stop offset="0" stopColor="var(--ab-ink)" stopOpacity="0.064" />
          <stop offset="0.7" stopColor="var(--ab-ink)" stopOpacity="0.029" />
          <stop offset="1" stopColor="var(--ab-ink)" stopOpacity="0.008" />
        </radialGradient>

        {/* Halo. Interior stops are hidden behind the disc; only 84%→100%
            (r 42→50) is visible, so it reads as a glow, not a wash. */}
        <radialGradient id={`${uid}-halo`}>
          <stop offset="0.84" stopColor="var(--ab-ink)" stopOpacity="0.15" />
          <stop offset="1" stopColor="var(--ab-ink)" stopOpacity="0" />
        </radialGradient>

        <filter id={`${uid}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.9" />
        </filter>
        <filter id={`${uid}-blurMaria`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.7" />
        </filter>

        {/* Crisp limb: clips the softened mask so the outer edge stays hard
            (Swiss) while only the terminator gets a soft falloff. */}
        <clipPath id={`${uid}-limb`}>
          <circle cx={C} cy={C} r={R} />
        </clipPath>

        <mask id={`${uid}-lit`}>
          <path d={litPath} fill="#fff" filter={`url(#${uid}-soft)`} />
          <g filter={`url(#${uid}-blurMaria)`}>
            {MARIA.map((m, i) => (
              <ellipse
                key={i}
                cx={m.x}
                cy={m.y}
                rx={m.rx}
                ry={m.ry}
                transform={`rotate(${m.a} ${m.x} ${m.y})`}
                fill="#000"
                fillOpacity={m.o}
              />
            ))}
          </g>
        </mask>
      </defs>

      <circle cx={C} cy={C} r={HALO} fill={`url(#${uid}-halo)`} />

      {/* Earthshine: the unlit disc stays faintly present rather than vanishing,
          which is what gives the sphere a readable silhouette at crescent. */}
      <circle cx={C} cy={C} r={R} fill={`url(#${uid}-earth)`} />
      <circle
        cx={C}
        cy={C}
        r={R}
        fill="none"
        stroke="var(--ab-ink)"
        strokeOpacity="0.11"
        strokeWidth="0.7"
      />

      <g
        clipPath={`url(#${uid}-limb)`}
        transform={waxing ? undefined : `translate(${2 * C}, 0) scale(-1, 1)`}
      >
        <g mask={`url(#${uid}-lit)`}>
          <circle cx={C} cy={C} r={R} fill={`url(#${uid}-sphere)`} />
        </g>
      </g>
    </svg>
  );
}

/**
 * MoonWidget — moon phase, computed from the date (no API). Three styles:
 *  disc   — big disc with the phase name (default)
 *  detail — disc beside illumination + age figures
 *  text   — typographic only: phase name large
 */
export default function MoonWidget({ variant = 'disc' }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // the phase moves slowly; hourly is plenty
    const id = setInterval(() => setNow(new Date()), 60 * 60_000);
    return () => clearInterval(id);
  }, []);

  const { phase, illumination, name, age } = moonState(now);
  const pct = Math.round(illumination * 100);

  if (variant === 'text') {
    return (
      <div className="ab-widget-root">
        <WidgetHeader title="Moon" meta={`${pct}%`} />
        <div className="flex-1 flex flex-col justify-center min-h-0">
          <span
            className="ab-display text-ink"
            style={{ fontSize: 'min(26cqh, 13cqw)', lineHeight: 0.9 }}
          >
            {name}
          </span>
          <span className="ab-widget-meta" style={{ marginTop: '0.6em' }}>
            Day {Math.floor(age)} of 29
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div className="ab-widget-root">
        <WidgetHeader title="Moon" />
        <div className="flex-1 flex items-center min-h-0" style={{ gap: '1em' }}>
          <MoonDisc phase={phase} size="min(34cqh, 34cqw)" />
          <div style={{ minWidth: 0 }}>
            <div className="ab-figure text-ink" style={{ fontSize: '2em', lineHeight: 1 }}>
              {pct}<span className="text-accent">%</span>
            </div>
            <div className="ab-widget-meta" style={{ marginTop: '0.3em' }}>{name}</div>
            <div className="ab-widget-meta">Day {Math.floor(age)} of 29</div>
          </div>
        </div>
      </div>
    );
  }

  // ── DISC (default) ──
  return (
    <div className="ab-widget-root">
      <WidgetHeader title="Moon" meta={`${pct}%`} />
      <div className="flex-1 flex flex-col items-center justify-center min-h-0" style={{ gap: '0.6em' }}>
        <MoonDisc phase={phase} size="min(46cqh, 46cqw)" />
        <span className="ab-widget-meta">{name}</span>
      </div>
    </div>
  );
}
