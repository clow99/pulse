# Pulse Orbit identity

Selected direction: Orbit, with open circular arcs and a small signal point.

- Primary blue: `#79C8F5`
- Signal point: `#B6E3FF`
- Wordmark: `#EDF3FC`
- App-icon background: `#0B1017`

The canonical artwork is `public/logo.svg` (226 x 72) and `public/brand/pulse-mark.svg` (72 x 72). Both use paths only; the wordmark is outlined and does not require a font download. Keep the aspect ratio and clear space intact. Use the mark for square icon placements and the full wordmark in headers.

The shared `PulseLogo` component provides intrinsic dimensions and accessible alt text. PNG compatibility assets, the multi-size ICO, and app icons are generated from the SVG masters with:

```sh
node scripts/generate-brand-assets.mjs
```

## Concept generation

The concepts were created with the built-in image_gen tool. The selected concept was rebuilt as clean vector geometry for production, preserving its open orbital arcs, signal point, and white wordmark.

Selected generation prompt:

Use case: logo-brand. Design one polished logo concept for 'Pulse', a privacy-first web analytics SaaS with a calm modern dark-slate interface. Direction: ORBIT. A distinctive abstract circular emblem constructed from three bold offset open arcs with carefully staggered gaps. The arcs should feel like a signal orbit or an expanding analytical ripple, with a small bright point sitting in one gap. The geometry must be harmonious and simple, clearly different from a waveform or letter monogram; avoid a globe or generic Wi-Fi icon. Pair the emblem on its right with the exact word 'Pulse' in a refined clean geometric sans-serif, white (#EDF3FC), medium weight, restrained elegant spacing, normal capitalization. Single horizontal icon-and-wordmark lockup centered on a flat matte deep slate (#0B1017) background. Soft sky blue #79C8F5 is the main emblem color, with a slightly paler blue #B6E3FF permitted on the small point. Flat vector-like graphic design, crisp precise curves, strong memorable silhouette, readable at small sizes. Use a wide horizontal canvas with generous negative space. No lowercase-p symbol, no mountains, no mascot, no tagline, no extra text, no gradient, no shadow, no glow, no 3D, no stationery, no presentation grid. Output only this one complete logo concept.
