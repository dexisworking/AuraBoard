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
};

/** Return a widget's variant metadata list (empty if none). */
export function getWidgetVariants(id) {
  return WIDGETS[id]?.variants ?? [];
}

/** Return the default (first) variant id for a widget. */
export function getDefaultVariant(id) {
  return WIDGETS[id]?.variants?.[0]?.id ?? null;
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
 * Default compositions below tile that grid with no gaps so the board fills the
 * screen, while rowHeight stays constant during editing (stable drag/resize).
 */
export const GRID_COLS = 12;
export const GRID_ROWS = 12;

// Tuned editorial compositions that fill the full 12×12 grid, no gaps/overlap.
const COMPOSITION_DEFAULT5 = [
  { i: 'clock',    x: 0, y: 0, w: 8, h: 6 },
  { i: 'date',     x: 8, y: 0, w: 4, h: 3 },
  { i: 'weather',  x: 8, y: 3, w: 4, h: 9 },
  { i: 'greeting', x: 0, y: 6, w: 5, h: 6 },
  { i: 'spotify',  x: 5, y: 6, w: 3, h: 6 },
];

const COMPOSITION_ALL9 = [
  { i: 'clock',    x: 0, y: 0, w: 6, h: 6 },
  { i: 'date',     x: 6, y: 0, w: 3, h: 3 },
  { i: 'weather',  x: 9, y: 0, w: 3, h: 6 },
  { i: 'greeting', x: 6, y: 3, w: 3, h: 3 },
  { i: 'spotify',  x: 0, y: 6, w: 6, h: 3 },
  { i: 'news',     x: 6, y: 6, w: 6, h: 3 },
  { i: 'crypto',   x: 0, y: 9, w: 4, h: 3 },
  { i: 'stocks',   x: 4, y: 9, w: 4, h: 3 },
  { i: 'sports',   x: 8, y: 9, w: 4, h: 3 },
];

const DEFAULT5_KEY = ['clock', 'date', 'greeting', 'weather', 'spotify'].sort().join(',');

/** Tile an arbitrary set of widgets across the full 12×12 grid. */
function flowLayout(ids) {
  const n = ids.length;
  if (n === 0) return [];
  const perRow = n <= 2 ? n : n <= 6 ? 2 : 3;
  const rows = Math.ceil(n / perRow);
  const out = [];
  for (let idx = 0; idx < n; idx += 1) {
    const r = Math.floor(idx / perRow);
    const c = idx % perRow;
    // last row may have fewer items — stretch them to fill the width
    const itemsInRow = r === rows - 1 ? n - r * perRow : perRow;
    const w = Math.floor(GRID_COLS / itemsInRow);
    const h = Math.floor(GRID_ROWS / rows);
    out.push({
      i: ids[idx],
      x: c * w,
      y: r * h,
      w: c === itemsInRow - 1 ? GRID_COLS - c * w : w,
      h: r === rows - 1 ? GRID_ROWS - r * h : h,
    });
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
 * Return the default layout for a set of enabled widget ids. Known default sets
 * get a hand-tuned full-bleed composition; any other set is flow-tiled to fill.
 */
export function getDefaultLayout(enabledWidgets) {
  const ids = (enabledWidgets && enabledWidgets.length)
    ? enabledWidgets.filter((id) => WIDGETS[id])
    : Object.keys(WIDGETS);
  const key = [...ids].sort().join(',');

  if (key === DEFAULT5_KEY) return withConstraints(COMPOSITION_DEFAULT5);
  if (ids.length === 9) return withConstraints(COMPOSITION_ALL9);
  return withConstraints(flowLayout(ids));
}

export default WIDGETS;
