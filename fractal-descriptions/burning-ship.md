# Burning Ship Fractal

The Burning Ship repeats the calculation of the [Mandelbrot set](/mandelbrot) with one extra operation. A pixel's horizontal and vertical coordinates give a number to add, called $c$, and the point starts at zero. Each jump then makes both of the point's coordinates positive or zero, squares the point, and adds $c$. The first of those operations is the **fold**: a point left of the vertical axis flips to the right, and a point below the horizontal axis flips upward.<sup><a id="burning-ship-ref-1" href="#burning-ship-source-1">1</a></sup>

<figure data-article-images="burning-ship"></figure>

In the route below, the dotted line shows the fold whenever a coordinate is negative. This picture draws positive vertical coordinates downward to keep the ship upright, so on screen a fold moves a point down. A small change in the pixel can change the route a lot: pick a pixel just left of the ring, and at $(-1.8, -0.03)$ the point crosses the dashed circle on jump 7, not jump 12.

<figure data-orbit="burning-ship"></figure>

Under the picture, the current jump is worked out by hand and rounded to five decimals, and its fold row removes the minus signs. **Next jump** feeds the new point back in as the next starting point.

A point that crosses the dashed circle has escaped, so a colored pixel is one that escaped, and its color shows how many jumps that took. Black pixels haven't escaped yet. The computer stops after a fixed number of steps, so some of them may escape later.

The Mandelbrot picture looks the same upside down, and the ship doesn't, because of the fold. Take the pixel $(-0.5, -0.5)$ and its mirror image across the horizontal axis, $(-0.5, 0.5)$. The first jump lands each point on its own pixel. The fold then moves both points to $(0.5, 0.5)$, so squaring gives both the same answer, $(0, 0.5)$. Adding each pixel's numbers puts them on $(-0.5, 0)$ and $(-0.5, 1)$, which are no longer mirror images.

<figure data-lesson="mirror-pair"></figure>

From there the first point stays inside the dashed circle and settles near $(-0.41, -0.28)$, while the second crosses it on jump 4.

Choose **Without the fold** and the picture becomes the Mandelbrot set. A point and its mirror image now square to answers that are mirror images too, so the two routes stay mirror images at every jump and both pixels get the same color.

Along the masts are smaller ship-shaped regions. At their centers, the calculation returns to zero after a fixed number of steps, so the same sequence repeats without escaping.<sup><a id="burning-ship-ref-2" href="#burning-ship-source-1">1</a></sup>

Between the smaller ships are thin, branching shapes that resemble [Julia sets](/julia-set), called **embedded quasi-Julia sets**.<sup><a id="burning-ship-ref-3" href="#burning-ship-source-1">1</a></sup> **Places to explore** includes three views from Heiland-Allen’s gallery under **Embedded Julia shapes**.<sup><a id="burning-ship-ref-4" href="#burning-ship-source-2">2</a></sup>

## Further exploring

- [Burning Ship fractal — Wikipedia](https://en.wikipedia.org/wiki/Burning_Ship_fractal)
- [Burning Ship fractal — MathWorld](https://mathworld.wolfram.com/BurningShipFractal.html)
- [Burning Ship Fractal — Paul Bourke](https://paulbourke.net/fractals/burnship/)

## Sources and notes

1. <span id="burning-ship-source-1"></span> [At the Helm of the Burning Ship](https://mathr.co.uk/helm/AtTheHelmOfTheBurningShip-Paper.pdf). [Back](#burning-ship-ref-1) [Back](#burning-ship-ref-2) [Back](#burning-ship-ref-3)
2. <span id="burning-ship-source-2"></span> [Burning Ship embedded Julia sets](https://mathr.co.uk/bs/2018-01-11_burning_ship_embedded_julia_sets/). [Back](#burning-ship-ref-4)
