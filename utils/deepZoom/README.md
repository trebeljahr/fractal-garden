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

Interactive Mandelbrot keeps the display canvas at native resolution. Moving sources are sized from the measured GPU rate so each finishes in about 150 ms, between 0.2 and 0.8 of native sampling in each dimension. Zooming therefore cannot outrun them on a slow view. Sources cover an 18% wider and taller span, adding a 9% border on each side for nearby pans. This trades moving detail for responsiveness; movement does not reduce the iteration budget or change the arithmetic fallback policy. While history still has more detail than a new source would, none starts. After 180 ms without another interaction, or an explicit `update(false)`, unfinished moving work is discarded and a fresh source begins at full native sampling. The one exception is a moving source that covers the viewport when no finished source does. It finishes first, because discarding it would make the native pass fill those edges again.

`motion.ts` stores completed and partially calculated sources with their original cameras. Each display frame transforms those original textures to the latest camera; it never resamples the previous displayed image into another source. Partial work is never painted over a finished source, so no refinement sweep is visible, at rest or moving. It shows only where no finished source has pixels. A finished source replaces history whole, fading in over 120 ms on top of the source it replaced. A coarser source never replaces sharper history: if history covers the viewport it is dropped, otherwise it waits underneath and shows only at the edges history no longer reaches. The native pass always replaces history. Reprojection can keep the camera responsive while fine detail is still old, and it cannot reveal detail outside the available sources. A source that no longer covers useful nearby space is discarded.

The backdrop is a separate source behind history, so zooming out or panning shows a soft image instead of dark edges. It spans four viewports at a twelfth of native sampling, which costs a ninth of a native pass. A replacement swaps in only when it is whole. A resting view calculates its backdrop after the native pass, unless the viewport would otherwise show dark, as after loading, a distant jump or a parameter edit; then the backdrop comes first. During motion it is replaced first once the viewport passes half its span, or once it is on screen and has lost half its density by zooming in. Its batches count toward the measured pixel rate. When the backdrop covers the viewport, settling discards unfinished moving work at once and the native pass starts, without filling the edges first.

The refinement grid uses 64 × 64 source-texture pixels. Adjacent cells can share a draw, so reducing the visible grid does not require one draw call per cell. After a pause followed by a small gesture, stopping also replaces any unfinished native pass for the earlier camera; only the final camera is refined. Same-camera updates retain already calculated work.

Tile priority starts with newly exposed visible edges that history cannot cover, then the visible center, then the extra border. When `EXT_disjoint_timer_query` is available, asynchronous results adjust the next pixel budget toward 8 ms while moving and 48 ms at rest. The adaptive budget has a floor of 16,384 pixels so fixed draw overhead cannot shrink useful work toward zero; starting movement caps the next batch at 32,768 pixels. Only one timed batch is outstanding; later animation frames poll without blocking or reading pixels back. These are adaptive targets, not hard duration guarantees: a first batch or an unusually costly tile can exceed them. Without timer queries, animation-frame intervals adjust a conservative budget from 16,384 pixels up to 65,536 while moving or 262,144 at rest; CPU submission duration is never treated as GPU time. Adjoining selected tiles are coalesced before drawing.

### Pixel reuse prototype

