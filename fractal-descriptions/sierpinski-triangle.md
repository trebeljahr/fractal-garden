# Sierpinski Triangle

Keep three half-size corner triangles and remove the inverted center triangle. Repeat inside every survivor. After $n$ rounds, $3^n$ triangles retain $(3/4)^n$ of the starting area. The limit has zero area and dimension $\log3/\log2\approx1.585$.

<figure data-construction-player="sierpinski-triangle"></figure>

## Start with a fish

The same limit appears if the seed is a square, circle or fish. Make three half-size copies, moving each toward one fixed triangle vertex. Repeat on the whole picture.

<figure data-lesson="sierpinski-seeds"></figure>

Any nonempty compact seed approaches the same attractor. After each step, its Hausdorff distance from the limit is at most half the previous distance. Barnsley, Hutchinson and Stenflo illustrate this with fish.<sup><a id="sierpinski-triangle-ref-1" href="#sierpinski-triangle-source-1">1</a></sup> At finite levels, the tiny fish remain visible.

## A puzzle graph and a number triangle

Every legal arrangement of $n$ Tower of Hanoi disks corresponds to one of $3^n$ states. Group states by the largest disk's peg. Each group contains a copy of the $(n-1)$-disk graph. Only specific moves connect the three groups, producing the gasket's recursive pattern. Grant Sanderson explains the link to binary and ternary counting in his *Binary, Hanoi and Sierpinski* videos.<sup><a id="sierpinski-triangle-ref-2" href="#sierpinski-triangle-source-2">2</a></sup>

Pascal's triangle gives another route. Color odd binomial coefficients and leave even ones blank. Lucas' theorem says $\binom nk$ is odd exactly when every $1$ bit of $k$ also occurs in $n$.<sup><a id="sierpinski-triangle-ref-3" href="#sierpinski-triangle-source-3">3</a></sup> Each binary digit pair has three allowed choices: $(0,0)$, $(1,0)$ and $(1,1)$. Those three choices explain the three half-size copies.

The [Sierpinski arrowhead](/l-system/sierpinski-arrowhead) approaches the same set through a continuous path. A [Sierpinski tetrahedron](/sierpinski-tetrahedron) can cast a stretched triangular gasket shadow, although another viewing direction gives a filled square.

## Sources and notes

1. <span id="sierpinski-triangle-source-1"></span> Michael Barnsley, John E. Hutchinson and Örjan Stenflo, [V-variable fractals and superfractals](https://arxiv.org/pdf/math/0312314), 2003 preprint, Figure 1 and introductory contraction discussion. Seed independence and fish example; this page uses its own drawing. [Back](#sierpinski-triangle-ref-1)
2. <span id="sierpinski-triangle-source-2"></span> Grant Sanderson, 3Blue1Brown, [Binary, Hanoi and Sierpinski, part 1](https://www.youtube.com/watch?v=2SUvWfNJSsM), 25 November 2016, with the linked second part. Original animated explanation of counting and puzzle-graph connections. [Back](#sierpinski-triangle-ref-2)
3. <span id="sierpinski-triangle-source-3"></span> Andrew Granville, [Arithmetic Properties of Binomial Coefficients I: Binomial coefficients modulo prime powers](https://dms.umontreal.ca/~andrew/Binomial/intro.html), Canadian Mathematical Society Conference Proceedings 20 (1997), 253–276. Lucas’ theorem and its cellular-automaton interpretation. Binary choices above specialize it to parity. [Back](#sierpinski-triangle-ref-3)
