# Mandelbrot Set

Start with zero. Square it, add a number, and repeat. Does the result stay nearby or run away?

Try adding zero each time. Nothing moves. Try adding $-1$ and the numbers bounce between zero and $-1$. Try adding $1$:

$$
0\to1\to2\to5\to26\to\cdots
$$

That one runs away.

<figure data-article-images="mandelbrot"></figure>

Each pixel tries a different number $c$. The rule is:

$$
z_{n+1}=z_n^2+c.
$$

A complex number gives a position in two directions, so this test makes a whole picture. The Mandelbrot set contains the choices of $c$ whose journeys stay bounded forever.

## What are the bulbs?

Inside the main heart-shaped body, the moving point settles toward one position. Inside the round bulb on its left, it settles into a two-position cycle.<sup><a id="mandelbrot-ref-1" href="#mandelbrot-source-1">1</a></sup>

The diagram follows the cycle at $c=-1$.

<figure data-orbit="mandelbrot"></figure>

Zoom along the edge to find smaller copies of the main shape. Their surrounding threads differ. The picture repeats familiar shapes without repeating every detail exactly.

That edge is so intricate that its fractal dimension is two. Mitsuhiro Shishikura proved this. It does not mean the edge becomes a filled patch.<sup><a id="mandelbrot-ref-2" href="#mandelbrot-source-2">2</a></sup>

**Smooth escape time** colors how quickly a point runs away. Black means it did not escape before the time limit. A slow escape can still hide there.

The [Julia explorer](/julia-set) keeps $c$ fixed and tries different starting points. The [Burning Ship](/burning-ship) adds a fold before every square.

## Sources and notes

1. <span id="mandelbrot-source-1"></span> John H. Hubbard, [Local Connectivity of Julia Sets and Bifurcation Loci: Three Theorems of J.-C. Yoccoz](https://pi.math.cornell.edu/~hubbard/hubbard.pdf), *Topological Methods in Modern Mathematics* (1993), especially section 5 on the main cardioid and limbs. The two-cycle at $-1$ follows by substitution. [Back](#mandelbrot-ref-1)
2. <span id="mandelbrot-source-2"></span> Mitsuhiro Shishikura, [The Hausdorff Dimension of the Boundary of the Mandelbrot Set and Julia Sets](https://arxiv.org/abs/math/9201282), 1991 preprint, published in *Annals of Mathematics* 147 (1998), 225–267. Proves the boundary has Hausdorff dimension two. [Back](#mandelbrot-ref-2)
