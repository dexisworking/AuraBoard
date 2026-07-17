/**
 * WidgetGrid — drag-and-drop widget layout engine using react-grid-layout v2.
 * 12-column grid, 60px row height, 10px margins.
 * EDIT MODE (Alt+E): drag widgets, resize from borders, remove buttons.
 * DISPLAY MODE (default): static layout, no interaction.
 */

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { ReactGridLayout, useContainerWidth } from 'react-grid-layout';
import { getWidget, getDefaultLayout } from '../widgets/registry';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './WidgetGrid.css';

const ROW_HEIGHT = 60;
const MARGIN = [10, 10];
const COLS = 12;
const MIN_LAYOUT_WIDTH_FOR_SAVE = 100;
const DEFAULT_MAX_GRID_HEIGHT = 100;

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

      const normalizedMaxW = Math.min(maxW, COLS);
      const normalizedW = clamp(Math.round(item.w), minW, normalizedMaxW);
      const normalizedH = clamp(Math.round(item.h), minH, maxH);
      const normalizedX = clamp(Math.round(item.x), 0, Math.max(0, COLS - normalizedW));
      const normalizedY = Math.max(0, Math.round(item.y));

      return {
        ...item,
        x: normalizedX,
        y: normalizedY,
        w: normalizedW,
        h: normalizedH,
        minW,
        minH,
        maxW: normalizedMaxW,
        maxH,
        z,
      };
    });
}

function getGridColumnWidth(gridWidth) {
  if (!gridWidth || gridWidth <= 0) return 0;
  const usableWidth = gridWidth - MARGIN[0] * (COLS + 1);
  return usableWidth > 0 ? usableWidth / COLS : 0;
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
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        position: 'absolute', top: 6, right: 6, zIndex: 50,
        width: 24, height: 24, borderRadius: '50%',
        background: 'rgba(239,68,68,0.85)', border: 'none',
        color: '#fff', fontSize: 14, lineHeight: '24px',
        cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        transition: 'transform 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      title="Remove widget"
    >
      ✕
    </button>
  );
}

/* ── edit-mode indicator overlay ── */
function EditBanner() {
  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, padding: '8px 24px', borderRadius: 999,
      background: 'var(--ab-accent, #6366f1)', backdropFilter: 'blur(12px)',
      color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
      letterSpacing: '0.05em', boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
      pointerEvents: 'none', userSelect: 'none',
    }}>
      EDIT MODE — drag & resize from borders · press Alt+E to exit
    </div>
  );
}

