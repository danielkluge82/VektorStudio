import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Sparkles, AlertTriangle } from 'lucide-react';
import { formatSvgCode, getElementLineRanges } from '../utils/svgDom';

interface CodePaneProps {
  code: string;
  onChangeCode: (newCode: string) => void;
  parseError: string | null;
  selectedTagsSummary: string;
  selectedEids: string[];
  hoveredEid: string | null;
}

const LINE_HEIGHT_PX = 20;
const VERTICAL_PAD_PX = 12;

export const CodePane: React.FC<CodePaneProps> = ({
  code,
  onChangeCode,
  parseError,
  selectedTagsSummary,
  selectedEids,
  hoveredEid,
}) => {
  const [copied, setCopied] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => code.split('\n'), [code]);
  const lineRanges = useMemo(() => getElementLineRanges(code), [code]);

  // Determine exact line indices highlighted by selection (and hover)
  const { selectedLineSet, hoveredLineSet, firstSelectedLine } = useMemo(() => {
    const selSet = new Set<number>();
    const hovSet = new Set<number>();
    let firstLine: number | null = null;

    for (const eid of selectedEids) {
      const range = lineRanges[eid];
      if (!range) continue;
      if (firstLine === null || range.startLine < firstLine) {
        firstLine = range.startLine;
      }
      for (let ln = range.startLine; ln <= range.endLine; ln++) {
        selSet.add(ln);
      }
    }

    if (hoveredEid && !selectedEids.includes(hoveredEid)) {
      const range = lineRanges[hoveredEid];
      if (range) {
        for (let ln = range.startLine; ln <= range.endLine; ln++) {
          hovSet.add(ln);
        }
      }
    }

    return {
      selectedLineSet: selSet,
      hoveredLineSet: hovSet,
      firstSelectedLine: firstLine,
    };
  }, [selectedEids, hoveredEid, lineRanges]);

  // Scroll code pane smoothly to bring newly selected element's code into view
  useEffect(() => {
    const el = textareaRef.current;
    if (!el || firstSelectedLine === null) return;
    // Do not hijack scroll if user is actively typing in the code editor
    if (document.activeElement === el) return;

    const targetTop = VERTICAL_PAD_PX + firstSelectedLine * LINE_HEIGHT_PX;
    const viewTop = el.scrollTop;
    const viewBottom = viewTop + el.clientHeight;

    if (targetTop < viewTop + 20 || targetTop > viewBottom - LINE_HEIGHT_PX * 3) {
      const centeredTop = Math.max(0, targetTop - el.clientHeight * 0.35);
      el.scrollTo({ top: centeredTop, behavior: 'smooth' });
    }
  }, [firstSelectedLine, selectedEids]);

  const handleScroll = () => {
    if (!textareaRef.current) return;
    const top = textareaRef.current.scrollTop;
    setScrollTop(top);
    if (gutterRef.current) {
      gutterRef.current.scrollTop = top;
    }
  };

  const handleFormat = () => {
    const formatted = formatSvgCode(code);
    onChangeCode(formatted);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Fallback
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const updated = code.substring(0, start) + '  ' + code.substring(end);
      onChangeCode(updated);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
  };

  return (
    <section
      aria-label="SVG Code Editor"
      className="flex flex-col h-full bg-[#0F172A] text-slate-100 border-r border-slate-800 min-w-0"
    >
      {/* Code Header */}
      <div className="h-10 shrink-0 px-3 bg-[#111C33] border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-slate-200 whitespace-nowrap">
            SVG-Code
          </span>
          <span className="text-[11px] font-mono tabular-nums text-slate-400 whitespace-nowrap">
            · {lines.length} Zeilen
          </span>
          {selectedTagsSummary && (
            <span className="text-[11px] font-mono text-blue-400 truncate">
              · {selectedTagsSummary}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleFormat}
            title="SVG-Code sauber formatieren"
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span>Formatieren</span>
          </button>
          <button
            type="button"
            onClick={handleCopy}
            title="SVG-Code in die Zwischenablage kopieren"
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors whitespace-nowrap cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Kopiert</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Kopieren</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Parse Error Banner */}
      {parseError && (
        <div className="px-3 py-2 bg-red-950/80 border-b border-red-800/70 flex items-start gap-2 text-xs text-red-200 shrink-0">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span className="leading-snug break-words">{parseError}</span>
        </div>
      )}

      {/* Line Numbers + Synchronized Line Highlight Overlay + Editable Code Area */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Line Number Gutter */}
        <div
          ref={gutterRef}
          aria-hidden="true"
          style={{ paddingTop: `${VERTICAL_PAD_PX}px`, paddingBottom: `${VERTICAL_PAD_PX}px` }}
          className="w-11 shrink-0 text-right font-mono text-[12px] text-slate-500 bg-[#0B1222] border-r border-slate-800/80 select-none overflow-hidden tabular-nums"
        >
          {lines.map((_, idx) => {
            const isSelected = selectedLineSet.has(idx);
            const isHovered = hoveredLineSet.has(idx);
            return (
              <div
                key={idx}
                style={{ height: `${LINE_HEIGHT_PX}px`, lineHeight: `${LINE_HEIGHT_PX}px` }}
                className={`pr-2.5 transition-colors ${
                  isSelected
                    ? 'bg-blue-600/35 text-blue-200 font-semibold'
                    : isHovered
                    ? 'bg-blue-500/15 text-blue-300'
                    : ''
                }`}
              >
                {idx + 1}
              </div>
            );
          })}
        </div>

        {/* Code Area Wrapper */}
        <div className="flex-1 relative min-w-0 h-full overflow-hidden">
          {/* Background Highlight Layer synced with textarea scrollTop */}
          <div
            aria-hidden="true"
            style={{
              transform: `translateY(${-scrollTop}px)`,
              paddingTop: `${VERTICAL_PAD_PX}px`,
              paddingBottom: `${VERTICAL_PAD_PX}px`,
            }}
            className="pointer-events-none absolute inset-x-0 top-0"
          >
            {lines.map((_, idx) => {
              const isSelected = selectedLineSet.has(idx);
              const isHovered = hoveredLineSet.has(idx);
              return (
                <div
                  key={idx}
                  style={{ height: `${LINE_HEIGHT_PX}px` }}
                  className={
                    isSelected
                      ? 'bg-blue-500/22'
                      : isHovered
                      ? 'bg-blue-500/10'
                      : ''
                  }
                />
              );
            })}
          </div>

          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => onChangeCode(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            aria-label="SVG Quellcode"
            placeholder="Hier SVG-Code einfügen oder bearbeiten..."
            style={{
              lineHeight: `${LINE_HEIGHT_PX}px`,
              paddingTop: `${VERTICAL_PAD_PX}px`,
              paddingBottom: `${VERTICAL_PAD_PX}px`,
            }}
            className="relative z-10 w-full h-full px-3 bg-transparent text-slate-100 font-mono text-[12px] resize-none focus:outline-none overflow-auto whitespace-pre"
          />
        </div>
      </div>
    </section>
  );
};
