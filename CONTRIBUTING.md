# Contributing to Fractal Garden

There are three ways to help: improve an existing fractal, add an L-system preset, or add a new fractal. Setup is in the [README](README.md#run-it-locally).

Before you open a pull request, run `pnpm lint` and `pnpm build`. A pre-commit hook runs Biome on the files you stage.

## Improve an existing fractal

Issues labelled [improve-existing-fractals](https://github.com/trebeljahr/fractal-garden/issues?q=is%3Aissue+is%3Aopen+label%3Aimprove-existing-fractals) list known problems: mobile support, speed and the articles.

Each article is a Markdown file in [`fractal-descriptions/`](fractal-descriptions/). You can edit one directly in the GitHub web editor. Please feel free to clarify points, add more details, or more connections or to simply fix typos where you see fit!

The articles follow a writing and sourcing standard: plain spoken English for a reader with no maths background, one step at a time, and a numbered source for each claim that needs one. The full standard is in [`AGENTS.md`](AGENTS.md) under "Fractal explanations". Run `pnpm check:links` after you add outside links.

## Add an L-system preset

The [L-System Explorer](https://fractal.garden/l-system/explorer) lets you write your own L-system rules in 2D or 3D. Its **Submit as preset** button opens GitHub with the preset file filled in. Committing it there opens a pull request that adds your system to the preset list. See [`lsystem-presets/README.md`](lsystem-presets/README.md) for the file format.

## Add a new fractal

Check the issues labelled [new-fractal](https://github.com/trebeljahr/fractal-garden/issues?q=is%3Aissue+is%3Aopen+label%3Anew-fractal) first. If your fractal has no issue yet, open one with the **New Fractal** issue template.

A new fractal, here called `your-fractal`, needs these files:

- `pages/your-fractal.tsx`: the explorer page. L-system fractals go in `pages/l-system/`.
- `fractal-descriptions/your-fractal.md`: the article.
- `public/assets/fractal-images/your-fractal.jpg`: the home-grid picture. Use a screenshot of the rendered canvas, and pick a good default colour for the fractal.

Then register the page in these places:

- `utils/fractalTiles.ts`: the home grid and the related-fractal tiles.
- `components/Navbar.tsx`: the previous and next links.
- `utils/pageSeo.ts`: the page title, description and link-preview image.
- `utils/relatedFractals.ts` (optional): the related fractals shown under the article.

The sitemap picks up new pages by itself. Copy an existing page of the same kind as a starting point. For example, `pages/t-square-fractal.tsx` is a recursive 2D fractal, and `pages/l-system/dragon-curve.tsx` is an L-system.

If you need help with anything, let me know.

Happy "growing"! 🌱
