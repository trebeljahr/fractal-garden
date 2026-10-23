# Lévy Curve

Replace a straight segment with the two equal sides of a right isosceles triangle. Repeat on both new segments, keeping the same local choice of side. This produces the Lévy C curve.

The page starts with F and applies `F → -F++F-` at 45 degrees. The initial minus tilts the first stroke. The double plus makes a 90-degree corner. The final minus restores the heading used before the replacement.

<figure data-construction-player="levy-curve"></figure>

To keep the old endpoints fixed, each new stroke must have length $1/\sqrt{2}$ of the old segment. After $n$ rewrites there are $2^n$ strokes. Their total length is $(\sqrt{2})^n$ times the initial length.

The complete limiting image has nonempty interior, although each finite drawing has zero area. Its two self-similar pieces meet along their boundaries. They do not overlap in positive area.<sup><a id="levy-curve-ref-1" href="#levy-curve-source-1">1</a></sup> The image has Hausdorff dimension 2, while its boundary is a different fractal set.

Finding that boundary's dimension is much harder than counting two copies. Duvall and Keesling's calculation uses a 752-by-752 matrix to track how pieces meet.

The [Dragon curve](/l-system/dragon-curve) uses the same $1/\sqrt{2}$ scale with a different orientation scheme.

## Sources and notes

1. <span id="levy-curve-source-1"></span> Paul Duvall and James Keesling, [The Hausdorff dimension of the boundary of the Lévy dragon](https://arxiv.org/pdf/math/9907145), arXiv:math/9907145, 1999. Sections 4–5 prove nonempty interior, the open set condition and zero-area overlap between pieces, then compute the boundary dimension using a 752-state matrix. Stroke and length counts above follow directly from the local rule. [Back](#levy-curve-ref-1)
