/**
 * Widget Registry — central source of truth for all AuraBoard widgets.
 * Maps widgetId → { id, name, description, defaultSize, minSize, maxSize, component }
 */

import { lazy } from 'react';

// Lazy-load each widget so the registry can be imported cheaply
const ClockWidget = lazy(() => import('./Clock/ClockWidget'));
const DateWidget = lazy(() => import('./Date/DateWidget'));
const GreetingWidget = lazy(() => import('./Greeting/GreetingWidget'));
const WeatherWidget = lazy(() => import('./Weather/WeatherWidget'));
const SpotifyWidget = lazy(() => import('./Spotify/SpotifyWidget'));
const NewsWidget = lazy(() => import('./News/NewsWidget'));
const CryptoWidget = lazy(() => import('./Crypto/CryptoWidget'));
const StocksWidget = lazy(() => import('./Stocks/StocksWidget'));
const SportsWidget = lazy(() => import('./Sports/SportsWidget'));
const SunWidget = lazy(() => import('./Sun/SunWidget'));
const MoonWidget = lazy(() => import('./Moon/MoonWidget'));
const CountdownWidget = lazy(() => import('./Countdown/CountdownWidget'));
const SystemWidget = lazy(() => import('./System/SystemWidget'));
const CalendarWidget = lazy(() => import('./Calendar/CalendarWidget'));

