/**
 * WidgetGrid — drag-and-drop widget layout engine using react-grid-layout v1.5.
 * 12-column grid; rowHeight is computed to fill the viewport height.
 * EDIT MODE: drag widgets anywhere, free-resize from any edge/corner, remove.
 * DISPLAY MODE (default): static layout, no interaction.
 */

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import GridLayout from 'react-grid-layout';
import {
  getWidget, getDefaultLayout, getDefaultVariant, getMinSize, GRID_ROWS,
} from '../widgets/registry';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './WidgetGrid.css';

const ROW_HEIGHT = 60;
const MARGIN = [10, 10];
const COLS = 12;
const MIN_LAYOUT_WIDTH_FOR_SAVE = 100;
const DEFAULT_MAX_GRID_HEIGHT = 100;

// Bumped when the default sizing rules change. Saved layouts written before the
// current version are discarded so users don't stay stuck on the old
// screen-filling defaults; every item carries the stamp it was saved under.
const LAYOUT_VERSION = 2;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function cloneLayout(layoutInput) {
  if (!Array.isArray(layoutInput)) return [];
  return layoutInput.map((item) => ({ ...item }));
}

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidLayout(layoutInput) {
  if (!Array.isArray(layoutInput)) return false;
  return layoutInput.every((item) => (
    item
    && typeof item.i === 'string'
    && isNumber(item.x)
    && isNumber(item.y)
    && isNumber(item.w)
    && isNumber(item.h)
    && item.w > 0
    && item.h > 0
  ));
}

function normalizeLayout(layoutInput) {
  if (!Array.isArray(layoutInput)) return [];

  return layoutInput
    .filter((item) => item && typeof item.i === 'string' && getWidget(item.i))
    .map((item, index) => {
      const meta = getWidget(item.i);
      const minW = meta?.minSize?.w ?? item.minW ?? 1;
      const minH = meta?.minSize?.h ?? item.minH ?? 1;
      const metaMaxW = meta?.maxSize?.w;
      const metaMaxH = meta?.maxSize?.h;
      const maxW = isNumber(item.maxW) ? item.maxW : (isNumber(metaMaxW) ? metaMaxW : COLS);
      const maxH = isNumber(item.maxH) ? item.maxH : (isNumber(metaMaxH) ? metaMaxH : DEFAULT_MAX_GRID_HEIGHT);
      const z = isNumber(item.z) ? item.z : index + 1;

      // Bound every widget to the fixed GRID_COLS × GRID_ROWS grid so nothing
      // can be dragged or resized off-screen and lost.
      const normalizedMaxW = Math.min(maxW, COLS);
      const normalizedMaxH = Math.min(maxH, GRID_ROWS);
      const normalizedW = clamp(Math.round(item.w), minW, normalizedMaxW);
      const normalizedH = clamp(Math.round(item.h), minH, normalizedMaxH);
      const normalizedX = clamp(Math.round(item.x), 0, Math.max(0, COLS - normalizedW));
      const normalizedY = clamp(Math.round(item.y), 0, Math.max(0, GRID_ROWS - normalizedH));

      return {
        ...item,
        x: normalizedX,
        y: normalizedY,
        w: normalizedW,
        h: normalizedH,
        minW,
        minH,
        maxW: normalizedMaxW,
        maxH: normalizedMaxH,
        z,
        v: LAYOUT_VERSION,
      };
    });
}

/** True when every item was saved under the current sizing rules. */
function isCurrentVersion(layoutInput) {
  return Array.isArray(layoutInput)
    && layoutInput.length > 0
    && layoutInput.every((item) => item?.v === LAYOUT_VERSION);
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * Place a newly enabled widget at its minimum size in the first free slot,
 * scanning left→right then top→bottom. Falls back to the top-left corner (an
 * overlap) when the board is full — overlap is allowed, off-screen is not.
 */
function placeNewWidget(widgetId, existingLayout) {
  const { w, h } = getMinSize(widgetId);
  const occupied = Array.isArray(existingLayout) ? existingLayout : [];

  for (let y = 0; y <= GRID_ROWS - h; y += 1) {
    for (let x = 0; x <= COLS - w; x += 1) {
      const candidate = { i: widgetId, x, y, w, h };
      if (!occupied.some((item) => overlaps(candidate, item))) return candidate;
    }
  }

  return { i: widgetId, x: 0, y: 0, w, h };
}

function mergeLayoutWithPrevious(nextLayout, previousLayout) {
  const previousById = new Map(
    Array.isArray(previousLayout)
      ? previousLayout.map((item) => [item.i, item])
      : []
  );

  return (Array.isArray(nextLayout) ? nextLayout : []).map((item) => {
    const previous = previousById.get(item.i);
    return {
      ...item,
      minW: item.minW ?? previous?.minW,
      minH: item.minH ?? previous?.minH,
      maxW: item.maxW ?? previous?.maxW,
      maxH: item.maxH ?? previous?.maxH,
      z: isNumber(item.z) ? item.z : previous?.z,
    };
  });
}

function getLayoutSignature(layoutInput) {
  if (!Array.isArray(layoutInput)) return '';
  return layoutInput
    .map((item) => (
      `${item.i}:${item.x},${item.y},${item.w},${item.h},${item.z ?? 0}`
    ))
    .sort()
    .join('|');
}

/* ── tiny fallback loader shown inside each widget while Suspense resolves ── */
function WidgetLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '100%', height: '100%', color: 'var(--ab-ink-tertiary, rgba(255,255,255,0.3))',
      fontFamily: 'var(--ab-font-micro, inherit)', fontSize: 11,
      letterSpacing: 'var(--ab-track-micro, 0.28em)', textTransform: 'uppercase',
    }}>
      Loading

    </div>
  );
}

