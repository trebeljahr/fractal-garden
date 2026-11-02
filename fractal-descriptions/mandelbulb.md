# Mandelbulb

Choose a point in space. We will use its position in a calculation, repeating the same two steps: change the current point's distance and direction, then add the position we chose.

Start at the center. Adding the chosen position takes us to that point. The next calculation can move somewhere else.

To change the distance and direction, measure how far the point is from the center and the two angles that locate it. With **Power** set to $8$, multiply eight copies of the distance together and multiply each angle by eight.

Follow that one operation below. The hollow dot stays at the start while the amber dot moves to the result.

<figure data-investigation="mandelbulb"></figure>

After this operation, add the chosen position again. Repeat. For some chosen positions, the current point's distance from the center grows without limit. For the rest, it doesn't. The boundary between these two groups forms the bulb's surface.

The [Mandelbrot set](/mandelbrot) tests points in a plane this way. The Mandelbulb uses distance and two angles to extend the idea into space. Changing **Power** changes the operation, so the whole surface changes too.

Daniel White published the construction in 2007. Paul Nylander's later experiments with higher powers led to the eighth-power images made in 2009.<sup><a id="mandelbulb-ref-1" href="#mandelbulb-source-1">1</a></sup>

## Further reading

- [Mandelbulb — Wikipedia](https://en.wikipedia.org/wiki/Mandelbulb)
- [Mandelbulb — MathWorld](https://mathworld.wolfram.com/Mandelbulb.html)
- [Mandelbulb — Inigo Quilez](https://iquilezles.org/articles/mandelbulb/)
- [Pandora’s 3D box — Plus Magazine](https://plus.maths.org/content/pandoras-3d-box)
- [Mandelbulb set — Paul Bourke](https://paulbourke.net/fractals/bulb/)
- [MandelBulb 3D Fractal — The Coding Train](https://www.youtube.com/watch?v=NJCiUVGiNyA)

## Sources and notes

1. <span id="mandelbulb-source-1"></span> [Mandelbulb: The Unravelling of the Real 3D Mandelbrot Fractal](https://www.skytopia.com/project/fractal/mandelbulb.html) and [2007 construction account](https://www.skytopia.com/project/fractal/mandelbrot.html). [Back](#mandelbulb-ref-1)
