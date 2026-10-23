# Koch Surface

Join the midpoints of a triangle's edges. This divides it into four equal triangles. Put a regular tetrahedron on the middle triangle, keeping the three corner triangles flat.

The tetrahedron covers the middle triangle and exposes three sloping faces. Together with the three corners, that makes six triangles in place of one. Repeat on every exposed triangle.<sup><a id="koch-surface-ref-1" href="#koch-surface-source-1">1</a></sup>

<figure data-construction-player="koch-surface"></figure>

Each new triangle has half the old edge length, so it has one quarter of the area. Six quarters add up to one and a half. The total triangle area increases by 50% each step.

The bumps shrink at each step, so the construction stays within a bounded space even while the sum of triangle areas increases without limit.

The tetrahedron start applies the rule to four faces at once. The added solids approach a cube whose alternating corners are the four original tetrahedron corners.<sup><a id="koch-surface-ref-2" href="#koch-surface-source-2">2</a></sup>

Some of the recursively generated triangles end up inside that cube. Adding every triangle's area therefore gives a different result from measuring only the cube's outside faces.

## Sources and notes

1. <span id="koch-surface-source-1"></span> Neel Shrestha, [Creating Square Koch Surfaces Using Origami](https://archive.bridgesmathart.org/2024/bridges2024-567.pdf), Bridges 2024, pp. 567–572. Triangle and square surface generators. [Back](#koch-surface-ref-1)
2. <span id="koch-surface-source-2"></span> Giovanni Ferrer and Alejandro Vélez-Santiago, [3D Koch-type crystals](https://ems.press/content/serial-article-files/37384), Journal of Fractal Geometry 10 (2023), 109–149, Example 3 and §3. Dimension of the Koch 2-surface and the exceptional cube limit. The area formula counts generated faces. [Back](#koch-surface-ref-2)