/* ── remove (×) button shown in edit mode ── */
function RemoveButton({ onClick }) {
  return (
    <button
      className="ab-remove-btn"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        position: 'absolute', top: 8, right: 8, zIndex: 50,
        width: 24, height: 24, borderRadius: 0,
        background: 'var(--ab-accent, #FF2B12)', border: 'none',
        color: 'var(--ab-accent-ink, #fff)', fontSize: 13, lineHeight: '24px',
        fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 160ms var(--ab-ease-out, ease)',
      }}
      title="Remove widget"
    >
      ✕
    </button>
  );
}

/* ── edit-mode indicator overlay ── */
function EditBanner() {
  return (
    <div
      className="ab-edit-banner"
      style={{
        position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, padding: '7px 18px', borderRadius: 0,
        background: 'var(--ab-accent, #FF2B12)',
        color: 'var(--ab-accent-ink, #fff)', fontSize: 11, fontWeight: 600,
        fontFamily: 'var(--ab-font-micro, monospace)',
        letterSpacing: '0.18em', textTransform: 'uppercase',
        pointerEvents: 'none', userSelect: 'none',
      }}
    >
      Edit Mode — drag &amp; resize · Alt+E to exit
    </div>
  );
}


export default function WidgetGrid({
  editMode = false,
  enabledWidgets = [],
  onRemoveWidget,
  onLayoutDraftChange,
  spotifyProps = {},
  widgetConfig = {},
  userName = '',
  weatherLocation = '',
  reloadTrigger = 0, // changes to this value trigger a layout reload
}) {
  const [layout, setLayout] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef(null);
  const width = containerWidth;
  const widthReady = containerWidth > 0;
  const layoutRef = useRef(layout);
  const persistedSignatureRef = useRef('');
  const pendingPersistLayoutRef = useRef(null);
  const saveInFlightRef = useRef(false);

  /* ── measure the container so GridLayout gets an explicit width and rowHeight
     can fill the viewport height (v1 GridLayout needs a numeric width; without
     the height measure the grid would cluster in a short band at the top). */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const measure = (w, h) => {
      if (w > 0) setContainerWidth(w);
      if (h > 0) setContainerHeight(h);
    };
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) measure(r.width, r.height);
    });
    ro.observe(el);
    measure(el.clientWidth, el.clientHeight);
    return () => ro.disconnect();
  }, [mounted]);

  const emitDraftLayout = useCallback((nextLayout) => {
    if (!editMode || !onLayoutDraftChange || !Array.isArray(nextLayout)) return;
    onLayoutDraftChange(cloneLayout(nextLayout));
  }, [editMode, onLayoutDraftChange]);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  /* ── Load and align layout whenever enabledWidgets or reloadTrigger changes ── */
  useEffect(() => {
    let active = true;

    async function init() {
      try {
        const saved = await window.electronAPI?.getWidgetLayout?.();
        if (!active) return;

        // Layouts saved under the old screen-filling defaults are dropped so the
        // board comes back at minimum-size packing instead of oversized cells.
        const usableSaved = isCurrentVersion(saved) ? saved : null;
        const normalizedSaved = normalizeLayout(usableSaved);
        const defaultL = getDefaultLayout(enabledWidgets);
        let finalLayout = defaultL;

        if (normalizedSaved.length > 0 && isValidLayout(normalizedSaved)) {
          const loaded = cloneLayout(normalizedSaved);
          // Align loaded layout with currently enabled widgets
          const enabledSet = new Set(enabledWidgets);
          const aligned = loaded.filter((l) => enabledSet.has(l.i));
          const currentIds = new Set(aligned.map((l) => l.i));
          for (const def of defaultL) {
            if (!currentIds.has(def.i) && enabledSet.has(def.i)) {
              // Newly enabled: drop it in at minimum size in a free slot rather
              // than at its packed default position, which may be occupied.
              aligned.push(placeNewWidget(def.i, aligned));
            }
          }
          finalLayout = normalizeLayout(aligned);
        } else {
          finalLayout = normalizeLayout(defaultL);
        }

        if (active) {
          setLayout(finalLayout);
          persistedSignatureRef.current = getLayoutSignature(finalLayout);
          emitDraftLayout(finalLayout);
          setMounted(true);
        }
      } catch (err) {
        console.error('Failed to load widget layout:', err);
        if (active) {
          const fallback = normalizeLayout(getDefaultLayout(enabledWidgets));
          setLayout(fallback);
          persistedSignatureRef.current = getLayoutSignature(fallback);
          emitDraftLayout(fallback);
          setMounted(true);
        }
      }
    }

    init();
    return () => {
      active = false;
    };
  }, [enabledWidgets, reloadTrigger, emitDraftLayout]);

  const persistLayout = useCallback(async (nextLayout) => {
    if (!editMode) return;
    if (!width || width < MIN_LAYOUT_WIDTH_FOR_SAVE) return;
    const normalizedLayout = normalizeLayout(nextLayout);
    if (!isValidLayout(normalizedLayout)) return;
    const signature = getLayoutSignature(normalizedLayout);
    if (signature === persistedSignatureRef.current) return;

    pendingPersistLayoutRef.current = normalizedLayout;
    if (saveInFlightRef.current) return;

    saveInFlightRef.current = true;
    try {
      while (pendingPersistLayoutRef.current) {
        const layoutToSave = pendingPersistLayoutRef.current;
        pendingPersistLayoutRef.current = null;
        const layoutSignature = getLayoutSignature(layoutToSave);
        try {
          await window.electronAPI?.saveWidgetLayout?.(layoutToSave);
          persistedSignatureRef.current = layoutSignature;
        } catch (error) {
          console.error('Failed to persist widget layout:', error);
          pendingPersistLayoutRef.current = layoutToSave;
          break;
        }
      }
    } finally {
      saveInFlightRef.current = false;
    }
  }, [editMode, width]);

  const commitLayout = useCallback(async (nextLayout) => {
    let mutableLayout = null;
    setLayout((previousLayout) => {
      const merged = normalizeLayout(mergeLayoutWithPrevious(nextLayout, previousLayout));
      if (!isValidLayout(merged)) {
        mutableLayout = null;
        return previousLayout;
      }
      mutableLayout = merged;
      return merged;
    });
    if (!mutableLayout) return;
    emitDraftLayout(mutableLayout);
    await persistLayout(mutableLayout);
  }, [emitDraftLayout, persistLayout]);

  /* ── draft layout updates while dragging/resizing ── */
  const handleLayoutChange = useCallback((newLayout) => {
    if (!editMode) return;
    if (!Array.isArray(newLayout) || newLayout.length === 0) return;
    setLayout((previousLayout) => {
      const draft = normalizeLayout(mergeLayoutWithPrevious(newLayout, previousLayout));
      emitDraftLayout(draft);
      return draft;
    });
  }, [editMode, emitDraftLayout]);

  /* ── persist after drag completes ── */
  const handleDragStop = useCallback((newLayout) => {
    if (!editMode) return;
    void commitLayout(newLayout);
  }, [commitLayout, editMode]);

  /* ── persist after resize completes ── */
  const handleResizeStop = useCallback((newLayout) => {
    if (!editMode) return;
    void commitLayout(newLayout);
  }, [commitLayout, editMode]);

  const bringItemToFront = useCallback((widgetId) => {
    if (!editMode) return;
    setLayout((prev) => {
      if (!Array.isArray(prev) || !prev.length) return prev;
      const currentMaxZ = prev.reduce((max, item) => (
        isNumber(item.z) && item.z > max ? item.z : max
      ), 0);
      const target = prev.find((item) => item.i === widgetId);
      if (!target) return prev;
      const targetZ = isNumber(target.z) ? target.z : 0;
      if (targetZ >= currentMaxZ) return prev;
      const raised = prev.map((item) => (
        item.i === widgetId ? { ...item, z: currentMaxZ + 1 } : item
      ));
      emitDraftLayout(raised);
      return raised;
    });
  }, [editMode, emitDraftLayout]);

  /* ── remove a widget (disable it) ── */
  const handleRemove = useCallback((widgetId) => {
    if (onRemoveWidget) onRemoveWidget(widgetId);
  }, [onRemoveWidget]);

  if (!mounted || !layout || !widthReady || !width) return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;

  /* ── build the set of visible layout items (only enabled widgets) ── */
  // Keep a STABLE DOM order (enabled/layout order). Stacking is expressed via
  // CSS z-index on each item — never by re-sorting, which would reorder the DOM
  // mid-drag and break the resize/drag interaction.
  const enabledSet = new Set(enabledWidgets);
  const visibleLayout = layout
    .filter((l) => enabledSet.has(l.i))
    .map((l) => ({
      ...l,
      // NEVER mark items static. react-grid-layout's correctBounds() shoves
      // *static* items downward whenever they collide — which silently pushed
      // overlapping widgets off-screen in display mode. Interaction is already
      // disabled via isDraggable/isResizable, so static buys nothing.
      static: false,
    }));

  /* ── fixed rowHeight: the grid is a constant GRID_ROWS-tall cell grid, like an
     Android home screen. rowHeight depends ONLY on the container height, never
     on the live layout — so dragging or resizing a widget never reflows the
     others (that mid-interaction reflow was the source of editor instability). */
  const usableHeight = containerHeight - MARGIN[1] * (GRID_ROWS + 1);
  const rowHeight = (containerHeight > 0 && usableHeight > 0)
    ? Math.max(28, usableHeight / GRID_ROWS)
    : ROW_HEIGHT;

  /* ── render each widget inside the grid ── */
  const widgetItems = visibleLayout.map((item) => {
    const meta = getWidget(item.i);
    if (!meta) return null;

    const Component = meta.component;

    // Build props from per-widget config (variant + instance settings),
    // replacing the old hardcoded values.
    const cfg = widgetConfig[item.i] || {};
    const variant = cfg.variant || getDefaultVariant(item.i);
    const widgetProps = { variant };
    if (item.i === 'greeting') widgetProps.userName = cfg.userName ?? userName;
    if (item.i === 'clock') {
      widgetProps.use24hr = cfg.use24hr ?? false;
      if (cfg.timeZone) widgetProps.timeZone = cfg.timeZone;
    }
    if (item.i === 'weather') {
      widgetProps.useFahrenheit = cfg.useFahrenheit ?? false;
      widgetProps.city = cfg.city || weatherLocation;
    }
    if (item.i === 'spotify') {
      widgetProps.pollInterval = cfg.pollInterval ?? 3;
      Object.assign(widgetProps, spotifyProps);
    }
    if (item.i === 'sun') {
      widgetProps.city = cfg.city || weatherLocation;
      widgetProps.use24hr = cfg.use24hr ?? false;
    }
    if (item.i === 'date' && cfg.timeZone) widgetProps.timeZone = cfg.timeZone;
    if (item.i === 'countdown') {
      widgetProps.targetDate = cfg.targetDate ?? '';
      widgetProps.label = cfg.label ?? '';
    }
    if (item.i === 'calendar') {
      widgetProps.icsUrl = cfg.icsUrl ?? '';
      widgetProps.use24hr = cfg.use24hr ?? false;
    }

    return (
      <div
        key={item.i}
        style={{ overflow: 'visible', zIndex: item.z ?? 1 }}
        onMouseDown={() => bringItemToFront(item.i)}
      >
        {editMode && <RemoveButton onClick={() => handleRemove(item.i)} />}
        <div
          className="ab-cell"
          style={{
            width: '100%', height: '100%',
            // Chromeless board: widgets sit directly on the treated photo with
            // no card behind them. Surface/border appear only in edit mode.
            background: editMode
              ? 'var(--ab-edit-surface, rgba(127,127,127,0.10))'
              : 'transparent',
            borderRadius: 'var(--ab-radius, 0)',
            border: editMode
              ? '1.5px dashed var(--ab-edit-border, currentColor)'
              : '1px solid transparent',
            transition: 'background 0.3s, border 0.3s',
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'hidden',
            // Size container: widgets size their type to the cell via cq units,
            // so content always fits regardless of how the cell is resized.
            containerType: 'size',
          }}
        >
          <Suspense fallback={<WidgetLoader />}>
            <Component {...widgetProps} />
          </Suspense>
        </div>
      </div>
    );
  });

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      {editMode && <EditBanner />}
      <GridLayout
        className={`widget-grid ${editMode ? 'is-editing' : ''}`}
        layout={visibleLayout}
        cols={COLS}
        maxRows={GRID_ROWS}
        rowHeight={rowHeight}
        width={width}
        margin={MARGIN}
        containerPadding={MARGIN}
        isDraggable={editMode}
        isResizable={editMode}
        resizeHandles={editMode ? ['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne'] : []}
        draggableCancel=".widget-no-drag, .react-resizable-handle"
        useCSSTransforms
        compactType={null}
        allowOverlap
        preventCollision={false}
        onLayoutChange={handleLayoutChange}
        onDragStop={handleDragStop}
        onResizeStop={handleResizeStop}
      >
        {widgetItems}
      </GridLayout>
    </div>
  );
}
