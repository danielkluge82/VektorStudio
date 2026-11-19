import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  CanvasBackdrop,
  PaintStyle,
  SvgUserBox,
  ToolType,
  WorkspaceLayout,
} from './types/svg';
import { SVG_TEMPLATES, SvgTemplate } from './utils/templates';
import {
  deleteElementsInCode,
  extractElementsMarkup,
  groupElementsInCode,
  insertSvgElementsInCode,
  parseSvgCode,
  reorderElementsInCode,
  resizeElementInCode,
  translateElementsInCode,
  ungroupElementInCode,
  updateElementAttributes,
  updateElementTextContent,
  updateSvgRootAttributes,
} from './utils/svgDom';
import { buildCleanSvgExport, downloadTextFile } from './utils/svgExport';
import { TopBar } from './components/TopBar';
import { ToolRail } from './components/ToolRail';
import { CodePane } from './components/CodePane';
import { CanvasStage } from './components/CanvasStage';
import { InspectorPane } from './components/InspectorPane';
import { ImportModal } from './components/ImportModal';
import { ExportModal } from './components/ExportModal';

const INITIAL_CODE = SVG_TEMPLATES[0].code;

function AppContent() {
  const [history, setHistory] = useState<string[]>([INITIAL_CODE]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const code = history[historyIdx] ?? INITIAL_CODE;

  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [layout, setLayout] = useState<WorkspaceLayout>('split');
  const [backdrop, setBackdrop] = useState<CanvasBackdrop>('checker');
  const [snapToGrid, setSnapToGrid] = useState(false);

  const [selectedEids, setSelectedEids] = useState<string[]>([]);
  const [hoveredEid, setHoveredEid] = useState<string | null>(null);
  const [clipboardMarkup, setClipboardMarkup] = useState<string[]>([]);

  const [paintStyle, setPaintStyle] = useState<PaintStyle>({
    fill: '#3B82F6',
    stroke: '#0F172A',
    strokeWidth: 2.5,
    opacity: 1,
    cornerRadius: 8,
    fontSize: 24,
  });

  const [codePaneWidth, setCodePaneWidth] = useState(400);
  const resizingSplitRef = useRef(false);

  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2200);
    return () => clearTimeout(t);
  }, [notice]);

  // Parse current SVG; retain last valid parsed SVG if user is mid-edit in raw XML
  const currentParsed = useMemo(() => parseSvgCode(code), [code]);
  const lastValidParsedRef = useRef(currentParsed);
  if (currentParsed.valid) {
    lastValidParsedRef.current = currentParsed;
  }
  const activeParsedSvg = currentParsed.valid ? currentParsed : lastValidParsedRef.current;

  const commitCode = useCallback(
    (nextCode: string, nextSelectedEids?: string[]) => {
      if (nextCode === code) {
        if (nextSelectedEids !== undefined) {
          setSelectedEids(nextSelectedEids);
        }
        return;
      }
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIdx + 1);
        const appended = [...sliced, nextCode];
        return appended.length > 80 ? appended.slice(appended.length - 80) : appended;
      });
      setHistoryIdx((prev) => Math.min(prev + 1, 79));
      if (nextSelectedEids !== undefined) {
        setSelectedEids(nextSelectedEids);
      }
    },
    [code, historyIdx]
  );

  // Keep selectedEids valid after arbitrary code edits
  useEffect(() => {
    if (!currentParsed.valid) return;
    setSelectedEids((prev) => {
      const validSet = new Set(currentParsed.flatNodes.map((n) => n.eid));
      const filtered = prev.filter((id) => validSet.has(id));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [currentParsed]);

  const handleUndo = useCallback(() => {
    if (historyIdx > 0) {
      setHistoryIdx((i) => i - 1);
      setHoveredEid(null);
    }
  }, [historyIdx]);

  const handleRedo = useCallback(() => {
    if (historyIdx < history.length - 1) {
      setHistoryIdx((i) => i + 1);
      setHoveredEid(null);
    }
  }, [historyIdx, history.length]);

  const handleCopy = useCallback(async () => {
    if (selectedEids.length === 0) return;
    const items = extractElementsMarkup(code, selectedEids);
    if (items.length === 0) return;
    setClipboardMarkup(items);
    try {
      await navigator.clipboard.writeText(items.join('\n'));
    } catch {
      // Internal clipboard still works
    }
    showNotice(`${items.length} ${items.length === 1 ? 'Element' : 'Elemente'} kopiert`);
  }, [code, selectedEids, showNotice]);

  const handleCut = useCallback(async () => {
    if (selectedEids.length === 0) return;
    const items = extractElementsMarkup(code, selectedEids);
    if (items.length === 0) return;
    setClipboardMarkup(items);
    try {
      await navigator.clipboard.writeText(items.join('\n'));
    } catch {
      // Ignore OS clipboard failure
    }
    const nextCode = deleteElementsInCode(code, selectedEids);
    commitCode(nextCode, []);
    showNotice(`${items.length} ${items.length === 1 ? 'Element' : 'Elemente'} ausgeschnitten`);
  }, [code, selectedEids, commitCode, showNotice]);

  const handlePaste = useCallback(async () => {
    let itemsToInsert = clipboardMarkup;
    let offset = 18;

    try {
      const osText = await navigator.clipboard.readText();
      const trimmed = osText.trim();
      if (
        trimmed &&
        trimmed.startsWith('<') &&
        trimmed !== clipboardMarkup.join('\n').trim()
      ) {
        itemsToInsert = [trimmed];
        offset = 0;
      }
    } catch {
      // Clipboard read permission not granted; use internal clipboard
    }

    if (!itemsToInsert || itemsToInsert.length === 0) {
      showNotice('Zwischenablage ist leer');
      return;
    }

    const res = insertSvgElementsInCode(code, itemsToInsert, offset, offset);
    if (res.insertedEids.length > 0) {
      commitCode(res.code, res.insertedEids);
      setActiveTool('select');
      showNotice(
        `${res.insertedEids.length} ${
          res.insertedEids.length === 1 ? 'Element' : 'Elemente'
        } eingefügt`
      );
    }
  }, [clipboardMarkup, code, commitCode, showNotice]);

  const handleDuplicate = useCallback(() => {
    if (selectedEids.length === 0) return;
    const items = extractElementsMarkup(code, selectedEids);
    if (items.length === 0) return;
    const res = insertSvgElementsInCode(code, items, 20, 20);
    if (res.insertedEids.length > 0) {
      commitCode(res.code, res.insertedEids);
    }
  }, [code, selectedEids, commitCode]);

  const handleDelete = useCallback(
    (targetEids = selectedEids) => {
      if (targetEids.length === 0) return;
      const nextCode = deleteElementsInCode(code, targetEids);
      commitCode(nextCode, []);
      setHoveredEid(null);
    },
    [code, selectedEids, commitCode]
  );

  const handleMoveSelected = useCallback(
    (dxSvg: number, dySvg: number) => {
      if (selectedEids.length === 0) return;
      const nextCode = translateElementsInCode(code, selectedEids, dxSvg, dySvg);
      commitCode(nextCode);
    },
    [code, selectedEids, commitCode]
  );

  const handleResizeElement = useCallback(
    (eid: string, newBox: SvgUserBox, origBox: SvgUserBox) => {
      const nextCode = resizeElementInCode(code, eid, newBox, origBox);
      commitCode(nextCode);
    },
    [code, commitCode]
  );

  const handleInsertShape = useCallback(
    (markup: string) => {
      const res = insertSvgElementsInCode(code, [markup], 0, 0);
      commitCode(res.code, res.insertedEids);
    },
    [code, commitCode]
  );

  const handleUpdateAttrs = useCallback(
    (eids: string[], updates: Record<string, string | null>) => {
      const nextCode = updateElementAttributes(code, eids, updates);
      commitCode(nextCode);
    },
    [code, commitCode]
  );

  const handleUpdateText = useCallback(
    (eid: string, text: string) => {
      const nextCode = updateElementTextContent(code, eid, text);
      commitCode(nextCode);
    },
    [code, commitCode]
  );

  const handleUpdateCanvasRoot = useCallback(
    (updates: { width?: string; height?: string; viewBox?: string }) => {
      const nextCode = updateSvgRootAttributes(code, updates);
      commitCode(nextCode);
    },
    [code, commitCode]
  );

  const handleReorder = useCallback(
    (action: 'forward' | 'backward' | 'front' | 'back') => {
      if (selectedEids.length === 0) return;
      const res = reorderElementsInCode(code, selectedEids, action);
      commitCode(res.code, res.newEids);
    },
    [code, selectedEids, commitCode]
  );

  const handleGroup = useCallback(() => {
    if (selectedEids.length < 2) return;
    const res = groupElementsInCode(code, selectedEids);
    if (res.newEid) {
      commitCode(res.code, [res.newEid]);
    }
  }, [code, selectedEids, commitCode]);

  const handleUngroup = useCallback(() => {
    if (selectedEids.length !== 1) return;
    const res = ungroupElementInCode(code, selectedEids[0]);
    commitCode(res.code, res.newEids);
  }, [code, selectedEids, commitCode]);

  const handleSelectTemplate = (tpl: SvgTemplate) => {
    commitCode(tpl.code, []);
    setHoveredEid(null);
    showNotice(`Vorlage „${tpl.name}“ geladen`);
  };

  const handleImportApply = (importedCode: string, mode: 'replace' | 'append') => {
    if (mode === 'replace') {
      commitCode(importedCode, []);
      showNotice('SVG-Code übernommen');
    } else {
      const res = insertSvgElementsInCode(code, [importedCode], 0, 0);
      commitCode(res.code, res.insertedEids);
      setActiveTool('select');
      showNotice('Elemente in Zeichenfläche eingefügt');
    }
  };

  const handleExportSvg = () => {
    const clean = buildCleanSvgExport(code);
    downloadTextFile(clean, 'vektor-grafik.svg', 'image/svg+xml;charset=utf-8');
    showNotice('SVG-Datei heruntergeladen');
  };

  // Global keyboard shortcuts (active when not typing in inputs/textarea)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (inEditable) return;

      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        handleCut();
        return;
      }
      if (mod && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopy();
        return;
      }
      if (mod && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handlePaste();
        return;
      }
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicate();
        return;
      }
      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const allLeafEids = activeParsedSvg.flatNodes
          .filter((n) => n.isRenderable && !n.isContainer)
          .map((n) => n.eid);
        setSelectedEids(allLeafEids);
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedEids.length > 0) {
          e.preventDefault();
          handleDelete();
        }
        return;
      }

      // Arrow key nudging
      if (
        selectedEids.length > 0 &&
        (e.key === 'ArrowLeft' ||
          e.key === 'ArrowRight' ||
          e.key === 'ArrowUp' ||
          e.key === 'ArrowDown')
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        handleMoveSelected(dx, dy);
        return;
      }

      if (!mod && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'v') setActiveTool('select');
        if (key === 'b') setActiveTool('brush');
        if (key === 'r') setActiveTool('rect');
        if (key === 'c') setActiveTool('circle');
        if (key === 'e') setActiveTool('ellipse');
        if (key === 'l') setActiveTool('line');
        if (key === 'p') setActiveTool('polygon');
        if (key === 't') setActiveTool('text');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleUndo,
    handleRedo,
    handleCut,
    handleCopy,
    handlePaste,
    handleDuplicate,
    handleDelete,
    handleMoveSelected,
    selectedEids,
    activeParsedSvg.flatNodes,
  ]);

  // Resizable split pane drag handlers
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!resizingSplitRef.current) return;
      const next = Math.min(680, Math.max(260, e.clientX));
      setCodePaneWidth(next);
    };
    const onPointerUp = () => {
      resizingSplitRef.current = false;
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  // Support drag & drop .svg files onto the workspace
  const handleDropFile = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.name.toLowerCase().endsWith('.svg') || file.type.includes('svg')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const parsed = parseSvgCode(reader.result);
          if (parsed.valid) {
            commitCode(reader.result, []);
            showNotice(`Datei „${file.name}“ geladen`);
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const selectedTagsSummary = useMemo(() => {
    if (selectedEids.length === 0) return '';
    if (selectedEids.length === 1) {
      const node = activeParsedSvg.flatNodes.find((n) => n.eid === selectedEids[0]);
      return node ? `<${node.tagName}>` : '';
    }
    return `${selectedEids.length} markiert`;
  }, [selectedEids, activeParsedSvg.flatNodes]);

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDropFile}
      className="h-screen w-screen overflow-hidden flex flex-col bg-[#F3F4F6] text-slate-900"
    >
      <TopBar
        layout={layout}
        onLayoutChange={setLayout}
        canUndo={historyIdx > 0}
        canRedo={historyIdx < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        hasSelection={selectedEids.length > 0}
        hasClipboard={clipboardMarkup.length > 0}
        onCut={handleCut}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onDuplicate={handleDuplicate}
        onDelete={() => handleDelete()}
        onSelectTemplate={handleSelectTemplate}
        onOpenImport={() => setImportOpen(true)}
        onExportSvg={handleExportSvg}
        onOpenHtmlExport={() => setExportOpen(true)}
      />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {(layout === 'split' || layout === 'code') && (
          <div
            style={layout === 'split' ? { width: `${codePaneWidth}px` } : undefined}
            className={layout === 'code' ? 'flex-1 h-full min-w-0' : 'shrink-0 h-full min-w-0'}
          >
            <CodePane
              code={code}
              onChangeCode={(next) => commitCode(next)}
              parseError={currentParsed.error}
              selectedTagsSummary={selectedTagsSummary}
              selectedEids={selectedEids}
              hoveredEid={hoveredEid}
            />
          </div>
        )}

        {layout === 'split' && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Code-Panel Breite anpassen"
            onPointerDown={() => {
              resizingSplitRef.current = true;
            }}
            className="w-1.5 shrink-0 bg-slate-200 hover:bg-blue-500 cursor-col-resize transition-colors"
          />
        )}

        {layout !== 'code' && (
          <>
            <CanvasStage
              parsedSvg={activeParsedSvg}
              activeTool={activeTool}
              paintStyle={paintStyle}
              snapToGrid={snapToGrid}
              selectedEids={selectedEids}
              hoveredEid={hoveredEid}
              backdrop={backdrop}
              onChangeBackdrop={setBackdrop}
              onSelectEids={setSelectedEids}
              onHoverEid={setHoveredEid}
              onMoveSelected={handleMoveSelected}
              onResizeElement={handleResizeElement}
              onInsertShape={handleInsertShape}
              onCut={handleCut}
              onCopy={handleCopy}
              onPaste={handlePaste}
              onDuplicate={handleDuplicate}
              onDelete={() => handleDelete()}
              onReorder={handleReorder}
              onGroup={handleGroup}
              onUngroup={handleUngroup}
              hasClipboard={clipboardMarkup.length > 0}
              onSwitchToSelect={() => setActiveTool('select')}
            />

            <ToolRail
              activeTool={activeTool}
              onSelectTool={setActiveTool}
              paintStyle={paintStyle}
              onChangePaintStyle={(partial) =>
                setPaintStyle((prev) => ({ ...prev, ...partial }))
              }
              snapToGrid={snapToGrid}
              onToggleSnap={() => setSnapToGrid((s) => !s)}
            />

            <InspectorPane
              parsedSvg={activeParsedSvg}
              selectedEids={selectedEids}
              hoveredEid={hoveredEid}
              paintStyle={paintStyle}
              onChangePaintStyle={(partial) =>
                setPaintStyle((prev) => ({ ...prev, ...partial }))
              }
              onSelectEids={setSelectedEids}
              onHoverEid={setHoveredEid}
              onUpdateAttrs={handleUpdateAttrs}
              onUpdateText={handleUpdateText}
              onUpdateCanvasRoot={handleUpdateCanvasRoot}
              onReorder={handleReorder}
              onGroup={handleGroup}
              onUngroup={handleUngroup}
              onDeleteEids={(eids) => handleDelete(eids)}
            />
          </>
        )}
      </div>

      {/* Subtle transient feedback toast */}
      {notice && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-3.5 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-lg pointer-events-none">
          {notice}
        </div>
      )}

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onApplyCode={handleImportApply}
      />

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        svgCode={code}
      />
    </div>
  );
}

class SvgErrorBoundary extends React.Component<
  { children: React.ReactNode; onReset: () => void },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode; onReset: () => void }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-[#F3F4F6] p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl shadow-lg p-6 space-y-4">
            <h1 className="text-base font-semibold text-slate-900">
              Fehler bei der SVG-Darstellung
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              Der eingefügte Code hat einen unerwarteten Darstellungsfehler ausgelöst:{' '}
              <span className="font-mono text-red-600">{this.state.error.message}</span>
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ error: null });
                this.props.onReset();
              }}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
            >
              Zurück zur Standard-Vorlage
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [resetKey, setResetKey] = useState(0);
  return (
    <SvgErrorBoundary onReset={() => setResetKey((k) => k + 1)}>
      <AppContent key={resetKey} />
    </SvgErrorBoundary>
  );
}

