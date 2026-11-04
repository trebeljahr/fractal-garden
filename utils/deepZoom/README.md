# Escape-time deep zoom

`EscapeTimeFractal` uses this path for Mandelbrot, quadratic Julia sets, and Burning Ship. Other renderers retain their own navigation and numerical methods; this is not a general solution for Newton maps, ray-marched 3D fractals, or recursive geometry.

## Numeric model

- The camera stores signed BigInt fixed-point coordinates and the base-two logarithm of its half-span. Wheel, drag, pinch, and saved links never add tiny offsets to a JavaScript Number coordinate.
- Precision grows with depth, with 128 guard bits. Reference calculation runs in a dedicated worker. Returning to a wider view reduces the worker's precision without discarding the camera's retained digits.
- Unskipped GPU steps evaluate the perturbation recurrence `delta' = 2 Z delta + delta² + deltaC`. For Julia sets, the initial delta changes and `deltaC` is zero.
- Each reference component has its own float mantissa and exponent. Normal iterations use rescaled native complex arithmetic. Tiny reference components, critical steps, and widely separated deltas use the full exponent representation. This avoids the usual float/double underflow boundary.
- Mandelbrot and Burning Ship can rebase onto their critical orbit. Burning Ship uses a cancellation-safe absolute difference for folded coordinates. Julia starts with a camera-seeded orbit, then can switch to a separate critical orbit for the same constant. It never treats the camera seed as zero.
- Suspected cancellation returns an invalid alpha mask. Repair work subdivides those regions and computes new reference orbits, down to individual pixels. Final pixel references double the depth precision and bypass GPU coordinate rounding, including tangencies and folded-axis crossings. A remaining precision failure is reported instead of accepted as interior.

