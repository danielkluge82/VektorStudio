import { ParsedSvgResult, SvgNodeInfo, SvgUserBox, SvgViewBox } from '../types/svg';

const SVG_NS = 'http://www.w3.org/2000/svg';

const NON_RENDERABLE_TAGS = new Set([
  'defs',
  'style',
  'title',
  'desc',
  'metadata',
  'script',
  'lineargradient',
  'radialgradient',
  'stop',
  'clippath',
  'mask',
  'pattern',
  'filter',
  'marker',
  'animate',
  'animatetransform',
]);

const CONTAINER_TAGS = new Set(['g', 'svg', 'a', 'switch', 'symbol']);

export function roundNum(n: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  const rounded = Math.round(n * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function fmtNum(n: number, decimals = 2): string {
  return String(roundNum(n, decimals));
}

function getTagName(el: Element): string {
  return el.localName || el.tagName.replace(/^.*:/, '');
}

function isNonRenderableTag(tagName: string): boolean {
  const lower = tagName.toLowerCase();
  return NON_RENDERABLE_TAGS.has(lower) || lower.startsWith('fe');
}

function extractNodeInfo(
  el: Element,
  eid: string,
  depth: number,
  parentNonRenderable = false
): SvgNodeInfo {
  const tagName = getTagName(el);
  const lowerTag = tagName.toLowerCase();
  const id = el.getAttribute('id') || '';
  const attributes: Record<string, string> = {};
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    attributes[attr.name] = attr.value;
  }

  const selfNonRenderable = parentNonRenderable || isNonRenderableTag(lowerTag);
  const isContainer = CONTAINER_TAGS.has(lowerTag);
  const isRenderable = !selfNonRenderable;

  const children: SvgNodeInfo[] = [];
  for (let i = 0; i < el.children.length; i++) {
    const childEid = eid ? `${eid}.${i}` : `${i}`;
    children.push(extractNodeInfo(el.children[i], childEid, depth + 1, selfNonRenderable));
  }

  const label = id ? `${tagName} #${id}` : tagName;

  return {
    eid,
    tagName,
    id,
    label,
    depth,
    isContainer,
    isRenderable,
    attributes,
    textContent: lowerTag === 'text' || lowerTag === 'tspan' ? el.textContent || '' : '',
    children,
  };
}

function flattenNodes(nodes: SvgNodeInfo[]): SvgNodeInfo[] {
  const result: SvgNodeInfo[] = [];
  for (const node of nodes) {
    result.push(node);
    if (node.children.length > 0) {
      result.push(...flattenNodes(node.children));
    }
  }
  return result;
}

export function parseViewBox(svgEl: Element): SvgViewBox {
  const vb = svgEl.getAttribute('viewBox');
  if (vb) {
    const parts = vb
      .trim()
      .split(/[\s,]+/)
      .map((v) => parseFloat(v));
    if (
      parts.length === 4 &&
      parts.every((n) => Number.isFinite(n)) &&
      parts[2] > 0 &&
      parts[3] > 0
    ) {
      return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
    }
  }
  const w = parseFloat(svgEl.getAttribute('width') || '');
  const h = parseFloat(svgEl.getAttribute('height') || '');
  return {
    x: 0,
    y: 0,
    width: Number.isFinite(w) && w > 0 ? w : 800,
    height: Number.isFinite(h) && h > 0 ? h : 600,
  };
}

function ensureSvgXmlns(svgMarkup: string): string {
  return svgMarkup.replace(/<svg\b((?:"[^"]*"|'[^']*'|[^>"'])*)>/i, (_full, attrs: string) => {
    if (/\bxmlns\s*=/i.test(attrs)) {
      const fixedAttrs = attrs.replace(
        /\bxmlns\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i,
        `xmlns="${SVG_NS}"`
      );
      return `<svg${fixedAttrs}>`;
    }
    return `<svg xmlns="${SVG_NS}"${attrs}>`;
  });
}

export function parseSvgCode(rawCode: string): ParsedSvgResult {
  const trimmed = rawCode.trim();
  if (!trimmed) {
    return {
      valid: false,
      error: 'Kein SVG-Code vorhanden.',
      doc: null,
      svgEl: null,
      viewBox: { x: 0, y: 0, width: 800, height: 600 },
      widthAttr: '800',
      heightAttr: '600',
      nodes: [],
      flatNodes: [],
    };
  }

  const parser = new DOMParser();
  let doc = parser.parseFromString(trimmed, 'image/svg+xml');
  let parserError = doc.querySelector('parsererror');

  // If pasted inline HTML <svg> omitted xmlns, re-parse with SVG namespace so elements become real SVGElements
  if (!parserError && doc.documentElement && getTagName(doc.documentElement).toLowerCase() === 'svg') {
    if (doc.documentElement.namespaceURI !== SVG_NS) {
      const withNs = ensureSvgXmlns(trimmed);
      const nsDoc = parser.parseFromString(withNs, 'image/svg+xml');
      if (!nsDoc.querySelector('parsererror')) {
        doc = nsDoc;
        parserError = null;
      }
    }
  }

  if (parserError) {
    const errText = parserError.textContent?.split('\n')[0]?.trim() || 'Ungültige XML/SVG-Syntax.';
    return {
      valid: false,
      error: errText,
      doc: null,
      svgEl: null,
      viewBox: { x: 0, y: 0, width: 800, height: 600 },
      widthAttr: '800',
      heightAttr: '600',
      nodes: [],
      flatNodes: [],
    };
  }

  const root = doc.documentElement;
  if (!root || getTagName(root).toLowerCase() !== 'svg') {
    return {
      valid: false,
      error: 'Das Wurzelelement muss ein <svg>-Tag sein.',
      doc: null,
      svgEl: null,
      viewBox: { x: 0, y: 0, width: 800, height: 600 },
      widthAttr: '800',
      heightAttr: '600',
      nodes: [],
      flatNodes: [],
    };
  }

  const viewBox = parseViewBox(root);
  const nodes: SvgNodeInfo[] = [];
  for (let i = 0; i < root.children.length; i++) {
    nodes.push(extractNodeInfo(root.children[i], `${i}`, 0));
  }

  return {
    valid: true,
    error: null,
    doc,
    svgEl: root as unknown as SVGSVGElement,
    viewBox,
    widthAttr: root.getAttribute('width') || String(viewBox.width),
    heightAttr: root.getAttribute('height') || String(viewBox.height),
    nodes,
    flatNodes: flattenNodes(nodes),
  };
}

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeXmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function serializeElementPretty(el: Element, indentLevel: number): string {
  const indent = '  '.repeat(indentLevel);
  const tagName = getTagName(el);

  const isRootSvg = indentLevel === 0 && tagName.toLowerCase() === 'svg';
  let hasXmlns = false;
  const attrs: string[] = [];
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    // Strip editor-internal attributes if any ever slipped in
    if (attr.name === 'data-eid') continue;
    if (isRootSvg && attr.name.toLowerCase() === 'xmlns') {
      attrs.push(`xmlns="${SVG_NS}"`);
      hasXmlns = true;
      continue;
    }
    attrs.push(`${attr.name}="${escapeXmlAttr(attr.value)}"`);
  }

  // Ensure root <svg> always includes valid SVG xmlns
  if (isRootSvg && !hasXmlns) {
    attrs.unshift(`xmlns="${SVG_NS}"`);
  }

  const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';
  const childElements = Array.from(el.children);

  if (childElements.length === 0) {
    const text = el.textContent || '';
    if (!text.trim()) {
      return `${indent}<${tagName}${attrStr} />`;
    }
    return `${indent}<${tagName}${attrStr}>${escapeXmlText(text)}</${tagName}>`;
  }

  const lowerTag = tagName.toLowerCase();
  if (lowerTag === 'text' || lowerTag === 'tspan') {
    // Preserve inline tspan/text formatting compactly
    const serializer = new XMLSerializer();
    let raw = serializer.serializeToString(el);
    raw = raw.replace(/\s+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, '');
    return `${indent}${raw}`;
  }

  const childrenStr = childElements
    .map((child) => serializeElementPretty(child, indentLevel + 1))
    .join('\n');

  return `${indent}<${tagName}${attrStr}>\n${childrenStr}\n${indent}</${tagName}>`;
}

