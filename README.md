# VektorStudio — SVG Editor & Paint

[Deutsch](#deutsch) | [English](#english)

---

<a id="deutsch"></a>

## Deutsch

**VektorStudio** ist ein moderner, browserbasierter SVG-Editor und Vektor-Paint-Arbeitsplatz mit direkter Live-Vorschau, bi-direktionaler Code-Synchronisation und integriertem Leuchttisch zum Abpauschen – komplett lokal im Browser und ohne KI-Ballast.

### Funktionen

- **Live-Code-Editor:** SVG-Quellcode direkt einfügen, formatieren, kopieren, mit **Leeren** auf `0` zurücksetzen oder live bearbeiten – inklusive Zeilennummern und automatischer Hervorhebung der ausgewählten Elemente im Code.
- **Abpauschen (Leuchttisch-Modus):** Fotos, Skizzen oder Screenshots (PNG, JPG, WebP, GIF, BMP) per Dateiauswahl, Drag & Drop oder direkt aus der Zwischenablage (`Strg/Cmd + V`) als durchscheinende Pausvorlage *unter* die Zeichenfläche legen. Mit Reglern für Deckkraft, S/W-Kontrast, Skalierung, Versatz, Ein-/Ausblenden und Fixieren zum komfortablen Nachzeichnen. Die Vorlage bleibt strikt vom SVG-Code getrennt und wird nicht mit exportiert.
- **Paint- & Vektor-Werkzeuge:** Freihand-Pinsel (mit automatischer Pfadglättung), Rechteck, Kreis, Ellipse, Linie, Polygon und Text direkt auf der Zeichenfläche einfügen (inkl. optionalem Raster-Einrasten).
- **Hover-Markierung & Mehrfachauswahl:** Elemente per Mouse-Over auf der Zeichenfläche, in der Ebenen-Liste und im Quellcode synchron hervorheben sowie einzeln, mit `Umschalt + Klick` oder per Rahmenauswahl markieren.
- **Bearbeiten & Anordnen:** Elemente flüssig verschieben, über 8 Anfasser skalieren, drehen, gruppieren (`<g>`), in der Ebenen-Reihenfolge verschieben sowie Füllung, Kontur, Deckkraft und Attribute direkt im Inspektor anpassen.
- **Fehlertoleranter SVG-Import:** Automatische Korrektur fehlender oder fehlerhafter `xmlns`-Namespaces sowie volle Unterstützung komplexer `<defs>`- und `<filter>`-Effekte (z. B. Neon-Glow).
- **Ausschneiden, Kopieren & Einfügen:** Volle Unterstützung für `Strg/Cmd + X / C / V / D`, Rückgängig/Wiederholen (`Strg/Cmd + Z`) und extern kopierte SVG-Elemente.
- **Export als SVG & HTML:** Sauberen `.svg`-Code oder eine fertige, zentrierte `.html`-Seite (Hell, Dunkel oder Transparent) direkt kopieren oder herunterladen.

### Lokal starten

```bash
npm install
npm run dev
```

Für den Produktions-Build (inklusive eigenständiger Offline-HTML-Datei unter `dist/VektorStudio-Offline.html`):

```bash
npm run build
```

---

<a id="english"></a>

## English

**VektorStudio** is a fast, browser-based SVG editor and vector paint studio featuring live preview, bi-directional code synchronization, and a built-in lightbox tracing mode — running 100% locally in your browser without any AI bloat.

### Features

- **Live Code Editor:** Paste, format, copy, reset with **Clear (Leeren)** to start from scratch, or edit SVG source code live — complete with line numbers and automatic code highlighting synchronized with the selected or hovered elements.
- **Tracing Mode (Lightbox Underlay):** Load photos, sketches, or screenshots (PNG, JPG, WebP, GIF, BMP) via file picker, drag & drop, or directly from your clipboard (`Ctrl/Cmd + V`) as a translucent tracing reference *underneath* the SVG canvas. Includes controls for opacity, grayscale contrast, scale, X/Y offset, quick visibility toggle, and lock/unlock positioning. The reference image stays completely separate from the SVG code and is never exported.
- **Paint & Vector Tools:** Draw freehand brush strokes (with automatic Bezier path smoothing), rectangles, circles, ellipses, lines, polygons, and text directly on the canvas with optional grid snapping.
- **Hover Highlight & Multi-Selection:** Synchronized hover and selection highlights across canvas, layers list, and source lines, plus `Shift + Click` and marquee box selection.
- **Edit & Arrange:** Smoothly move elements, resize via 8 handles, rotate, group/ungroup (`<g>`), reorder layers, and adjust fill, stroke, opacity, and geometry attributes directly in the inspector.
- **Resilient SVG Parsing:** Automatically normalizes missing or malformed `xmlns` namespaces and renders complex `<defs>` and `<filter>` effects (such as glow filters) cleanly.
- **Clipboard & History:** Full support for cut, copy, paste, duplicate (`Ctrl/Cmd + X / C / V / D`), multi-step undo/redo (`Ctrl/Cmd + Z`), and pasting external SVG snippets.
- **SVG & HTML Export:** Copy or download clean `.svg` files or ready-to-use centered `.html` pages (Light, Dark, or Transparent background).

### Run Locally

```bash
npm install
npm run dev
```

For the production build (including a standalone single-file offline HTML build at `dist/VektorStudio-Offline.html`):

```bash
npm run build
```

