import React, { useState } from 'react';
import { X, Upload, ClipboardCheck } from 'lucide-react';
import { normalizeExternalSvgInput, parseSvgCode } from '../utils/svgDom';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onApplyCode: (code: string, mode: 'replace' | 'append') => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ open, onClose, onApplyCode }) => {
  const [rawInput, setRawInput] = useState('');
  const [mode, setMode] = useState<'replace' | 'append'>('replace');
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setRawInput(reader.result);
        setError(null);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = () => {
    const normalized = normalizeExternalSvgInput(rawInput);
    const parsed = parseSvgCode(normalized);
    if (!parsed.valid) {
      setError(parsed.error || 'Der eingefügte Code konnte nicht als SVG erkannt werden.');
      return;
    }
    onApplyCode(normalized, mode);
    setRawInput('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            SVG-Code einfügen oder Datei laden
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
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setMode('replace')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  mode === 'replace'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Aktuelles SVG ersetzen
              </button>
              <button
                type="button"
                onClick={() => setMode('append')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  mode === 'append'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                In Zeichenfläche einfügen
              </button>
            </div>

            <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>.svg Datei wählen</span>
              <input
                type="file"
                accept=".svg,image/svg+xml,text/plain"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          <textarea
            rows={11}
            value={rawInput}
            onChange={(e) => {
              setRawInput(e.target.value);
              setError(null);
            }}
            spellCheck={false}
            placeholder='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">...</svg> oder einzelne Elemente wie <circle cx="100" cy="100" r="40" fill="#2563EB" />'
            className="w-full p-3 font-mono text-xs bg-slate-950 text-slate-100 rounded-lg border border-slate-800 focus:outline-none focus:border-blue-500 resize-y"
          />

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200/60 rounded-lg cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={!rawInput.trim()}
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg cursor-pointer"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Übernehmen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
