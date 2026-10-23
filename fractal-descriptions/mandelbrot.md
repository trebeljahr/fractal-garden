# Mandelbrot Set

Each pixel supplies a complex parameter $c$. Start at zero, square, add $c$, and repeat:

$$
z_0=0,\qquad z_{n+1}=z_n^2+c.
$$

The Mandelbrot set contains parameters whose orbits stay bounded forever. For $c=0$, the orbit stays at zero. For $c=-1$, it alternates $0,-1,0,-1,\ldots$. For $c=1$, it starts $0,1,2,5,26,\ldots$ and escapes.

<figure data-article-images="mandelbrot"></figure>

The main cardioid contains parameters with an attracting fixed point. The round bulb centered at $-1$ contains an attracting two-cycle. These regions organize the long-term orbit behavior.<sup><a id="mandelbrot-ref-1" href="#mandelbrot-source-1">1</a></sup>

The cardioid's equation follows directly from that fixed point. Write $z=z^2+c$, so $c=z-z^2$. Its multiplier is $2z$. At the attracting region's boundary, put $2z=e^{it}$:

$$
c(t)=\frac{e^{it}}2-\frac{e^{2it}}4.
$$

The diagram follows the two-cycle at $c=-1$.

<figure data-orbit="mandelbrot"></figure>

Small Mandelbrot copies repeat the arrangement of a main body and attached bulbs. Their surrounding filaments differ. The entire image is not one exact self-similar pattern.

Its boundary has Hausdorff dimension **two**, the full dimension available in the plane. Mitsuhiro Shishikura proved this theorem. Dimension two does not mean the boundary contains an open disk.<sup><a id="mandelbrot-ref-2" href="#mandelbrot-source-2">2</a></sup>

**Smooth escape time** colors escaping orbits. Black means no escape before the iteration limit, including some slowly escaping parameters. Escape gives a one-way test. Surviving finitely many steps does not prove membership.

The [Julia explorer](/julia-set) fixes $c$ and varies $z_0$. The [Burning Ship](/burning-ship) adds a coordinate fold before each square.

## Sources and notes

1. <span id="mandelbrot-source-1"></span> John H. Hubbard, [Local Connectivity of Julia Sets and Bifurcation Loci: Three Theorems of J.-C. Yoccoz](https://pi.math.cornell.edu/~hubbard/hubbard.pdf), *Topological Methods in Modern Mathematics* (1993), especially section 5 on the main cardioid and limbs. The displayed cardioid equation is derived above from the fixed-point equation and multiplier. The two-cycle at $-1$ follows by substitution. [Back](#mandelbrot-ref-1)
2. <span id="mandelbrot-source-2"></span> Mitsuhiro Shishikura, [The Hausdorff Dimension of the Boundary of the Mandelbrot Set and Julia Sets](https://arxiv.org/abs/math/9201282), 1991 preprint, published in *Annals of Mathematics* 147 (1998), 225–267. Proves the boundary has Hausdorff dimension two. [Back](#mandelbrot-ref-2)
