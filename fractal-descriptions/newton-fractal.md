# Newton Fractal

Look for three colored regions with smaller patches around their boundaries. Each pixel starts a calculation that tries to reach a root. Nearby starting points can lead to different roots.

## Turn a tangent into the next estimate

[Newton's method](https://en.wikipedia.org/wiki/Newton%27s_method) starts with an estimate. Draw a tangent to the function there, then use its crossing of the horizontal axis as the next estimate. Repeat at the new point.

<figure data-lesson="newton"></figure>

Start with **Real tangent** to follow the crossings. Compare **Start at 2** with **Start at 0.5**. The **Flat tangent (0)** has no crossing, so the update stops. Switch to **Complex orbit** to follow the same rule in the complex plane.

For the version shown here, the equation is

$$
f(z) = z^3 - 1
$$

which has three roots:

$$
1,\quad -\frac{1}{2} + \frac{\sqrt{3}}{2}i,\quad -\frac{1}{2} - \frac{\sqrt{3}}{2}i
$$

The Newton update is:

$$
z_{n+1} = z_n - \frac{z_n^3 - 1}{3z_n^2}
$$

The denominator is the derivative. A zero derivative prevents this division. Starting close to zero can also cause a large jump.

## Read the colors as a numerical result

Red names the real root at $1$. Green and blue name the roots above and below the real axis. Near a boundary, a small change in the starting point can change which root the iteration approaches.

The full image takes at most 48 updates per pixel. It stops near a root, when the derivative becomes too small, or when a value exceeds its numerical limit. If no root meets the tolerance, it colors the last point by its nearest root, with slightly lower brightness. A pixel's color alone therefore does not prove convergence.

In the explorer, compare **All three basins** with **Where the basins meet** under **Places to explore**. Drag to pan, then use the wheel or a pinch gesture to inspect a boundary.

The [Mandelbrot set](/mandelbrot) and [Burning Ship fractal](/burning-ship) also iterate complex numbers, but color their images using escape tests. The [Julia set](/julia-set) varies the starting point of a fixed rule, as this Newton picture does.
