# Lévy Curve

Replace a straight line with two equal lines that meet at a right angle. Keep the old ends in place. Repeat on both new lines, bending each the same way.

A C-shaped curve starts to curl around itself.

<figure data-construction-player="levy-curve"></figure>

Two lines replace one, so the count doubles each round. Each new line is about 71% as long as the old line. Together, they make a longer route between the same ends.

At any finite stage, you draw only lines. In the infinite limit, the curve fills a region with area.<sup><a id="levy-curve-ref-1" href="#levy-curve-source-1">1</a></sup>

Even its outer edge is hard to describe. Duvall and Keesling needed a table with 752 rows to track how the pieces meet.

## Draw it from symbols

Start with F and replace it with `-F++F-`. F draws forward. Each turn is 45 degrees. The double plus makes the right-angle corner.

The [Dragon curve](/l-system/dragon-curve) shrinks its lines by the same amount but turns its pieces differently. Compare how the two paths pack themselves into the plane.

## Sources and notes

1. <span id="levy-curve-source-1"></span> Paul Duvall and James Keesling, [The Hausdorff dimension of the boundary of the Lévy dragon](https://arxiv.org/pdf/math/9907145), arXiv:math/9907145, 1999. Sections 4–5 prove nonempty interior, the open set condition and zero-area overlap between pieces, then compute the boundary dimension using a 752-state matrix. Stroke and length counts above follow directly from the local rule. [Back](#levy-curve-ref-1)
