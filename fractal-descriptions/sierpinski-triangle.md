# Sierpinski Triangle

Split a triangle into four smaller triangles. Remove the upside-down one in the middle. Repeat inside the three that remain.

Each round leaves three times as many triangles, each half as wide. Small triangular holes appear around the big hole.

<figure data-construction-player="sierpinski-triangle"></figure>

The remaining area shrinks by three quarters each round. After infinitely many rounds, it reaches zero. Points and edges remain, even though no filled triangle survives.

## Start with a fish

You do not need a triangle to begin. Try a square, a circle or a fish.

Make three half-size copies. Move one toward each corner of a fixed triangle. Repeat on the whole picture.

<figure data-lesson="sierpinski-seeds"></figure>

The little fish stay visible at first. Keep shrinking and copying, and they approach the same Sierpinski triangle. Barnsley, Hutchinson and Stenflo used fish to illustrate this result.<sup><a id="sierpinski-triangle-ref-1" href="#sierpinski-triangle-source-1">1</a></sup>

## A puzzle makes the same pattern

In the Tower of Hanoi puzzle, disks move between three pegs. Draw a dot for each legal arrangement. Join two dots when one legal move connects them.

The resulting network has the Sierpinski triangle's structure. Group the arrangements by the largest disk's peg, and you find three smaller copies of the same network.<sup><a id="sierpinski-triangle-ref-2" href="#sierpinski-triangle-source-2">2</a></sup>

Pascal's triangle hides the pattern too. Color the odd numbers and leave the even numbers blank. The same triangular gaps appear.<sup><a id="sierpinski-triangle-ref-3" href="#sierpinski-triangle-source-3">3</a></sup>

The [Sierpinski arrowhead](/l-system/sierpinski-arrowhead) approaches this shape with one continuous path. The [tetrahedron](/sierpinski-tetrahedron) repeats the corner-copy idea in three dimensions.

## Sources and notes

1. <span id="sierpinski-triangle-source-1"></span> Michael Barnsley, John E. Hutchinson and Örjan Stenflo, [V-variable fractals and superfractals](https://arxiv.org/pdf/math/0312314), 2003 preprint, Figure 1 and introductory contraction discussion. Seed independence and fish example; this page uses its own drawing. [Back](#sierpinski-triangle-ref-1)
2. <span id="sierpinski-triangle-source-2"></span> Grant Sanderson, 3Blue1Brown, [Binary, Hanoi and Sierpinski, part 1](https://www.youtube.com/watch?v=2SUvWfNJSsM), 25 November 2016, with the linked second part. Original animated explanation of counting and puzzle-graph connections. [Back](#sierpinski-triangle-ref-2)
3. <span id="sierpinski-triangle-source-3"></span> Andrew Granville, [Arithmetic Properties of Binomial Coefficients I: Binomial coefficients modulo prime powers](https://dms.umontreal.ca/~andrew/Binomial/intro.html), Canadian Mathematical Society Conference Proceedings 20 (1997), 253–276. Lucas’ theorem and its cellular-automaton interpretation. [Back](#sierpinski-triangle-ref-3)