Add `?zoom=reuse` to compare `reuse.ts` with the default compositor, following [XaoS](https://en.wikipedia.org/wiki/XaoS). It keeps one image at native size and never shows a separate source. Each camera change moves the stored pixels. A second texture records, per pixel, how far its color's real position lies from the pixel center, in 16 bits per axis. Each new pixel takes the stored sample nearest its position, so colors are never resampled and repeated moves do not blur. Without that record, slow motion would round to no motion.

Each frame recalculates one share of the screen: 64 phases, each 2 × 2 blocks in an ordered pattern. Blocks match how GPUs shade pixels in groups of four, so lone pixels do not waste three neighbors. A depth mask limits the unchanged fractal shader to those blocks. Timer queries size the share toward 8 ms moving and 30 ms at rest. Missing or distant samples get up to three more shares. A stopped camera finishes all 64 phases, then stops drawing. Missing pixels show the same low-resolution backdrop as the default compositor.

Interactive Mandelbrot omits synchronous alpha-mask readback: its shader does not emit invalid-alpha pixels. Julia and Burning Ship retain their mask inspection and repair paths.

References and approximation tables cover a region larger than the initial viewport and include spare iterations. Panning and zooming reuse them while their precision and iteration count suffice. The renderer requests a replacement before the viewport reaches the cached domain margin or exhausts the spare precision or iterations. Each pixel separately checks the table's parameter bound; outside it, ordinary perturbation continues without BLA. The first deep frame, or a change requiring more precision or iterations than the available reference, can wait for the worker.

Julia and Burning Ship retain native sampling during movement and rest, with their existing perturbation and reference-repair methods. They do not use Mandelbrot's motion compositor, BLA tables, or native arithmetic shortcut. An available reference renders the current camera; a cached-image preview is only a fallback while no usable reference is available. Camera versions prevent stale repairs from replacing a newer view.

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

Repeat with `--fixture whole`, `tail`, `boundary`, or `antenna`; use `--dpr 2` to exercise a larger physical framebuffer. `--zoom-travel 4` tests a continuous four-bit zoom instead of the default half-bit excursion. The benchmark opts into the interactive renderer and reports camera-input cadence, display draws, submitted detail tiles and pixels, source ages and effective densities, worker jobs, final settle time, and moving/settled images.

Use `--pause-before-stop 260 --fixture boundary` to reproduce a brief pause followed by a final wheel nudge. `settleStats` records whether an obsolete source continues advancing before the final native pass.

Use `--no-timers` to exercise the frame-pacing fallback. Use `--async` for the production scheduling behavior. Per-draw times then measure CPU submission, not GPU completion. Omitting it synchronizes every draw with a pixel readback, which changes scheduling and is useful only as a separate diagnostic. Timer-query results report GPU batches when supported; `motionGpuBatches` isolates movement, while the aggregate `gpuBatches` statistics also include setup and settling.

Camera-input median/p95 intervals and display cadence measure responsiveness, not the rate of fresh full-frame detail. Inspect `motionStats` alongside them: completed source counts, source age, effective density, submitted fraction, and final native completion show how much detail has caught up. `currentDraws` counts calculation draws, including individual tiles; it is not a count of complete current-camera frames. Submitted pixels can belong to an earlier sampled camera and are not necessarily finished when recorded. Moving/settled images and `settleMs` remain necessary checks of the quality tradeoff.

Also check continuous scrolling, pointer anchoring, touch pinch, resize, parameter edits during refinement, share restoration, PNG export and WebGL context recovery in the actual pages. The Mandelbrot “Deep branches” place uses a decimal-string approximation of the preperiodic point near `-0.101096 + 0.956287 i`, calculated from `z5(c) = z4(c)`, at a half-span of `1e-30`. “Pinwheel” centers on a period 1433 nucleus found with Newton's method on `z1433(c) = 0`, starting at `0.2549870375144766 - 0.0005679790528465 i`. “Deep miniature” frames the real period 31 nucleus nearest `c = -2`. Its center sits `0.35` half-spans left of the nucleus, so the copy is framed as in the opening view. “Googol spiral” is offset from the preperiodic point `z39(c) = z34(c)` near `-0.744982 + 0.130948 i`, by `(-6, -0.67)` half-spans at a half-span of `1.5e-100`.

`scripts/generate-place-previews.mjs` draws these previews from one BigInt reference orbit at each center, with each pixel's offset in binary64. An offset restarts from zero when the orbit passes closer to zero than the offset is.

Check Burning Ship repairs against independent fixed-point colors for the reported mast views and embedded Julia destinations:

```sh
node scripts/check-burning-ship-renderer.mjs /private/tmp/check-burning-ship.js
playwright-cli -s=deep-zoom --raw run-code --filename /private/tmp/check-burning-ship.js
```

Use `--mode=log` or `--mode=banded` for the other batched coloring modes, and `--width=256 --height=160` for a larger grid. The check requires no invalid pixels, mean RGB-channel error below 1, and at most 0.5% of pixels with a channel difference above 16. It reports first-frame missing pixels, completed repairs, and worker-job count separately.