export function serializeSvgDoc(doc: XMLDocument): string {
  return serializeElementPretty(doc.documentElement, 0);
}

export function formatSvgCode(code: string): string {
  const parsed = parseSvgCode(code);
  if (!parsed.valid || !parsed.doc) return code;
  return serializeSvgDoc(parsed.doc);
}

export function normalizeExternalSvgInput(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return trimmed;
  // If user pasted HTML containing an <svg>...</svg>, extract the first <svg> block
  if (!/^<\?xml/i.test(trimmed) && !/^<svg\b/i.test(trimmed)) {
    const svgMatch = trimmed.match(/<svg[\s\S]*<\/svg>/i);
    if (svgMatch) {
      return formatSvgCode(svgMatch[0]);
    }
    // Maybe user pasted raw SVG elements like <circle ... /><rect ... />
    if (/^</.test(trimmed)) {
      const wrapped = `<svg xmlns="${SVG_NS}" viewBox="0 0 800 600" width="800" height="600">\n${trimmed}\n</svg>`;
      const check = parseSvgCode(wrapped);
      if (check.valid) {
        return formatSvgCode(wrapped);
      }
    }
  }
  return formatSvgCode(trimmed);
}

export function findElementByEid(svgRoot: Element, eid: string): Element | null {
  if (!eid) return null;
  const indices = eid.split('.').map((n) => parseInt(n, 10));
  let current: Element | null = svgRoot;
  for (const idx of indices) {
    if (!current || Number.isNaN(idx) || idx < 0 || idx >= current.children.length) {
      return null;
    }
    current = current.children[idx];
  }
  return current;
}

