# Marketing assets

Screenshots and GitHub social preview cards for Fractal Garden. Every screenshot is a capture of the real site in headless Chromium (ANGLE Metal GPU), taken from a static build of commit `6e98a25` on 2026-11-06. The cards are the site's own link preview design, composed from those captures and the site's fractal thumbnails. Nothing is mocked up or generated.

[`manifest.json`](manifest.json) lists every file with its purpose, size, SHA-256, source page and capture date.

## Rebuild

```bash
pnpm build                      # static site in out/
pnpm marketing:screenshots      # serves out/ on a free port, writes screenshots/
pnpm marketing:social-preview   # renders social-preview/*.png in the site's link preview design
```

The screenshot script needs Playwright, which is not a project dependency: install it with `npm i -g playwright`. Set `CHROMIUM_PATH` to use a Chromium build other than Playwright's default. `--only=name1,name2` recaptures single shots. `--base-url=<url>` captures a running site instead of `out/`. The social preview script needs only sharp.

Scripts: [`scripts/marketing/capture-screenshots.mjs`](../../scripts/marketing/capture-screenshots.mjs), [`scripts/marketing/render-social-preview.mjs`](../../scripts/marketing/render-social-preview.mjs) and [`scripts/generate-og-images.mjs`](../../scripts/generate-og-images.mjs), which holds the card design.

## Screenshots

Desktop shots are 1600×1000 CSS pixels at device scale 2, so the files are 3200×2000. WebP, quality 80 for interface shots and 74 for the gallery renders.

| File | What it shows | Used in |
| --- | --- | --- |
| `screenshots/mandelbrot-double-spiral.webp` | Mandelbrot explorer with its controls, Places to explore → Double spiral | README hero |
| `screenshots/home.webp` | Home page: title and the first row of the grid | Marketing set |
| `screenshots/mandelbrot-article.webp` | Mandelbrot article with its first interactive demo | README |
| `screenshots/l-system-explorer.webp` | L-System Explorer, default preset | README |
| `screenshots/gallery-mandelbrot-seahorse-valley.webp` | Mandelbrot set, Seahorse Valley | README gallery, cards C and D |
| `screenshots/gallery-julia-sea-spiral.webp` | Julia set, Sea spiral | README gallery, card D |
| `screenshots/gallery-burning-ship-little-ship.webp` | Burning Ship, Little ship | README gallery, card D |
| `screenshots/gallery-mandelbulb.webp` | Mandelbulb, default view | README gallery, card D |
| `screenshots/gallery-dragon-curve.webp` | Dragon curve L-system | README gallery, card D |
| `screenshots/gallery-barnsley-fern.webp` | Barnsley fern | README gallery, card D |
| `screenshots/mobile-mandelbrot.webp` | Mandelbrot explorer at phone width (390×844 at scale 3, 1170×2532) | Marketing set |

The gallery shots hide the interface with each page's own **Hide UI** button. That button leaves a small **Show UI** button in the corner, which the script makes transparent for the capture.

## Social preview cards

1280×640 PNG, each under 1 MB (a 256-colour palette when the lossless file is larger). Each is the site's link preview, [`public/assets/og/home.jpg`](../../public/assets/og/home.jpg), at 2:1: pictures in a grid under the same vignette, the same dark rounded panel, "Fractal Garden" and "fractal.garden" in the same type and colours. The design and the four cards (`SOCIAL_PREVIEW_CARDS`) are in [`scripts/generate-og-images.mjs`](../../scripts/generate-og-images.mjs); `pnpm og:images` renders the 1200×630 card from the same code. The text sits inside the panel, well inside a 64 px margin. Rendered on 2026-11-07.

| File | Option | Pictures |
| --- | --- | --- |
| `social-preview/social-preview-a.png` | A: the home link preview at 2:1 | The home card's six thumbnails from `public/assets/fractal-images/`: Mandelbrot set, Barnsley fern, Menger sponge, Penrose tiling, Julia set, Pythagoras tree |
| `social-preview/social-preview-b.png` | B: the same design, four by two | Eight other thumbnails: Burning Ship, Barnsley tree, Jerusalem cube, twindragon, romanesco, Mandelbar set, quadratic Koch surface, dragon curve |
| `social-preview/social-preview-c.png` | C: the panel over one render, full bleed | `screenshots/gallery-mandelbrot-seahorse-valley.webp` |
| `social-preview/social-preview-d.png` | D: the home card's three by two grid with renders | The six `screenshots/gallery-*.webp` renders |

None of them is uploaded to GitHub yet. The repository settings take one card under **Social preview**. `--review=<folder>` also copies the PNGs to that folder with a `review-sheet.jpg` of all four.

## Live GitHub social preview

`social-preview/github-social-preview.jpg` is the card uploaded in Settings → Social preview on 2026-11-07. It is the existing home-grid link-preview crop from the vault press set (`ai-work-notes/projects/fractal-garden/assets/home-grid-top-crop-1200x630.webp`), center-cropped to 1280×640 with ImageMagick (`magick SRC -resize 1280x640^ -gravity center -extent 1280x640 -quality 90`); no new design.
