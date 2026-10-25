# GPU recursive surfaces

`GpuSpatialExplorer` renders Jerusalem, the five polyhedron flakes, both triangular Koch seeds and the quadratic Koch surface. A full-screen WebGL 2 shader traverses their recursive constructions for each visible pixel. Camera movement never requests a triangle mesh or waits for a geometry worker. Finite construction players keep their existing generators.

`model.ts` describes each shape with a convex descendant hull, a seed surface and a short list of child transforms. Jerusalem keeps eight corner cubes at `sqrt(2)-1` and twelve edge cubes at its square; their ranks advance by one and two. Flakes use the existing seed vertices and ratios. Triangular Koch patches replace one triangle with six half-size triangles. Quadratic patches replace a square with eight flat squares, one raised top and four side walls, all at one third of its size.

The triangular Koch descendant hull is the tetrahedron above its canonical triangle, with apex height `sqrt(2/3)/2` for a unit edge. The quadratic hull is `[-1,1] × [-1,1] × [0,1]` for a square of half-width one. Child hull containment is verified independently in the tests. A ray tests the actual triangle, square or convex seed when it reaches the requested detail, rather than intersecting an enclosing hull as if it were the surface.

The CPU retains the existing BigInt camera and selects a small set of local roots. It uses the original construction operations before subtracting the eye: fixed seed anchors for flakes, unequal ranks for Jerusalem, exact division by three for quadratic patches and actual triangle endpoints for triangular Koch. This preserves nearby boundaries through 240 zoom doublings. A frontier with twice the render horizon can survive small moves and turns; its fixed-point roots are rebased without cumulative float transforms. Visible subdivision stays on the GPU.

The shader follows every intersected branch that could beat the nearest hit. Octant orders visit nearby children first, including when a child rotates the ray. Detail stops before a child's smallest feature becomes smaller than two display pixels, adjusted for the actual framebuffer resolution. This avoids sampling tiny holes as speckles. The fixed 8,000,000-pixel budget is the same during movement and at rest; frame timing never reduces quality.

The drawable canvas fills the viewport. The shared framing projection fits the opening shape between controls without clipping the drawing area; rendering, picking and contact shading use the same projection. Movement, resting and PNG export use the same framebuffer resolution. Every changed camera view is rendered; an unchanged view stays idle.

Traversal has a forty-level local stack and a bounded visit count. An unfinished ray retries at coarser detail; a final conservative hull pass avoids reporting unfinished branches as empty space. This fallback is an approximation and is reported by diagnostic queries. CPU root selection has its own explicit budget and reports failure rather than dropping roots.

One GPU pass writes colour plus packed view-space normal/depth. The second pass applies the existing screen-space Soft or Strong corner shading. Koch facet lighting fades from its enclosing patch normal over one to three detail footprints. Contact shading fades below eight projected leaf pixels and disappears below two. These fades change shading only; hit positions and surface normals remain exact. Classic and Depth lighting, outlines, independently eased atmosphere, PNG export and shared camera links remain available.

Picking and collision clearance use small GPU query targets. Clearance traverses descendant hulls in every direction and returns a conservative lower bound, including unresolved geometry; it does not estimate distance from a few sampled rays. Incomplete clearance returns zero. Movement consumes the full elapsed interval in bounded steps and rechecks clearance between steps. It can resume after a previously unresolved gap opens.

`query.ts` is a small CPU ray reference for validation. Production rendering, picking and clearance do not use it. The independent finite oracle comes from the existing construction generators, not from the new transform catalogue.

Validation:

- `node --test tests/spatial-gpu.test.mjs tests/spatial-flight-timing.test.mjs tests/spatial-zoom.test.mjs tests/explorer-share.test.mjs`
- `node scripts/check-spatial-flight-gpu.mjs /private/tmp/check-spatial-flight-gpu.js` produces a Playwright callback comparing actual GPU hits with independent finite surfaces, deep camera frames and analytical edge tangencies. Run it with Playwright CLI `run-code --filename`; require `passed: true`. Hit/miss agreement is exact; depth tolerance is 0.0002 plus 8 ppm for Float32 division at grazing incidence.
- `node scripts/check-spatial-flight-ui.mjs /private/tmp/check-spatial-flight-ui.js BASE_URL CAPTURE_DIRECTORY` produces a bounded browser callback covering all nine variants, flight, saved views, context recovery, phone touch movement and PNG export. It records synchronized draw times as measurements, without a fixed performance gate.
- Run the project typecheck and production build after renderer or integration changes.