export function getEidForElement(svgRoot: Element, target: Element): string | null {
  const indices: number[] = [];
  let cur: Element | null = target;
  while (cur && cur !== svgRoot) {
    const pn: Node | null = cur.parentNode;
    const parent: Element | null = pn && pn.nodeType === 1 ? (pn as Element) : null;
    if (!parent) return null;
    const idx = Array.from(parent.children).indexOf(cur);
    if (idx === -1) return null;
    indices.unshift(idx);
    cur = parent;
  }
  if (cur !== svgRoot || indices.length === 0) return null;
  return indices.join('.');
}

// Keep only top-level selected eids (ignore descendants if ancestor is also selected)
export function filterTopLevelEids(eids: string[]): string[] {
  const unique = Array.from(new Set(eids)).filter(Boolean);
  return unique.filter((eid) => {
    return !unique.some((other) => other !== eid && eid.startsWith(other + '.'));
  });
}

function parseLeadingTranslate(transform: string): { tx: number; ty: number; rest: string } {
  const trimmed = transform.trim();
  const match = trimmed.match(/^translate\(\s*([+-]?\d*\.?\d+(?:e[+-]?\d+)?)(?:[\s,]+([+-]?\d*\.?\d+(?:e[+-]?\d+)?))?\s*\)\s*(.*)$/i);
  if (match) {
    return {
      tx: parseFloat(match[1]) || 0,
      ty: match[2] !== undefined ? parseFloat(match[2]) || 0 : 0,
      rest: match[3] || '',
    };
  }
  return { tx: 0, ty: 0, rest: trimmed };
}

function hasNonTranslateTransform(transform: string): boolean {
  const { rest } = parseLeadingTranslate(transform);
  return rest.trim().length > 0;
}

export function translateElement(el: Element, dx: number, dy: number): void {
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return;
  const tag = getTagName(el).toLowerCase();
  const existingTransform = el.getAttribute('transform') || '';

  if (!hasNonTranslateTransform(existingTransform) && !existingTransform.trim()) {
    if (tag === 'rect' || tag === 'image' || tag === 'use') {
      const x = parseFloat(el.getAttribute('x') || '0') || 0;
      const y = parseFloat(el.getAttribute('y') || '0') || 0;
      el.setAttribute('x', fmtNum(x + dx));
      el.setAttribute('y', fmtNum(y + dy));
      return;
    }
    if (tag === 'text') {
      const xStr = el.getAttribute('x');
      const yStr = el.getAttribute('y');
      const isSimpleX = !xStr || /^[+-]?\d*\.?\d+$/.test(xStr.trim());
      const isSimpleY = !yStr || /^[+-]?\d*\.?\d+$/.test(yStr.trim());
      if (isSimpleX && isSimpleY) {
        const x = parseFloat(xStr || '0') || 0;
        const y = parseFloat(yStr || '0') || 0;
        el.setAttribute('x', fmtNum(x + dx));
        el.setAttribute('y', fmtNum(y + dy));
        return;
      }
    }
    if (tag === 'circle' || tag === 'ellipse') {
      const cx = parseFloat(el.getAttribute('cx') || '0') || 0;
      const cy = parseFloat(el.getAttribute('cy') || '0') || 0;
      el.setAttribute('cx', fmtNum(cx + dx));
      el.setAttribute('cy', fmtNum(cy + dy));
      return;
    }
    if (tag === 'line') {
      const x1 = parseFloat(el.getAttribute('x1') || '0') || 0;
      const y1 = parseFloat(el.getAttribute('y1') || '0') || 0;
      const x2 = parseFloat(el.getAttribute('x2') || '0') || 0;
      const y2 = parseFloat(el.getAttribute('y2') || '0') || 0;
      el.setAttribute('x1', fmtNum(x1 + dx));
      el.setAttribute('y1', fmtNum(y1 + dy));
      el.setAttribute('x2', fmtNum(x2 + dx));
      el.setAttribute('y2', fmtNum(y2 + dy));
      return;
    }
    if (tag === 'polygon' || tag === 'polyline') {
      const pointsStr = el.getAttribute('points') || '';
      const nums = pointsStr.trim().match(/[+-]?\d*\.?\d+(?:e[+-]?\d+)?/gi);
      if (nums && nums.length >= 2) {
        const pairs: string[] = [];
        for (let i = 0; i + 1 < nums.length; i += 2) {
          const px = parseFloat(nums[i]) + dx;
          const py = parseFloat(nums[i + 1]) + dy;
          pairs.push(`${fmtNum(px)},${fmtNum(py)}`);
        }
        el.setAttribute('points', pairs.join(' '));
        return;
      }
    }
  }

  // Fallback or transform-based elements (<path>, <g>, rotated elements)
  const { tx, ty, rest } = parseLeadingTranslate(existingTransform);
  const newTx = roundNum(tx + dx);
  const newTy = roundNum(dy + ty);
  const translatePart = newTx === 0 && newTy === 0 ? '' : `translate(${newTx}, ${newTy})`;
  const combined = [translatePart, rest].filter(Boolean).join(' ').trim();
  if (combined) {
    el.setAttribute('transform', combined);
  } else {
    el.removeAttribute('transform');
  }
}

