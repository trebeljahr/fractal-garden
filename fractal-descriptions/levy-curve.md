# Lévy Curve

Replace a straight line with two equal lines meeting at a right angle. Keep the original endpoints fixed. Repeat on both new lines, placing each replacement on the same side of its line.

<figure data-construction-player="levy-curve"></figure>

The original line is the long side of a right triangle. The two new lines are its equal shorter sides. Each must be $1/\sqrt2$ times the old length, about 71%, for the endpoints to stay fixed.

Their combined length is about 1.414 times the old length. Each round doubles the line count and increases the total distance drawn by that same factor.

Every finite version is made from straight line segments. In the infinite limit, the image contains a region with area.<sup><a id="levy-curve-ref-1" href="#levy-curve-source-1">1</a></sup> The small loops and overlaps become dense enough to include the region's interior, not only its edge.

The [Dragon curve](/l-system/dragon-curve) uses the same two-piece size. It changes which direction the smaller pieces face, producing a different outline.

This page's rule is `F → -F++F-`, with 45-degree turns. The two adjacent plus signs make the right angle between the new lines.

## Sources and notes

1. <span id="levy-curve-source-1"></span> Paul Duvall and James Keesling, [The Hausdorff dimension of the boundary of the Lévy dragon](https://arxiv.org/pdf/math/9907145), arXiv:math/9907145, 1999. Sections 4–5 prove nonempty interior, the open set condition and zero-area overlap between pieces, then compute the boundary dimension using a 752-state matrix. [Back](#levy-curve-ref-1)
