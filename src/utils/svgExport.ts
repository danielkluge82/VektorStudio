import { HtmlExportOptions } from '../types/svg';
import { formatSvgCode } from './svgDom';

export function buildCleanSvgExport(svgCode: string): string {
  const formatted = formatSvgCode(svgCode);
  return formatted;
}

export function buildHtmlDocument(svgCode: string, options: HtmlExportOptions): string {
  const cleanSvg = buildCleanSvgExport(svgCode);
  const safeTitle = options.title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const bgColor =
    options.background === 'dark'
      ? '#0f172a'
      : options.background === 'light'
      ? '#f8fafc'
      : 'transparent';

  const svgStyle = options.responsive
    ? 'max-width: 100%; height: auto; display: block;'
    : 'display: block;';

  const styledSvg = cleanSvg.replace(
    /<svg\b([^>]*)>/i,
    (_match, attrs: string) => {
      if (/\bstyle=/.test(attrs)) {
        return `<svg${attrs}>`;
      }
      return `<svg${attrs} style="${svgStyle}">`;
    }
  );

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle || 'SVG Export'}</title>
  <style>
${options.includeReset ? `    *, *::before, *::after { box-sizing: border-box; }\n` : ''}    html, body {
      margin: 0;
      padding: 0;
      min-height: 100vh;
      background: ${bgColor};
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .svg-container {
      padding: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
    }
  </style>
</head>
<body>
  <main class="svg-container">
${styledSvg
  .split('\n')
  .map((line) => `    ${line}`)
  .join('\n')}
  </main>
</body>
</html>
`;
}

export function downloadTextFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