export function translateElementsInCode(
  code: string,
  eids: string[],
  dx: number,
  dy: number
): string {
  const parsed = parseSvgCode(code);
  if (!parsed.valid || !parsed.doc || !parsed.svgEl) return code;
  const topEids = filterTopLevelEids(eids);
  for (const eid of topEids) {
    const el = findElementByEid(parsed.svgEl, eid);
    if (el) {
      translateElement(el, dx, dy);
    }
  }
  return serializeSvgDoc(parsed.doc);
}

export function resizeElementInCode(
  code: string,
  eid: string,
  newBox: SvgUserBox,
  origBox: SvgUserBox
): string {
  const parsed = parseSvgCode(code);
  if (!parsed.valid || !parsed.doc || !parsed.svgEl) return code;
  const el = findElementByEid(parsed.svgEl, eid);
  if (!el) return code;

  const tag = getTagName(el).toLowerCase();
  const minW = Math.max(1, newBox.width);
  const minH = Math.max(1, newBox.height);

  if (tag === 'rect' || tag === 'image') {
    el.setAttribute('x', fmtNum(newBox.x));
    el.setAttribute('y', fmtNum(newBox.y));
    el.setAttribute('width', fmtNum(minW));
    el.setAttribute('height', fmtNum(minH));
  } else if (tag === 'circle') {
    const r = Math.max(1, Math.min(minW, minH) / 2);
    el.setAttribute('cx', fmtNum(newBox.x + newBox.width / 2));
    el.setAttribute('cy', fmtNum(newBox.y + newBox.height / 2));
    el.setAttribute('r', fmtNum(r));
  } else if (tag === 'ellipse') {
    el.setAttribute('cx', fmtNum(newBox.x + newBox.width / 2));
    el.setAttribute('cy', fmtNum(newBox.y + newBox.height / 2));
    el.setAttribute('rx', fmtNum(minW / 2));
    el.setAttribute('ry', fmtNum(minH / 2));
  } else if (tag === 'line') {
    const x1 = parseFloat(el.getAttribute('x1') || '0');
    const y1 = parseFloat(el.getAttribute('y1') || '0');
    const x2 = parseFloat(el.getAttribute('x2') || '0');
    const y2 = parseFloat(el.getAttribute('y2') || '0');
    const oW = Math.max(1, origBox.width);
    const oH = Math.max(1, origBox.height);
    const nx1 = newBox.x + ((x1 - origBox.x) / oW) * newBox.width;
    const ny1 = newBox.y + ((y1 - origBox.y) / oH) * newBox.height;
    const nx2 = newBox.x + ((x2 - origBox.x) / oW) * newBox.width;
    const ny2 = newBox.y + ((y2 - origBox.y) / oH) * newBox.height;
    el.setAttribute('x1', fmtNum(nx1));
    el.setAttribute('y1', fmtNum(ny1));
    el.setAttribute('x2', fmtNum(nx2));
    el.setAttribute('y2', fmtNum(ny2));
  } else if (tag === 'polygon' || tag === 'polyline') {
    const pointsStr = el.getAttribute('points') || '';
    const nums = pointsStr.trim().match(/[+-]?\d*\.?\d+(?:e[+-]?\d+)?/gi);
    if (nums && nums.length >= 2 && origBox.width > 0 && origBox.height > 0) {
      const pairs: string[] = [];
      for (let i = 0; i + 1 < nums.length; i += 2) {
        const px = parseFloat(nums[i]);
        const py = parseFloat(nums[i + 1]);
        const nx = newBox.x + ((px - origBox.x) / origBox.width) * minW;
        const ny = newBox.y + ((py - origBox.y) / origBox.height) * minH;
        pairs.push(`${fmtNum(nx)},${fmtNum(ny)}`);
      }
      el.setAttribute('points', pairs.join(' '));
    }
  } else {
    // For <path>, <g>, <text>, adjust translate/scale around origBox origin
    if (origBox.width > 0 && origBox.height > 0) {
      const sx = roundNum(minW / origBox.width, 3);
      const sy = roundNum(minH / origBox.height, 3);
      const existing = el.getAttribute('transform') || '';
      const cleanRest = existing.replace(/\s*scale\([^)]*\)/g, '').trim();
      const tx = fmtNum(newBox.x - origBox.x * sx);
      const ty = fmtNum(newBox.y - origBox.y * sy);
      // Simple scale around origin
      el.setAttribute(
        'transform',
        `translate(${tx}, ${ty}) scale(${sx}, ${sy}) ${cleanRest}`.trim()
      );
    }
  }

  return serializeSvgDoc(parsed.doc);
}

