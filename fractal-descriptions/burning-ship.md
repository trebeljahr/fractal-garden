# Burning Ship Fractal

Choose a pixel in the ship. Its horizontal and vertical coordinates give a number to add, called $c$. Start at zero, square the current point, add $c$, and repeat, as in the [Mandelbrot set](/mandelbrot).

The Burning Ship adds one operation before each squaring. A point left of the vertical axis flips to the right. A point below the horizontal axis flips upward. Both coordinates are now positive or zero. This is the **fold**.<sup><a id="burning-ship-ref-1" href="#burning-ship-source-1">1</a></sup>

<figure data-article-images="burning-ship"></figure>

Follow the jumps below. Whenever a coordinate is negative, the dotted line shows the fold before the jump. This picture draws positive vertical coordinates downward to keep the ship upright, so a fold moves a point down. Pick a pixel just left of the ring to see how much a small change affects the route: at $(-1.8, -0.03)$ the point crosses the dashed circle on jump 7, not jump 12.

<figure data-orbit="burning-ship"></figure>

Under the picture, the current jump is worked out by hand and rounded to five decimals. The fold row removes the minus signs. Press **Next jump** and the new point goes back in as the next starting point.

A point that crosses the dashed circle has escaped. Colored pixels escaped, and the color shows how many jumps that took. Black pixels haven't escaped yet. The computer stops after a fixed number of steps, so some of them may escape later.

The Mandelbrot picture looks the same upside down. The ship does not, and the fold is the reason.

Take the pixel $(-0.5, -0.5)$ and its mirror image across the horizontal axis, $(-0.5, 0.5)$. The first jump lands each point on its own pixel. The fold then moves both points to $(0.5, 0.5)$, so squaring gives both the same answer, $(0, 0.5)$. Adding each pixel's numbers puts them on $(-0.5, 0)$ and $(-0.5, 1)$. They are no longer mirror images.

<figure data-lesson="mirror-pair"></figure>

The first point stays inside the dashed circle and settles near $(-0.41, -0.28)$. The second crosses it on jump 4.

Choose **Without the fold**. The picture becomes the Mandelbrot set. A point and its mirror image square to answers that are mirror images too, so the two routes stay mirror images at every jump, and both pixels get the same color.

Zoom along a mast to find smaller ship-shaped regions. At their centers, the calculation returns to zero after a fixed number of steps. The same sequence then repeats without escaping.<sup><a id="burning-ship-ref-2" href="#burning-ship-source-1">1</a></sup>

Look between the smaller ships for thin, branching shapes that resemble [Julia sets](/julia-set). These are called **embedded quasi-Julia sets**.<sup><a id="burning-ship-ref-3" href="#burning-ship-source-1">1</a></sup> **Places to explore** includes three views from Heiland-Allen’s gallery under **Embedded Julia shapes**.<sup><a id="burning-ship-ref-4" href="#burning-ship-source-2">2</a></sup>

## Further exploring

- [Burning Ship fractal — Wikipedia](https://en.wikipedia.org/wiki/Burning_Ship_fractal)
- [Burning Ship fractal — MathWorld](https://mathworld.wolfram.com/BurningShipFractal.html)
- [Burning Ship Fractal — Paul Bourke](https://paulbourke.net/fractals/burnship/)

## Sources and notes

1. <span id="burning-ship-source-1"></span> [At the Helm of the Burning Ship](https://mathr.co.uk/helm/AtTheHelmOfTheBurningShip-Paper.pdf). [Back](#burning-ship-ref-1) [Back](#burning-ship-ref-2) [Back](#burning-ship-ref-3)
2. <span id="burning-ship-source-2"></span> [Burning Ship embedded Julia sets](https://mathr.co.uk/bs/2018-01-11_burning_ship_embedded_julia_sets/). [Back](#burning-ship-ref-4)
