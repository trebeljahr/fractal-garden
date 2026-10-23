# Recursive voxel exploration

`camera.ts` keeps the global camera in BigInt fixed point. A level defines the local unit as `2 / 3^level` world units. Precision grows with the level, retaining 160 extra bits. Camera links validate position, precision, level and orientation before allocating or parsing coordinates.

For every subdivision level, the CPU sends the nearest grid plane relative to the camera, its child-cell width, and the base-3 child digit on the positive side of that plane. Choosing the nearest plane preserves tiny distances near distant ancestor boundaries. No large absolute camera coordinate reaches the shader. Far ancestor rules with constant occupancy in the local viewing volume are omitted; crossing digit 2 to 0 does not change these center-count rules.

The shader follows rays through recursive child grids. Empty cells skip directly to their exit face. Occupied cells descend until their projected size is about three pixels. Expensive grazing rays get one coarser retry. The traversal visits only local geometry and allocates no complete voxel mesh.

The movement bound is the maximum of distance to the root box and distance to each level's periodic union of retained children. Each is a lower bound on distance to the fractal. Neighboring child cells are included, so a continuous empty tunnel does not acquire artificial walls at subdivision boundaries. Movement takes bounded fractions of this safe distance. The local scale follows clearance, slowing world-space movement near surfaces.

Movement evaluates clearance without allocating the render texture or collecting grid levels. Once `sqrt(3) * childWidth` is below the best bound, finer periodic rules cannot improve it and need no evaluation. Retained children are precomputed per pattern. The full renderer grid and movement bound agree; returning just the root-box distance near a tunnel opening would incorrectly prevent entering the shape.

Desktop flight uses Pointer Lock after a canvas click or Enter while the canvas is focused. Relative mouse movement turns the camera without dragging or screen-edge limits. Escape releases the mouse; Back outside ends Explore. Blur, context loss and unmount release capture and held keys. Browsers denying capture retain drag navigation, and touch gestures do not request a lock. Keyboard flight runs at four clearance units per second, with a fourfold Shift boost; diagonal movement is normalized and collision substeps remain bounded. Wheel travel is twice the initial implementation's rate.

Lighting uses the enclosing surface normal from crossings larger than 48 pixel footprints, so tiny cube faces do not obscure the main shape. Actual local normals still guide edges and four shared-grid ambient probes. A directional key, dimmer ambient light, distance fog and restrained outlines distinguish faces and recesses. Wire-only views retain full-strength fine outlines. This is approximate local lighting, without global shadow rays.

Current limits: 256 global subdivision levels, camera levels 0–244, 512 local units of viewing distance, at most 384 steps per ray with one coarser retry, and 900,000 framebuffer pixels. These are practical limits, not literal infinite geometry or a guaranteed frame rate. The whole-shape construction renderer remains available independently.

Supported rules: Menger, seven-copy Vicsek, and both Mosely variants. Jerusalem and polyhedron flakes have different subdivision rules and do not use this path.

Effect cleanup deletes renderer resources immediately. Context release waits until the canvas leaves the DOM, so development Strict Mode and Fast Refresh can replay effects on the same canvas without losing its context. Real context loss pauses rendering; restoration recreates resources and draws the current camera. The stage keeps the selected background while graphics are unavailable.

Validation: `node --test tests/voxel-flight.test.mjs tests/explorer-share.test.mjs`. `node scripts/check-voxel-flight-gpu.mjs /tmp/check-voxel-flight.js` generates a Playwright CLI payload comparing GPU rays to independent finite-box intersections and level-150 boundary/nested-copy fixtures. The generated result must report `passed: true`. Keep the oracle recurrence/traversal independent; do not weaken its checks to accommodate a renderer mismatch.

Lifecycle regression: start `next dev` on an owned port, then run `node scripts/check-voxel-flight-lifecycle.mjs /tmp/check-voxel-flight-lifecycle.js http://127.0.0.1:PORT`. Execute the generated payload with Playwright CLI `run-code --filename`. It requires development Strict Mode replay, checks all supported patterns, native mouse capture and look without dragging, Escape release, unmount release, resource cleanup and re-entry, context restoration and Mosely variant swaps. A production-only check cannot catch this replay regression.
