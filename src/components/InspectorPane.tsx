import React from 'react';
import {
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  Group,
  Ungroup,
  Trash2,
  RotateCw,
  Layers,
} from 'lucide-react';
import { PaintStyle, ParsedSvgResult, SvgNodeInfo } from '../types/svg';

interface InspectorPaneProps {
  parsedSvg: ParsedSvgResult;
  selectedEids: string[];
  hoveredEid: string | null;
  paintStyle: PaintStyle;
  onChangePaintStyle: (partial: Partial<PaintStyle>) => void;
  onSelectEids: (eids: string[]) => void;
  onHoverEid: (eid: string | null) => void;
  onUpdateAttrs: (eids: string[], updates: Record<string, string | null>) => void;
  onUpdateText: (eid: string, text: string) => void;
  onUpdateCanvasRoot: (updates: { width?: string; height?: string; viewBox?: string }) => void;
  onReorder: (action: 'forward' | 'backward' | 'front' | 'back') => void;
  onGroup: () => void;
  onUngroup: () => void;
  onDeleteEids: (eids: string[]) => void;
}

const QUICK_SWATCHES = [
  '#0F172A',
  '#FFFFFF',
  '#2563EB',
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#8B5CF6',
  '#EC4899',
];

export const InspectorPane: React.FC<InspectorPaneProps> = ({
  parsedSvg,
  selectedEids,
  hoveredEid,
  paintStyle,
  onChangePaintStyle,
  onSelectEids,
  onHoverEid,
  onUpdateAttrs,
  onUpdateText,
  onUpdateCanvasRoot,
  onReorder,
  onGroup,
  onUngroup,
  onDeleteEids,
}) => {
  const selectedNodes: SvgNodeInfo[] = selectedEids
    .map((eid) => parsedSvg.flatNodes.find((n) => n.eid === eid))
    .filter((n): n is SvgNodeInfo => Boolean(n));

  const singleNode = selectedNodes.length === 1 ? selectedNodes[0] : null;
  const firstNode = selectedNodes[0] || null;
  const tagLower = singleNode?.tagName.toLowerCase() || '';

  const currentFill = firstNode?.attributes.fill ?? '#000000';
  const currentStroke = firstNode?.attributes.stroke ?? 'none';
  const currentStrokeWidth = parseFloat(firstNode?.attributes['stroke-width'] || '0') || 0;
  const currentOpacity =
    firstNode?.attributes.opacity !== undefined ? parseFloat(firstNode.attributes.opacity) : 1;

  const rotateSingleBy45 = () => {
    if (!singleNode) return;
    const existing = singleNode.attributes.transform || '';
    const match = existing.match(/rotate\(\s*([+-]?\d*\.?\d+)/i);
    const currentDeg = match ? parseFloat(match[1]) : 0;
    const nextDeg = (currentDeg + 45) % 360;
    const cleaned = existing.replace(/\s*rotate\([^)]*\)/gi, '').trim();
    const nextTransform =
      nextDeg === 0 ? cleaned : `${cleaned} rotate(${nextDeg})`.trim();
    onUpdateAttrs([singleNode.eid], { transform: nextTransform || null });
  };

  return (
    <aside
      aria-label="Eigenschaften und Elemente"
      className="w-72 shrink-0 bg-white border-l border-slate-200 flex flex-col h-full overflow-hidden select-none"
    >
      {/* Top Half: Properties Inspector */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-4">
        {selectedNodes.length === 0 ? (
          <>
            <div>
              <h2 className="text-xs font-semibold text-slate-900 mb-2.5">
                Zeichenfläche (SVG)
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[11px] text-slate-500">Breite</span>
                  <input
                    type="text"
                    value={parsedSvg.widthAttr}
                    onChange={(e) => onUpdateCanvasRoot({ width: e.target.value })}
                    className="mt-1 w-full px-2 py-1 text-xs font-mono tabular-nums border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] text-slate-500">Höhe</span>
                  <input
                    type="text"
                    value={parsedSvg.heightAttr}
                    onChange={(e) => onUpdateCanvasRoot({ height: e.target.value })}
                    className="mt-1 w-full px-2 py-1 text-xs font-mono tabular-nums border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
                  />
                </label>
              </div>
              <label className="block mt-2">
                <span className="text-[11px] text-slate-500">viewBox</span>
                <input
                  type="text"
                  value={`${parsedSvg.viewBox.x} ${parsedSvg.viewBox.y} ${parsedSvg.viewBox.width} ${parsedSvg.viewBox.height}`}
                  onChange={(e) => onUpdateCanvasRoot({ viewBox: e.target.value })}
                  className="mt-1 w-full px-2 py-1 text-xs font-mono tabular-nums border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
                />
              </label>
            </div>

            <div className="border-t border-slate-100 pt-3.5">
              <h2 className="text-xs font-semibold text-slate-900 mb-2.5">
                Pinsel- &amp; Formvorgaben
              </h2>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span>Füllfarbe</span>
                    <button
                      type="button"
                      onClick={() =>
                        onChangePaintStyle({
                          fill: paintStyle.fill === 'none' ? '#3B82F6' : 'none',
                        })
                      }
                      className="text-blue-600 hover:underline cursor-pointer"
                    >
                      {paintStyle.fill === 'none' ? 'Aktivieren' : 'Ohne Füllung'}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={paintStyle.fill === 'none' ? '#3B82F6' : paintStyle.fill}
                      onChange={(e) => onChangePaintStyle({ fill: e.target.value })}
                      className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={paintStyle.fill}
                      onChange={(e) => onChangePaintStyle({ fill: e.target.value })}
                      className="flex-1 px-2 py-1 text-xs font-mono border border-slate-200 rounded-md"
                    />
                  </div>
                  <div className="flex items-center gap-1 mt-1.5">
                    {QUICK_SWATCHES.map((swatch) => (
                      <button
                        key={swatch}
                        type="button"
                        onClick={() => onChangePaintStyle({ fill: swatch })}
                        style={{ backgroundColor: swatch }}
                        className="w-5 h-5 rounded-xs border border-slate-300 cursor-pointer hover:scale-110 transition-transform"
                        title={swatch}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span>Kontur</span>
                    <button
                      type="button"
                      onClick={() =>
                        onChangePaintStyle({
                          stroke: paintStyle.stroke === 'none' ? '#0F172A' : 'none',
                        })
                      }
                      className="text-blue-600 hover:underline cursor-pointer"
                    >
                      {paintStyle.stroke === 'none' ? 'Aktivieren' : 'Ohne Kontur'}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={paintStyle.stroke === 'none' ? '#0F172A' : paintStyle.stroke}
                      onChange={(e) => onChangePaintStyle({ stroke: e.target.value })}
                      className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={paintStyle.stroke}
                      onChange={(e) => onChangePaintStyle({ stroke: e.target.value })}
                      className="flex-1 px-2 py-1 text-xs font-mono border border-slate-200 rounded-md"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[11px] text-slate-500">Konturstärke</span>
                    <input
                      type="number"
                      min={0}
                      max={64}
                      step={0.5}
                      value={paintStyle.strokeWidth}
                      onChange={(e) =>
                        onChangePaintStyle({ strokeWidth: Math.max(0, parseFloat(e.target.value) || 0) })
                      }
                      className="mt-1 w-full px-2 py-1 text-xs font-mono tabular-nums border border-slate-200 rounded-md"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-slate-500">Eckenradius (rx)</span>
                    <input
                      type="number"
                      min={0}
                      max={200}
                      value={paintStyle.cornerRadius}
                      onChange={(e) =>
                        onChangePaintStyle({ cornerRadius: Math.max(0, parseFloat(e.target.value) || 0) })
                      }
                      className="mt-1 w-full px-2 py-1 text-xs font-mono tabular-nums border border-slate-200 rounded-md"
                    />
                  </label>
                </div>

                <label className="block">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Deckkraft</span>
                    <span className="font-mono tabular-nums">
                      {Math.round(paintStyle.opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={1}
                    step={0.05}
                    value={paintStyle.opacity}
                    onChange={(e) => onChangePaintStyle({ opacity: parseFloat(e.target.value) })}
                    className="w-full mt-1 accent-blue-600 cursor-pointer"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] text-slate-500">Textgröße (für Text-Tool)</span>
                  <input
                    type="number"
                    min={8}
                    max={200}
                    value={paintStyle.fontSize}
                    onChange={(e) =>
                      onChangePaintStyle({ fontSize: Math.max(8, parseInt(e.target.value, 10) || 24) })
                    }
                    className="mt-1 w-full px-2 py-1 text-xs font-mono tabular-nums border border-slate-200 rounded-md"
                  />
                </label>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Selected Header & Layer Order Actions */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <h2 className="text-xs font-semibold text-slate-900 truncate">
                  {singleNode
                    ? `<${singleNode.tagName}>${singleNode.id ? ` #${singleNode.id}` : ''}`
                    : `${selectedNodes.length} Elemente ausgewählt`}
                </h2>
                <button
                  type="button"
                  onClick={() => onDeleteEids(selectedEids)}
                  title="Ausgewählte Elemente löschen"
                  className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => onReorder('front')}
                  title="Ganz nach vorne"
                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded border border-slate-200 cursor-pointer"
                >
                  <ChevronsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onReorder('forward')}
                  title="Eine Ebene nach vorne"
                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded border border-slate-200 cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onReorder('backward')}
                  title="Eine Ebene nach hinten"
                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded border border-slate-200 cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onReorder('back')}
                  title="Ganz nach hinten"
                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded border border-slate-200 cursor-pointer"
                >
                  <ChevronsDown className="w-3.5 h-3.5" />
                </button>

                {selectedNodes.length >= 2 && (
                  <button
                    type="button"
                    onClick={onGroup}
                    title="Auswahl gruppieren (<g>)"
                    className="ml-auto flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 rounded border border-slate-200 cursor-pointer"
                  >
                    <Group className="w-3.5 h-3.5" />
                    <span>Gruppieren</span>
                  </button>
                )}
                {tagLower === 'g' && (
                  <button
                    type="button"
                    onClick={onUngroup}
                    title="Gruppe auflösen"
                    className="ml-auto flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 rounded border border-slate-200 cursor-pointer"
                  >
                    <Ungroup className="w-3.5 h-3.5" />
                    <span>Auflösen</span>
                  </button>
                )}
              </div>
            </div>

            {/* Appearance Section */}
            <div className="border-t border-slate-100 pt-3 space-y-3">
              <div className="text-[11px] font-semibold text-slate-500">Darstellung</div>

              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <span>Füllung (fill)</span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateAttrs(selectedEids, {
                        fill: currentFill === 'none' ? '#2563EB' : 'none',
                      })
                    }
                    className="text-blue-600 hover:underline cursor-pointer"
                  >
                    {currentFill === 'none' ? 'Setzen' : 'none'}
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={currentFill.startsWith('#') && currentFill.length === 7 ? currentFill : '#2563EB'}
                    onChange={(e) => onUpdateAttrs(selectedEids, { fill: e.target.value })}
                    className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={currentFill}
                    onChange={(e) => onUpdateAttrs(selectedEids, { fill: e.target.value })}
                    className="flex-1 px-2 py-1 text-xs font-mono border border-slate-200 rounded-md"
                  />
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                  {QUICK_SWATCHES.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      onClick={() => onUpdateAttrs(selectedEids, { fill: swatch })}
                      style={{ backgroundColor: swatch }}
                      className="w-5 h-5 rounded-xs border border-slate-300 cursor-pointer hover:scale-110 transition-transform"
                      title={swatch}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <span>Kontur (stroke)</span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateAttrs(selectedEids, {
                        stroke: currentStroke === 'none' ? '#0F172A' : 'none',
                        ...(currentStroke === 'none' && currentStrokeWidth === 0
                          ? { 'stroke-width': '2' }
                          : {}),
                      })
                    }
                    className="text-blue-600 hover:underline cursor-pointer"
                  >
                    {currentStroke === 'none' ? 'Setzen' : 'none'}
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={currentStroke.startsWith('#') && currentStroke.length === 7 ? currentStroke : '#0F172A'}
                    onChange={(e) =>
                      onUpdateAttrs(selectedEids, {
                        stroke: e.target.value,
                        ...(currentStrokeWidth === 0 ? { 'stroke-width': '2' } : {}),
                      })
                    }
                    className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={currentStroke}
                    onChange={(e) => onUpdateAttrs(selectedEids, { stroke: e.target.value })}
                    className="flex-1 px-2 py-1 text-xs font-mono border border-slate-200 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[11px] text-slate-500">Konturstärke</span>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={currentStrokeWidth}
                    onChange={(e) =>
                      onUpdateAttrs(selectedEids, { 'stroke-width': e.target.value })
                    }
                    className="mt-1 w-full px-2 py-1 text-xs font-mono tabular-nums border border-slate-200 rounded-md"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] text-slate-500">
                    Deckkraft ({Math.round(currentOpacity * 100)}%)
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={currentOpacity}
                    onChange={(e) =>
                      onUpdateAttrs(selectedEids, {
                        opacity: e.target.value === '1' ? null : e.target.value,
                      })
                    }
                    className="w-full mt-2 accent-blue-600 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Geometry & Specific Attributes (Single Selection) */}
            {singleNode && (
              <div className="border-t border-slate-100 pt-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Geometrie &amp; Attribute
                  </span>
                  <button
                    type="button"
                    onClick={rotateSingleBy45}
                    title="Um 45° drehen"
                    className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline cursor-pointer"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>+45°</span>
                  </button>
                </div>

                <label className="block">
                  <span className="text-[11px] text-slate-500">ID</span>
                  <input
                    type="text"
                    value={singleNode.attributes.id || ''}
                    placeholder="z.B. logo-kreis"
                    onChange={(e) =>
                      onUpdateAttrs([singleNode.eid], { id: e.target.value || null })
                    }
                    className="mt-0.5 w-full px-2 py-1 text-xs font-mono border border-slate-200 rounded-md"
                  />
                </label>

                {tagLower === 'rect' && (
                  <div className="grid grid-cols-2 gap-2">
                    {(['x', 'y', 'width', 'height', 'rx'] as const).map((attr) => (
                      <label key={attr} className="block">
                        <span className="text-[11px] text-slate-500">{attr}</span>
                        <input
                          type="text"
                          value={singleNode.attributes[attr] || '0'}
                          onChange={(e) =>
                            onUpdateAttrs([singleNode.eid], { [attr]: e.target.value })
                          }
                          className="mt-0.5 w-full px-2 py-1 text-xs font-mono tabular-nums border border-slate-200 rounded-md"
                        />
                      </label>
                    ))}
                  </div>
                )}

                {tagLower === 'circle' && (
                  <div className="grid grid-cols-3 gap-2">
                    {(['cx', 'cy', 'r'] as const).map((attr) => (
                      <label key={attr} className="block">
                        <span className="text-[11px] text-slate-500">{attr}</span>
                        <input
                          type="text"
                          value={singleNode.attributes[attr] || '0'}
                          onChange={(e) =>
                            onUpdateAttrs([singleNode.eid], { [attr]: e.target.value })
                          }
                          className="mt-0.5 w-full px-2 py-1 text-xs font-mono tabular-nums border border-slate-200 rounded-md"
                        />
                      </label>
                    ))}
                  </div>
                )}

                {tagLower === 'ellipse' && (
                  <div className="grid grid-cols-2 gap-2">
                    {(['cx', 'cy', 'rx', 'ry'] as const).map((attr) => (
                      <label key={attr} className="block">
                        <span className="text-[11px] text-slate-500">{attr}</span>
                        <input
                          type="text"
                          value={singleNode.attributes[attr] || '0'}
                          onChange={(e) =>
                            onUpdateAttrs([singleNode.eid], { [attr]: e.target.value })
                          }
                          className="mt-0.5 w-full px-2 py-1 text-xs font-mono tabular-nums border border-slate-200 rounded-md"
                        />
                      </label>
                    ))}
                  </div>
                )}

                {tagLower === 'line' && (
                  <div className="grid grid-cols-2 gap-2">
                    {(['x1', 'y1', 'x2', 'y2'] as const).map((attr) => (
                      <label key={attr} className="block">
                        <span className="text-[11px] text-slate-500">{attr}</span>
                        <input
                          type="text"
                          value={singleNode.attributes[attr] || '0'}
                          onChange={(e) =>
                            onUpdateAttrs([singleNode.eid], { [attr]: e.target.value })
                          }
                          className="mt-0.5 w-full px-2 py-1 text-xs font-mono tabular-nums border border-slate-200 rounded-md"
                        />
                      </label>
                    ))}
                  </div>
                )}

                {tagLower === 'text' && (
                  <>
                    <label className="block">
                      <span className="text-[11px] text-slate-500">Textinhalt</span>
                      <input
                        type="text"
                        value={singleNode.textContent}
                        onChange={(e) => onUpdateText(singleNode.eid, e.target.value)}
                        className="mt-0.5 w-full px-2 py-1 text-xs border border-slate-200 rounded-md"
                      />
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="block">
                        <span className="text-[11px] text-slate-500">x</span>
                        <input
                          type="text"
                          value={singleNode.attributes.x || '0'}
                          onChange={(e) =>
                            onUpdateAttrs([singleNode.eid], { x: e.target.value })
                          }
                          className="mt-0.5 w-full px-2 py-1 text-xs font-mono tabular-nums border border-slate-200 rounded-md"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[11px] text-slate-500">y</span>
                        <input
                          type="text"
                          value={singleNode.attributes.y || '0'}
                          onChange={(e) =>
                            onUpdateAttrs([singleNode.eid], { y: e.target.value })
                          }
                          className="mt-0.5 w-full px-2 py-1 text-xs font-mono tabular-nums border border-slate-200 rounded-md"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[11px] text-slate-500">Größe</span>
                        <input
                          type="text"
                          value={singleNode.attributes['font-size'] || '16'}
                          onChange={(e) =>
                            onUpdateAttrs([singleNode.eid], { 'font-size': e.target.value })
                          }
                          className="mt-0.5 w-full px-2 py-1 text-xs font-mono tabular-nums border border-slate-200 rounded-md"
                        />
                      </label>
                    </div>
                  </>
                )}

                {tagLower === 'path' && (
                  <label className="block">
                    <span className="text-[11px] text-slate-500">Pfad-Daten (d)</span>
                    <textarea
                      rows={3}
                      value={singleNode.attributes.d || ''}
                      onChange={(e) =>
                        onUpdateAttrs([singleNode.eid], { d: e.target.value })
                      }
                      className="mt-0.5 w-full px-2 py-1 text-[11px] font-mono border border-slate-200 rounded-md resize-y"
                    />
                  </label>
                )}

                {(tagLower === 'polygon' || tagLower === 'polyline') && (
                  <label className="block">
                    <span className="text-[11px] text-slate-500">Punkte (points)</span>
                    <textarea
                      rows={2}
                      value={singleNode.attributes.points || ''}
                      onChange={(e) =>
                        onUpdateAttrs([singleNode.eid], { points: e.target.value })
                      }
                      className="mt-0.5 w-full px-2 py-1 text-[11px] font-mono border border-slate-200 rounded-md resize-y"
                    />
                  </label>
                )}

                <label className="block">
                  <span className="text-[11px] text-slate-500">Transform</span>
                  <input
                    type="text"
                    value={singleNode.attributes.transform || ''}
                    placeholder="z.B. translate(10, 20) rotate(15)"
                    onChange={(e) =>
                      onUpdateAttrs([singleNode.eid], {
                        transform: e.target.value || null,
                      })
                    }
                    className="mt-0.5 w-full px-2 py-1 text-xs font-mono border border-slate-200 rounded-md"
                  />
                </label>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Half: Element Layers Tree */}
      <div className="h-56 shrink-0 border-t border-slate-200 flex flex-col bg-slate-50/70">
        <div className="h-8 px-3 border-b border-slate-200 flex items-center justify-between bg-white">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Elemente</span>
          </span>
          <span className="text-[11px] font-mono tabular-nums text-slate-400">
            {parsedSvg.flatNodes.filter((n) => n.isRenderable).length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {parsedSvg.flatNodes.length === 0 ? (
            <div className="px-3 py-4 text-xs text-slate-400 text-center">
              Noch keine SVG-Elemente vorhanden.
            </div>
          ) : (
            parsedSvg.flatNodes.map((node) => {
              if (!node.isRenderable) return null;
              const isSelected = selectedEids.includes(node.eid);
              const isHovered = hoveredEid === node.eid;
              const fillColor = node.attributes.fill;
              return (
                <div
                  key={node.eid}
                  onMouseEnter={() => onHoverEid(node.eid)}
                  onMouseLeave={() => onHoverEid(null)}
                  onClick={(e) => {
                    if (e.shiftKey) {
                      onSelectEids(
                        isSelected
                          ? selectedEids.filter((id) => id !== node.eid)
                          : [...selectedEids, node.eid]
                      );
                    } else {
                      onSelectEids([node.eid]);
                    }
                  }}
                  style={{ paddingLeft: `${10 + node.depth * 14}px` }}
                  className={`group pr-2 py-1.5 flex items-center justify-between gap-2 text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : isHovered
                      ? 'bg-blue-50 text-blue-900'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-xs border border-black/15 shrink-0"
                      style={{
                        backgroundColor:
                          fillColor && fillColor !== 'none' && !fillColor.startsWith('url(')
                            ? fillColor
                            : 'transparent',
                      }}
                    />
                    <span className="font-mono text-[11px] truncate">
                      {node.tagName}
                      {node.id ? ` #${node.id}` : ''}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteEids([node.eid]);
                    }}
                    title="Element löschen"
                    className={`opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity cursor-pointer ${
                      isSelected ? 'hover:bg-blue-500 text-white' : 'hover:text-red-600 text-slate-400'
                    }`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
};
