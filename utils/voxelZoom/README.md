# Recursive voxel exploration

`camera.ts` keeps the global camera in BigInt fixed point. A level defines the local unit as `2 / 3^level` world units. Precision grows with the level, retaining 160 extra bits. Camera links validate position, precision, level and orientation before allocating or parsing coordinates.

For every subdivision level, the CPU sends the nearest grid plane relative to the camera, its child-cell width, and the base-3 child digit on the positive side of that plane. Choosing the nearest plane preserves tiny distances near distant ancestor boundaries. No large absolute camera coordinate reaches the shader. Far ancestor rules with constant occupancy in the local viewing volume are omitted; crossing digit 2 to 0 does not change these center-count rules.

The shader follows rays through recursive child grids. Empty cells skip directly to their exit face. Occupied cells descend until their projected size is about three pixels. Expensive grazing rays get one coarser retry. The traversal visits only local geometry and allocates no complete voxel mesh.

The movement bound is the maximum of distance to the root box and distance to each level's periodic union of retained children. Each is a lower bound on distance to the fractal. Neighboring child cells are included, so a continuous empty tunnel does not acquire artificial walls at subdivision boundaries. Movement takes bounded fractions of this safe distance. The local scale follows clearance, slowing world-space movement near surfaces.

Current limits: 256 global subdivision levels, camera levels 0–244, 512 local units of viewing distance, at most 384 steps per ray with one coarser retry, and 900,000 framebuffer pixels. These are practical limits, not literal infinite geometry or a guaranteed frame rate. The whole-shape construction renderer remains available independently.

Supported rules: Menger, seven-copy Vicsek, and both Mosely variants. Jerusalem and polyhedron flakes have different subdivision rules and do not use this path.

Validation: `node --test tests/voxel-flight.test.mjs tests/explorer-share.test.mjs`. `node scripts/check-voxel-flight-gpu.mjs /tmp/check-voxel-flight.js` generates a Playwright CLI payload comparing GPU rays to independent finite-box intersections and level-150 boundary/nested-copy fixtures. The generated result must report `passed: true`. Keep the oracle recurrence/traversal independent; do not weaken its checks to accommodate a renderer mismatch.
