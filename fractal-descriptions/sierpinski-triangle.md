# Sierpinski Triangle

The Sierpinski Triangle is one of the coolest fractals in this garden. The reason why I like it so much is that there are so so many different ways to construct it. You can recursively cut out an inverted triangle, similar to how you would cut out squares from the [Sierpinski Carpet](/sierpinski-carpet). You could build one out of playing a Chaos Game (the triangle attracts points to it, just like the Barnsley Fern does). You could get it from a [Sierpinski-Arrowhead curve](/l-system/sierpinski-arrowhead).

## Start with a square, a circle, or a fish

Choose **Next step** below to compare four starting drawings. Every step makes three copies of the whole current picture. Each copy has half its width and height, with every point moved halfway towards one fixed triangle corner.

<figure data-lesson="sierpinski-seeds"></figure>

The initial square, circle and fish look different. Repeated contractions reduce the influence of those initial shapes. Their arrangements approach the same Sierpinski triangle.

This works for any nonempty compact starting set: a bounded shape that includes its boundary, even one with holes or disconnected pieces. The three shrinking transformations determine the limit. The error bound for the starting shape halves at every step. At any finite step, tiny fish or circles still remain.

Barnsley, Hutchinson and Stenflo illustrate this with fish in Figure 1, on [page 3 of their paper, V-variable fractals and superfractals](https://arxiv.org/pdf/math/0312314.pdf#page=3). The comparison here uses its own fish drawing and the same Sierpinski transformations.

You could draw it with its outlines only (like we do here), you could get it from a [Fractal Canopy](/fractal-canopy). You could even construct it with [Cellular Automata](https://en.wikipedia.org/wiki/Rule_90)! It's simply nuts.

To me, the most beautiful connection is that between the Sierpinski Triangle and the Towers of Hanoi Puzzle. There's a [great 3Blue1Brown video on that](https://www.youtube.com/watch?v=2SUvWfNJSsM).

The infinite Sierpinski triangle has zero area, but still contains infinitely many points. Every finite filled stage in the comparison above has positive area.

## Three copies, half the scale

Each replacement keeps three corner copies with half the old side length. The number of copies grows as $3^n$, while their individual areas shrink as $4^{-n}$.

The remaining area is $(3/4)^n$ of the starting triangle. It tends to zero, although points and connecting structure remain. The dimension is $\log3/\log2$, about 1.585.

A line can approach this same set. The [Sierpinski arrowhead](/l-system/sierpinski-arrowhead) follows one continuous route through its triangular pattern.

## A triangular shadow of a tetrahedron

The [Sierpinski tetrahedron](/sierpinski-tetrahedron) can project to a triangular gasket when viewed parallel to an edge. Two of its four corner copies overlap in the shadow, leaving three distinct half-size copies. The resulting gasket is an affine, stretched version of this triangle.

In a different direction, the very same tetrahedron casts a filled square shadow. Its explanation includes an interactive comparison and references to the mathematics of fractal shadows.
