import React from 'react';
import {
  MousePointer2,
  Pencil,
  Square,
  Circle,
  Minus,
  Pentagon,
  Type,
  Magnet,
  ArrowLeftRight,
} from 'lucide-react';
import { PaintStyle, ToolType } from '../types/svg';

interface ToolRailProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  paintStyle: PaintStyle;
  onChangePaintStyle: (partial: Partial<PaintStyle>) => void;
  snapToGrid: boolean;
  onToggleSnap: () => void;
}

const TOOLS: Array<{
  id: ToolType;
  label: string;
  shortcut: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'select', label: 'Auswählen & Bewegen', shortcut: 'V', icon: MousePointer2 },
  { id: 'brush', label: 'Freihand-Pinsel', shortcut: 'B', icon: Pencil },
  { id: 'rect', label: 'Rechteck', shortcut: 'R', icon: Square },
  { id: 'circle', label: 'Kreis', shortcut: 'C', icon: Circle },
  {
    id: 'ellipse',
    label: 'Ellipse',
    shortcut: 'E',
    icon: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <ellipse cx="12" cy="12" rx="9" ry="6" />
      </svg>
    ),
  },
  { id: 'line', label: 'Linie', shortcut: 'L', icon: Minus },
  { id: 'polygon', label: 'Polygon zeichnen', shortcut: 'P', icon: Pentagon },
  { id: 'text', label: 'Text hinzufügen', shortcut: 'T', icon: Type },
];

export const ToolRail: React.FC<ToolRailProps> = ({
  activeTool,
  onSelectTool,
  paintStyle,
  onChangePaintStyle,
  snapToGrid,
  onToggleSnap,
}) => {
  const swapColors = () => {
    const prevFill = paintStyle.fill;
    const prevStroke = paintStyle.stroke;
    onChangePaintStyle({
      fill: prevStroke === 'none' ? '#2563EB' : prevStroke,
      stroke: prevFill === 'none' ? '#0F172A' : prevFill,
    });
  };

  return (
    <aside
      aria-label="Zeichenwerkzeuge"
      className="w-14 shrink-0 bg-white border-l border-slate-200 py-3 flex flex-col items-center justify-between select-none z-20"
    >
      {/* Drawing & Selection Tools */}
      <div className="flex flex-col items-center gap-1 w-full px-1.5">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const active = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => onSelectTool(tool.id)}
              title={`${tool.label} (${tool.shortcut})`}
              aria-label={tool.label}
              aria-pressed={active}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                active
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}

        <div className="w-7 h-px bg-slate-200 my-1.5" />

        <button
          type="button"
          onClick={onToggleSnap}
          title={snapToGrid ? 'Raster-Einrasten aktiv (10px)' : 'Raster-Einrasten einschalten'}
          aria-pressed={snapToGrid}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            snapToGrid
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Magnet className="w-4 h-4" />
        </button>
      </div>

      {/* Paint Color Wells & Stroke Quick Control */}
      <div className="flex flex-col items-center gap-2.5 w-full px-1.5 pt-3 border-t border-slate-200">
        <div className="flex flex-col items-center gap-1">
          <label
            title="Füllfarbe für neue Elemente"
            className="relative w-7 h-7 rounded-md border border-slate-300 cursor-pointer overflow-hidden shadow-xs"
            style={{
              background:
                paintStyle.fill === 'none'
                  ? 'linear-gradient(135deg, #fff 45%, #ef4444 45%, #ef4444 55%, #fff 55%)'
                  : paintStyle.fill,
            }}
          >
            <input
              type="color"
              value={paintStyle.fill === 'none' ? '#3B82F6' : paintStyle.fill}
              onChange={(e) => onChangePaintStyle({ fill: e.target.value })}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              aria-label="Füllfarbe"
            />
          </label>
          <button
            type="button"
            onClick={() =>
              onChangePaintStyle({ fill: paintStyle.fill === 'none' ? '#3B82F6' : 'none' })
            }
            className="text-[10px] font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
            title="Füllung ein/aus"
          >
            {paintStyle.fill === 'none' ? 'Leer' : 'Füll'}
          </button>
        </div>

        <button
          type="button"
          onClick={swapColors}
          title="Füll- und Konturfarbe tauschen"
          className="p-1 text-slate-400 hover:text-slate-800 rounded transition-colors cursor-pointer"
        >
          <ArrowLeftRight className="w-3 h-3" />
        </button>

        <div className="flex flex-col items-center gap-1">
          <label
            title="Konturfarbe für neue Elemente"
            className="relative w-7 h-7 rounded-md border-2 border-slate-300 cursor-pointer overflow-hidden flex items-center justify-center bg-white"
          >
            <span
              className="w-4 h-4 rounded-xs border-2"
              style={{
                borderColor: paintStyle.stroke === 'none' ? '#cbd5e1' : paintStyle.stroke,
              }}
            />
            <input
              type="color"
              value={paintStyle.stroke === 'none' ? '#0F172A' : paintStyle.stroke}
              onChange={(e) => onChangePaintStyle({ stroke: e.target.value })}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              aria-label="Konturfarbe"
            />
          </label>
          <span className="text-[10px] font-mono tabular-nums text-slate-500">
            {paintStyle.strokeWidth}px
          </span>
        </div>
      </div>
    </aside>
  );
};
