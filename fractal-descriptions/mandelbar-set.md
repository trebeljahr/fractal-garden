# Mandelbar Set

Choose a pixel. Its coordinates give a number to add, called $c$. Start at zero, square the point, add $c$, and repeat, as in the [Mandelbrot set](/mandelbrot). Pixels whose points never run away belong to the set.

Add one move before each square: mirror the point across the horizontal axis, so $(x, y)$ becomes $(x, -y)$.<sup><a id="mandelbar-set-ref-1" href="#mandelbar-set-source-1">1</a></sup> That one mirror replaces the Mandelbrot set's heart shape with three matching corners, which is why John Milnor called this set the tricorn.<sup><a id="mandelbar-set-ref-2" href="#mandelbar-set-source-2">2</a></sup>

Follow the jumps below. The dotted line shows the mirror before each jump.

<figure data-orbit="mandelbar"></figure>

Here is why there are three corners. Suppose the point and $c$ are both turned by 120 degrees. Mirroring changes that turn to −120 degrees. Squaring doubles it to −240 degrees, which faces the same way as +120. Adding $c$, also turned by 120 degrees, keeps the whole result turned by 120 degrees.

So when you turn a pixel by a third of a circle, its entire route turns with it, jump for jump. If one pixel's route runs away, so does the route of the pixel turned by 120 degrees. The picture has to look the same after a third of a turn.

Squaring without the mirror turns 120 degrees into 240, so the Mandelbrot set has no such match. A higher power adds a corner: the fourth power with a mirror turns 72 degrees into −288, the same as 72, which gives five corners.<sup><a id="mandelbar-set-ref-3" href="#mandelbar-set-source-3">3</a></sup>

<figure data-lesson="mandelbar-turns"></figure>

The smooth body in the middle is where a route settles on one point. Its edge is where that point sits exactly 1/2 away from zero. Walk that point $z$ around its circle and compute $c = z - \bar{z}^2$, where $\bar{z}$ is the mirrored $z$. The curve has three sharp points. Use $c = z - z^2$ instead, without the mirror, and you draw the Mandelbrot set's heart, with one sharp point.<sup><a id="mandelbar-set-ref-4" href="#mandelbar-set-source-4">4</a></sup>

## Further exploring

- [Tricorn — Wikipedia](https://en.wikipedia.org/wiki/Tricorn_(mathematics))
- [Multicorns are not Path Connected](https://arxiv.org/abs/1209.1753)

## Sources and notes

1. <span id="mandelbar-set-source-1"></span> [Mandelbar Set](https://mathworld.wolfram.com/MandelbarSet.html). [Back](#mandelbar-set-ref-1)
2. <span id="mandelbar-set-source-2"></span> [Remarks on Iterated Cubic Maps](https://arxiv.org/abs/math/9201273), §4. [Back](#mandelbar-set-ref-2)
3. <span id="mandelbar-set-source-3"></span> [On Multicorns and Unicorns II: Bifurcations in Spaces of Antiholomorphic Polynomials](https://arxiv.org/abs/1404.5031), §1. [Back](#mandelbar-set-ref-3)
4. <span id="mandelbar-set-source-4"></span> Calculation. A point settles on $z = \bar{z}^2 + c$ when two jumps shrink nearby distances, which needs $|2z| < 1$. Setting $z = \tfrac12 e^{i\theta}$ gives $c = \tfrac12 e^{i\theta} - \tfrac14 e^{-2i\theta}$. [Back](#mandelbar-set-ref-4)
