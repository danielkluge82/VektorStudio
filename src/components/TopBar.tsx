import React, { useState, useRef, useEffect } from 'react';
import {
  Undo2,
  Redo2,
  Scissors,
  Copy,
  ClipboardPaste,
  Trash2,
  Files,
  Download,
  FileCode2,
  Upload,
  Columns2,
  Eye,
  Code2,
  ChevronDown,
} from 'lucide-react';
import { WorkspaceLayout } from '../types/svg';
import { SVG_TEMPLATES, SvgTemplate } from '../utils/templates';

interface TopBarProps {
  layout: WorkspaceLayout;
  onLayoutChange: (layout: WorkspaceLayout) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  hasSelection: boolean;
  hasClipboard: boolean;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSelectTemplate: (template: SvgTemplate) => void;
  onOpenImport: () => void;
  onExportSvg: () => void;
  onOpenHtmlExport: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  layout,
  onLayoutChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  hasSelection,
  hasClipboard,
  onCut,
  onCopy,
  onPaste,
  onDuplicate,
  onDelete,
  onSelectTemplate,
  onOpenImport,
  onExportSvg,
  onOpenHtmlExport,
}) => {
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTemplatesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-13 shrink-0 bg-white border-b border-slate-200 px-4 flex items-center justify-between gap-4 select-none z-30">
      {/* Left: Brand & Templates */}
      <div className="flex items-center gap-4 min-w-0">
        <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
          VektorStudio
        </span>

        <div className="h-4 w-px bg-slate-200 shrink-0" />

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setTemplatesOpen((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Vorlagen</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {templatesOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-lg shadow-lg py-1.5 z-50">
              {SVG_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => {
                    onSelectTemplate(tpl);
                    setTemplatesOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="text-xs font-semibold text-slate-900">{tpl.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {tpl.description}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenImport}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5 text-slate-500" />
          <span>Code einfügen / Datei</span>
        </button>
      </div>

      {/* Center: Edit actions & Workspace Layout Switch */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-0.5 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Rückgängig (Strg+Z)"
            className="p-1.5 rounded-md text-slate-700 hover:bg-white hover:text-slate-900 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Wiederholen (Strg+Umschalt+Z)"
            className="p-1.5 rounded-md text-slate-700 hover:bg-white hover:text-slate-900 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-0.5 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
          <button
            type="button"
            onClick={onCut}
            disabled={!hasSelection}
            title="Ausschneiden (Strg+X)"
            className="p-1.5 rounded-md text-slate-700 hover:bg-white hover:text-slate-900 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <Scissors className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onCopy}
            disabled={!hasSelection}
            title="Kopieren (Strg+C)"
            className="p-1.5 rounded-md text-slate-700 hover:bg-white hover:text-slate-900 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onPaste}
            title={hasClipboard ? 'Einfügen (Strg+V)' : 'Aus Zwischenablage einfügen (Strg+V)'}
            className="p-1.5 rounded-md text-slate-700 hover:bg-white hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            disabled={!hasSelection}
            title="Duplizieren (Strg+D)"
            className="p-1.5 rounded-md text-slate-700 hover:bg-white hover:text-slate-900 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <Files className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={!hasSelection}
            title="Löschen (Entf)"
            className="p-1.5 rounded-md text-slate-700 hover:bg-red-50 hover:text-red-600 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => onLayoutChange('split')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              layout === 'split'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>Geteilt</span>
          </button>
          <button
            type="button"
            onClick={() => onLayoutChange('canvas')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              layout === 'canvas'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Vorschau</span>
          </button>
          <button
            type="button"
            onClick={() => onLayoutChange('code')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              layout === 'code'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Code</span>
          </button>
        </div>
      </div>

      {/* Right: SVG & HTML Export */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onExportSvg}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-slate-600" />
          <span>SVG exportieren</span>
        </button>
        <button
          type="button"
          onClick={onOpenHtmlExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <FileCode2 className="w-3.5 h-3.5" />
          <span>HTML exportieren</span>
        </button>
      </div>
    </header>
  );
};
