# Mandelbulb

Choose a point $\mathbf c$ in three-dimensional space. Start at $\mathbf z_0=0$, apply a spherical power, then add $\mathbf c$. Repeat, keeping the same $\mathbf c$:

$$
\mathbf z_{n+1}=P_p(\mathbf z_n)+\mathbf c.
$$

For a vector with radius $r$, polar angle $\theta$ from the positive z-axis, and azimuth $\phi$, the power is

$$
P_p(\mathbf z)=r^p\begin{pmatrix}
\sin(p\theta)\cos(p\phi)\\
\sin(p\theta)\sin(p\phi)\\
\cos(p\theta)
\end{pmatrix}.
$$

At zero, define $P_p(0)=0$. The explorer defaults to $p=8$. It raises the radius to the eighth power and multiplies both angles by eight.

<figure data-investigation="mandelbulb"></figure>

Daniel White published his spherical-coordinate construction in 2007. Paul Nylander later tried higher powers. Their eighth-power renders attracted attention in 2009. White's account documents the earlier quadratic experiments and the higher-power breakthrough.<sup><a id="mandelbulb-ref-1" href="#mandelbulb-source-1">1</a></sup>

This power is an explicit geometric rule. It borrows the radius-and-angle idea from complex powers, then extends it to two angles. Different three-dimensional extensions need not produce the same object.

The mathematical set contains parameters whose orbits remain bounded. The surface marks the edge of that volume. A finite iteration limit approximates the distinction between bounded and escaping orbits.

The renderer casts a ray through each pixel. At successive positions it estimates distance to the bulb from the orbit's radius and accumulated derivative estimate. It advances by that estimate until it reaches a small surface tolerance. These are approximate distance estimates, so detail depends on numerical limits and rendering tolerance.

Orbit-trap colors record close approaches to coordinate planes and the origin. Changing **Power** changes the iterated rule itself.

Compare the planar [Mandelbrot set](/mandelbrot) and fixed-parameter [Julia sets](/julia-set).

## Sources and notes

1. <span id="mandelbulb-source-1"></span> Daniel White, [Mandelbulb: The Unravelling of the Real 3D Mandelbrot Fractal](https://www.skytopia.com/project/fractal/mandelbulb.html), 8 November 2009, and his linked [2007 construction account](https://www.skytopia.com/project/fractal/mandelbrot.html). Creator's history credits Nylander's higher-power experiments. Formula and rendering details above match this explorer's spherical-power shader. [Back](#mandelbulb-ref-1)
