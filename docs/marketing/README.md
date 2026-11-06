# Marketing assets

Screenshots and GitHub social preview cards for Fractal Garden. Every image is a capture of the real site in headless Chromium (ANGLE Metal GPU), taken from a static build of commit `6e98a25` on 2026-11-06. Nothing is mocked up or generated.

[`manifest.json`](manifest.json) lists every file with its purpose, size, SHA-256, source page and capture date.

## Rebuild

```bash
pnpm build                      # static site in out/
pnpm marketing:screenshots      # serves out/ on a free port, writes screenshots/
pnpm marketing:social-preview   # renders social-preview/*.png from template.html
```

Both scripts need Playwright, which is not a project dependency: install it with `npm i -g playwright`. Set `CHROMIUM_PATH` to use a Chromium build other than Playwright's default. `--only=name1,name2` recaptures single shots. `--base-url=<url>` captures a running site instead of `out/`.

Scripts: [`scripts/marketing/capture-screenshots.mjs`](../../scripts/marketing/capture-screenshots.mjs) and [`scripts/marketing/render-social-preview.mjs`](../../scripts/marketing/render-social-preview.mjs).

## Screenshots

Desktop shots are 1600×1000 CSS pixels at device scale 2, so the files are 3200×2000. WebP, quality 80 for interface shots and 74 for the gallery renders.

| File | What it shows | Used in |
| --- | --- | --- |
| `screenshots/mandelbrot-double-spiral.webp` | Mandelbrot explorer with its controls, Places to explore → Double spiral | README hero |
| `screenshots/home.webp` | Home page: title and the first row of the grid | Marketing set |
| `screenshots/mandelbrot-article.webp` | Mandelbrot article with its first interactive demo | README |
| `screenshots/l-system-explorer.webp` | L-System Explorer, default preset | README |
| `screenshots/gallery-mandelbrot-seahorse-valley.webp` | Mandelbrot set, Seahorse Valley | README gallery, card A |
| `screenshots/gallery-julia-sea-spiral.webp` | Julia set, Sea spiral | README gallery, card C |
| `screenshots/gallery-burning-ship-little-ship.webp` | Burning Ship, Little ship | README gallery, card C |
| `screenshots/gallery-mandelbulb.webp` | Mandelbulb, default view | README gallery, card C |
| `screenshots/gallery-dragon-curve.webp` | Dragon curve L-system | README gallery |
| `screenshots/gallery-barnsley-fern.webp` | Barnsley fern | README gallery, card C |
| `screenshots/mobile-mandelbrot.webp` | Mandelbrot explorer at phone width (390×844 at scale 3, 1170×2532) | Marketing set |

The gallery shots hide the interface with each page's own **Hide UI** button. That button leaves a small **Show UI** button in the corner, which the script makes transparent for the capture.

## Social preview cards

1280×640 PNG, each under 1 MB, key content inside a 64 px margin. Built from [`social-preview/template.html`](social-preview/template.html) with the site's own Montserrat and Merriweather files and its colours (`#091115`, `#f5f1d1`, `#f5cc75`).

| File | Composition |
| --- | --- |
| `social-preview/social-preview-a.png` | A, screenshot-led: Seahorse Valley full bleed, title and one line on the left |
| `social-preview/social-preview-b.png` | B, brand-led: the home page heading over six home-grid thumbnails |
| `social-preview/social-preview-c.png` | C, split: title on the left, a 2×2 mosaic of gallery shots on the right |

None of them is uploaded to GitHub yet. The repository settings take one card under **Social preview**.
