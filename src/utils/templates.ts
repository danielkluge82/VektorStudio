export interface SvgTemplate {
  id: string;
  name: string;
  description: string;
  code: string;
}

export const SVG_TEMPLATES: SvgTemplate[] = [
  {
    id: 'studio-scene',
    name: 'Studio Komposition',
    description: 'Mehrschichtige Vektorszene zum Testen von Hover, Verschieben & Export',
    code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 560" width="800" height="560">
  <defs>
    <linearGradient id="sky-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EFF6FF" />
      <stop offset="100%" stop-color="#DBEAFE" />
    </linearGradient>
    <linearGradient id="accent-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6" />
      <stop offset="100%" stop-color="#1D4ED8" />
    </linearGradient>
  </defs>
  <rect id="hintergrund" x="40" y="40" width="720" height="480" rx="24" fill="url(#sky-grad)" stroke="#BFDBFE" stroke-width="2" />
  <circle id="sonne" cx="620" cy="145" r="54" fill="#F59E0B" />
  <circle id="sonne-ring" cx="620" cy="145" r="74" fill="none" stroke="#FBBF24" stroke-width="3" stroke-dasharray="8 8" />
  <path id="huegel-hinten" d="M 40 390 Q 220 260 420 355 T 760 320 L 760 496 Q 760 520 736 520 L 64 520 Q 40 520 40 496 Z" fill="#93C5FD" />
  <path id="huegel-vorne" d="M 40 435 Q 260 340 490 425 T 760 390 L 760 496 Q 760 520 736 520 L 64 520 Q 40 520 40 496 Z" fill="url(#accent-grad)" />
  <g id="architektur">
    <rect id="turm" x="175" y="185" width="130" height="210" rx="12" fill="#FFFFFF" stroke="#1E3A8A" stroke-width="3" />
    <rect id="fenster-1" x="203" y="218" width="32" height="32" rx="6" fill="#DBEAFE" stroke="#2563EB" stroke-width="2" />
    <rect id="fenster-2" x="245" y="218" width="32" height="32" rx="6" fill="#DBEAFE" stroke="#2563EB" stroke-width="2" />
    <rect id="tuer" x="220" y="325" width="40" height="70" rx="8" fill="#1E40AF" />
    <polygon id="dach" points="160,188 240,120 320,188" fill="#EF4444" stroke="#991B1B" stroke-width="3" stroke-linejoin="round" />
  </g>
  <line id="horizont-linie" x1="360" y1="220" x2="500" y2="220" stroke="#1E40AF" stroke-width="3" stroke-linecap="round" />
  <text id="titel-text" x="360" y="200" font-family="Plus Jakarta Sans, sans-serif" font-size="28" font-weight="700" fill="#1E293B">VektorStudio</text>
</svg>`,
  },
  {
    id: 'blank',
    name: 'Leere Zeichenfläche',
    description: 'Saubere 800×600 Zeichenfläche für freie Zeichnungen',
    code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect x="0" y="0" width="800" height="600" fill="#FFFFFF" />
</svg>`,
  },
  {
    id: 'geometric-badge',
    name: 'Geometrisches Logo',
    description: 'Präzise Formen für Logo-Design und Icon-Konstruktion',
    code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect x="32" y="32" width="448" height="448" rx="96" fill="#0F172A" />
  <circle cx="256" cy="256" r="144" fill="none" stroke="#38BDF8" stroke-width="24" />
  <polygon points="256,128 368,320 144,320" fill="#2563EB" opacity="0.9" />
  <circle cx="256" cy="256" r="36" fill="#F8FAFC" />
</svg>`,
  },
  {
    id: 'ui-diagram',
    name: 'Flussdiagramm-Bausteine',
    description: 'Karten, Verbinder und Knoten für technische Diagramme',
    code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <rect x="80" y="180" width="170" height="90" rx="12" fill="#FFFFFF" stroke="#0F172A" stroke-width="2.5" />
  <text x="165" y="232" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="18" font-weight="600" fill="#0F172A">Eingabe</text>
  <line x1="250" y1="225" x2="315" y2="225" stroke="#2563EB" stroke-width="3" stroke-linecap="round" />
  <polygon points="310,217 326,225 310,233" fill="#2563EB" />
  <rect x="326" y="180" width="170" height="90" rx="12" fill="#EFF6FF" stroke="#2563EB" stroke-width="2.5" />
  <text x="411" y="232" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="18" font-weight="600" fill="#1D4ED8">Verarbeitung</text>
  <line x1="496" y1="225" x2="561" y2="225" stroke="#2563EB" stroke-width="3" stroke-linecap="round" />
  <polygon points="556,217 572,225 556,233" fill="#2563EB" />
  <rect x="572" y="180" width="170" height="90" rx="12" fill="#0F172A" />
  <text x="657" y="232" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="18" font-weight="600" fill="#FFFFFF">Ausgabe</text>
</svg>`,
  },
];
