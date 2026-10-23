# Burning Ship Fractal

The [Mandelbrot set](/mandelbrot) repeatedly squares a point and adds a fixed number. The Burning Ship inserts one extra step before squaring: make both coordinates nonnegative.

A point left of the vertical axis flips to the right. A point below the horizontal axis flips upward. Points in all four quarters fold into the top-right quarter before the next calculation.<sup><a id="burning-ship-ref-1" href="#burning-ship-source-1">1</a></sup>

<figure data-article-images="burning-ship"></figure>

Start at zero. Fold, square, add the number chosen by the pixel, and repeat. Some choices send the results away without bound. The color shows how long the escape takes.

<figure data-orbit="burning-ship"></figure>

The small diagram uses the usual upward direction for positive vertical coordinates. The main image flips that display direction, which puts the hull below the masts.

Zoom along a mast to find smaller ship-shaped regions. At their centers, the calculation returns to zero after a fixed number of steps. The same sequence then repeats without escaping.<sup><a id="burning-ship-ref-2" href="#burning-ship-source-2">2</a></sup>

A black pixel means the calculation hasn't escaped within the chosen limit. The computer cannot wait forever, so slowly escaping points can still look black.

## Sources and notes

1. <span id="burning-ship-source-1"></span> Michael Michelitsch and Otto E. Rössler, [The “burning ship” and its quasi-Julia sets](https://www.sciencedirect.com/science/article/pii/009784939290032Q), *Computers & Graphics* 16(4) (1992), 435–438. Original paper's public abstract confirms the nonanalytic construction and quasi-Julia family. [Back](#burning-ship-ref-1)
2. <span id="burning-ship-source-2"></span> Claude Heiland-Allen, [At the Helm of the Burning Ship](https://mathr.co.uk/helm/AtTheHelmOfTheBurningShip-Paper.pdf), *Electronic Visualisation and the Arts* (2019), 402–408. Gives the real-coordinate recurrence, axis convention, periodic mini-ships and Jacobian methods. [Back](#burning-ship-ref-2)
