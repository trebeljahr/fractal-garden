# Lévy Curve

Replace a straight line with two equal lines meeting at a right angle, keeping the original endpoints fixed. Then repeat on both new lines, placing each replacement on the same side of its line. As drawing instructions, this page's rule is `F → -F++F-`, with 45-degree turns, and the two adjacent plus signs make the right angle between the new lines.

<figure data-construction-player="levy-curve"></figure>

The original line is the long side of a right triangle, and the two new lines are its equal shorter sides, so each must be $1/\sqrt2$ times the old length, about 71%, for the endpoints to stay fixed. Their combined length is about 1.414 times the old length, which means each round doubles the line count and increases the total distance drawn by that same factor.

Every drawing you can make leaves gaps between its lines, but in the infinite limit the curve fills a region.<sup><a id="levy-curve-ref-1" href="#levy-curve-source-1">1</a></sup>

The [Dragon curve](/l-system/dragon-curve) uses the same two-piece size but changes which direction the smaller pieces face, which produces a different outline. Its figure has a **Lévy** button that swaps between the two rules.

## Further exploring

- [Lévy C curve — Wikipedia](https://en.wikipedia.org/wiki/L%C3%A9vy_C_curve)
- [Lévy fractal — MathWorld](https://mathworld.wolfram.com/LevyFractal.html)
- [Lévy Dragon — Larry Riddle](https://larryriddle.agnesscott.org/ifs/levy/levy.htm)
- [The C Curve, HAKMEM item 135 — Bill Gosper](https://www.jjj.de/hakmem/flows.html)

## Sources and notes

1. <span id="levy-curve-source-1"></span> Paul Duvall and James Keesling, [The Hausdorff dimension of the boundary of the Lévy dragon](https://arxiv.org/pdf/math/9907145), arXiv:math/9907145, 1999. Sections 4–5 prove nonempty interior, the open set condition and zero-area overlap between pieces, then compute the boundary dimension using a 752-state matrix. [Back](#levy-curve-ref-1)
