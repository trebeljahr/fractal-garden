# Cactus Fractal

Choose a pixel. Its coordinates give a number called $c$. In the [Mandelbrot set](/mandelbrot) a point starts at zero. Here it starts at $c$. Each jump then follows one rule:<sup><a id="cactus-fractal-ref-1" href="#cactus-fractal-source-1">1</a></sup>

$$z \to z^3 + (c - 1)z - c$$

Pixels whose points never run away form the two prickly black bodies. Try a pixel in each one below.

<figure data-orbit="cactus"></figure>

At $c = 0.15$, in the right body, the route settles on one point. At $c = -0.2$, in the left body, it settles into bouncing between two points.

The two bodies meet at exactly $c = 0$, for a reason you can check. Near the settling point, each jump multiplies a small distance by about $c - 1$. Just right of zero that number is a little smaller than 1 in size, so distances shrink and the route settles. Just left of zero it is a little larger, so distances grow and the single point stops holding the route. At zero the number is exactly $-1$: distances keep their size and flip sides.<sup><a id="cactus-fractal-ref-2" href="#cactus-fractal-source-2">2</a></sup>

The Mandelbrot set's heart meets its round left bulb the same way, at $c = -3/4$, with the same $-1$.

Use **Places to explore** to look away from the bodies. You find specks with space around them. The Mandelbrot set is known to be one connected piece, and the proof uses its start at zero, the place where the rule's slope is zero.<sup><a id="cactus-fractal-ref-3" href="#cactus-fractal-source-3">3</a></sup> A cactus point starts at $c$, which is not such a place, so that argument does not apply here. A picture cannot prove that two pieces never join, so treat the gaps as what the screen shows.

## Further reading

- [Cactus — Paul Bourke](https://paulbourke.net/fractals/cactus)

## Sources and notes

1. <span id="cactus-fractal-source-1"></span> [Cactus Fractal](https://mathworld.wolfram.com/CactusFractal.html). [Back](#cactus-fractal-ref-1)
2. <span id="cactus-fractal-source-2"></span> Calculation. A settling point solves $z = z^3 + (c-1)z - c$, which for small $c$ gives $z \approx -c/2$. The slope of the rule there is $3z^2 + c - 1 \approx c - 1$. [Back](#cactus-fractal-ref-2)
3. <span id="cactus-fractal-source-3"></span> Background: [Mandelbrot set — Wikipedia](https://en.wikipedia.org/wiki/Mandelbrot_set). The slope of the cactus rule at its start is $3c^2 + c - 1$, which is not zero for most $c$. [Back](#cactus-fractal-ref-3)
