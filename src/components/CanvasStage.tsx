import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Scissors,
  Copy,
  ClipboardPaste,
  Files,
  Trash2,
  ArrowUp,
  ArrowDown,
  Group,
  Ungroup,
} from 'lucide-react';
import {
  CanvasBackdrop,
  PaintStyle,
  ParsedSvgResult,
  ScreenBox,
  SvgUserBox,
  ToolType,
} from '../types/svg';
import {
  cloneAndTagSvgForPreview,
  fmtNum,
  pointsToSmoothPath,
  roundNum,
} from '../utils/svgDom';

interface CanvasStageProps {
  parsedSvg: ParsedSvgResult;
  activeTool: ToolType;
  paintStyle: PaintStyle;
  snapToGrid: boolean;
  selectedEids: string[];
  hoveredEid: string | null;
  backdrop: CanvasBackdrop;
  onChangeBackdrop: (b: CanvasBackdrop) => void;
  onSelectEids: (eids: string[]) => void;
  onHoverEid: (eid: string | null) => void;
  onMoveSelected: (dxSvg: number, dySvg: number) => void;
  onResizeElement: (eid: string, newBox: SvgUserBox, origBox: SvgUserBox) => void;
  onInsertShape: (markup: string) => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onReorder: (action: 'forward' | 'backward' | 'front' | 'back') => void;
  onGroup: () => void;
  onUngroup: () => void;
  hasClipboard: boolean;
  onSwitchToSelect: () => void;
}

type DragMode =
  | { type: 'none' }
  | { type: 'pan'; startX: number; startY: number; origPanX: number; origPanY: number }
  | { type: 'move'; startClientX: number; startClientY: number; dx: number; dy: number }
  | {
      type: 'marquee';
      startClientX: number;
      startClientY: number;
      curClientX: number;
      curClientY: number;
      additive: boolean;
    }
  | {
      type: 'resize';
      eid: string;
      handle: string;
      startSvgX: number;
      startSvgY: number;
      origUserBox: SvgUserBox;
      currentUserBox: SvgUserBox;
    }
  | {
      type: 'draw';
      tool: 'brush' | 'rect' | 'circle' | 'ellipse' | 'line';
      startX: number;
      startY: number;
      curX: number;
      curY: number;
      shiftKey: boolean;
      points: Array<{ x: number; y: number }>;
    };

const BACKDROP_OPTIONS: Array<{ id: CanvasBackdrop; label: string }> = [
  { id: 'checker', label: 'Raster' },
  { id: 'white', label: 'Hell' },
  { id: 'dotgrid', label: 'Punkte' },
  { id: 'dark', label: 'Dunkel' },
];

const RESIZE_HANDLES = [
  { id: 'nw', cursor: 'nwse-resize', xPct: 0, yPct: 0 },
  { id: 'n', cursor: 'ns-resize', xPct: 0.5, yPct: 0 },
  { id: 'ne', cursor: 'nesw-resize', xPct: 1, yPct: 0 },
  { id: 'e', cursor: 'ew-resize', xPct: 1, yPct: 0.5 },
  { id: 'se', cursor: 'nwse-resize', xPct: 1, yPct: 1 },
  { id: 's', cursor: 'ns-resize', xPct: 0.5, yPct: 1 },
  { id: 'sw', cursor: 'nesw-resize', xPct: 0, yPct: 1 },
  { id: 'w', cursor: 'ew-resize', xPct: 0, yPct: 0.5 },
];

