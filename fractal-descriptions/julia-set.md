# Julia Set

A single constant determines every spiral and branch in a quadratic Julia set. Some constants produce connected sets. Others produce disconnected dust.

Repeated iteration spreads the effect of that constant across the entire plane. Changing it can reshape every part of the boundary.

## One rule, different starting points

Two pixels share the same rule and constant, but start their orbits at different complex values. Their later paths can approach the same cycle or escape.

A small change to the constant can change the fate of the critical orbit starting at zero. That orbit determines whether the Julia set is connected.

Coloring measures the behavior of these orbits. It does not change which infinite orbits remain bounded.

<figure data-article-images="julia"></figure>

## One Julia set for each Mandelbrot point

The [Mandelbrot set](/mandelbrot) and these Julia sets share the rule:

$$
z_{n+1} = z_n^2 + c
$$

The Mandelbrot explorer starts every sequence at $z_0 = 0$ and uses each pixel as a different value of $c$. The Julia explorer keeps $c$ fixed and uses each pixel as a different starting value $z_0$.

This makes the Mandelbrot set a [map of the Julia family](https://pi.math.cornell.edu/~lipa/mec/lesson5.html). A value of $c$ in the Mandelbrot set gives a connected Julia set. A value outside it gives disconnected dust. Near the Mandelbrot boundary, small changes to $c$ can produce large changes in the Julia image.

Below, $c=-0.8+0.156i$ stays fixed. Only the starting point changes. This separates the role of the parameter from the role of the iterated value.

<figure data-orbit="julia"></figure>

## What the image shows

The filled Julia set contains all starting points whose sequences stay bounded forever. Its boundary is the Julia set itself.

With default **Smooth escape time** coloring, the dark region approximates the filled set. The surrounding colors describe how quickly other starting points escape. The finite **Iterations** limit means that a slowly escaping point can still appear dark.

**Orbit trap** colors points by how close their sequences come to the origin, including points that do not escape. This can reveal patterns inside the dark region. The [Burning Ship explorer](/burning-ship) offers the same coloring controls with a different iteration rule.

### A finite test of an infinite orbit

Some starting points spend a long time near the boundary before escaping. A finite iteration limit can leave those points dark.

The filled set contains every bounded starting orbit. The Julia set is the boundary between that behavior and escape.

Magnification changes which starting points occupy the screen. It does not change the constant or the recurrence.
