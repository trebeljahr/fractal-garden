# Burning Ship Fractal

Choose a pixel in the ship. Its horizontal and vertical coordinates give a number to add, called $c$. Start at zero, square the current point, add $c$, and repeat, as in the [Mandelbrot set](/mandelbrot).

The Burning Ship adds one operation before each squaring. A point left of the vertical axis flips to the right. A point below the horizontal axis flips upward. Both coordinates are now positive or zero. This is the **fold**.<sup><a id="burning-ship-ref-1" href="#burning-ship-source-1">1</a></sup>

<figure data-article-images="burning-ship"></figure>

Follow the jumps below. Whenever a coordinate is negative, the dotted line shows the fold before the jump. This picture draws positive vertical coordinates downward so the ship stands upright, so a fold moves a point down. Compare **Little ship** with **Nearby pixel** to see how a small change affects the route.

<figure data-orbit="burning-ship"></figure>

Count the steps until the result passes the escape limit, then use that count to choose a color from the palette. Pixels with the same count form bands. Smooth coloring also uses how far the result went beyond the limit, so colors blend between bands.<sup><a id="burning-ship-ref-2" href="#burning-ship-source-2">2</a></sup>

With escape-time coloring, points that haven't escaped within the chosen step limit use the interior color, black by default. The computer cannot wait forever, so slowly escaping points can still look black.

There is another way to color the same calculation. Follow its route, called an **orbit**, and measure how close it gets to a chosen shape. The closest visit sets the pixel's color. This is an **orbit trap**.<sup><a id="burning-ship-ref-3" href="#burning-ship-source-3">3</a></sup> Here, the point trap measures distance from zero. The cross trap measures distance from the nearer axis. These can reveal patterns in regions that escape-time coloring leaves black.

Zoom along a mast to find smaller ship-shaped regions. At their centers, the calculation returns to zero after a fixed number of steps. The same sequence then repeats without escaping.<sup><a id="burning-ship-ref-4" href="#burning-ship-source-4">4</a></sup>

Look between the smaller ships for thin, branching shapes that resemble [Julia sets](/julia-set). These are called **embedded quasi-Julia sets**.<sup><a id="burning-ship-ref-5" href="#burning-ship-source-5">5</a></sup> **Places to explore** includes three views from Heiland-Allen’s gallery under **Embedded Julia shapes**.<sup><a id="burning-ship-ref-6" href="#burning-ship-source-6">6</a></sup>

## Further reading

- [Burning Ship fractal — Wikipedia](https://en.wikipedia.org/wiki/Burning_Ship_fractal)
- [At the Helm of the Burning Ship — Claude Heiland-Allen](https://mathr.co.uk/web/helm.html)

## Sources and notes

1. <span id="burning-ship-source-1"></span> [At the Helm of the Burning Ship](https://mathr.co.uk/helm/AtTheHelmOfTheBurningShip-Paper.pdf). [Back](#burning-ship-ref-1)
2. <span id="burning-ship-source-2"></span> Background: [Smooth Shading for the Mandelbrot Exterior](https://linas.org/art-gallery/escape/smooth.html). [Back](#burning-ship-ref-2)
3. <span id="burning-ship-source-3"></span> [Orbit Traps](https://www.ultrafractal.com/help/coloring/standard/orbittraps.html). [Back](#burning-ship-ref-3)
4. <span id="burning-ship-source-4"></span> [At the Helm of the Burning Ship](https://mathr.co.uk/helm/AtTheHelmOfTheBurningShip-Paper.pdf). [Back](#burning-ship-ref-4)
5. <span id="burning-ship-source-5"></span> [At the Helm of the Burning Ship](https://mathr.co.uk/helm/AtTheHelmOfTheBurningShip-Paper.pdf). [Back](#burning-ship-ref-5)
6. <span id="burning-ship-source-6"></span> [Burning Ship embedded Julia sets](https://mathr.co.uk/bs/2018-01-11_burning_ship_embedded_julia_sets/). [Back](#burning-ship-ref-6)
