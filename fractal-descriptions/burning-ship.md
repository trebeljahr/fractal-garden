# Burning Ship Fractal

The [Mandelbrot set](/mandelbrot) repeatedly squares a point and adds a fixed number. The Burning Ship inserts one extra step before squaring: make both coordinates nonnegative.

A point left of the vertical axis flips to the right. A point below the horizontal axis flips upward. Points in all four quarters fold into the top-right quarter before the next calculation.<sup><a id="burning-ship-ref-1" href="#burning-ship-source-1">1</a></sup>

<figure data-article-images="burning-ship"></figure>

Start at zero. Fold, square, add the number chosen by the pixel, and repeat. Some choices send the results away without bound.

Count the steps until the result passes the escape limit, then use that count to choose a color from the palette. Pixels with the same count form bands. Smooth coloring also uses how far the result went beyond the limit, so colors blend between bands.<sup><a id="burning-ship-ref-2" href="#burning-ship-source-2">2</a></sup>

<figure data-orbit="burning-ship"></figure>

The small diagram uses the usual upward direction for positive vertical coordinates. The main image flips that display direction, which puts the hull below the masts.

The sequence of points is called an orbit. After each step, an orbit trap measures the new point's distance from a chosen shape. The smallest distance chooses the pixel's color.<sup><a id="burning-ship-ref-3" href="#burning-ship-source-3">3</a></sup> Here, the point trap measures distance from zero. The cross trap measures distance from the nearer axis. These can reveal patterns in regions that escape-time coloring leaves black.

Zoom along a mast to find smaller ship-shaped regions. At their centers, the calculation returns to zero after a fixed number of steps. The same sequence then repeats without escaping.<sup><a id="burning-ship-ref-4" href="#burning-ship-source-4">4</a></sup>

With escape-time coloring, points that haven't escaped within the chosen step limit use the interior color, black by default. The computer cannot wait forever, so slowly escaping points can still look black.

## Further reading

- [Burning Ship fractal — Wikipedia](https://en.wikipedia.org/wiki/Burning_Ship_fractal)
- [At the Helm of the Burning Ship — Claude Heiland-Allen](https://mathr.co.uk/web/helm.html)

## Sources and notes

1. <span id="burning-ship-source-1"></span> [The “burning ship” and its quasi-Julia sets](https://www.sciencedirect.com/science/article/pii/009784939290032Q). [Back](#burning-ship-ref-1)
2. <span id="burning-ship-source-2"></span> Background: [Smooth Shading for the Mandelbrot Exterior](https://linas.org/art-gallery/escape/smooth.html). [Back](#burning-ship-ref-2)
3. <span id="burning-ship-source-3"></span> [Orbit Traps](https://www.ultrafractal.com/help/coloring/standard/orbittraps.html). [Back](#burning-ship-ref-3)
4. <span id="burning-ship-source-4"></span> [At the Helm of the Burning Ship](https://mathr.co.uk/helm/AtTheHelmOfTheBurningShip-Paper.pdf). [Back](#burning-ship-ref-4)
