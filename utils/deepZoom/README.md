# Escape-time deep zoom

`EscapeTimeFractal` uses this path for Mandelbrot, quadratic Julia sets, and Burning Ship. Other renderers retain their own navigation and numerical methods; this is not a general solution for Newton maps, ray-marched 3D fractals, or recursive geometry.

## Numeric model

- The camera stores signed BigInt fixed-point coordinates and the base-two logarithm of its half-span. Wheel, drag, pinch, and saved links never add tiny offsets to a JavaScript Number coordinate.
- Precision grows with depth, with 128 guard bits. Reference calculation runs in a dedicated worker. Returning to a wider view reduces the worker's precision without discarding the camera's retained digits.
- The GPU iterates the exact perturbation recurrence `delta' = 2 Z delta + delta² + deltaC`. For Julia sets, the initial delta changes and `deltaC` is zero.
- Each reference component has its own float mantissa and exponent. Normal iterations use rescaled native complex arithmetic. Tiny reference components, critical steps, and widely separated deltas use the full exponent representation. This avoids the usual float/double underflow boundary.
- Mandelbrot and Burning Ship can rebase onto their critical orbit. Burning Ship uses a cancellation-safe absolute difference for folded coordinates. Julia starts with a camera-seeded orbit, then can switch to a separate critical orbit for the same constant. It never treats the camera seed as zero.
- Suspected cancellation returns an invalid alpha mask. Idle rendering subdivides those regions and computes new reference orbits, down to individual pixels. Final pixel references double the depth precision and bypass GPU coordinate rounding, including tangencies and folded-axis crossings. A remaining precision failure is reported instead of accepted as interior.

The derivation, rescaling exceptions, absolute differences and glitch criteria follow [mathr's deep-zoom notes](https://mathr.co.uk/blog/2021-05-14_deep_zoom_theory_and_practice.html). Perturbation uses approximate GPU arithmetic; these are practical error controls, not certified interval bounds.

## Interaction and cost

Ordinary zooms above a half-span of `2^-7` render at device-pixel resolution. Deep zoom prioritizes responsive movement: a completed frame is reprojected during navigation while the worker calculates the next reference. Actual GPU frames use a smaller pixel budget while moving; idle rendering restores detail. Pixel budgets also decrease with iteration cost. The framebuffer is retained for progressive tile repair and PNG export. Worker results carry versions and parameters so stale repairs cannot overwrite a newer view. Workers, timers, textures and programs are released on unmount/context loss.

The ordinary shader remains the fast path above a half-span of `2^-7`. Below that, the minimum iteration count grows with depth. The studio value is a minimum. Routine zoom, refinement and iteration status is not shown over the fractal; only renderer or graphics errors are displayed. Palette changes reuse reference data when possible.

There are explicit resource budgets: 16,384 depth bits (about `10^4932` magnification) and 8,192 iterations per pixel. There is no guarantee of a fixed frame rate, arbitrary-location correctness, or endless visible detail. A point that does not escape within the iteration budget is not proof of set membership. BigInt reference work, difficult orbit regions and tile repair can all take longer as depth increases. All saved coordinates must remain within the existing one-million-unit coordinate envelope.

## Validation

Run the focused numeric and sharing tests:

```sh
node --test tests/deep-zoom.test.mjs tests/explorer-share.test.mjs
```

Generate a browser check using the same shader recurrence and independent BigInt pixel calculations:

```sh
node scripts/check-deep-zoom-gpu.mjs /private/tmp/deep-zoom-gpu.js
playwright-cli -s=deep-zoom --raw run-code --filename /private/tmp/deep-zoom-gpu.js
```

Run that command in an existing task-owned Playwright session. The generator starts no browser. It reports renderer identity, timings, matched pixels and pixels requiring another reference, including samples at `10^1000`. The diagnostic shader changes only final coloring to encode iteration counts; recurrence and glitch logic come from production sources.

Also check continuous scrolling, pointer anchoring, touch pinch, resize, parameter edits during refinement, share restoration, PNG export and WebGL context recovery in the actual pages. The Mandelbrot “Deep branches” place uses a decimal-string approximation of the preperiodic point near `-0.101096 + 0.956287 i`, calculated from `z5(c) = z4(c)`, at a half-span of `1e-30`.
