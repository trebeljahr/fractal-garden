# Sierpinski Triangle

Join the midpoints of a triangle's sides. This divides it into four equal triangles. Remove the inverted triangle in the center, then repeat inside the three remaining triangles.

The second round removes three smaller central triangles. The third removes nine. Each new hole is half as wide as a hole from the previous round.

<figure data-construction-player="sierpinski-triangle"></figure>

Each step retains three quarters of the remaining area. Repeatedly multiplying by $3/4$ sends the area toward zero. The borders remain connected at their corners even though no filled patch survives in the infinite limit.

The same shape can be made without starting from a triangle. Take a square, circle or fish. Make three half-size copies and move one toward each corner of a fixed triangle. Repeat on the whole result.

<figure data-lesson="sierpinski-seeds"></figure>

The starting shape is visible in the early stages. Each replacement makes it smaller, so its effect on the overall picture decreases. These different starting shapes approach the same Sierpinski triangle.<sup><a id="sierpinski-triangle-ref-1" href="#sierpinski-triangle-source-1">1</a></sup>

The pattern also appears in Pascal's triangle. Color the odd numbers and leave the even numbers blank. The odd numbers form three smaller triangular patterns, with a blank triangle between them. The same arrangement repeats at larger sizes.<sup><a id="sierpinski-triangle-ref-2" href="#sierpinski-triangle-source-2">2</a></sup>

## Sources and notes

1. <span id="sierpinski-triangle-source-1"></span> Michael Barnsley, John E. Hutchinson and Örjan Stenflo, [V-variable fractals and superfractals](https://arxiv.org/pdf/math/0312314), 2003 preprint, Figure 1 and introductory contraction discussion. Repeated smaller copies approach the same set regardless of the starting shape; Figure 1 uses a fish. [Back](#sierpinski-triangle-ref-1)
2. <span id="sierpinski-triangle-source-2"></span> Andrew Granville, [Arithmetic Properties of Binomial Coefficients I: Binomial coefficients modulo prime powers](https://dms.umontreal.ca/~andrew/Binomial/intro.html), Canadian Mathematical Society Conference Proceedings 20 (1997), 253–276. Lucas’ theorem and its cellular-automaton interpretation. [Back](#sierpinski-triangle-ref-2)