export function updateElementAttributes(
  code: string,
  eids: string[],
  updates: Record<string, string | null>
): string {
  const parsed = parseSvgCode(code);
  if (!parsed.valid || !parsed.doc || !parsed.svgEl) return code;

  for (const eid of eids) {
    const el = findElementByEid(parsed.svgEl, eid);
    if (!el) continue;
    for (const [key, val] of Object.entries(updates)) {
      if (val === null || val === '') {
        el.removeAttribute(key);
      } else {
        el.setAttribute(key, val);
      }
    }
  }
  return serializeSvgDoc(parsed.doc);
}

export function updateElementTextContent(code: string, eid: string, text: string): string {
  const parsed = parseSvgCode(code);
  if (!parsed.valid || !parsed.doc || !parsed.svgEl) return code;
  const el = findElementByEid(parsed.svgEl, eid);
  if (!el) return code;
  el.textContent = text;
  return serializeSvgDoc(parsed.doc);
}

export function deleteElementsInCode(code: string, eids: string[]): string {
  const parsed = parseSvgCode(code);
  if (!parsed.valid || !parsed.doc || !parsed.svgEl) return code;
  const topEids = filterTopLevelEids(eids);
  // Resolve references BEFORE removing so indices don't shift mid-loop
  const targets = topEids
    .map((eid) => findElementByEid(parsed.svgEl!, eid))
    .filter((el): el is Element => el !== null);
  for (const el of targets) {
    el.parentNode?.removeChild(el);
  }
  return serializeSvgDoc(parsed.doc);
}

export function extractElementsMarkup(code: string, eids: string[]): string[] {
  const parsed = parseSvgCode(code);
  if (!parsed.valid || !parsed.svgEl) return [];
  const topEids = filterTopLevelEids(eids);
  const result: string[] = [];
  for (const eid of topEids) {
    const el = findElementByEid(parsed.svgEl, eid);
    if (el) {
      result.push(serializeElementPretty(el, 0));
    }
  }
  return result;
}

export function insertSvgElementsInCode(
  code: string,
  markupItems: string[],
  offsetX = 0,
  offsetY = 0
): { code: string; insertedEids: string[] } {
  const parsed = parseSvgCode(code);
  if (!parsed.valid || !parsed.doc || !parsed.svgEl) {
    return { code, insertedEids: [] };
  }

  const insertedEls: Element[] = [];
  const parser = new DOMParser();

  for (const rawItem of markupItems) {
    const trimmed = rawItem.trim();
    if (!trimmed) continue;

    // If pasted item is a full <svg>...</svg>, unwrap its renderable children & merge defs
    if (/^<(?:<\?xml[\s\S]*\?>\s*)?<svg\b/i.test(trimmed) || /<svg\b/i.test(trimmed)) {
      let subDoc = parser.parseFromString(trimmed, 'image/svg+xml');
      if (
        !subDoc.querySelector('parsererror') &&
        subDoc.documentElement &&
        getTagName(subDoc.documentElement).toLowerCase() === 'svg' &&
        subDoc.documentElement.namespaceURI !== SVG_NS
      ) {
        const nsSubDoc = parser.parseFromString(ensureSvgXmlns(trimmed), 'image/svg+xml');
        if (!nsSubDoc.querySelector('parsererror')) {
          subDoc = nsSubDoc;
        }
      }
      if (
        !subDoc.querySelector('parsererror') &&
        subDoc.documentElement &&
        getTagName(subDoc.documentElement).toLowerCase() === 'svg'
      ) {
        const subChildren = Array.from(subDoc.documentElement.children);
        for (const child of subChildren) {
          const imported = parsed.doc.importNode(child, true) as Element;
          if (!isNonRenderableTag(getTagName(imported))) {
            if (offsetX !== 0 || offsetY !== 0) {
              translateElement(imported, offsetX, offsetY);
            }
            parsed.svgEl.appendChild(imported);
            insertedEls.push(imported);
          } else {
            parsed.svgEl.appendChild(imported);
          }
        }
        continue;
      }
    }

    const wrapped = `<svg xmlns="${SVG_NS}">${trimmed}</svg>`;
    const fragDoc = parser.parseFromString(wrapped, 'image/svg+xml');
    if (!fragDoc.querySelector('parsererror')) {
      const fragChildren = Array.from(fragDoc.documentElement.children);
      for (const child of fragChildren) {
        const imported = parsed.doc.importNode(child, true) as Element;
        if (
          (offsetX !== 0 || offsetY !== 0) &&
          !isNonRenderableTag(getTagName(imported))
        ) {
          translateElement(imported, offsetX, offsetY);
        }
        parsed.svgEl.appendChild(imported);
        if (!isNonRenderableTag(getTagName(imported))) {
          insertedEls.push(imported);
        }
      }
    }
  }

  const insertedEids = insertedEls
    .map((el) => getEidForElement(parsed.svgEl!, el))
    .filter((eid): eid is string => eid !== null);

  return {
    code: serializeSvgDoc(parsed.doc),
    insertedEids,
  };
}