const WIDGETS = {
  clock: {
    id: 'clock',
    name: 'Clock',
    description: 'Digital clock with hours, minutes and seconds',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 12, h: 12 },
    component: ClockWidget,
    variants: [
      { id: 'numeric', name: 'Numeric', description: 'Condensed HH:MM with seconds column' },
      { id: 'stack', name: 'Stacked', description: 'Hours over minutes, poster style' },
      { id: 'words', name: 'Word Clock', description: 'Time spelled out in display type' },
    ],
    settings: [
      { key: 'use24hr', type: 'boolean', label: '24-hour time', default: false },
      { key: 'timeZone', type: 'timezone', label: 'Time zone', default: '' },
    ],
  },
  date: {
    id: 'date',
    name: 'Date',
    description: 'Current day, date and year',
    defaultSize: { w: 2, h: 1 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 12, h: 12 },
    component: DateWidget,
    variants: [
      { id: 'standard', name: 'Standard', description: 'Weekday over date line' },
      { id: 'numeric', name: 'Big Number', description: 'Large day number, month beside' },
      { id: 'minimal', name: 'Minimal', description: 'Single compact line' },
    ],
    settings: [
      { key: 'timeZone', type: 'timezone', label: 'Time zone', default: '' },
    ],
  },
  greeting: {
    id: 'greeting',
    name: 'Greeting',
    description: 'Time-of-day greeting message',
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 12, h: 12 },
    component: GreetingWidget,
    variants: [
      { id: 'stack', name: 'Stacked', description: 'Words stacked, name in accent' },
      { id: 'inline', name: 'Inline', description: 'One big line' },
      { id: 'minimal', name: 'Name First', description: 'Name huge, greeting as label' },
    ],
    settings: [
      { key: 'userName', type: 'text', label: 'Name', default: '', placeholder: 'Defaults to your global name' },
    ],
  },
  weather: {
    id: 'weather',
    name: 'Weather',
    description: 'Current weather with 3-day forecast',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 12, h: 12 },
    component: WeatherWidget,
    variants: [
      { id: 'full', name: 'Full', description: 'Temp, details and 3-day forecast' },
      { id: 'compact', name: 'Compact', description: 'Temp, condition and location' },
      { id: 'minimal', name: 'Minimal', description: 'Giant temperature only' },
    ],
    settings: [
      { key: 'city', type: 'text', label: 'Location', default: '', placeholder: 'Defaults to global weather location' },
      { key: 'useFahrenheit', type: 'boolean', label: 'Fahrenheit', default: false },
    ],
  },
  spotify: {
    id: 'spotify',
    name: 'Spotify',
    description: 'Music playback controls and now-playing info',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 12, h: 12 },
    component: SpotifyWidget,
    variants: [
      { id: 'full', name: 'Full', description: 'Art, progress, controls and volume' },
      { id: 'compact', name: 'Compact', description: 'Art, title and play control' },
      { id: 'minimal', name: 'Marquee', description: 'Scrolling title, no art' },
    ],
    settings: [
      { key: 'pollInterval', type: 'number', label: 'Refresh (seconds)', default: 3, min: 1, max: 10 },
    ],
  },
  news: {
    id: 'news',
    name: 'News',
    description: 'Scrolling news headlines from GNews or BBC RSS',
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 12, h: 12 },
    component: NewsWidget,
    variants: [
      { id: 'ticker', name: 'Ticker', description: 'Scrolling headline marquee' },
      { id: 'headline', name: 'Headline', description: 'One rotating headline, large' },
      { id: 'list', name: 'List', description: 'Stacked headline list' },
    ],
  },
  crypto: {
    id: 'crypto',
    name: 'Crypto',
    description: 'Live cryptocurrency prices with sparkline charts',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 12, h: 12 },
    component: CryptoWidget,
    variants: [
      { id: 'list', name: 'List', description: 'Rows with sparklines' },
      { id: 'focus', name: 'Focus', description: 'One coin, big price' },
      { id: 'ticker', name: 'Ticker', description: 'Scrolling price strip' },
    ],
  },
  stocks: {
    id: 'stocks',
    name: 'Stocks',
    description: 'Stock market prices with market status indicator',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 12, h: 12 },
    component: StocksWidget,
    variants: [
      { id: 'list', name: 'List', description: 'Rows with change' },
      { id: 'focus', name: 'Focus', description: 'One ticker, big price' },
      { id: 'ticker', name: 'Ticker', description: 'Scrolling price strip' },
    ],
  },
  sports: {
    id: 'sports',
    name: 'Sports',
    description: 'Upcoming fixtures, results and ESPN headlines',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 12, h: 12 },
    component: SportsWidget,
    variants: [
      { id: 'fixtures', name: 'Fixtures', description: 'Fixture list with ticker' },
      { id: 'next', name: 'Next Up', description: 'Single next match, large' },
      { id: 'ticker', name: 'Ticker', description: 'Scrolling headline strip' },
    ],
  },
  sun: {
    id: 'sun',
    name: 'Sun',
    description: 'Sunrise, sunset and daylight remaining',
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 12, h: 12 },
    component: SunWidget,
    variants: [
      { id: 'arc', name: 'Arc', description: 'Rise/set with a daylight rail' },
      { id: 'times', name: 'Times', description: 'Both times, large' },
      { id: 'daylight', name: 'Daylight', description: 'Total daylight as the figure' },
    ],
    settings: [
      { key: 'use24hr', type: 'boolean', label: '24-hour time', default: false },
    ],
  },
  moon: {
    id: 'moon',
    name: 'Moon',
    description: 'Moon phase and illumination (no network needed)',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 12, h: 12 },
    component: MoonWidget,
    variants: [
      { id: 'disc', name: 'Disc', description: 'Large phase disc' },
      { id: 'detail', name: 'Detail', description: 'Disc with illumination figures' },
      { id: 'text', name: 'Typographic', description: 'Phase name, large' },
    ],
  },
  countdown: {
    id: 'countdown',
    name: 'Countdown',
    description: 'Days until a date you choose',
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 12, h: 12 },
    component: CountdownWidget,
    variants: [
      { id: 'days', name: 'Days', description: 'Giant day count' },
      { id: 'clock', name: 'Clock', description: 'Days / hours / minutes' },
      { id: 'bar', name: 'Progress', description: 'Day count with a rail' },
    ],
    settings: [
      { key: 'targetDate', type: 'date', label: 'Target date', default: '' },
      { key: 'label', type: 'text', label: 'Caption', default: '', placeholder: 'e.g. Launch day' },
    ],
  },
  system: {
    id: 'system',
    name: 'System',
    description: 'CPU, memory and uptime for this machine',
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 12, h: 12 },
    component: SystemWidget,
    variants: [
      { id: 'meters', name: 'Meters', description: 'CPU and RAM meters' },
      { id: 'compact', name: 'Compact', description: 'Two figures side by side' },
      { id: 'cpu', name: 'CPU', description: 'CPU as a single figure' },
    ],
  },
  calendar: {
    id: 'calendar',
    name: 'Calendar',
    description: 'Next events from a subscribed .ics calendar',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 12, h: 12 },
    component: CalendarWidget,
    variants: [
      { id: 'next', name: 'Next Up', description: 'The next event, poster-sized' },
      { id: 'agenda', name: 'Agenda', description: 'Short ruled list' },
      { id: 'countdown', name: 'Countdown', description: 'Time until the next event' },
    ],
    settings: [
      { key: 'icsUrl', type: 'text', label: 'Calendar URL (.ics)', default: '', placeholder: 'https://…/basic.ics' },
      { key: 'use24hr', type: 'boolean', label: '24-hour time', default: false },
    ],
  },
};