export const CanvasStage: React.FC<CanvasStageProps> = ({
  parsedSvg,
  activeTool,
  paintStyle,
  snapToGrid,
  selectedEids,
  hoveredEid,
  backdrop,
  onChangeBackdrop,
  onSelectEids,
  onHoverEid,
  onMoveSelected,
  onResizeElement,
  onInsertShape,
  onCut,
  onCopy,
  onPaste,
  onDuplicate,
  onDelete,
  onReorder,
  onGroup,
  onUngroup,
  hasClipboard,
  onSwitchToSelect,
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const svgMountRef = useRef<HTMLDivElement>(null);
  const mountedSvgRef = useRef<SVGSVGElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);

  const [drag, setDrag] = useState<DragMode>({ type: 'none' });
  const [polygonPoints, setPolygonPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [polygonCursor, setPolygonCursor] = useState<{ x: number; y: number } | null>(null);

  const [textDraft, setTextDraft] = useState<{
    svgX: number;
    svgY: number;
    screenX: number;
    screenY: number;
    value: string;
  } | null>(null);

  const [selectedBoxes, setSelectedBoxes] = useState<Record<string, ScreenBox>>({});
  const [hoveredBox, setHoveredBox] = useState<{ box: ScreenBox; label: string } | null>(null);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const { viewBox } = parsedSvg;

  // Mount cloned SVG into preview container whenever parsedSvg changes
  useLayoutEffect(() => {
    const container = svgMountRef.current;
    if (!container) return;

    if (!parsedSvg.valid || !parsedSvg.svgEl) {
      return;
    }

    container.innerHTML = '';
    const cloned = document.importNode(cloneAndTagSvgForPreview(parsedSvg.svgEl), true);
    cloned.setAttribute('width', '100%');
    cloned.setAttribute('height', '100%');
    if (!cloned.getAttribute('viewBox')) {
      cloned.setAttribute(
        'viewBox',
        `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`
      );
    }
    if ('style' in cloned && cloned.style) {
      cloned.style.display = 'block';
      cloned.style.overflow = 'visible';
    }
    container.appendChild(cloned);
    mountedSvgRef.current = cloned;
  }, [parsedSvg, viewBox.x, viewBox.y, viewBox.width, viewBox.height]);

  // Fit artboard initially on mount
  const fitToView = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const padX = 72;
    const padY = 88;
    const availW = Math.max(200, rect.width - padX);
    const availH = Math.max(200, rect.height - padY);
    const safeW = Math.max(1, viewBox.width || 800);
    const safeH = Math.max(1, viewBox.height || 600);
    const fitZoom = Math.min(availW / safeW, availH / safeH, 1.5);
    setZoom(roundNum(Math.max(0.2, Number.isFinite(fitZoom) ? fitZoom : 1), 2));
    setPan({ x: 0, y: 0 });
  }, [viewBox.width, viewBox.height]);

  useEffect(() => {
    fitToView();
  }, [fitToView]);

  // Spacebar pan key listener + Escape to cancel polygon/text
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (e.code === 'Space' && !inInput) {
        e.preventDefault();
        setSpacePressed(true);
      }
      if (e.key === 'Escape') {
        setPolygonPoints([]);
        setPolygonCursor(null);
        setTextDraft(null);
        setContextMenu(null);
      }
      if (e.key === 'Enter' && polygonPoints.length >= 3 && !inInput) {
        e.preventDefault();
        const ptsAttr = polygonPoints.map((p) => `${fmtNum(p.x)},${fmtNum(p.y)}`).join(' ');
        const markup = `<polygon points="${ptsAttr}" fill="${paintStyle.fill}" stroke="${paintStyle.stroke}" stroke-width="${paintStyle.strokeWidth}" opacity="${paintStyle.opacity}" />`;
        onInsertShape(markup);
        setPolygonPoints([]);
        setPolygonCursor(null);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [polygonPoints, paintStyle, onInsertShape]);

  // Clear polygon draft if switching away from polygon tool
  useEffect(() => {
    if (activeTool !== 'polygon') {
      setPolygonPoints([]);
      setPolygonCursor(null);
    }
    if (activeTool !== 'text') {
      setTextDraft(null);
    }
  }, [activeTool]);

  const snapVal = useCallback(
    (v: number) => (snapToGrid ? Math.round(v / 10) * 10 : roundNum(v)),
    [snapToGrid]
  );

  const clientToSvgPoint = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const svg = mountedSvgRef.current;
      if (svg && typeof svg.getScreenCTM === 'function') {
        try {
          const ctm = svg.getScreenCTM();
          if (ctm) {
            const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
            if (Number.isFinite(pt.x) && Number.isFinite(pt.y)) {
              return { x: roundNum(pt.x), y: roundNum(pt.y) };
            }
          }
        } catch {
          // Non-invertible CTM fallback
        }
      }
      const mount = svgMountRef.current;
      if (mount) {
        const r = mount.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          const x = viewBox.x + ((clientX - r.left) / r.width) * viewBox.width;
          const y = viewBox.y + ((clientY - r.top) / r.height) * viewBox.height;
          return { x: roundNum(x), y: roundNum(y) };
        }
      }
      return { x: 0, y: 0 };
    },
    [viewBox]
  );

  const getScreenBoxForElement = useCallback((el: Element): ScreenBox | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const stageRect = stage.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    return {
      x: r.left - stageRect.left,
      y: r.top - stageRect.top,
      width: Math.max(r.width, 4),
      height: Math.max(r.height, 4),
    };
  }, []);

  const getUserBoxForElement = useCallback(
    (el: Element): SvgUserBox | null => {
      const svg = mountedSvgRef.current;
      if (!svg) return null;
      const r = el.getBoundingClientRect();
      const p1 = clientToSvgPoint(r.left, r.top);
      const p2 = clientToSvgPoint(r.right, r.bottom);
      return {
        x: roundNum(p1.x),
        y: roundNum(p1.y),
        width: Math.max(1, roundNum(p2.x - p1.x)),
        height: Math.max(1, roundNum(p2.y - p1.y)),
      };
    },
    [clientToSvgPoint]
  );

  // Measure selected & hovered boxes whenever DOM, zoom, pan, or selection changes
  const measureBoxes = useCallback(() => {
    const svg = mountedSvgRef.current;
    if (!svg) {
      setSelectedBoxes({});
      setHoveredBox(null);
      return;
    }

    const nextSelected: Record<string, ScreenBox> = {};
    for (const eid of selectedEids) {
      const el = svg.querySelector(`[data-eid="${eid}"]`);
      if (el) {
        const box = getScreenBoxForElement(el);
        if (box) nextSelected[eid] = box;
      }
    }
    setSelectedBoxes(nextSelected);

    if (hoveredEid && !selectedEids.includes(hoveredEid)) {
      const el = svg.querySelector(`[data-eid="${hoveredEid}"]`);
      if (el) {
        const box = getScreenBoxForElement(el);
        if (box) {
          const tag = el.localName || el.tagName;
          const id = el.getAttribute('id');
          setHoveredBox({
            box,
            label: id ? `<${tag} #${id}>` : `<${tag}>`,
          });
        } else {
          setHoveredBox(null);
        }
      } else {
        setHoveredBox(null);
      }
    } else {
      setHoveredBox(null);
    }
  }, [selectedEids, hoveredEid, getScreenBoxForElement]);

  useLayoutEffect(() => {
    measureBoxes();
  }, [measureBoxes, parsedSvg, zoom, pan]);

  useEffect(() => {
    window.addEventListener('resize', measureBoxes);
    return () => window.removeEventListener('resize', measureBoxes);
  }, [measureBoxes]);

  // Hit test topmost renderable SVG element at pointer position
  const hitTestEid = useCallback(
    (clientX: number, clientY: number): string | null => {
      const svg = mountedSvgRef.current;
      if (!svg) return null;
      const elements = document.elementsFromPoint(clientX, clientY);
      for (const el of elements) {
        if (!svg.contains(el) || el === svg) continue;
        const target: Element | null = el.closest('[data-eid]');
        if (!target || target === svg || !svg.contains(target)) continue;
        const eid = target.getAttribute('data-eid');
        if (!eid) continue;
        const node = parsedSvg.flatNodes.find((n) => n.eid === eid);
        if (node && node.isRenderable) {
          return eid;
        }
      }
      return null;
    },
    [parsedSvg.flatNodes]
  );

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      setZoom((z) => roundNum(Math.min(4, Math.max(0.2, z * factor)), 2));
    } else {
      setPan((p) => ({
        x: p.x - e.deltaX * 0.6,
        y: p.y - e.deltaY * 0.6,
      }));
    }
  };

  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button === 2) return; // Context menu handled separately
    setContextMenu(null);

    if (e.button === 1 || spacePressed) {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setDrag({
        type: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        origPanX: pan.x,
        origPanY: pan.y,
      });
      return;
    }

    if (e.button !== 0) return;

    // Select & Move tool
    if (activeTool === 'select') {
      const hitEid = hitTestEid(e.clientX, e.clientY);
      if (hitEid) {
        if (e.shiftKey) {
          const exists = selectedEids.includes(hitEid);
          const next = exists
            ? selectedEids.filter((id) => id !== hitEid)
            : [...selectedEids, hitEid];
          onSelectEids(next);
          return;
        }

        if (!selectedEids.includes(hitEid)) {
          onSelectEids([hitEid]);
        }

        e.currentTarget.setPointerCapture(e.pointerId);
        setDrag({
          type: 'move',
          startClientX: e.clientX,
          startClientY: e.clientY,
          dx: 0,
          dy: 0,
        });
      } else {
        // Start Marquee box selection
        e.currentTarget.setPointerCapture(e.pointerId);
        setDrag({
          type: 'marquee',
          startClientX: e.clientX,
          startClientY: e.clientY,
          curClientX: e.clientX,
          curClientY: e.clientY,
          additive: e.shiftKey,
        });
      }
      return;
    }

    const pt = clientToSvgPoint(e.clientX, e.clientY);
    const sx = activeTool === 'brush' ? pt.x : snapVal(pt.x);
    const sy = activeTool === 'brush' ? pt.y : snapVal(pt.y);

    if (activeTool === 'text') {
      const stageRect = stageRef.current?.getBoundingClientRect();
      setTextDraft({
        svgX: sx,
        svgY: sy,
        screenX: stageRect ? e.clientX - stageRect.left : 100,
        screenY: stageRect ? e.clientY - stageRect.top : 100,
        value: '',
      });
      return;
    }

    if (activeTool === 'polygon') {
      // Close polygon if clicking near first vertex
      if (polygonPoints.length >= 3) {
        const first = polygonPoints[0];
        if (Math.hypot(sx - first.x, sy - first.y) < 10 / zoom) {
          const ptsAttr = polygonPoints.map((p) => `${fmtNum(p.x)},${fmtNum(p.y)}`).join(' ');
          const markup = `<polygon points="${ptsAttr}" fill="${paintStyle.fill}" stroke="${paintStyle.stroke}" stroke-width="${paintStyle.strokeWidth}" opacity="${paintStyle.opacity}" />`;
          onInsertShape(markup);
          setPolygonPoints([]);
          setPolygonCursor(null);
          return;
        }
      }
      setPolygonPoints((prev) => [...prev, { x: sx, y: sy }]);
      setPolygonCursor({ x: sx, y: sy });
      return;
    }

    // Continuous drag drawing tools
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({
      type: 'draw',
      tool: activeTool,
      startX: sx,
      startY: sy,
      curX: sx,
      curY: sy,
      shiftKey: e.shiftKey,
      points: [{ x: sx, y: sy }],
    });
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.type === 'pan') {
      setPan({
        x: drag.origPanX + (e.clientX - drag.startX),
        y: drag.origPanY + (e.clientY - drag.startY),
      });
      return;
    }

    if (drag.type === 'move') {
      const dx = e.clientX - drag.startClientX;
      const dy = e.clientY - drag.startClientY;
      setDrag({ ...drag, dx, dy });
      return;
    }

    if (drag.type === 'marquee') {
      setDrag({ ...drag, curClientX: e.clientX, curClientY: e.clientY });
      return;
    }

    if (drag.type === 'resize') {
      const pt = clientToSvgPoint(e.clientX, e.clientY);
      const sx = snapVal(pt.x);
      const sy = snapVal(pt.y);
      const dx = sx - drag.startSvgX;
      const dy = sy - drag.startSvgY;
      const o = drag.origUserBox;
      let nx = o.x;
      let ny = o.y;
      let nw = o.width;
      let nh = o.height;

      if (drag.handle.includes('e')) {
        nw = Math.max(4, o.width + dx);
      }
      if (drag.handle.includes('s')) {
        nh = Math.max(4, o.height + dy);
      }
      if (drag.handle.includes('w')) {
        const clampedDx = Math.min(dx, o.width - 4);
        nx = o.x + clampedDx;
        nw = o.width - clampedDx;
      }
      if (drag.handle.includes('n')) {
        const clampedDy = Math.min(dy, o.height - 4);
        ny = o.y + clampedDy;
        nh = o.height - clampedDy;
      }

      setDrag({
        ...drag,
        currentUserBox: { x: roundNum(nx), y: roundNum(ny), width: roundNum(nw), height: roundNum(nh) },
      });
      return;
    }

    if (drag.type === 'draw') {
      const pt = clientToSvgPoint(e.clientX, e.clientY);
      const cx = drag.tool === 'brush' ? pt.x : snapVal(pt.x);
      const cy = drag.tool === 'brush' ? pt.y : snapVal(pt.y);
      setDrag((prev) => {
        if (prev.type !== 'draw') return prev;
        return {
          ...prev,
          curX: cx,
          curY: cy,
          shiftKey: e.shiftKey,
          points: prev.tool === 'brush' ? [...prev.points, { x: cx, y: cy }] : prev.points,
        };
      });
      return;
    }

    // Hover tracking
    if (activeTool === 'polygon' && polygonPoints.length > 0) {
      const pt = clientToSvgPoint(e.clientX, e.clientY);
      setPolygonCursor({ x: snapVal(pt.x), y: snapVal(pt.y) });
      return;
    }

    if (activeTool === 'select') {
      const hitEid = hitTestEid(e.clientX, e.clientY);
      if (hitEid !== hoveredEid) {
        onHoverEid(hitEid);
      }
    } else if (hoveredEid !== null) {
      onHoverEid(null);
    }
  };

  const handleStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.type === 'none') return;

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (drag.type === 'move') {
      if (Math.hypot(drag.dx, drag.dy) > 2) {
        const p0 = clientToSvgPoint(drag.startClientX, drag.startClientY);
        const p1 = clientToSvgPoint(drag.startClientX + drag.dx, drag.startClientY + drag.dy);
        const dxSvg = snapToGrid ? Math.round((p1.x - p0.x) / 10) * 10 : roundNum(p1.x - p0.x);
        const dySvg = snapToGrid ? Math.round((p1.y - p0.y) / 10) * 10 : roundNum(p1.y - p0.y);
        if (dxSvg !== 0 || dySvg !== 0) {
          onMoveSelected(dxSvg, dySvg);
        }
      }
      setDrag({ type: 'none' });
      return;
    }

    if (drag.type === 'marquee') {
      const minX = Math.min(drag.startClientX, drag.curClientX);
      const maxX = Math.max(drag.startClientX, drag.curClientX);
      const minY = Math.min(drag.startClientY, drag.curClientY);
      const maxY = Math.max(drag.startClientY, drag.curClientY);

      if (maxX - minX < 4 && maxY - minY < 4) {
        if (!drag.additive) {
          onSelectEids([]);
        }
      } else {
        const svg = mountedSvgRef.current;
        if (svg) {
          const matched: string[] = [];
          for (const node of parsedSvg.flatNodes) {
            if (!node.isRenderable || node.isContainer) continue;
            const el = svg.querySelector(`[data-eid="${node.eid}"]`);
            if (!el) continue;
            const r = el.getBoundingClientRect();
            const intersects =
              r.right >= minX && r.left <= maxX && r.bottom >= minY && r.top <= maxY;
            if (intersects) {
              matched.push(node.eid);
            }
          }
          if (drag.additive) {
            onSelectEids(Array.from(new Set([...selectedEids, ...matched])));
          } else {
            onSelectEids(matched);
          }
        }
      }
      setDrag({ type: 'none' });
      return;
    }

    if (drag.type === 'resize') {
      onResizeElement(drag.eid, drag.currentUserBox, drag.origUserBox);
      setDrag({ type: 'none' });
      return;
    }

    if (drag.type === 'draw') {
      let markup = '';
      const opacityAttr = paintStyle.opacity < 1 ? ` opacity="${paintStyle.opacity}"` : '';

      if (drag.tool === 'brush') {
        if (drag.points.length >= 2) {
          const d = pointsToSmoothPath(drag.points);
          const strokeColor = paintStyle.stroke === 'none' ? '#0F172A' : paintStyle.stroke;
          markup = `<path d="${d}" fill="none" stroke="${strokeColor}" stroke-width="${Math.max(
            1,
            paintStyle.strokeWidth
          )}" stroke-linecap="round" stroke-linejoin="round"${opacityAttr} />`;
        }
      } else if (drag.tool === 'rect') {
        let w = Math.abs(drag.curX - drag.startX);
        let h = Math.abs(drag.curY - drag.startY);
        if (drag.shiftKey) {
          const side = Math.max(w, h);
          w = side;
          h = side;
        }
        const x = drag.curX >= drag.startX ? drag.startX : drag.startX - w;
        const y = drag.curY >= drag.startY ? drag.startY : drag.startY - h;
        if (w >= 2 && h >= 2) {
          const rxAttr = paintStyle.cornerRadius > 0 ? ` rx="${paintStyle.cornerRadius}"` : '';
          markup = `<rect x="${fmtNum(x)}" y="${fmtNum(y)}" width="${fmtNum(w)}" height="${fmtNum(
            h
          )}"${rxAttr} fill="${paintStyle.fill}" stroke="${paintStyle.stroke}" stroke-width="${
            paintStyle.strokeWidth
          }"${opacityAttr} />`;
        }
      } else if (drag.tool === 'circle') {
        const r = Math.hypot(drag.curX - drag.startX, drag.curY - drag.startY);
        if (r >= 2) {
          markup = `<circle cx="${fmtNum(drag.startX)}" cy="${fmtNum(drag.startY)}" r="${fmtNum(
            r
          )}" fill="${paintStyle.fill}" stroke="${paintStyle.stroke}" stroke-width="${
            paintStyle.strokeWidth
          }"${opacityAttr} />`;
        }
      } else if (drag.tool === 'ellipse') {
        const rx = Math.abs(drag.curX - drag.startX) / 2;
        const ry = Math.abs(drag.curY - drag.startY) / 2;
        const cx = (drag.startX + drag.curX) / 2;
        const cy = (drag.startY + drag.curY) / 2;
        if (rx >= 2 && ry >= 2) {
          markup = `<ellipse cx="${fmtNum(cx)}" cy="${fmtNum(cy)}" rx="${fmtNum(rx)}" ry="${fmtNum(
            ry
          )}" fill="${paintStyle.fill}" stroke="${paintStyle.stroke}" stroke-width="${
            paintStyle.strokeWidth
          }"${opacityAttr} />`;
        }
      } else if (drag.tool === 'line') {
        let x2 = drag.curX;
        let y2 = drag.curY;
        if (drag.shiftKey) {
          const angle = Math.round(Math.atan2(y2 - drag.startY, x2 - drag.startX) / (Math.PI / 4)) * (Math.PI / 4);
          const len = Math.hypot(x2 - drag.startX, y2 - drag.startY);
          x2 = drag.startX + Math.cos(angle) * len;
          y2 = drag.startY + Math.sin(angle) * len;
        }
        if (Math.hypot(x2 - drag.startX, y2 - drag.startY) >= 2) {
          const strokeColor = paintStyle.stroke === 'none' ? '#0F172A' : paintStyle.stroke;
          markup = `<line x1="${fmtNum(drag.startX)}" y1="${fmtNum(drag.startY)}" x2="${fmtNum(
            x2
          )}" y2="${fmtNum(y2)}" stroke="${strokeColor}" stroke-width="${Math.max(
            1,
            paintStyle.strokeWidth
          )}" stroke-linecap="round"${opacityAttr} />`;
        }
      }

      if (markup) {
        onInsertShape(markup);
      }
      setDrag({ type: 'none' });
      return;
    }

    setDrag({ type: 'none' });
  };

  const handleStageDoubleClick = () => {
    if (activeTool === 'polygon' && polygonPoints.length >= 3) {
      const ptsAttr = polygonPoints.map((p) => `${fmtNum(p.x)},${fmtNum(p.y)}`).join(' ');
      const markup = `<polygon points="${ptsAttr}" fill="${paintStyle.fill}" stroke="${paintStyle.stroke}" stroke-width="${paintStyle.strokeWidth}" opacity="${paintStyle.opacity}" />`;
      onInsertShape(markup);
      setPolygonPoints([]);
      setPolygonCursor(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const hitEid = hitTestEid(e.clientX, e.clientY);
    if (hitEid && !selectedEids.includes(hitEid)) {
      onSelectEids([hitEid]);
    }
    const stageRect = stageRef.current?.getBoundingClientRect();
    if (stageRect) {
      setContextMenu({
        x: Math.min(e.clientX - stageRect.left, stageRect.width - 190),
        y: Math.min(e.clientY - stageRect.top, stageRect.height - 260),
      });
    }
  };

  const handleStartResize = (handleId: string, e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (selectedEids.length !== 1) return;
    const eid = selectedEids[0];
    const el = mountedSvgRef.current?.querySelector(`[data-eid="${eid}"]`);
    if (!el) return;
    const origUserBox = getUserBoxForElement(el);
    if (!origUserBox) return;
    const pt = clientToSvgPoint(e.clientX, e.clientY);

    (stageRef.current as HTMLElement | null)?.setPointerCapture?.(e.pointerId);
    setDrag({
      type: 'resize',
      eid,
      handle: handleId,
      startSvgX: snapVal(pt.x),
      startSvgY: snapVal(pt.y),
      origUserBox,
      currentUserBox: origUserBox,
    });
  };

  const commitTextDraft = () => {
    if (!textDraft) return;
    const txt = textDraft.value.trim();
    if (txt) {
      const escaped = txt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const fill = paintStyle.fill === 'none' ? '#0F172A' : paintStyle.fill;
      const markup = `<text x="${fmtNum(textDraft.svgX)}" y="${fmtNum(
        textDraft.svgY
      )}" font-family="Plus Jakarta Sans, sans-serif" font-size="${
        paintStyle.fontSize
      }" font-weight="600" fill="${fill}">${escaped}</text>`;
      onInsertShape(markup);
      onSwitchToSelect();
    }
    setTextDraft(null);
  };

  const backdropClass =
    backdrop === 'checker'
      ? 'svg-checkerboard'
      : backdrop === 'white'
      ? 'bg-white'
      : backdrop === 'dotgrid'
      ? 'svg-dotgrid'
      : 'bg-[#0F172A]';

  const artboardWidth = Math.max(40, viewBox.width * zoom);
  const artboardHeight = Math.max(40, viewBox.height * zoom);

  // Live visual drag offset for selected elements
  const dragOffsetX = drag.type === 'move' ? drag.dx : 0;
  const dragOffsetY = drag.type === 'move' ? drag.dy : 0;

  let resizeScreenBox: ScreenBox | null = null;
  if (drag.type === 'resize' && stageRef.current && mountedSvgRef.current) {
    const ctm = mountedSvgRef.current.getScreenCTM();
    const sr = stageRef.current.getBoundingClientRect();
    if (ctm) {
      const p1 = new DOMPoint(drag.currentUserBox.x, drag.currentUserBox.y).matrixTransform(ctm);
      const p2 = new DOMPoint(
        drag.currentUserBox.x + drag.currentUserBox.width,
        drag.currentUserBox.y + drag.currentUserBox.height
      ).matrixTransform(ctm);
      resizeScreenBox = {
        x: Math.min(p1.x, p2.x) - sr.left,
        y: Math.min(p1.y, p2.y) - sr.top,
        width: Math.max(4, Math.abs(p2.x - p1.x)),
        height: Math.max(4, Math.abs(p2.y - p1.y)),
      };
    }
  }

  // Combined selection box across all selected elements
  const selectedBoxList = selectedEids
    .map((eid) => selectedBoxes[eid])
    .filter((b): b is ScreenBox => Boolean(b));

  const combinedBox: ScreenBox | null =
    resizeScreenBox ??
    (selectedBoxList.length > 0
      ? {
          x: Math.min(...selectedBoxList.map((b) => b.x)) + dragOffsetX,
          y: Math.min(...selectedBoxList.map((b) => b.y)) + dragOffsetY,
          width:
            Math.max(...selectedBoxList.map((b) => b.x + b.width)) -
            Math.min(...selectedBoxList.map((b) => b.x)),
          height:
            Math.max(...selectedBoxList.map((b) => b.y + b.height)) -
            Math.min(...selectedBoxList.map((b) => b.y)),
        }
      : null);

  // Marquee rect in stage coords
  let marqueeScreenBox: ScreenBox | null = null;
  if (drag.type === 'marquee' && stageRef.current) {
    const sr = stageRef.current.getBoundingClientRect();
    const x1 = drag.startClientX - sr.left;
    const y1 = drag.startClientY - sr.top;
    const x2 = drag.curClientX - sr.left;
    const y2 = drag.curClientY - sr.top;
    marqueeScreenBox = {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    };
  }

  // Apply live CSS transform during drag directly on preview DOM elements for smooth 60fps feedback
  useEffect(() => {
    const svg = mountedSvgRef.current;
    if (!svg) return;
    const allTagged = svg.querySelectorAll('[data-eid]');
    allTagged.forEach((el) => {
      if ('style' in el && (el as SVGElement).style) {
        (el as SVGElement).style.translate = '';
      }
    });
    if (drag.type === 'move' && (drag.dx !== 0 || drag.dy !== 0)) {
      const p0 = clientToSvgPoint(drag.startClientX, drag.startClientY);
      const p1 = clientToSvgPoint(drag.startClientX + drag.dx, drag.startClientY + drag.dy);
      const dxSvg = p1.x - p0.x;
      const dySvg = p1.y - p0.y;
      for (const eid of selectedEids) {
        const el = svg.querySelector(`[data-eid="${eid}"]`) as SVGElement | null;
        if (el && 'style' in el && el.style) {
          el.style.translate = `${dxSvg}px ${dySvg}px`;
        }
      }
    }
  }, [drag, selectedEids, clientToSvgPoint]);

  const singleSelectedNode =
    selectedEids.length === 1
      ? parsedSvg.flatNodes.find((n) => n.eid === selectedEids[0])
      : null;

  const cursorStyle = spacePressed
    ? 'grab'
    : drag.type === 'pan'
    ? 'grabbing'
    : activeTool === 'select'
    ? 'default'
    : activeTool === 'text'
    ? 'text'
    : 'crosshair';

  return (
    <section
      aria-label="Live SVG Zeichenfläche"
      className="flex-1 flex flex-col h-full bg-[#ECEEF2] relative min-w-0 select-none overflow-hidden"
    >
      {/* Top Canvas Micro-Bar */}
      <div className="h-10 shrink-0 px-3 bg-white border-b border-slate-200 flex items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
          <span className="font-mono tabular-nums text-slate-700 font-medium whitespace-nowrap">
            {viewBox.width} × {viewBox.height}
          </span>
          <span aria-hidden="true">·</span>
          {selectedEids.length > 0 ? (
            <span className="text-blue-700 font-medium whitespace-nowrap">
              {selectedEids.length === 1
                ? `1 Element markiert`
                : `${selectedEids.length} Elemente markiert`}
            </span>
          ) : (
            <span className="truncate">
              {activeTool === 'select'
                ? 'Hover zum Markieren · Umschalt+Klick für Mehrfachauswahl'
                : activeTool === 'polygon'
                ? 'Klicken für Punkte · Doppelklick oder Enter zum Schließen'
                : 'Ziehen auf der Zeichenfläche zum Zeichnen'}
            </span>
          )}
        </div>

        {/* Backdrop & Zoom Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-md border border-slate-200">
            {BACKDROP_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeBackdrop(opt.id)}
                className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                  backdrop === opt.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-0.5 border border-slate-200 rounded-md bg-white px-1 py-0.5">
            <button
              type="button"
              onClick={() => setZoom((z) => roundNum(Math.max(0.2, z - 0.15), 2))}
              title="Verkleinern"
              className="p-1 text-slate-600 hover:text-slate-900 rounded cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="w-11 text-center text-[11px] font-mono tabular-nums text-slate-700">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => roundNum(Math.min(4, z + 0.15), 2))}
              title="Vergrößern"
              className="p-1 text-slate-600 hover:text-slate-900 rounded cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={fitToView}
              title="Ansicht einpassen"
              className="p-1 text-slate-600 hover:text-slate-900 rounded cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Stage Viewport */}
      <div
        ref={stageRef}
        onWheel={handleWheel}
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
        onDoubleClick={handleStageDoubleClick}
        onContextMenu={handleContextMenu}
        onPointerLeave={() => {
          if (drag.type === 'none') onHoverEid(null);
        }}
        style={{ cursor: cursorStyle }}
        className="flex-1 relative overflow-hidden flex items-center justify-center"
      >
        {/* Artboard Container */}
        <div
          style={{
            width: `${artboardWidth}px`,
            height: `${artboardHeight}px`,
            transform: `translate(${pan.x}px, ${pan.y}px)`,
          }}
          className={`relative shadow-md border border-slate-300/90 ${backdropClass} shrink-0`}
        >
          {/* Mounted Live SVG */}
          <div ref={svgMountRef} className="w-full h-full svg-preview-scope" />

          {/* Live Drawing Ghost Overlay */}
          {(drag.type === 'draw' || polygonPoints.length > 0) && (
            <svg
              viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
              className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
            >
              {drag.type === 'draw' && drag.tool === 'brush' && drag.points.length > 1 && (
                <path
                  d={pointsToSmoothPath(drag.points)}
                  fill="none"
                  stroke={paintStyle.stroke === 'none' ? '#0F172A' : paintStyle.stroke}
                  strokeWidth={Math.max(1, paintStyle.strokeWidth)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={paintStyle.opacity}
                />
              )}

              {drag.type === 'draw' && drag.tool === 'rect' && (() => {
                let w = Math.abs(drag.curX - drag.startX);
                let h = Math.abs(drag.curY - drag.startY);
                if (drag.shiftKey) {
                  const s = Math.max(w, h);
                  w = s;
                  h = s;
                }
                const x = drag.curX >= drag.startX ? drag.startX : drag.startX - w;
                const y = drag.curY >= drag.startY ? drag.startY : drag.startY - h;
                return (
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    rx={paintStyle.cornerRadius}
                    fill={paintStyle.fill}
                    stroke={paintStyle.stroke === 'none' ? '#2563EB' : paintStyle.stroke}
                    strokeWidth={Math.max(1, paintStyle.strokeWidth)}
                    opacity={paintStyle.opacity}
                  />
                );
              })()}

              {drag.type === 'draw' && drag.tool === 'circle' && (
                <circle
                  cx={drag.startX}
                  cy={drag.startY}
                  r={Math.hypot(drag.curX - drag.startX, drag.curY - drag.startY)}
                  fill={paintStyle.fill}
                  stroke={paintStyle.stroke === 'none' ? '#2563EB' : paintStyle.stroke}
                  strokeWidth={Math.max(1, paintStyle.strokeWidth)}
                  opacity={paintStyle.opacity}
                />
              )}

              {drag.type === 'draw' && drag.tool === 'ellipse' && (
                <ellipse
                  cx={(drag.startX + drag.curX) / 2}
                  cy={(drag.startY + drag.curY) / 2}
                  rx={Math.abs(drag.curX - drag.startX) / 2}
                  ry={Math.abs(drag.curY - drag.startY) / 2}
                  fill={paintStyle.fill}
                  stroke={paintStyle.stroke === 'none' ? '#2563EB' : paintStyle.stroke}
                  strokeWidth={Math.max(1, paintStyle.strokeWidth)}
                  opacity={paintStyle.opacity}
                />
              )}

              {drag.type === 'draw' && drag.tool === 'line' && (() => {
                let x2 = drag.curX;
                let y2 = drag.curY;
                if (drag.shiftKey) {
                  const angle =
                    Math.round(Math.atan2(y2 - drag.startY, x2 - drag.startX) / (Math.PI / 4)) *
                    (Math.PI / 4);
                  const len = Math.hypot(x2 - drag.startX, y2 - drag.startY);
                  x2 = drag.startX + Math.cos(angle) * len;
                  y2 = drag.startY + Math.sin(angle) * len;
                }
                return (
                  <line
                    x1={drag.startX}
                    y1={drag.startY}
                    x2={x2}
                    y2={y2}
                    stroke={paintStyle.stroke === 'none' ? '#0F172A' : paintStyle.stroke}
                    strokeWidth={Math.max(1, paintStyle.strokeWidth)}
                    strokeLinecap="round"
                    opacity={paintStyle.opacity}
                  />
                );
              })()}

              {polygonPoints.length > 0 && (
                <>
                  <polyline
                    points={[
                      ...polygonPoints,
                      ...(polygonCursor ? [polygonCursor] : []),
                    ]
                      .map((p) => `${p.x},${p.y}`)
                      .join(' ')}
                    fill="rgba(37, 99, 235, 0.12)"
                    stroke="#2563EB"
                    strokeWidth={2 / zoom}
                    strokeDasharray={`${4 / zoom} ${3 / zoom}`}
                  />
                  {polygonPoints.map((p, idx) => (
                    <circle
                      key={idx}
                      cx={p.x}
                      cy={p.y}
                      r={(idx === 0 ? 5 : 3.5) / zoom}
                      fill={idx === 0 ? '#2563EB' : '#FFFFFF'}
                      stroke="#2563EB"
                      strokeWidth={1.5 / zoom}
                    />
                  ))}
                </>
              )}
            </svg>
          )}
        </div>

        {/* Hover-Over Highlight Box */}
        {hoveredBox && drag.type === 'none' && activeTool === 'select' && (
          <div
            style={{
              left: `${hoveredBox.box.x}px`,
              top: `${hoveredBox.box.y}px`,
              width: `${hoveredBox.box.width}px`,
              height: `${hoveredBox.box.height}px`,
            }}
            className="pointer-events-none absolute border-2 border-blue-500/80 bg-blue-500/5 z-20"
          >
            <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-blue-600 text-white font-mono text-[10px] rounded-xs whitespace-nowrap shadow-xs">
              {hoveredBox.label}
            </div>
          </div>
        )}

        {/* Individual Selected Element Outlines */}
        {selectedEids.map((eid) => {
          const box = selectedBoxes[eid];
          if (!box) return null;
          return (
            <div
              key={eid}
              style={{
                left: `${box.x + dragOffsetX}px`,
                top: `${box.y + dragOffsetY}px`,
                width: `${box.width}px`,
                height: `${box.height}px`,
              }}
              className="pointer-events-none absolute border border-blue-600 z-20"
            />
          );
        })}

        {/* Combined Selection Bounding Box + 8 Resize Handles */}
        {combinedBox && (
          <div
            style={{
              left: `${combinedBox.x}px`,
              top: `${combinedBox.y}px`,
              width: `${combinedBox.width}px`,
              height: `${combinedBox.height}px`,
            }}
            className="pointer-events-none absolute border-2 border-blue-600 z-30"
          >
            {selectedEids.length === 1 &&
              drag.type !== 'move' &&
              RESIZE_HANDLES.map((h) => (
                <div
                  key={h.id}
                  onPointerDown={(e) => handleStartResize(h.id, e)}
                  style={{
                    left: `${h.xPct * 100}%`,
                    top: `${h.yPct * 100}%`,
                    cursor: h.cursor,
                  }}
                  className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border-2 border-blue-600 rounded-[2px] shadow-xs hover:scale-125 transition-transform"
                />
              ))}
          </div>
        )}

        {/* Marquee Box Selection */}
        {marqueeScreenBox && (
          <div
            style={{
              left: `${marqueeScreenBox.x}px`,
              top: `${marqueeScreenBox.y}px`,
              width: `${marqueeScreenBox.width}px`,
              height: `${marqueeScreenBox.height}px`,
            }}
            className="pointer-events-none absolute border border-blue-600 bg-blue-500/12 z-40"
          />
        )}

        {/* Inline Text Creation Input */}
        {textDraft && (
          <div
            style={{ left: `${textDraft.screenX}px`, top: `${textDraft.screenY - 16}px` }}
            className="absolute z-50 bg-white border border-blue-500 rounded-md shadow-lg p-1.5 flex items-center gap-1.5"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              autoFocus
              value={textDraft.value}
              onChange={(e) => setTextDraft({ ...textDraft, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTextDraft();
                if (e.key === 'Escape') setTextDraft(null);
              }}
              placeholder="Text eingeben..."
              className="px-2 py-1 text-xs text-slate-900 focus:outline-none w-44"
            />
            <button
              type="button"
              onClick={commitTextDraft}
              className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
            >
              OK
            </button>
          </div>
        )}

        {/* Right-Click Context Menu */}
        {contextMenu && (
          <div
            style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute z-50 w-48 bg-white border border-slate-200 rounded-lg shadow-xl py-1 text-xs text-slate-700"
          >
            <button
              type="button"
              disabled={selectedEids.length === 0}
              onClick={() => {
                onCut();
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Scissors className="w-3.5 h-3.5" /> Ausschneiden
              </span>
              <span className="text-[10px] font-mono text-slate-400">Strg+X</span>
            </button>
            <button
              type="button"
              disabled={selectedEids.length === 0}
              onClick={() => {
                onCopy();
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Copy className="w-3.5 h-3.5" /> Kopieren
              </span>
              <span className="text-[10px] font-mono text-slate-400">Strg+C</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onPaste();
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <ClipboardPaste className="w-3.5 h-3.5" /> {hasClipboard ? 'Einfügen' : 'Aus Ablage einfügen'}
              </span>
              <span className="text-[10px] font-mono text-slate-400">Strg+V</span>
            </button>
            <button
              type="button"
              disabled={selectedEids.length === 0}
              onClick={() => {
                onDuplicate();
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Files className="w-3.5 h-3.5" /> Duplizieren
              </span>
              <span className="text-[10px] font-mono text-slate-400">Strg+D</span>
            </button>

            <div className="my-1 border-t border-slate-100" />

            <button
              type="button"
              disabled={selectedEids.length === 0}
              onClick={() => {
                onReorder('forward');
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <ArrowUp className="w-3.5 h-3.5" /> Nach vorne
            </button>
            <button
              type="button"
              disabled={selectedEids.length === 0}
              onClick={() => {
                onReorder('backward');
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <ArrowDown className="w-3.5 h-3.5" /> Nach hinten
            </button>

            {selectedEids.length >= 2 && (
              <button
                type="button"
                onClick={() => {
                  onGroup();
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 cursor-pointer"
              >
                <Group className="w-3.5 h-3.5" /> Gruppieren (&lt;g&gt;)
              </button>
            )}

            {singleSelectedNode?.tagName.toLowerCase() === 'g' && (
              <button
                type="button"
                onClick={() => {
                  onUngroup();
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 cursor-pointer"
              >
                <Ungroup className="w-3.5 h-3.5" /> Gruppe auflösen
              </button>
            )}

            <div className="my-1 border-t border-slate-100" />

            <button
              type="button"
              disabled={selectedEids.length === 0}
              onClick={() => {
                onDelete();
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 flex items-center justify-between text-red-600 hover:bg-red-50 disabled:opacity-40 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5" /> Löschen
              </span>
              <span className="text-[10px] font-mono text-red-400">Entf</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
