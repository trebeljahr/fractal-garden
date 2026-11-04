# Mandelbulb

The [Mandelbrot set](/mandelbrot) tests points on a plane. Pick a point, start at the center, square the current point, add the point you picked, and repeat. If the distance from the center grows without limit, the point you picked is out, and otherwise it is in. The Mandelbulb runs that test in space, where the squaring step needs a new meaning.

Squaring a point on a plane multiplies its distance by itself and doubles its angle. This works because points on a plane are complex numbers, which can be multiplied and divided, and numbers like that do not exist with three coordinates.<sup><a id="mandelbulb-ref-1" href="#mandelbulb-source-1">1</a></sup> So squaring a point in space has no single right answer, and someone has to choose a rule.

Daniel White chose this one in 2007. A point in space has a distance from the center and two angles, one measured from the vertical axis and one measured around it, so square the distance and double both angles.<sup><a id="mandelbulb-ref-2" href="#mandelbulb-source-2">2</a></sup> Paul Nylander then tried higher powers. With power 8, raise the distance to the eighth power and multiply both angles by eight, then add the point you picked and repeat. Each repeat is one jump.

A point whose distance passes 2 only moves farther away, so that is the test.<sup><a id="mandelbulb-ref-3" href="#mandelbulb-source-3">3</a></sup> Test every point in space, and the ones that stay make a solid.

Cutting the solid shows its inside. Move **Height** below to choose where the cut goes. Everything above it is removed, and the amber face is the set of points that stay.

<figure data-lesson="bulb-slice"></figure>

At height 0, count the bumps around the edge of the amber shape. Power 8 has seven, not eight, and moving **Power** gives five at 6 and three at 4.

The missing bump follows from the rule. Pick a point, then turn it one seventh of a circle around the vertical axis. Its distance and its angle from the axis stay the same, and its angle around the axis grows by 1/7 of a circle. Multiplying by 8 makes that 8/7 of a circle, which is one full turn plus 1/7, so the power step lands on the same result as before, turned by 1/7. Adding the turned point keeps it turned, and the same happens at every jump.

The route of a turned point is therefore the original route, turned. Both points get the same answer, so the solid looks the same after each seventh of a circle. Pick a point in the cut seen from above to see this: the white route is yours, and the others start from the same point, turned by equal parts of a circle. The [Mandelbar set](/mandelbar-set) gets its three corners the same way.

This rule does not make a perfect copy of the Mandelbrot set, which has detail all along its edge. Parts of the bulb's surface do not: White himself describes "smeared 'whipped cream' sections" in the power 8 bulb, and expects a real 3D Mandelbrot would show more.<sup><a id="mandelbulb-ref-4" href="#mandelbulb-source-2">2</a></sup>

## Further exploring

### Videos

- [MandelBulb 3D Fractal — The Coding Train](https://www.youtube.com/watch?v=NJCiUVGiNyA)

### Reading

- [Mandelbulb — Wikipedia](https://en.wikipedia.org/wiki/Mandelbulb)
- [Mandelbulb — MathWorld](https://mathworld.wolfram.com/Mandelbulb.html)
- [Mandelbulb — Inigo Quilez](https://iquilezles.org/articles/mandelbulb/)
- [Pandora’s 3D box — Plus Magazine](https://plus.maths.org/pandoras-3d-box)
- [Mandelbulb set — Paul Bourke](https://paulbourke.net/fractals/bulb/)

## Sources and notes

1. <span id="mandelbulb-source-1"></span> [Frobenius theorem](https://en.wikipedia.org/wiki/Frobenius_theorem_(real_division_algebras)): associative number systems with division exist only with 1, 2 or 4 coordinates. [Back](#mandelbulb-ref-1)
2. <span id="mandelbulb-source-2"></span> [Mandelbulb: The Unravelling of the Real 3D Mandelbrot Fractal](https://www.skytopia.com/project/fractal/mandelbulb.html), [its formula and epilogue](https://www.skytopia.com/project/fractal/2mandelbulb.html) and [2007 construction account](https://www.skytopia.com/project/fractal/mandelbrot.html). [Back](#mandelbulb-ref-2) [Back](#mandelbulb-ref-4)
3. <span id="mandelbulb-source-3"></span> Calculation: if $|z|>2$ and $|z|\ge|c|$, then one jump gives at least $|z|^n-|c|\ge|z|(|z|^{n-1}-1)>|z|$. [Back](#mandelbulb-ref-3)