export function reorderElementsInCode(
  code: string,
  eids: string[],
  action: 'forward' | 'backward' | 'front' | 'back'
): { code: string; newEids: string[] } {
  const parsed = parseSvgCode(code);
  if (!parsed.valid || !parsed.doc || !parsed.svgEl) return { code, newEids: eids };

  const topEids = filterTopLevelEids(eids);
  const targets = topEids
    .map((eid) => findElementByEid(parsed.svgEl!, eid))
    .filter((el): el is Element => el !== null);

  if (targets.length === 0) return { code, newEids: eids };

  if (action === 'front') {
    for (const el of targets) {
      el.parentElement?.appendChild(el);
    }
  } else if (action === 'back') {
    for (const el of [...targets].reverse()) {
      const parent = el.parentElement;
      if (parent) {
        // Insert after <defs> if present at index 0
        const firstNonDef = Array.from(parent.children).find(
          (c) => getTagName(c).toLowerCase() !== 'defs'
        );
        if (firstNonDef && firstNonDef !== el) {
          parent.insertBefore(el, firstNonDef);
        } else if (!firstNonDef) {
          parent.insertBefore(el, parent.firstElementChild);
        }
      }
    }
  } else if (action === 'forward') {
    for (const el of [...targets].reverse()) {
      const parent = el.parentElement;
      const next = el.nextElementSibling;
      if (parent && next) {
        parent.insertBefore(next, el);
      }
    }
  } else if (action === 'backward') {
    for (const el of targets) {
      const parent = el.parentElement;
      const prev = el.previousElementSibling;
      if (parent && prev && getTagName(prev).toLowerCase() !== 'defs') {
        parent.insertBefore(el, prev);
      }
    }
  }

  const newEids = targets
    .map((el) => getEidForElement(parsed.svgEl!, el))
    .filter((eid): eid is string => eid !== null);

  return { code: serializeSvgDoc(parsed.doc), newEids };
}

export function groupElementsInCode(
  code: string,
  eids: string[]
): { code: string; newEid: string | null } {
  const parsed = parseSvgCode(code);
  if (!parsed.valid || !parsed.doc || !parsed.svgEl) return { code, newEid: null };

  const topEids = filterTopLevelEids(eids);
  const targets = topEids
    .map((eid) => findElementByEid(parsed.svgEl!, eid))
    .filter((el): el is Element => el !== null);

  if (targets.length < 2) return { code, newEid: topEids[0] || null };

  const first = targets[0];
  const parent = first.parentElement || parsed.svgEl;
  const g = parsed.doc.createElementNS(SVG_NS, 'g');
  parent.insertBefore(g, first);
  for (const el of targets) {
    g.appendChild(el);
  }
  const newEid = getEidForElement(parsed.svgEl, g);
  return { code: serializeSvgDoc(parsed.doc), newEid };
}

export function ungroupElementInCode(
  code: string,
  eid: string
): { code: string; newEids: string[] } {
  const parsed = parseSvgCode(code);
  if (!parsed.valid || !parsed.doc || !parsed.svgEl) return { code, newEids: [eid] };

  const groupEl = findElementByEid(parsed.svgEl, eid);
  if (!groupEl || getTagName(groupEl).toLowerCase() !== 'g') {
    return { code, newEids: [eid] };
  }

  const parent = groupEl.parentElement || parsed.svgEl;
  const groupTransform = groupEl.getAttribute('transform') || '';
  const children = Array.from(groupEl.children);

  for (const child of children) {
    if (groupTransform) {
      const childTransform = child.getAttribute('transform') || '';
      child.setAttribute('transform', `${groupTransform} ${childTransform}`.trim());
    }
    parent.insertBefore(child, groupEl);
  }
  parent.removeChild(groupEl);

  const newEids = children
    .map((c) => getEidForElement(parsed.svgEl!, c))
    .filter((id): id is string => id !== null);

  return { code: serializeSvgDoc(parsed.doc), newEids };
}