The derivation, rescaling exceptions, absolute differences and glitch criteria follow [mathr's deep-zoom notes](https://mathr.co.uk/blog/2021-05-14_deep_zoom_theory_and_practice.html). Perturbation uses approximate GPU arithmetic; these are practical error controls, not certified interval bounds.

Burning Ship smooth, logarithmic, and banded coloring use batched pixel repairs at half-spans of `2^-64` and wider. The initial GPU validity mask is divided into tiles of at most 32 by 32 pixels. The worker calculates only invalid pixels with the independent fixed-point recurrence, using at least twice the depth bits plus 128 guard bits. It returns each pixel's iteration, final log-magnitude, and escape flag. One texture upload and draw colors the whole tile; valid pixels are preserved. This avoids a separate reference texture and draw for every difficult pixel. Deeper views and coloring modes that need the full orbit retain reference repairs. Reference repair coordinates are measured from each tile's center before scaling, so small tiles do not cancel two full-frame offsets.

## Mandelbrot acceleration

The worker builds bivariate linear approximations (BLA) alongside the Mandelbrot reference. Each map replaces several recurrence steps with `deltaOut = A deltaIn + B deltaC`. Coefficients retain separate component exponents. The construction follows [mathr's current BLA notes](https://mathr.co.uk/web/deep-zoom.html); the older validity formula in the 2022 article is not used.

Each reference index has two candidates: the longest valid block, up to 128 iterations, and the longest distinct short block, up to 8. One RGBA header stores both radii and lengths; four following texels store their `A` and `B` coefficients. The shader tries the long block, then the short block, then an ordinary step. It never walks the CPU hierarchy on the GPU.

Leaf domains limit the omitted quadratic term. Composition propagates a nonlinear magnitude envelope, rather than assuming the affine approximation is exact. Every admitted intermediate reference magnitude is below 128 and its nonlinear delta below 1, leaving room before bailout at 256. The requested linearization budget is distributed over the maximum block length. This is not a certificate for reference rounding, GPU arithmetic, accumulated image error, or arbitrary-location correctness.

BLA is enabled only for smooth, logarithmic, and banded coloring. Distance coloring retains the unskipped derivative path. Stripe averages and orbit traps visit every iterate so their accumulated values are preserved.

Where the exponent range permits, a second reference texture region stores ordinary float components. The shader can then keep Mandelbrot deltas in native complex arithmetic. A pixel that has not finished after 128 native loop passes restarts from zero through the established componentwise exponent path, with BLA disabled for that restart. An accepted block counts as one loop pass, regardless of its skipped iteration count. This conservative fallback applies equally during movement and at rest; distance coloring and exact-pixel repairs bypass the native path.

## Interaction and cost

`createDeepZoomRenderer` accepts optional `{ pixelRatio, interactive }` settings. The live explorer opts into `interactive: true`; the default remains the direct renderer used by numeric checks and export. `pixelRatio` defaults to display DPR. Hardware texture, renderbuffer, and viewport limits can reduce the drawing buffer.

Interactive Mandelbrot uses `reuse.ts`, following [XaoS](https://en.wikipedia.org/wiki/XaoS). It keeps one image at native size. Each camera change moves the stored pixels. A second texture records, per pixel, how far its color's real position lies from the pixel center, in 16 bits per axis. Each new pixel takes the stored sample nearest its position, so colors are never resampled and repeated moves do not blur. Without that record, slow motion would round to no motion.

Each frame recalculates one share of the screen: 64 phases, each 2 × 2 blocks in an ordered pattern. Blocks match how GPUs shade pixels in groups of four, so lone pixels do not waste three neighbors. A depth mask limits the unchanged fractal shader to those blocks. `EXT_disjoint_timer_query` sizes the share from cost per phase, without waiting for results before painting. The moving target starts at 6 ms and tunes itself between 3 and 12 ms from actual frame intervals, because moving pixels costs GPU time too. The resting target is 30 ms. Without timers, as in Safari, the share grows while frames arrive on time and shrinks when one is late. Missing or distant samples get up to three more shares. A stopped camera finishes all 64 phases, then stops drawing. These are adaptive targets, not duration guarantees. A new step limit keeps the picture and recalculates it, since only the slowest pixels change. Any other parameter edit or a resize forgets the stored pixels.

A pixel shows its stored color only when pixels 4 away in each direction are filled too. Anywhere else shows a soft image, so scattered samples never read as dots. That image spans 2 views at 1/8 sampling and comes out of the same frame budget. It is replaced once the camera has used 70% of its span, by zooming out or panning, or once zooming in has spread its pixels 4 times apart. Faster zooming than that can still outrun it and show dark.

`zoomGlide.ts` turns wheel events into a distance that the camera covers in even per-frame steps, instead of jumping on each event. Its render waits 4 ms after the animation frame: updating the camera inside the frame, or with `setTimeout(0)` from it, measured 33 ms per frame instead of 16. The cause was not found.

Interactive Mandelbrot omits synchronous alpha-mask readback: its shader does not emit invalid-alpha pixels. Julia and Burning Ship retain their mask inspection and repair paths.

References and approximation tables cover a region larger than the initial viewport and include spare iterations. Panning and zooming reuse them while their precision and iteration count suffice. The renderer requests a replacement before the viewport reaches the cached domain margin or exhausts the spare precision or iterations. Each pixel separately checks the table's parameter bound; outside it, ordinary perturbation continues without BLA. The first deep frame, or a change requiring more precision or iterations than the available reference, can wait for the worker.

Julia and Burning Ship retain native sampling during movement and rest, with their existing perturbation and reference-repair methods. They do not use Mandelbrot's pixel reuse, BLA tables, or native arithmetic shortcut. An available reference renders the current camera; a cached-image preview is only a fallback while no usable reference is available. Camera versions prevent stale repairs from replacing a newer view.

The direct renderer retains its framebuffer for tile repairs. PNG export snapshots the view and coloring into an isolated, non-interactive renderer, waits for its repairs, then encodes the image. Its explicit `pixelRatio: 1` renders every requested output pixel independently of display DPR, subject to the same hardware limits. Export does not resize or disturb the live explorer. Workers, textures and programs are released on unmount, context loss, or export completion/cancellation. Full native sampling does not certify the underlying approximate arithmetic.

The ordinary shader remains the fast path above a half-span of `2^-7`; interactive Mandelbrot also schedules this shader in tiles. The studio value is a minimum: it is honored down to about `2^-12`, then a floor ramps up to `200 + 12 × depth bits` by `2^-16`, because lower limits turn most deep pictures black.

The Mandelbrot explorer measures its step limit by default (`autoSteps.ts`). A worker samples 4,000 pixels and their neighbors at the display's pixel spacing, then stops where 70% of pixels differ from a neighbor by more than one color round. The result is at least 150 and replaces the floor down to `2^-32`; deeper views use double precision too coarsely, so the last limit and the floor apply. A new limit is ignored unless it differs by a factor of 1.5, which keeps the picture from flickering during movement. Typing a step count turns the measurement off. Routine zoom, refinement and iteration status is not shown over the fractal; only renderer or graphics errors are displayed. Palette changes reuse reference data when possible.

There are explicit resource budgets: 16,384 depth bits (about `10^4932` magnification) and 8,192 iterations per pixel. There is no guarantee of a fixed frame rate, arbitrary-location correctness, or endless visible detail. A point that does not escape within the iteration budget is not proof of set membership. Difficult views can still take seconds to calculate new detail even while the displayed camera responds smoothly. BigInt reference work, difficult orbit regions and tile repair can all take longer as depth increases. All saved coordinates must remain within the existing one-million-unit coordinate envelope.

## Validation

Run the focused numeric and sharing tests:

```sh
node --test tests/deep-zoom*.test.mjs tests/explorer-share.test.mjs
```

Generate a browser check using the same shader recurrence and independent BigInt pixel calculations:

```sh
node scripts/check-deep-zoom-gpu.mjs /private/tmp/deep-zoom-gpu.js
playwright-cli -s=deep-zoom --raw run-code --filename /private/tmp/deep-zoom-gpu.js
```

Run that command in an existing task-owned Playwright session. The generator starts no browser. It reports renderer identity, timings, matched pixels and pixels requiring another reference, including samples at `10^1000`. The diagnostic shader changes only final coloring to encode iteration counts; recurrence and glitch logic come from production sources.

Compare the current shader with BLA and native arithmetic independently disabled, using identical references, cameras, and all seven coloring modes:

```sh
node scripts/check-mandelbrot-acceleration.mjs /private/tmp/mandelbrot-acceleration.js --width=128 --height=80 --variant=bla,native,combined
playwright-cli -s=deep-zoom --raw run-code --filename /private/tmp/mandelbrot-acceleration.js
```

The fixtures cover Seahorse tail, Deep branches, a `1e-14` boundary, and the `1e-1000` antenna. The report keeps image differences and independent-oracle evidence separate. RGB, classification, and iteration thresholds are explicit; boundary-sensitive pixels are not silently exempted. Draw/read timings include synchronization and readback, so they are not isolated GPU timings.

For a full-grid oracle, use a smaller image. Every pixel is calculated at the viewport precision and again with 128 additional bits; the center is rescaled exactly. The report includes precision stabilization, old/new classification errors, exact and within-one iteration agreement, iteration MAE/p95, and paired regressions or improvements:

```sh
node scripts/check-mandelbrot-acceleration.mjs /private/tmp/mandelbrot-oracle.js --width=32 --height=20 --variant=combined --oracle-grid
playwright-cli -s=deep-zoom --raw run-code --filename /private/tmp/mandelbrot-oracle.js
```

Benchmark continuous camera movement through the production renderer and worker:

```sh
node scripts/benchmark-mandelbrot-motion.mjs /private/tmp/mandelbrot-motion.js --fixture branches --width 960 --height 600 --dpr 1 --frames 120 --async
playwright-cli -s=deep-zoom --raw run-code --filename /private/tmp/mandelbrot-motion.js
```

Repeat with `--fixture whole`, `tail`, `boundary`, or `antenna`; use `--dpr 2` to exercise a larger physical framebuffer. `--zoom-travel 4` tests a continuous four-bit zoom instead of the default half-bit excursion. The benchmark opts into the interactive renderer and reports camera-input cadence, display draws, painted phases, worker jobs, final settle time, and moving/settled images.

Use `--pause-before-stop 260 --fixture boundary` to reproduce a brief pause followed by a final wheel nudge. `settleStats` records the phases painted before the final image completes.

Use `--no-timers` to exercise the frame-pacing fallback. Use `--async` for the production scheduling behavior. Per-draw times then measure CPU submission, not GPU completion. Omitting it synchronizes every draw with a pixel readback, which changes scheduling and is useful only as a separate diagnostic. Timer-query results report GPU batches when supported; `motionGpuBatches` isolates movement, while the aggregate `gpuBatches` statistics also include setup and settling.

Camera-input median/p95 intervals and display cadence measure responsiveness, not the rate of fresh full-frame detail. Inspect `motionStats` alongside them: painted and fresh phases, the moving target and final native completion show how much detail has caught up. `currentDraws` counts calculation draws; it is not a count of complete current-camera frames. Moving/settled images and `settleMs` remain necessary checks of the quality tradeoff.

Also check continuous scrolling, pointer anchoring, touch pinch, resize, parameter edits during refinement, share restoration, PNG export and WebGL context recovery in the actual pages. The Mandelbrot “Deep branches” place uses a decimal-string approximation of the preperiodic point near `-0.101096 + 0.956287 i`, calculated from `z5(c) = z4(c)`, at a half-span of `1e-30`. “Pinwheel” centers on a period 1433 nucleus found with Newton's method on `z1433(c) = 0`, starting at `0.2549870375144766 - 0.0005679790528465 i`. “Deep miniature” frames the real period 31 nucleus nearest `c = -2`. Its center sits `0.35` half-spans left of the nucleus, so the copy is framed as in the opening view. “Googol spiral” is offset from the preperiodic point `z39(c) = z34(c)` near `-0.744982 + 0.130948 i`, by `(-6, -0.67)` half-spans at a half-span of `1.5e-100`.

`scripts/generate-place-previews.mjs` draws these previews from one BigInt reference orbit at each center, with each pixel's offset in binary64. An offset restarts from zero when the orbit passes closer to zero than the offset is.

Check Burning Ship repairs against independent fixed-point colors for the reported mast views and embedded Julia destinations:

```sh
node scripts/check-burning-ship-renderer.mjs /private/tmp/check-burning-ship.js
playwright-cli -s=deep-zoom --raw run-code --filename /private/tmp/check-burning-ship.js
```

Use `--mode=log` or `--mode=banded` for the other batched coloring modes, and `--width=256 --height=160` for a larger grid. The check requires no invalid pixels, mean RGB-channel error below 1, and at most 0.5% of pixels with a channel difference above 16. It reports first-frame missing pixels, completed repairs, and worker-job count separately.
