# VektorStudio — SVG Editor & Paint

**VektorStudio** ist ein moderner, browserbasierter SVG-Editor und Vektor-Paint-Arbeitsplatz mit direkter Live-Vorschau und bi-direktionaler Code-Synchronisation.

## Funktionen

- **Live-Code-Editor:** SVG-Quellcode direkt einfügen, formatieren, kopieren oder live bearbeiten – inklusive Zeilennummern und automatischer Markierung der ausgewählten Elemente im Code.
- **Paint- & Vektor-Werkzeuge:** Freihand-Pinsel (mit automatischer Pfadglättung), Rechteck, Kreis, Ellipse, Linie, Polygon und Text direkt auf der Zeichenfläche einfügen.
- **Hover-Markierung & Mehrfachauswahl:** Elemente per Mouse-Over hervorheben, einzeln oder mit `Umschalt + Klick` bzw. Rahmenauswahl markieren.
- **Bearbeiten & Anordnen:** Elemente flüssig verschieben, über 8 Anfasser skalieren, drehen, gruppieren (`<g>`), in der Ebenen-Reihenfolge verschieben sowie Füllung, Kontur, Deckkraft und Attribute direkt im Inspektor anpassen.
- **Ausschneiden, Kopieren & Einfügen:** Volle Unterstützung für `Strg/Cmd + X / C / V / D`, Rückgängig/Wiederholen (`Strg/Cmd + Z`) und extern kopierte SVG-Elemente.
- **Export als SVG & HTML:** Sauberen `.svg`-Code oder eine fertige, zentrierte `.html`-Seite (Hell, Dunkel oder Transparent) direkt kopieren oder herunterladen.

## Lokal starten

```bash
npm install
npm run dev
```

Für den Produktions-Build (inklusive eigenständiger Offline-HTML-Datei unter `dist/VektorStudio-Offline.html`):

```bash
npm run build
```