export function alignElementsInCode(
  code: string,
  eids: string[],
  alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom',
  boxes: Record<string, SvgUserBox>
): string {
  const parsed = parseSvgCode(code);
  if (!parsed.valid || !parsed.doc || !parsed.svgEl) return code;

  const topEids = filterTopLevelEids(eids).filter((id) => boxes[id]);
  if (topEids.length < 2) return code;

  const allBoxes = topEids.map((id) => boxes[id]);
  const minX = Math.min(...allBoxes.map((b) => b.x));
  const maxX = Math.max(...allBoxes.map((b) => b.x + b.width));
  const minY = Math.min(...allBoxes.map((b) => b.y));
  const maxY = Math.max(...allBoxes.map((b) => b.y + b.height));
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  for (const eid of topEids) {
    const el = findElementByEid(parsed.svgEl, eid);
    const box = boxes[eid];
    if (!el || !box) continue;
    let dx = 0;
    let dy = 0;
    if (alignment === 'left') dx = minX - box.x;
    if (alignment === 'center') dx = midX - (box.x + box.width / 2);
    if (alignment === 'right') dx = maxX - (box.x + box.width);
    if (alignment === 'top') dy = minY - box.y;
    if (alignment === 'middle') dy = midY - (box.y + box.height / 2);
    if (alignment === 'bottom') dy = maxY - (box.y + box.height);
    translateElement(el, dx, dy);
  }

  return serializeSvgDoc(parsed.doc);
}

export function updateSvgRootAttributes(
  code: string,
  updates: { width?: string; height?: string; viewBox?: string }
): string {
  const parsed = parseSvgCode(code);
  if (!parsed.valid || !parsed.doc || !parsed.svgEl) return code;

  if (updates.width !== undefined) {
    if (updates.width.trim()) parsed.svgEl.setAttribute('width', updates.width.trim());
    else parsed.svgEl.removeAttribute('width');
  }
  if (updates.height !== undefined) {
    if (updates.height.trim()) parsed.svgEl.setAttribute('height', updates.height.trim());
    else parsed.svgEl.removeAttribute('height');
  }
  if (updates.viewBox !== undefined && updates.viewBox.trim()) {
    parsed.svgEl.setAttribute('viewBox', updates.viewBox.trim());
  }

  return serializeSvgDoc(parsed.doc);
}

export function cloneAndTagSvgForPreview(svgEl: SVGSVGElement): SVGSVGElement {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;

  // Strip inline event handlers on the root <svg> itself
  for (const attr of Array.from(clone.attributes)) {
    if (attr.name.toLowerCase().startsWith('on')) {
      clone.removeAttribute(attr.name);
    }
  }

  // Sanitize any <script> tags
  const scripts = clone.querySelectorAll('script');
  scripts.forEach((s) => s.remove());

  // Scope <style> tags inside the pasted SVG so rules like `path { fill: ... }`
  // or `svg { ... }` never leak out onto the editor UI or toolbar icons
  const styles = clone.querySelectorAll('style');
  styles.forEach((styleEl) => {
    const css = styleEl.textContent || '';
    if (css.trim()) {
      styleEl.textContent = `.svg-preview-scope { ${css} }`;
    }
  });

  function tagChildren(parent: Element, prefix: string) {
    for (let i = 0; i < parent.children.length; i++) {
      const child = parent.children[i];
      // Strip inline event attributes
      for (const attr of Array.from(child.attributes)) {
        if (attr.name.toLowerCase().startsWith('on')) {
          child.removeAttribute(attr.name);
        }
      }
      const eid = prefix ? `${prefix}.${i}` : `${i}`;
      child.setAttribute('data-eid', eid);
      tagChildren(child, eid);
    }
  }

  tagChildren(clone, '');
  return clone;
}