/* ── Full Widget Scaling ── */
function ScaleWrapper({ children, defaultGridW, defaultGridH, colWidth, rowHeight = ROW_HEIGHT }) {
  const ref = useRef(null);
  const [scale, setScale] = useState(1);
  const [mounted, setMounted] = useState(false);

  const safeColWidth = colWidth > 0 ? colWidth : 1;
  const safeRowHeight = rowHeight > 0 ? rowHeight : ROW_HEIGHT;
  const baseW = defaultGridW * safeColWidth + (defaultGridW - 1) * MARGIN[0];
  const baseH = defaultGridH * safeRowHeight + (defaultGridH - 1) * MARGIN[1];

  useEffect(() => {
    setMounted(true);
    let rAF;
    const ob = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      // Slight debounce using rAF to prevent loop limits
      rAF = requestAnimationFrame(() => {
        const widthScale = width > 0 && baseW > 0 ? width / baseW : 1;
        const heightScale = height > 0 && baseH > 0 ? height / baseH : 1;
        const nextScale = Math.max(0.1, Math.min(widthScale, heightScale));
        setScale(Number.isFinite(nextScale) ? nextScale : 1);
      });
    });
    if (ref.current && ref.current.parentElement) {
      ob.observe(ref.current.parentElement);
    }
    return () => {
      ob.disconnect();
      cancelAnimationFrame(rAF);
    };
  }, [baseW, baseH]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div
        ref={ref}
        style={{
          width: baseW,
          height: baseH,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.2s',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function WidgetGrid({
  editMode = false,
  enabledWidgets = [],
  onRemoveWidget,
  onLayoutDraftChange,
  spotifyProps = {},
  reloadTrigger = 0, // changes to this value trigger a layout reload
}) {
  const [layout, setLayout] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [containerHeight, setContainerHeight] = useState(0);
  const { width, mounted: widthReady, containerRef } = useContainerWidth();
  const colWidth = getGridColumnWidth(width);
  const layoutRef = useRef(layout);
  const persistedSignatureRef = useRef('');
  const pendingPersistLayoutRef = useRef(null);
  const saveInFlightRef = useRef(false);

  /* ── measure container height so rowHeight can fill the viewport ──
     The board is full-screen; without this the grid only occupies
     rows*ROW_HEIGHT px and clusters at the top with a large void below. */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect?.height ?? 0;
      if (h > 0) setContainerHeight(h);
    });
    ro.observe(el);
    if (el.clientHeight > 0) setContainerHeight(el.clientHeight);
    return () => ro.disconnect();
  }, [containerRef, widthReady, mounted]);

  const emitDraftLayout = useCallback((nextLayout) => {
    if (!editMode || !onLayoutDraftChange || !Array.isArray(nextLayout)) return;
    onLayoutDraftChange(cloneLayout(nextLayout));
  }, [editMode, onLayoutDraftChange]);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  /* ── load persisted layout ── */
  const loadLayout = useCallback(async () => {
    try {
      const saved = await window.electronAPI?.getWidgetLayout?.();
      const normalizedSaved = normalizeLayout(saved);
      if (normalizedSaved.length > 0 && isValidLayout(normalizedSaved)) {
        const loaded = cloneLayout(normalizedSaved);
        setLayout(loaded);
        persistedSignatureRef.current = getLayoutSignature(loaded);
        emitDraftLayout(loaded);
      } else {
        const fallback = normalizeLayout(getDefaultLayout(enabledWidgets));
        setLayout(fallback);
        persistedSignatureRef.current = getLayoutSignature(fallback);
        emitDraftLayout(fallback);
      }
    } catch {
      const fallback = normalizeLayout(getDefaultLayout(enabledWidgets));
      setLayout(fallback);
      persistedSignatureRef.current = getLayoutSignature(fallback);
      emitDraftLayout(fallback);
    }
  }, [enabledWidgets, emitDraftLayout]);

  /* ── initial mount and reload trigger ── */
  useEffect(() => {
    let active = true;
    (async () => {
      await loadLayout();
      if (active) setMounted(true);
    })();
    return () => { active = false; };
  }, [loadLayout, reloadTrigger]);

  /* ── when enabledWidgets change, add missing items & remove disabled ones ── */
  useEffect(() => {
    const currentLayout = layoutRef.current;
    if (!Array.isArray(currentLayout)) return;

    const currentIds = new Set(currentLayout.map((l) => l.i));
    const enabledSet = new Set(enabledWidgets);

    let updated = currentLayout.filter((l) => enabledSet.has(l.i));

    // add new widgets that aren't in the current layout
    const defaultPositions = getDefaultLayout(enabledWidgets);
    for (const def of defaultPositions) {
      if (!currentIds.has(def.i) && enabledSet.has(def.i)) {
        updated.push(def);
      }
    }

    if (
      updated.length !== currentLayout.length
      || updated.some((u, i) => u.i !== currentLayout[i]?.i)
    ) {
      const normalized = normalizeLayout(updated);
      setLayout(normalized);
      emitDraftLayout(normalized);
    }
  }, [enabledWidgets, emitDraftLayout]);

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
  const enabledSet = new Set(enabledWidgets);
  const visibleLayout = layout
    .filter((l) => enabledSet.has(l.i))
    .map((l) => ({
      ...l,
      static: !editMode,
    }))
    .sort((a, b) => (a.z ?? 0) - (b.z ?? 0));

  /* ── dynamic rowHeight: scale rows so the layout fills the viewport height ──
     rowHeight = usableHeight / maxRow, where maxRow is the tallest row the
     current layout reaches. This keeps the board full-bleed regardless of how
     many rows a layout uses, and keeps ScaleWrapper's base cell aspect close to
     the real cell (less letterboxing). Falls back to ROW_HEIGHT before measure. */
  const maxRow = visibleLayout.reduce(
    (m, it) => Math.max(m, (Number(it.y) || 0) + (Number(it.h) || 1)),
    0,
  ) || 1;
  const usableHeight = containerHeight - MARGIN[1] * (maxRow + 1);
  const rowHeight = (containerHeight > 0 && usableHeight > 0)
    ? Math.max(28, usableHeight / maxRow)
    : ROW_HEIGHT;

  /* ── render each widget inside the grid ── */
  const widgetItems = visibleLayout.map((item) => {
    const meta = getWidget(item.i);
    if (!meta) return null;

    const Component = meta.component;

    // build props for each widget type
    let widgetProps = {};
    if (item.i === 'greeting') widgetProps = { userName: 'Dex' };
    if (item.i === 'clock') widgetProps = { use24hr: false };
    if (item.i === 'weather') widgetProps = { useFahrenheit: false };
    if (item.i === 'spotify') widgetProps = { pollInterval: 3, ...spotifyProps };

    return (
      <div
        key={item.i}
        style={{ overflow: 'visible', zIndex: item.z ?? 1 }}
        onMouseDown={() => bringItemToFront(item.i)}
      >
        {editMode && <RemoveButton onClick={() => handleRemove(item.i)} />}
        <div style={{
          width: '100%', height: '100%',
          // Chromeless board: widgets sit directly on the treated photo with no
          // card behind them. Surface/border appear only in edit mode.
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
        }}>
          <Suspense fallback={<WidgetLoader />}>
            <ScaleWrapper
              defaultGridW={meta.defaultSize.w}
              defaultGridH={meta.defaultSize.h}
              colWidth={colWidth}
              rowHeight={rowHeight}
            >
              <Component {...widgetProps} />
            </ScaleWrapper>
          </Suspense>
        </div>
      </div>
    );
  });

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      {editMode && <EditBanner />}
      <ReactGridLayout
        className={`widget-grid ${editMode ? 'is-editing' : ''}`}
        layout={visibleLayout}
        cols={COLS}
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
        style={{ minHeight: '100%' }}
      >
        {widgetItems}
      </ReactGridLayout>
    </div>
  );
}
