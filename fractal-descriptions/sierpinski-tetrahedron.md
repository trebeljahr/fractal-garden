# Sierpinski Tetrahedron

Keep four half-size copies of a regular tetrahedron, one at each vertex. Neighboring copies meet at edge midpoints. The missing center is a regular octahedron. Repeat on every surviving tetrahedron.

<figure data-investigation="sierpinski-tetrahedron"></figure>

After $n$ steps, $4^n$ tetrahedra remain. Each has $1/8^n$ of the original volume, so the total volume fraction is $(1/2)^n$. Their total face area stays constant: four copies each contribute one-quarter of their parent's area.

The Hausdorff dimension is $\log4/\log2=2$. This integer dimension does not make the set a flat surface.

The square-pyramid option uses five half-size corner copies. Its base is square and its four side faces are equilateral triangles. That different rule gives dimension $\log5/\log2\approx2.322$.

## One object, incompatible shadows

Project the tetrahedron along the line between midpoints of opposite edges. Its shadow is a filled square. The four smaller tetrahedra fill its quadrants, and the same happens at every scale. Hideki Tsuiki shows that three mutually perpendicular directions give square shadows.<sup><a id="sierpinski-tetrahedron-ref-1" href="#sierpinski-tetrahedron-source-1">1</a></sup>

Project parallel to an edge instead. Two corner copies overlap, leaving three half-size triangular positions. This gives a stretched [Sierpinski triangle](/l-system/sierpinski-triangle), with zero area.

<figure data-projection="tetrahedron"></figure>

These are orthographic shadows, made with parallel rays. The main explorer uses perspective.

The remaining tetrahedral edges also contain knots. Broden and colleagues construct every **pretzel knot** in a finite stage, using edges that survive later subdivisions.<sup><a id="sierpinski-tetrahedron-ref-2" href="#sierpinski-tetrahedron-source-2">2</a></sup> Their 2024 paper leaves the corresponding all-knots statement for this tetrahedron as a conjecture. It proves the all-knots statement for the [Menger sponge](/menger-sponge).

## Sources and notes

1. <span id="sierpinski-tetrahedron-source-1"></span> Hideki Tsuiki, [Does it Look Square? Hexagonal Bipyramids, Triangular Antiprismoids, and their Fractals](https://www.i.h.kyoto-u.ac.jp/~tsuiki/papers/Bridges2007.pdf), Bridges 2007. Square projections of the Sierpinski tetrahedron, including all finite stages. [Back](#sierpinski-tetrahedron-ref-1)
2. <span id="sierpinski-tetrahedron-source-2"></span> Joshua Broden, Malors Espinosa, Noah Nazareth and Niko Voth, [Knots Inside Fractals](https://arxiv.org/pdf/2409.03639), 2024 preprint, Theorem B. Pretzel-knot embeddings are proved; arbitrary tetrahedral knot embeddings are conjectural there. [Back](#sierpinski-tetrahedron-ref-2)
