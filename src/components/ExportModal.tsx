import React, { useMemo, useState } from 'react';
import { X, Download, Copy, Check } from 'lucide-react';
import { HtmlExportOptions } from '../types/svg';
import { buildCleanSvgExport, buildHtmlDocument, downloadTextFile } from '../utils/svgExport';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  svgCode: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({ open, onClose, svgCode }) => {
  const [title, setTitle] = useState('VektorStudio Export');
  const [filename, setFilename] = useState('vektor-grafik');
  const [background, setBackground] = useState<HtmlExportOptions['background']>('light');
  const [responsive, setResponsive] = useState(true);
  const [copiedType, setCopiedType] = useState<'html' | 'svg' | null>(null);

  const htmlOutput = useMemo(
    () =>
      buildHtmlDocument(svgCode, {
        title,
        background,
        responsive,
        includeReset: true,
      }),
    [svgCode, title, background, responsive]
  );

  const cleanSvg = useMemo(() => buildCleanSvgExport(svgCode), [svgCode]);

  if (!open) return null;

  const safeFileBase = filename.trim() || 'vektor-grafik';

  const handleCopy = async (type: 'html' | 'svg') => {
    try {
      await navigator.clipboard.writeText(type === 'html' ? htmlOutput : cleanSvg);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 1600);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-3xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Als HTML oder SVG exportieren
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-[11px] font-medium text-slate-600">Dateiname</span>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="mt-1 w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-slate-600">HTML Seitentitel</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
              />
            </label>
            <div>
              <span className="text-[11px] font-medium text-slate-600 block">
                HTML Hintergrund
              </span>
              <div className="mt-1 flex items-center gap-1 p-0.5 bg-slate-100 rounded-md border border-slate-200">
                {(
                  [
                    { id: 'light', label: 'Hell' },
                    { id: 'dark', label: 'Dunkel' },
                    { id: 'transparent', label: 'Keine' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setBackground(opt.id)}
                    className={`flex-1 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                      background === opt.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={responsive}
              onChange={(e) => setResponsive(e.target.checked)}
              className="rounded accent-blue-600"
            />
            <span>Responsive SVG-Skalierung (max-width: 100%; height: auto)</span>
          </label>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-700">HTML5-Vorschau</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy('svg')}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 rounded border border-slate-200 cursor-pointer"
                >
                  {copiedType === 'svg' ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedType === 'svg' ? 'SVG kopiert' : 'SVG kopieren'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy('html')}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 rounded border border-slate-200 cursor-pointer"
                >
                  {copiedType === 'html' ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedType === 'html' ? 'HTML kopiert' : 'HTML kopieren'}</span>
                </button>
              </div>
            </div>
            <pre className="p-3 bg-slate-950 text-slate-100 font-mono text-[11px] leading-relaxed rounded-lg max-h-64 overflow-auto border border-slate-800">
              {htmlOutput}
            </pre>
          </div>
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200/60 rounded-lg cursor-pointer"
          >
            Schließen
          </button>
          <button
            type="button"
            onClick={() =>
              downloadTextFile(cleanSvg, `${safeFileBase}.svg`, 'image/svg+xml;charset=utf-8')
            }
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Als .svg speichern</span>
          </button>
          <button
            type="button"
            onClick={() =>
              downloadTextFile(htmlOutput, `${safeFileBase}.html`, 'text/html;charset=utf-8')
            }
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Als .html speichern</span>
          </button>
        </div>
      </div>
    </div>
  );
};