export function pointsToSmoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    return `M ${fmtNum(points[0].x)} ${fmtNum(points[0].y)} L ${fmtNum(points[0].x + 0.1)} ${fmtNum(points[0].y)}`;
  }
  if (points.length === 2) {
    return `M ${fmtNum(points[0].x)} ${fmtNum(points[0].y)} L ${fmtNum(points[1].x)} ${fmtNum(points[1].y)}`;
  }

  // Distance filter so dense mouse events produce crisp, lightweight SVG path code
  const filtered: Array<{ x: number; y: number }> = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = filtered[filtered.length - 1];
    const dist = Math.hypot(points[i].x - prev.x, points[i].y - prev.y);
    if (dist >= 3.5) {
      filtered.push(points[i]);
    }
  }
  filtered.push(points[points.length - 1]);

  if (filtered.length < 3) {
    return filtered.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${fmtNum(p.x)} ${fmtNum(p.y)}`).join(' ');
  }

  let d = `M ${fmtNum(filtered[0].x)} ${fmtNum(filtered[0].y)}`;
  for (let i = 1; i < filtered.length - 1; i++) {
    const midX = (filtered[i].x + filtered[i + 1].x) / 2;
    const midY = (filtered[i].y + filtered[i + 1].y) / 2;
    d += ` Q ${fmtNum(filtered[i].x)} ${fmtNum(filtered[i].y)} ${fmtNum(midX)} ${fmtNum(midY)}`;
  }
  const last = filtered[filtered.length - 1];
  d += ` L ${fmtNum(last.x)} ${fmtNum(last.y)}`;
  return d;
}

export interface ElementLineRange {
  startLine: number;
  endLine: number;
}

export function getElementLineRanges(code: string): Record<string, ElementLineRange> {
  const ranges: Record<string, ElementLineRange> = {};
  if (!code) return ranges;

  const lineStarts: number[] = [0];
  for (let i = 0; i < code.length; i++) {
    if (code.charCodeAt(i) === 10) {
      lineStarts.push(i + 1);
    }
  }

  const charToLine = (idx: number): number => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (lineStarts[mid] <= idx) {
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return Math.max(0, hi);
  };

  interface StackFrame {
    eid: string;
    tag: string;
    startLine: number;
    childCount: number;
  }

  const stack: StackFrame[] = [];
  let i = 0;
  const len = code.length;

  while (i < len) {
    const lt = code.indexOf('<', i);
    if (lt === -1) break;

    if (code.startsWith('<!--', lt)) {
      const endComment = code.indexOf('-->', lt + 4);
      i = endComment === -1 ? len : endComment + 3;
      continue;
    }

    if (code.startsWith('<?', lt)) {
      const endPi = code.indexOf('?>', lt + 2);
      i = endPi === -1 ? len : endPi + 2;
      continue;
    }

    if (code.startsWith('<![CDATA[', lt)) {
      const endCdata = code.indexOf(']]>', lt + 9);
      i = endCdata === -1 ? len : endCdata + 3;
      continue;
    }

    if (code.startsWith('<!', lt)) {
      const endDecl = code.indexOf('>', lt + 2);
      i = endDecl === -1 ? len : endDecl + 1;
      continue;
    }

    // Closing tag </tag>
    if (code[lt + 1] === '/') {
      const gt = code.indexOf('>', lt + 2);
      if (gt === -1) break;
      const closeTag = code.slice(lt + 2, gt).trim().toLowerCase();
      for (let s = stack.length - 1; s >= 0; s--) {
        if (stack[s].tag === closeTag || s === stack.length - 1) {
          const popped = stack.splice(s, stack.length - s)[0];
          if (popped && popped.eid !== '') {
            ranges[popped.eid] = {
              startLine: popped.startLine,
              endLine: charToLine(gt),
            };
          }
          break;
        }
      }
      i = gt + 1;
      continue;
    }

    // Opening or self-closing tag: scan to '>' respecting quoted attributes
    let cursor = lt + 1;
    let quote: string | null = null;
    while (cursor < len) {
      const ch = code[cursor];
      if (quote) {
        if (ch === quote) quote = null;
      } else {
        if (ch === '"' || ch === "'") {
          quote = ch;
        } else if (ch === '>') {
          break;
        }
      }
      cursor++;
    }

    if (cursor >= len) break;

    const tagContent = code.slice(lt + 1, cursor).trim();
    const selfClosing = tagContent.endsWith('/');
    const tagNameMatch = tagContent.match(/^([^\s/>]+)/);
    const tagName = tagNameMatch ? tagNameMatch[1].toLowerCase() : '';

    if (tagName) {
      if (stack.length === 0 && (tagName === 'svg' || tagName.endsWith(':svg'))) {
        if (!selfClosing) {
          stack.push({
            eid: '',
            tag: tagName,
            startLine: charToLine(lt),
            childCount: 0,
          });
        }
      } else if (stack.length > 0) {
        const parent = stack[stack.length - 1];
        const eid = parent.eid ? `${parent.eid}.${parent.childCount}` : `${parent.childCount}`;
        parent.childCount += 1;
        const startLine = charToLine(lt);
        if (selfClosing) {
          ranges[eid] = {
            startLine,
            endLine: charToLine(cursor),
          };
        } else {
          stack.push({
            eid,
            tag: tagName,
            startLine,
            childCount: 0,
          });
        }
      }
    }

    i = cursor + 1;
  }

  return ranges;
}