/** Return a widget's variant metadata list (empty if none). */
export function getWidgetVariants(id) {
  return WIDGETS[id]?.variants ?? [];
}

/** Return the default (first) variant id for a widget. */
export function getDefaultVariant(id) {
  return WIDGETS[id]?.variants?.[0]?.id ?? null;
}

/** Per-instance settings schema for a widget (empty if it has none). */
export function getWidgetSettings(id) {
  return WIDGETS[id]?.settings ?? [];
}

/**
 * Return all registered widgets as an array of metadata objects.
 */
export function getAllWidgets() {
  return Object.values(WIDGETS);
}

/**
 * Return a single widget's metadata by id.
 */
export function getWidget(id) {
  return WIDGETS[id] || null;
}

/**
 * The board is a fixed GRID_COLS × GRID_ROWS grid (like an Android home screen).
 * Widgets are always PLACED at their minimum size and packed shelf-style so the
 * whole set fits inside one screen — never wider or taller than the grid. The
 * user grows them from there in edit mode; overlap is allowed at all times.
 */
export const GRID_COLS = 12;
export const GRID_ROWS = 12;

/** The smallest legal footprint for a widget, bounded by the grid itself. */
export function getMinSize(id) {
  const meta = WIDGETS[id];
  return {
    w: Math.min(meta?.minSize?.w ?? 2, GRID_COLS),
    h: Math.min(meta?.minSize?.h ?? 2, GRID_ROWS),
  };
}

/**
 * Pack every widget at minimum size, left→right then top→bottom. Rows wrap at
 * the grid width, and the last shelf is clamped to the grid height so nothing
 * can land off-screen (clamping may overlap — that's allowed and preferable to
 * a widget the user can't see).
 */
function packMinSizes(ids) {
  const out = [];
  let cursorX = 0;
  let shelfY = 0;
  let shelfH = 0;

  for (const id of ids) {
    const { w, h } = getMinSize(id);

    // wrap to the next shelf when this widget would run past the right edge
    if (cursorX + w > GRID_COLS && cursorX > 0) {
      shelfY += shelfH;
      cursorX = 0;
      shelfH = 0;
    }

    out.push({
      i: id,
      x: Math.min(cursorX, GRID_COLS - w),
      y: Math.max(0, Math.min(shelfY, GRID_ROWS - h)),
      w,
      h,
    });

    cursorX += w;
    shelfH = Math.max(shelfH, h);
  }

  return out;
}

function withConstraints(positions) {
  return positions.map((item) => {
    const meta = WIDGETS[item.i];
    return {
      ...item,
      minW: meta?.minSize?.w ?? 2,
      minH: meta?.minSize?.h ?? 2,
      maxW: meta?.maxSize?.w ?? GRID_COLS,
      maxH: meta?.maxSize?.h ?? GRID_ROWS,
    };
  });
}

/**
 * Return the default layout for a set of enabled widget ids: every widget at its
 * minimum size, packed so the entire set fits inside a single screen.
 */
export function getDefaultLayout(enabledWidgets) {
  const ids = (enabledWidgets && enabledWidgets.length)
    ? enabledWidgets.filter((id) => WIDGETS[id])
    : Object.keys(WIDGETS);

  return withConstraints(packMinSizes(ids));
}

export default WIDGETS;
