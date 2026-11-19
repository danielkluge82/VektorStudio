export type ToolType =
  | 'select'
  | 'brush'
  | 'rect'
  | 'circle'
  | 'ellipse'
  | 'line'
  | 'polygon'
  | 'text';

export type WorkspaceLayout = 'split' | 'canvas' | 'code';

export type CanvasBackdrop = 'checker' | 'white' | 'dotgrid' | 'dark';

export interface SvgNodeInfo {
  eid: string; // Tree index path, e.g. "0", "0.1", "2"
  tagName: string;
  id: string;
  label: string;
  depth: number;
  isContainer: boolean;
  isRenderable: boolean;
  attributes: Record<string, string>;
  textContent: string;
  children: SvgNodeInfo[];
}

export interface SvgViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ParsedSvgResult {
  valid: boolean;
  error: string | null;
  doc: XMLDocument | null;
  svgEl: SVGSVGElement | null;
  viewBox: SvgViewBox;
  widthAttr: string;
  heightAttr: string;
  nodes: SvgNodeInfo[];
  flatNodes: SvgNodeInfo[];
}

export interface PaintStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  cornerRadius: number;
  fontSize: number;
}

export interface ScreenBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SvgUserBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HtmlExportOptions {
  title: string;
  background: 'transparent' | 'light' | 'dark';
  responsive: boolean;
  includeReset: boolean;
}
