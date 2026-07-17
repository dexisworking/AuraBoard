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
    minSize: { w: 1, h: 1 },
    maxSize: { w: 8, h: 5 },
    component: ClockWidget,
  },
  date: {
    id: 'date',
    name: 'Date',
    description: 'Current day, date and year',
    defaultSize: { w: 2, h: 1 },
    minSize: { w: 1, h: 1 },
    maxSize: { w: 8, h: 4 },
    component: DateWidget,
  },
  greeting: {
    id: 'greeting',
    name: 'Greeting',
    description: 'Time-of-day greeting message',
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 1, h: 1 },
    maxSize: { w: 8, h: 4 },
    component: GreetingWidget,
  },
  weather: {
    id: 'weather',
    name: 'Weather',
    description: 'Current weather with 3-day forecast',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 1, h: 1 },
    maxSize: { w: 6, h: 6 },
    component: WeatherWidget,
  },
  spotify: {
    id: 'spotify',
    name: 'Spotify',
    description: 'Music playback controls and now-playing info',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 1, h: 1 },
    maxSize: { w: 6, h: 6 },
    component: SpotifyWidget,
  },
  news: {
    id: 'news',
    name: 'News',
    description: 'Scrolling news headlines from GNews or BBC RSS',
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 1, h: 1 },
    maxSize: { w: 8, h: 4 },
    component: NewsWidget,
  },
  crypto: {
    id: 'crypto',
    name: 'Crypto',
    description: 'Live cryptocurrency prices with sparkline charts',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 1, h: 1 },
    maxSize: { w: 6, h: 6 },
    component: CryptoWidget,
  },
  stocks: {
    id: 'stocks',
    name: 'Stocks',
    description: 'Stock market prices with market status indicator',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 1, h: 1 },
    maxSize: { w: 6, h: 6 },
    component: StocksWidget,
  },
  sports: {
    id: 'sports',
    name: 'Sports',
    description: 'Upcoming fixtures, results and ESPN headlines',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 1, h: 1 },
    maxSize: { w: 6, h: 6 },
    component: SportsWidget,
  },
};

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
 * Return the default react-grid-layout layout array for a set of enabled widget ids.
 * Positions mimic the original hardcoded screensaver layout for the core widgets
 * and place new widgets in a logical grid flow.
 */
export function getDefaultLayout(enabledWidgets) {
  const enabled = new Set(enabledWidgets || Object.keys(WIDGETS));

  const allPositions = [
    { i: 'greeting', x: 0, y: 0, w: 3, h: 2 },
    { i: 'date',     x: 3, y: 0, w: 2, h: 1 },
    { i: 'clock',    x: 10, y: 0, w: 2, h: 2 },
    { i: 'weather',  x: 0, y: 2, w: 2, h: 2 },
    { i: 'spotify',  x: 2, y: 2, w: 2, h: 2 },
    { i: 'crypto',   x: 4, y: 2, w: 2, h: 2 },
    { i: 'stocks',   x: 6, y: 2, w: 2, h: 2 },
    { i: 'news',     x: 0, y: 5, w: 3, h: 2 },
    { i: 'sports',   x: 3, y: 5, w: 2, h: 2 },
  ];

  return allPositions
    .filter((item) => enabled.has(item.i))
    .map((item) => {
      const meta = WIDGETS[item.i];
      return {
        ...item,
        minW: meta?.minSize?.w ?? 2,
        minH: meta?.minSize?.h ?? 2,
        maxW: meta?.maxSize?.w ?? 12,
        maxH: meta?.maxSize?.h ?? 100,
      };
    });
}

export default WIDGETS;
